import { PoolClient } from "pg";
import { pool, ejecutarEnTransaccion } from "../db/pool";
import { CartaParaInventario } from "../types/inventario";

const insertarOAsignarCarta = async (client: PoolClient, carta: Omit<CartaParaInventario, "colores" | "tipos">): Promise<number> => {

    const sql = `INSERT INTO cartas (scryfall_id, nombre, mana_value, mana_cost, ataque, vida, descripcion, expansion_id, numero_carta, foil, imagen_url, rareza)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (scryfall_id) DO UPDATE SET imagen_url = EXCLUDED.imagen_url, rareza = EXCLUDED.rareza
                RETURNING id
                `

    const resultado = await client.query(sql, [carta.scryfallId, carta.nombre, carta.manaValue, carta.manaCost, carta.ataque, carta.vida, carta.descripcion, carta.expansionId, carta.numeroCarta, carta.foil, carta.imagenUrl, carta.rareza])

    return resultado.rows[0].id;

}

const obtenerColores = async (client: PoolClient) => {
    const sql = `SELECT id, nombre FROM colores`;

    const resultado = await client.query(sql);

    return resultado.rows;
}

const insertarColoresCarta = async (client: PoolClient, cartaId: number, coloresCarta: string[]) => {
    const colores = await obtenerColores(client);

    const mapaColores = colores.reduce((acumulador, colorFila) => {
        acumulador[colorFila.nombre] = colorFila.id;
        return acumulador;
    }, {} as Record<string, number>);

    for (const nombreColor of coloresCarta) {
        const colorId = mapaColores[nombreColor];
        const sql = `INSERT INTO carta_colores (carta_id, color_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`;
        await client.query(sql, [cartaId, colorId])
    }
}

const obtenerTipos = async (client: PoolClient) => {
    const sql = `SELECT * from tipos_carta`;

    const resultado = await client.query(sql);

    return resultado.rows;
}

const obtenerSubtipos = async (client: PoolClient) => {
    const sql = `SELECT * from subtipos_carta`;

    const resultado = await client.query(sql);

    return resultado.rows;
}

