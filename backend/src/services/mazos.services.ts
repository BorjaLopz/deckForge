import { PoolClient } from "pg";
import { pool, ejecutarEnTransaccion } from "../db/pool";
import { CartaParaInventario } from "../types/inventario";
import { esTierraBasica, Formato, FORMATOS, puedeSerComandante } from "../utils/formatos";
import { resolverOCrearCarta, resolverOCrearCartasEnLote } from "./inventario.services";
import { construirCartaParaInventario } from "../utils/importarDesdeScryfall";
import { obtenerCartasPorIds, resolverCartaPreferentementeEnEspanol } from "../utils/scryfallCliente";

export const crearMazo = async (usuarioId: string, nombre: string, comandanteCartaId: number | null, formato: Formato) => {
    const sql = `INSERT INTO mazos (nombre, comandante_id, usuario_id, formato) VALUES ($1, $2, $3, $4) RETURNING id`;
    const resultado = await pool.query(sql, [nombre, comandanteCartaId, usuarioId, formato]);
    return resultado.rows[0].id;
};

/* Lanza si añadir `incremento` copias de esa carta rompe el límite del
   formato (1 en Commander, 4 en el resto). Se cuenta por oracle_id: dos
   impresiones distintas de la misma carta suman juntas. Las tierras
   básicas no tienen límite. */
const comprobarLimiteCopias = async (mazoId: number, cartaId: number, incremento: number) => {
    const { rows } = await pool.query(
        `SELECT m.formato, c.type_line, c.nombre,
                COALESCE((
                    SELECT SUM(mc.cantidad)
                    FROM mazo_cartas mc
                    INNER JOIN cartas c2 ON c2.id = mc.carta_id
                    WHERE mc.mazo_id = m.id
                      AND (c2.id = c.id OR (c.oracle_id IS NOT NULL AND c2.oracle_id = c.oracle_id))
                ), 0)::int AS actuales
         FROM mazos m, cartas c
         WHERE m.id = $1 AND c.id = $2`,
        [mazoId, cartaId]
    );
    const fila = rows[0];
    if (!fila || esTierraBasica(fila.type_line)) return;

    const reglas = FORMATOS[fila.formato as Formato];
    if (fila.actuales + incremento > reglas.maxCopias) {
        throw new Error(
            reglas.maxCopias === 1
                ? `En ${reglas.etiqueta} solo puede haber 1 copia de "${fila.nombre}" (salvo tierras básicas)`
                : `En ${reglas.etiqueta} el máximo son ${reglas.maxCopias} copias de "${fila.nombre}" (salvo tierras básicas)`
        );
    }
};

export const listarMazos = async (usuarioId: string) => {
    const sql = `
        SELECT mazos.*, COUNT(mazo_cartas.id)::int AS total_cartas, COALESCE(SUM(mazo_cartas.cantidad), 0)::int AS total_copias
        FROM mazos
        LEFT JOIN mazo_cartas ON mazo_cartas.mazo_id = mazos.id
        WHERE mazos.usuario_id = $1
        GROUP BY mazos.id
        ORDER BY mazos.nombre ASC
    `;
    const resultado = await pool.query(sql, [usuarioId]);
    return resultado.rows;
};

export const obtenerMazo = async (usuarioId: string, mazoId: number) => {
    const mazoResultado = await pool.query(
        `SELECT * FROM mazos WHERE id = $1 AND usuario_id = $2`,
        [mazoId, usuarioId]
    );

    if (mazoResultado.rows.length === 0) return null;

    /* Cruce con tu inventario por oracle_id (no por impresión): si tienes la
       carta en español y el mazo apunta a la inglesa, cuenta igual. Se
       suman todas tus impresiones de esa carta. Derivado en caliente: si
       luego la compras, el mazo lo refleja solo. */
    const cartasResultado = await pool.query(
        `WITH poseidas AS (
             SELECT c.oracle_id, SUM(i.cantidad_poseida)::int AS cantidad
             FROM inventario i
             INNER JOIN cartas c ON c.id = i.carta_id
             WHERE i.usuario_id = $2 AND c.oracle_id IS NOT NULL
             GROUP BY c.oracle_id
         )
         SELECT cartas.*, mazo_cartas.cantidad,
                COALESCE(poseidas.cantidad, 0) AS cantidad_en_inventario,
                GREATEST(mazo_cartas.cantidad - COALESCE(poseidas.cantidad, 0), 0) AS cantidad_faltante
         FROM mazo_cartas
         INNER JOIN cartas ON cartas.id = mazo_cartas.carta_id
         LEFT JOIN poseidas ON poseidas.oracle_id = cartas.oracle_id
         WHERE mazo_cartas.mazo_id = $1
         ORDER BY cartas.nombre ASC`,
        [mazoId, usuarioId]
    );

    return { ...mazoResultado.rows[0], cartas: cartasResultado.rows };
};

export const eliminarMazo = async (usuarioId: string, mazoId: number): Promise<boolean> => {
    const resultado = await pool.query(
        `DELETE FROM mazos WHERE id = $1 AND usuario_id = $2`,
        [mazoId, usuarioId]
    );
    return (resultado.rowCount ?? 0) > 0;
};

