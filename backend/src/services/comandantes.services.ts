import { pool } from "../db/pool";
import { obtenerMazoMedioEdhrec, obtenerRecomendacionesEdhrec, slugEdhrec } from "../utils/edhrecCliente";
import { esTierraBasica } from "../utils/formatos";
import { buscarComandantesEnEspanol, obtenerCartasPorIds, resolverCartaEnIngles } from "../utils/scryfallCliente";
import { CartaScryfallBruta } from "../types/scryfall";

/* Error "de negocio" (el usuario puede corregirlo) para distinguirlo de un
   fallo de red/BD en el controller y devolver 4xx con mensaje claro. */
export class ErrorComandante extends Error {}

interface DatosScryfallCarta {
    oracleId: string | null;
    imagenUrl: string | null;
    imagenPequena: string | null;
    esBasica: boolean;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cacheScryfall = new Map<string, { timestamp: number; porId: Map<string, DatosScryfallCarta> }>();

const imagenes = (carta: CartaScryfallBruta) => {
    const uris = carta.image_uris ?? carta.card_faces?.[0]?.image_uris;
    return { imagenUrl: uris?.normal ?? null, imagenPequena: uris?.small ?? null };
};

/* EDHREC solo da id + nombre; oracle_id (para cruzar con tu inventario) e
   imagen salen de Scryfall en lote. Se cachea junto con EDHREC. */
const datosScryfallDeRecomendaciones = async (slug: string, ids: string[]) => {
    const enCache = cacheScryfall.get(slug);
    if (enCache && Date.now() - enCache.timestamp < CACHE_TTL_MS) return enCache.porId;

    const cartas = await obtenerCartasPorIds(ids);
    const porId = new Map<string, DatosScryfallCarta>(
        cartas.map((c) => [c.id, { oracleId: c.oracle_id ?? null, ...imagenes(c), esBasica: esTierraBasica(c.type_line) }])
    );

    cacheScryfall.set(slug, { timestamp: Date.now(), porId });
    return porId;
};

/* Cuántas copias tienes de cada oracle_id (sumando impresiones e idiomas) y
   con qué nombre las guardaste — para mostrar "Anillo solar" en vez de
   "Sol Ring" cuando ya la tienes. */
const poseidasPorOracle = async (usuarioId: string, oracleIds: string[]) => {
    const { rows } = await pool.query(
        `SELECT c.oracle_id, SUM(i.cantidad_poseida)::int AS cantidad, MIN(c.nombre) AS nombre
         FROM inventario i
         INNER JOIN cartas c ON c.id = i.carta_id
         WHERE i.usuario_id = $1 AND c.oracle_id = ANY($2::uuid[])
         GROUP BY c.oracle_id`,
        [usuarioId, oracleIds]
    );
    return new Map<string, { cantidad: number; nombre: string }>(
        rows.map((r) => [r.oracle_id, { cantidad: r.cantidad, nombre: r.nombre }])
    );
};

/* Palabras de 4+ letras: descarta "de", "del", "la", "rey"... que son justo
   las que más se escriben distinto de memoria. */
const palabrasSignificativas = (texto: string): string[] => {
    const palabras = texto.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const largas = palabras.filter((p) => p.length >= 4);
    return largas.length > 0 ? largas : palabras;
};

const resolverComandante = async (nombreBuscado: string): Promise<CartaScryfallBruta> => {
    try {
        return await resolverCartaEnIngles(nombreBuscado);
    } catch {
        // el fuzzy de Scryfall tolera erratas en inglés, pero poco en español
    }

    const candidatos = await buscarComandantesEnEspanol(palabrasSignificativas(nombreBuscado));

    if (candidatos.length === 1) return candidatos[0]!;

    if (candidatos.length > 1) {
        const opciones = candidatos.slice(0, 5).map((c) => c.printed_name ?? c.name).join(" · ");
        throw new ErrorComandante(`Hay varios comandantes que encajan, escribe uno: ${opciones}`);
    }

    throw new ErrorComandante(`No encontré ningún comandante llamado "${nombreBuscado}"`);
};

export const obtenerRecomendacionesComandante = async (usuarioId: string, nombreBuscado: string) => {
    const comandante = await resolverComandante(nombreBuscado);

    if (!comandante.type_line.includes("Legendary")) {
        throw new ErrorComandante(`${comandante.name} no es legendaria, no puede ser comandante`);
    }

    const edhrec = await obtenerRecomendacionesEdhrec(comandante.name);
    if (!edhrec) {
        throw new ErrorComandante(`EDHREC no tiene datos de ${comandante.name}`);
    }

    const idsRecomendados = edhrec.categorias.flatMap((cat) => cat.cartas.map((c) => c.scryfallId));
    const [datosScryfall, mazoMedio] = await Promise.all([
        datosScryfallDeRecomendaciones(slugEdhrec(comandante.name), idsRecomendados),
        obtenerMazoMedioEdhrec(comandante.name)
    ]);

    const oracleIds = [
        comandante.oracle_id,
        ...[...datosScryfall.values()].map((d) => d.oracleId)
    ].filter((id): id is string => Boolean(id));
    const poseidas = await poseidasPorOracle(usuarioId, oracleIds);

    const poseidaDe = (oracleId: string | null | undefined) => (oracleId ? poseidas.get(oracleId) : undefined);

    return {
        comandante: {
            scryfallId: comandante.id,
            oracleId: comandante.oracle_id ?? null,
            nombre: poseidaDe(comandante.oracle_id)?.nombre ?? comandante.name,
            nombreIngles: comandante.name,
            imagenUrl: imagenes(comandante).imagenUrl,
            cantidadEnInventario: poseidaDe(comandante.oracle_id)?.cantidad ?? 0
        },
        numMazos: edhrec.numMazos,
        composicionMedia: mazoMedio?.composicion ?? null,
        categorias: edhrec.categorias.map((cat) => ({
            categoria: cat.categoria,
            cartas: cat.cartas.map((c) => {
                const datos = datosScryfall.get(c.scryfallId);
                const poseida = poseidaDe(datos?.oracleId);
                return {
                    scryfallId: c.scryfallId,
                    oracleId: datos?.oracleId ?? null,
                    nombre: poseida?.nombre ?? c.nombreIngles,
                    nombreIngles: c.nombreIngles,
                    imagenUrl: datos?.imagenUrl ?? null,
                    imagenPequena: datos?.imagenPequena ?? null,
                    inclusion: c.inclusion,
                    sinergia: c.sinergia,
                    cantidadEnInventario: poseida?.cantidad ?? 0,
                    /* Solo las básicas pueden ir repetidas en Commander: cogemos
                       cuántas lleva el mazo medio (4 Forest...), si no, 1. */
                    cantidadSugerida: datos?.esBasica ? (mazoMedio?.cantidadPorNombre[c.nombreIngles] ?? 1) : 1
                };
            })
        }))
    };
};