const insertarTiposDeCarta = async (client: PoolClient, cartaId: number, tiposCarta: string[]) => {
    const tipos = await obtenerTipos(client);
    const subtipos = await obtenerSubtipos(client);

    const mapaTipos = tipos.reduce((acumulador, tipoFila) => {
        acumulador[tipoFila.nombre] = tipoFila.id;
        return acumulador;
    }, {} as Record<string, number>);


    const mapaSubtipos = subtipos.reduce((acumulador, subtipoFila) => {
        acumulador[subtipoFila.nombre] = subtipoFila.id;
        return acumulador;
    }, {} as Record<string, number>);


    for (const palabra of tiposCarta) {
        if (palabra in mapaTipos) {
            const tipoId = mapaTipos[palabra];
            await client.query(
                `INSERT INTO carta_tipos (carta_id, tipo_carta_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [cartaId, tipoId]
            );
        } else if (palabra in mapaSubtipos) {
            const subtipoId = mapaSubtipos[palabra];
            await client.query(
                `INSERT INTO carta_subtipos (carta_id, subtipo_carta_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [cartaId, subtipoId]
            );
        }
    }

}

const agregarCartaAInventario = async (client: PoolClient, cartaId: number, userId: string, cantidad: number) => {
    const sql = `INSERT INTO inventario (carta_id, usuario_id, cantidad_poseida) VALUES ($1, $2, $3)
                 ON CONFLICT (usuario_id, carta_id) DO UPDATE SET cantidad_poseida = inventario.cantidad_poseida + $3
                 RETURNING cantidad_poseida`;

    const resultado = await client.query(sql, [cartaId, userId, cantidad]);

    return resultado.rows[0].cantidad_poseida;
}

export const guardarCartaEnInventario = async (carta: CartaParaInventario, userId: string, cantidad: number = 1) => {
    return ejecutarEnTransaccion(async (client) => {
        const cartaId = await insertarOAsignarCarta(client, carta);
        await insertarColoresCarta(client, cartaId, carta.colores);
        await insertarTiposDeCarta(client, cartaId, carta.tipos);
        await agregarCartaAInventario(client, cartaId, userId, cantidad);

        return cartaId;
    });
}


/* Whitelist campo -> columna real. El ORDER BY nunca se construye
   interpolando directamente lo que mande el cliente: si no está aquí, no existe. */
const COLUMNAS_ORDENABLES: Record<string, string> = {
    nombre: "cartas.nombre",
    numero_carta: "cartas.numero_carta",
    cantidad: "inventario.cantidad_poseida",
};

export const obtenerInventario = async (usuarioId: string,
    filtros: {
        nombre?: string | undefined,
        foil?: boolean | undefined,
        colores?: string[] | undefined,
        tipo?: string | undefined
        manaValueMin?: number | undefined
        manaValueMax?: number | undefined
        rareza?: string | undefined
        ordenarPor?: string | undefined
        direccion?: string | undefined
    }
) => {
    const condiciones: string[] = ["inventario.usuario_id = $1"]
    const valores: any[] = [usuarioId];

    if (filtros.nombre) {
        valores.push(`%${filtros.nombre}%`);
        condiciones.push(`cartas.nombre ILIKE $${valores.length}`)
    }

    if (filtros.foil !== undefined) {
        valores.push(filtros.foil); //=== "true" es lo mismo    
        condiciones.push(`cartas.foil = $${valores.length}`)
    }

    if (filtros.colores && filtros.colores.length > 0 && filtros.colores.length < 6) {
        const placeholders = filtros.colores.map((_, i) => `$${valores.length + i + 1}`);
        valores.push(...filtros.colores);
        condiciones.push(`colores.nombre IN (${placeholders.join(", ")})`);
    }

    if (filtros.tipo) {
        valores.push(filtros.tipo);
        condiciones.push(`tipos_carta.nombre = $${valores.length}`);
    }

    if (filtros.manaValueMin !== undefined) {
        valores.push(filtros.manaValueMin);
        condiciones.push(`cartas.mana_value >= $${valores.length}`);
    }

    if (filtros.manaValueMax !== undefined) {
        valores.push(filtros.manaValueMax);
        condiciones.push(`cartas.mana_value <= $${valores.length}`);
    }

    if (filtros.rareza) {
        valores.push(filtros.rareza);
        condiciones.push(`cartas.rareza = $${valores.length}`);
    }

    const columnaOrden = COLUMNAS_ORDENABLES[filtros.ordenarPor ?? "nombre"] ?? COLUMNAS_ORDENABLES.nombre;
    const direccion = filtros.direccion === "desc" ? "DESC" : "ASC";

    const sql = `
        SELECT DISTINCT cartas.*, inventario.cantidad_poseida
        FROM inventario
        INNER JOIN cartas ON inventario.carta_id = cartas.id
        LEFT JOIN carta_colores ON carta_colores.carta_id = cartas.id
        LEFT JOIN colores ON colores.id = carta_colores.color_id
        LEFT JOIN carta_tipos ON carta_tipos.carta_id = cartas.id
        LEFT JOIN tipos_carta ON tipos_carta.id = carta_tipos.tipo_carta_id
        WHERE ${condiciones.join(" AND ")}
        ORDER BY ${columnaOrden} ${direccion}
    `;

    const resultados = await pool.query(sql, valores);
    return resultados.rows;

}

export const actualizarCantidadInventario = async (usuarioId: string, cartaId: number, delta: number) => {
    const sql = `
        UPDATE inventario
        SET cantidad_poseida = GREATEST(cantidad_poseida + $1, 0)
        WHERE usuario_id = $2 AND carta_id = $3
        RETURNING cantidad_poseida
    `

    const resultado = await pool.query(sql, [delta, usuarioId, cartaId]);

    if (resultado.rows.length === 0) {
        throw new Error("No se encontró esa carta en el inventario del usuario");
    }

    return resultado.rows[0];
}

export const eliminarCartaDeInventario = async (usuarioId: string, cartaId: number) => {
    const sql = `DELETE FROM inventario WHERE usuario_id = $1 AND carta_id = $2`;
    await pool.query(sql, [usuarioId, cartaId])
}