const esMazoDelUsuario = async (usuarioId: string, mazoId: number): Promise<boolean> => {
    const resultado = await pool.query(
        `SELECT 1 FROM mazos WHERE id = $1 AND usuario_id = $2`,
        [mazoId, usuarioId]
    );
    return resultado.rows.length > 0;
};

const upsertCartaEnMazo = async (mazoId: number, cartaId: number, cantidad: number): Promise<number> => {
    const sql = `
        INSERT INTO mazo_cartas (mazo_id, carta_id, cantidad) VALUES ($1, $2, $3)
        ON CONFLICT (mazo_id, carta_id) DO UPDATE SET cantidad = mazo_cartas.cantidad + $3
        RETURNING cantidad
    `;
    const resultado = await pool.query(sql, [mazoId, cartaId, cantidad]);
    return resultado.rows[0].cantidad;
};

/* Ya no exigimos que la carta esté en el inventario: un mazo puede tener
   cartas que ya posees y cartas que te faltan (se distinguen en obtenerMazo
   vía el LEFT JOIN con inventario). */
export const agregarCartaAMazo = async (
    usuarioId: string,
    mazoId: number,
    cartaId: number,
    cantidad: number
): Promise<number> => {
    if (!(await esMazoDelUsuario(usuarioId, mazoId))) {
        throw new Error("Ese mazo no existe o no es tuyo");
    }

    await comprobarLimiteCopias(mazoId, cartaId, cantidad);
    return upsertCartaEnMazo(mazoId, cartaId, cantidad);
};

/* Para añadir al mazo una carta que no tienes en inventario ni en el
   catálogo todavía: la resolvemos en Scryfall (mismo criterio que el import
   masivo, preferentemente en español) y creamos la fila en `cartas` sin
   tocar `inventario` — así queda marcada como "te falta". */
export const agregarCartaPorNombreAMazo = async (
    usuarioId: string,
    mazoId: number,
    nombre: string,
    cantidad: number
): Promise<number> => {
    if (!(await esMazoDelUsuario(usuarioId, mazoId))) {
        throw new Error("Ese mazo no existe o no es tuyo");
    }

    const cartaBruta = await resolverCartaPreferentementeEnEspanol(nombre);
    const cartaParaInventario = construirCartaParaInventario(cartaBruta);
    const cartaId = await resolverOCrearCarta(cartaParaInventario);

    await comprobarLimiteCopias(mazoId, cartaId, cantidad);
    return upsertCartaEnMazo(mazoId, cartaId, cantidad);
};

/* Crea un mazo a partir de recomendaciones (ids de Scryfall). El comandante
   va en mazos.comandante_id y también en mazo_cartas, para que cuente en
   "te faltan" y salga en la exportación si no lo tienes.
   Las llamadas a Scryfall van ANTES de abrir la transacción (no conviene
   tener una conexión de BD bloqueada esperando a la red); después catálogo +
   mazo + cartas van juntos — o todo o nada. */
export const crearMazoDesdeComandante = async (
    usuarioId: string,
    nombre: string,
    comandanteScryfallId: string,
    scryfallIds: string[]
): Promise<number> => {
    const cartas = await cartasDeScryfall(comandanteScryfallId, scryfallIds);

    return ejecutarEnTransaccion(async (client) => {
        const { rows } = await client.query(
            `INSERT INTO mazos (nombre, usuario_id, formato) VALUES ($1, $2, 'commander') RETURNING id`,
            [nombre, usuarioId]
        );
        const mazoId: number = rows[0].id;

        await poblarMazoDesdeComandante(client, mazoId, comandanteScryfallId, cartas);
        return mazoId;
    });
};

/* Igual que crear, pero sobre un mazo que ya tienes (ej. empezaste a mano
   metiendo al comandante y quieres rellenar con recomendaciones). */
export const completarMazoDesdeComandante = async (
    usuarioId: string,
    mazoId: number,
    comandanteScryfallId: string,
    scryfallIds: string[]
): Promise<void> => {
    const { rows } = await pool.query(`SELECT formato FROM mazos WHERE id = $1 AND usuario_id = $2`, [mazoId, usuarioId]);
    if (rows.length === 0) {
        throw new Error("Ese mazo no existe o no es tuyo");
    }
    if (!FORMATOS[rows[0].formato as Formato].usaComandante) {
        throw new Error("Solo los mazos Commander se completan desde un comandante");
    }

    const cartas = await cartasDeScryfall(comandanteScryfallId, scryfallIds);

    await ejecutarEnTransaccion((client) => poblarMazoDesdeComandante(client, mazoId, comandanteScryfallId, cartas));
};

const cartasDeScryfall = async (comandanteScryfallId: string, scryfallIds: string[]) => {
    const idsUnicos = [...new Set([comandanteScryfallId, ...scryfallIds])];
    return (await obtenerCartasPorIds(idsUnicos)).map(construirCartaParaInventario);
};

