import { pool } from "../db/pool";

const insertarOAsignarCarta = async (carta: {
    scryfallId: string;
    nombre: string;
    manaValue: number | null;
    manaCost: string | null;
    ataque: number | null;
    vida: number | null;
    descripcion: string | null;
    expansionId: number | null;
    numeroCarta: string | null;
    foil: boolean;
}): Promise<number> => {

    const sql = `INSERT INTO cartas (scryfall_id, nombre, mana_value, mana_cost, ataque, vida, descripcion, expansion_id, numero_carta, foil) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (scryfall_id) DO UPDATE SET scryfall_id = EXCLUDED.scryfall_id
                RETURNING id               
                `

    const resultado = await pool.query(sql, [carta.scryfallId, carta.nombre, carta.manaValue, carta.manaCost, carta.ataque, carta.vida, carta.descripcion, carta.expansionId, carta.numeroCarta, carta.foil])

    return resultado.rows[0].id;

}

const obtenerColores = async () => {
    const sql = `SELECT id, nombre FROM colores`;

    const resultado = await pool.query(sql);

    return resultado.rows;
}

const insertarColoresCarta = async (cartaId: number, coloresCarta: string[]) => {
    const colores = await obtenerColores();

    const mapaColores = colores.reduce((acumulador, colorFila) => {
        acumulador[colorFila.nombre] = colorFila.id;
        return acumulador;
    }, {} as Record<string, number>);

    for (const nombreColor of coloresCarta) {
        const colorId = mapaColores[nombreColor];
        const sql = `INSERT INTO carta_colores (carta_id, color_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`;
        await pool.query(sql, [cartaId, colorId])
    }
}

const obtenerTipos = async () => {
    const sql = `SELECT * from tipos_carta`;

    const resultado = await pool.query(sql);

    return resultado.rows;
}

const obtenerSubtipos = async () => {
    const sql = `SELECT * from subtipos_carta`;

    const resultado = await pool.query(sql);

    return resultado.rows;
}

const insertarTiposDeCarta = async (cartaId: number, tiposCarta: string[]) => {
    const tipos = await obtenerTipos();
    const subtipos = await obtenerSubtipos();

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
            await pool.query(
                `INSERT INTO carta_tipos (carta_id, tipo_carta_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [cartaId, tipoId]
            );
        } else if (palabra in mapaSubtipos) {
            const subtipoId = mapaSubtipos[palabra];
            await pool.query(
                `INSERT INTO carta_subtipos (carta_id, subtipo_carta_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [cartaId, subtipoId]
            );
        }
    }

}

const agregarCartaAInventario = async (cartaId: number, userId: string) => {
    const sql = `INSERT INTO inventario (carta_id, usuario_id) VALUES ($1, $2) 
                 ON CONFLICT (usuario_id, carta_id) DO UPDATE SET cantidad_poseida = inventario.cantidad_poseida + 1
                 RETURNING cantidad_poseida`;

    const resultado = await pool.query(sql, [cartaId, userId]);

    return resultado.rows[0].cantidad_poseida;
}

export const guardarCartaEnInventario = async (carta: {
    scryfallId: string;
    nombre: string;
    manaValue: number | null;
    manaCost: string | null;
    ataque: number | null;
    vida: number | null;
    descripcion: string | null;
    expansionId: number | null;
    numeroCarta: string | null;
    foil: boolean;
    colores: string[];
    tipos: string[]
}, userId: string) => {
    const cartaId = await insertarOAsignarCarta(carta);
    await insertarColoresCarta(cartaId, carta.colores);
    await insertarTiposDeCarta(cartaId, carta.tipos);
    await agregarCartaAInventario(cartaId, userId);

    return cartaId;
}


export const obtenerInventario = async (usuarioId: string, filtros: { nombre?: string | undefined, foil?: boolean | undefined }) => {
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

    const sql = `
        SELECT cartas.*, inventario.cantidad_poseida
        FROM inventario
        INNER JOIN cartas ON inventario.carta_id = cartas.id
        WHERE ${condiciones.join(" AND ")}
        `;

    const resultados = await pool.query(sql, valores);
    return resultados.rows;

}