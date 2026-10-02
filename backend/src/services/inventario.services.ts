import { PoolClient } from "pg";
import { pool, ejecutarEnTransaccion } from "../db/pool";
import { CartaParaInventario } from "../types/inventario";

const insertarOAsignarCarta = async (client: PoolClient, carta: Omit<CartaParaInventario, "colores" | "tipos">): Promise<number> => {

    const sql = `INSERT INTO cartas (scryfall_id, nombre, mana_value, mana_cost, ataque, vida, descripcion, expansion_id, numero_carta, foil, imagen_url, rareza, oracle_id, type_line, legalidades, identidad_color, game_changer)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                ON CONFLICT (scryfall_id) DO UPDATE SET imagen_url = EXCLUDED.imagen_url, rareza = EXCLUDED.rareza,
                    oracle_id = COALESCE(EXCLUDED.oracle_id, cartas.oracle_id),
                    type_line = COALESCE(EXCLUDED.type_line, cartas.type_line),
                    legalidades = COALESCE(EXCLUDED.legalidades, cartas.legalidades),
                    identidad_color = COALESCE(EXCLUDED.identidad_color, cartas.identidad_color),
                    game_changer = COALESCE(EXCLUDED.game_changer, cartas.game_changer)
                RETURNING id
                `

    const resultado = await client.query(sql, [carta.scryfallId, carta.nombre, carta.manaValue, carta.manaCost, carta.ataque, carta.vida, carta.descripcion, carta.expansionId, carta.numeroCarta, carta.foil, carta.imagenUrl, carta.rareza, carta.oracleId ?? null, carta.typeLine ?? null,
        carta.legalidades ? JSON.stringify(carta.legalidades) : null, carta.identidadColor ?? null, carta.gameChanger ?? null])

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

const mapaNombreAId = (filas: { id: number; nombre: string }[]) =>
    new Map(filas.map((f) => [f.nombre, f.id]));

/* Versión en lote de insertarOAsignarCarta + colores + tipos: con `unnest`
   cada tabla se rellena en UNA consulta para todas las cartas, en vez de
   varias consultas por carta. Contra una BD remota (cada ida y vuelta
   cuesta ~40ms) pasar de ~500 consultas a ~7 es la diferencia entre 20s y
   menos de 1s. Recibe el client para poder ir dentro de otra transacción. */
export const resolverOCrearCartasEnLote = async (
    client: PoolClient,
    cartas: CartaParaInventario[]
): Promise<Map<string, number>> => {
    // ON CONFLICT DO UPDATE falla si la misma fila aparece dos veces en el INSERT
    const unicas = [...new Map(cartas.map((c) => [c.scryfallId, c])).values()];
    if (unicas.length === 0) return new Map();

    const { rows } = await client.query(
        `INSERT INTO cartas (scryfall_id, nombre, mana_value, mana_cost, ataque, vida, descripcion, expansion_id, numero_carta, foil, imagen_url, rareza, oracle_id, type_line, legalidades, identidad_color, game_changer)
         SELECT * FROM unnest($1::uuid[], $2::varchar[], $3::int[], $4::varchar[], $5::int[], $6::int[], $7::text[],
                              $8::int[], $9::varchar[], $10::bool[], $11::text[], $12::varchar[], $13::uuid[], $14::text[],
                              $15::jsonb[], $16::varchar[], $17::bool[])
         ON CONFLICT (scryfall_id) DO UPDATE SET imagen_url = EXCLUDED.imagen_url, rareza = EXCLUDED.rareza,
             oracle_id = COALESCE(EXCLUDED.oracle_id, cartas.oracle_id),
             type_line = COALESCE(EXCLUDED.type_line, cartas.type_line),
             legalidades = COALESCE(EXCLUDED.legalidades, cartas.legalidades),
             identidad_color = COALESCE(EXCLUDED.identidad_color, cartas.identidad_color),
             game_changer = COALESCE(EXCLUDED.game_changer, cartas.game_changer)
         RETURNING id, scryfall_id`,
        [
            unicas.map((c) => c.scryfallId),
            unicas.map((c) => c.nombre),
            unicas.map((c) => c.manaValue),
            unicas.map((c) => c.manaCost),
            unicas.map((c) => c.ataque),
            unicas.map((c) => c.vida),
            unicas.map((c) => c.descripcion),
            unicas.map((c) => c.expansionId),
            unicas.map((c) => c.numeroCarta),
            unicas.map((c) => c.foil),
            unicas.map((c) => c.imagenUrl),
            unicas.map((c) => c.rareza),
            unicas.map((c) => c.oracleId ?? null),
            unicas.map((c) => c.typeLine ?? null),
            unicas.map((c) => (c.legalidades ? JSON.stringify(c.legalidades) : null)),
            unicas.map((c) => c.identidadColor ?? null),
            unicas.map((c) => c.gameChanger ?? null)
        ]
    );
    const idPorScryfall = new Map<string, number>(rows.map((r) => [r.scryfall_id, r.id]));

    const mapaColores = mapaNombreAId(await obtenerColores(client));
    const mapaTipos = mapaNombreAId(await obtenerTipos(client));
    const mapaSubtipos = mapaNombreAId(await obtenerSubtipos(client));

    const colores: [number, number][] = [];
    const tipos: [number, number][] = [];
    const subtipos: [number, number][] = [];

    for (const carta of unicas) {
        const cartaId = idPorScryfall.get(carta.scryfallId)!;
        for (const color of carta.colores) {
            const colorId = mapaColores.get(color);
            if (colorId !== undefined) colores.push([cartaId, colorId]);
        }
        for (const palabra of carta.tipos) {
            const tipoId = mapaTipos.get(palabra);
            const subtipoId = mapaSubtipos.get(palabra);
            if (tipoId !== undefined) tipos.push([cartaId, tipoId]);
            else if (subtipoId !== undefined) subtipos.push([cartaId, subtipoId]);
        }
    }

    const insertarRelacion = async (tabla: string, columna: string, pares: [number, number][]) => {
        if (pares.length === 0) return;
        await client.query(
            `INSERT INTO ${tabla} (carta_id, ${columna}) SELECT * FROM unnest($1::int[], $2::int[]) ON CONFLICT DO NOTHING`,
            [pares.map((p) => p[0]), pares.map((p) => p[1])]
        );
    };

    await insertarRelacion("carta_colores", "color_id", colores);
    await insertarRelacion("carta_tipos", "tipo_carta_id", tipos);
    await insertarRelacion("carta_subtipos", "subtipo_carta_id", subtipos);

    return idPorScryfall;
};

/* Igual que guardarCartaEnInventario pero sin tocar inventario — para cuando
   solo hace falta la fila del catálogo (ej. añadir una carta a un mazo que
   todavía no se posee). */
export const resolverOCrearCarta = async (carta: CartaParaInventario): Promise<number> => {
    return ejecutarEnTransaccion(async (client) => {
        const cartaId = await insertarOAsignarCarta(client, carta);
        await insertarColoresCarta(client, cartaId, carta.colores);
        await insertarTiposDeCarta(client, cartaId, carta.tipos);
        return cartaId;
    });
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