/* Mete en el mazo las cartas que aún no tiene y fija el comandante.
   "Ya la tiene" se decide por oracle_id, no por impresión: si el mazo ya
   lleva "Bardo, rey de Valle" (ES), no se añade "Bard, King of Dale" (EN)
   como segunda fila — y si esa carta es el comandante, se reutiliza su fila. */
const poblarMazoDesdeComandante = async (
    client: PoolClient,
    mazoId: number,
    comandanteScryfallId: string,
    cartas: CartaParaInventario[]
) => {
    const { rows: existentes } = await client.query(
        `SELECT cartas.id, cartas.oracle_id
         FROM mazo_cartas INNER JOIN cartas ON cartas.id = mazo_cartas.carta_id
         WHERE mazo_cartas.mazo_id = $1 AND cartas.oracle_id IS NOT NULL`,
        [mazoId]
    );
    const cartaIdEnMazoPorOracle = new Map<string, number>(existentes.map((r) => [r.oracle_id, r.id]));

    const comandante = cartas.find((c) => c.scryfallId === comandanteScryfallId);
    if (!comandante) throw new Error("No se pudo resolver el comandante en Scryfall");

    const nuevas = cartas.filter((c) => !c.oracleId || !cartaIdEnMazoPorOracle.has(c.oracleId));
    const cartaIdPorScryfall = await resolverOCrearCartasEnLote(client, nuevas);

    const comandanteCartaId = (comandante.oracleId && cartaIdEnMazoPorOracle.get(comandante.oracleId))
        || cartaIdPorScryfall.get(comandanteScryfallId)!;

    await client.query(`UPDATE mazos SET comandante_id = $1 WHERE id = $2`, [comandanteCartaId, mazoId]);

    await client.query(
        `INSERT INTO mazo_cartas (mazo_id, carta_id, cantidad)
         SELECT $1, carta_id, 1 FROM unnest($2::int[]) AS carta_id
         ON CONFLICT (mazo_id, carta_id) DO NOTHING`,
        [mazoId, [...cartaIdPorScryfall.values()]]
    );
};

export const ajustarCantidadEnMazo = async (
    usuarioId: string,
    mazoId: number,
    cartaId: number,
    delta: number
) => {
    if (!(await esMazoDelUsuario(usuarioId, mazoId))) {
        throw new Error("Ese mazo no existe o no es tuyo");
    }

    if (delta > 0) await comprobarLimiteCopias(mazoId, cartaId, delta);

    const sql = `
        UPDATE mazo_cartas
        SET cantidad = GREATEST(cantidad + $1, 0)
        WHERE mazo_id = $2 AND carta_id = $3
        RETURNING cantidad
    `;
    const resultado = await pool.query(sql, [delta, mazoId, cartaId]);

    if (resultado.rows.length === 0) {
        throw new Error("Esa carta no está en el mazo");
    }

    return resultado.rows[0];
};

export const eliminarCartaDeMazo = async (usuarioId: string, mazoId: number, cartaId: number) => {
    if (!(await esMazoDelUsuario(usuarioId, mazoId))) {
        throw new Error("Ese mazo no existe o no es tuyo");
    }

    /* Si quitas del mazo la carta que era el comandante, el mazo se queda
       sin comandante (si no, comandante_id apuntaría a una carta que ya no
       está en el mazo). Las dos cosas juntas, o ninguna. */
    await ejecutarEnTransaccion(async (client) => {
        await client.query(`DELETE FROM mazo_cartas WHERE mazo_id = $1 AND carta_id = $2`, [mazoId, cartaId]);
        await client.query(`UPDATE mazos SET comandante_id = NULL WHERE id = $1 AND comandante_id = $2`, [mazoId, cartaId]);
    });
};

/* Elegir (o quitar, con cartaId null) el comandante de un mazo Commander.
   Tiene que ser una carta que ya esté en el mazo y que pueda ser comandante. */
export const fijarComandante = async (usuarioId: string, mazoId: number, cartaId: number | null) => {
    const { rows } = await pool.query(`SELECT formato FROM mazos WHERE id = $1 AND usuario_id = $2`, [mazoId, usuarioId]);
    if (rows.length === 0) {
        throw new Error("Ese mazo no existe o no es tuyo");
    }
    if (!FORMATOS[rows[0].formato as Formato].usaComandante) {
        throw new Error("Solo los mazos Commander tienen comandante");
    }

    if (cartaId !== null) {
        const { rows: cartas } = await pool.query(
            `SELECT cartas.nombre, cartas.type_line, cartas.descripcion
             FROM mazo_cartas INNER JOIN cartas ON cartas.id = mazo_cartas.carta_id
             WHERE mazo_cartas.mazo_id = $1 AND mazo_cartas.carta_id = $2`,
            [mazoId, cartaId]
        );
        const carta = cartas[0];
        if (!carta) {
            throw new Error("Esa carta no está en el mazo");
        }
        if (!puedeSerComandante(carta.type_line, carta.descripcion)) {
            throw new Error(`"${carta.nombre}" no puede ser comandante: tiene que ser una criatura legendaria`);
        }
    }

    await pool.query(`UPDATE mazos SET comandante_id = $1 WHERE id = $2`, [cartaId, mazoId]);
};
