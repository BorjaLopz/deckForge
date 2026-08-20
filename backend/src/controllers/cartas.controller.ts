import { Request, Response } from "express";
import { buildError, buildResponse } from "../utils/response";
import { translator } from "../utils/translator";
import { ExpansionScryfall, SetBrutoScryfall } from "../types/scryfall";

/* Los sets de Scryfall no cambian cada minuto: cacheamos en memoria un día
   entero en vez de pegarle a su API en cada carga del selector. */
let expansionesCache: ExpansionScryfall[] | null = null;
let expansionesCacheTimestamp = 0;
const EXPANSIONES_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/* Traduce nuestras etiquetas en español a los operadores que Scryfall
   realmente entiende. Whitelist: cualquier valor que no esté aquí se ignora
   en vez de colarse tal cual en la query. */
const MAPA_COLORES: Record<string, string> = {
    Blanco: "w", Azul: "u", Negro: "b", Rojo: "r", Verde: "g", Incoloro: "c"
};

const MAPA_TIPOS: Record<string, string> = {
    Criatura: "creature", Artefacto: "artifact", Encantamiento: "enchantment",
    "Instantáneo": "instant", Conjuro: "sorcery", Tierra: "land",
    Planeswalker: "planeswalker", Battle: "battle"
};

const parseNumeroQuery = (valor: unknown): number | undefined => {
    if (valor === undefined) return undefined;
    const numero = Number(valor);
    return isNaN(numero) ? undefined : numero;
};

export const buscar = async (req: Request, res: Response) => {
    try {

        const { nombre, set, colores, tipo, cmcMin, cmcMax, ataqueMin, ataqueMax, vidaMin, vidaMax } = req.query;

        const partesQuery: (string | null)[] = [nombre ? String(nombre) : null];

        if (set) partesQuery.push(`set:${set}`);

        if (colores) {
            const codigosColores = String(colores)
                .split(",")
                .map((c) => MAPA_COLORES[c])
                .filter(Boolean);

            if (codigosColores.length > 0) {
                partesQuery.push(`(${codigosColores.map((c) => `c:${c}`).join(" or ")})`);
            }
        }

        if (tipo && MAPA_TIPOS[String(tipo)]) {
            partesQuery.push(`t:${MAPA_TIPOS[String(tipo)]}`);
        }

        const cmcMinNum = parseNumeroQuery(cmcMin);
        const cmcMaxNum = parseNumeroQuery(cmcMax);
        const ataqueMinNum = parseNumeroQuery(ataqueMin);
        const ataqueMaxNum = parseNumeroQuery(ataqueMax);
        const vidaMinNum = parseNumeroQuery(vidaMin);
        const vidaMaxNum = parseNumeroQuery(vidaMax);

        if (cmcMinNum !== undefined) partesQuery.push(`cmc>=${cmcMinNum}`);
        if (cmcMaxNum !== undefined) partesQuery.push(`cmc<=${cmcMaxNum}`);
        if (ataqueMinNum !== undefined) partesQuery.push(`pow>=${ataqueMinNum}`);
        if (ataqueMaxNum !== undefined) partesQuery.push(`pow<=${ataqueMaxNum}`);
        if (vidaMinNum !== undefined) partesQuery.push(`tou>=${vidaMinNum}`);
        if (vidaMaxNum !== undefined) partesQuery.push(`tou<=${vidaMaxNum}`);

        partesQuery.push("(lang:en or lang:es)");

        const partesQueryFinal = partesQuery.filter(Boolean).join(" ");

        const dataBruto = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(partesQueryFinal)}&unique=prints`, {
            method: "GET",
            headers: {
                "User-Agent": "deckForge/1.0",
                "Accept": "application/json"
            }
        })

        if (!dataBruto.ok) {
            const errorData = await dataBruto.json();

            /* Scryfall devuelve 404 + code "not_found" cuando la búsqueda es
               válida pero no hay ninguna carta que la cumpla: no es un fallo
               nuestro, es una respuesta vacía legítima. */
            if (errorData.code === "not_found") {
                return buildResponse(res, { object: "list", total_cards: 0, data: [] });
            }

            throw new Error(errorData.details || "Error desconocido de Scryfall");
        }

        const data = await dataBruto.json();

        /* (lang:en or lang:es) hace que la misma carta salga como dos objetos
           de Scryfall distintos (uno por idioma) cuando el set tiene ambas
           impresiones. Son el mismo print físico a efectos de la UI, así que
           nos quedamos con uno por (set, número de colección) — priorizando
           español, porque esa versión trae printed_name/printed_text/
           printed_type_line ya traducidos y el frontend los usa para mostrar
           la carta en español cuando existen. */
        if (data.object === "list" && Array.isArray(data.data)) {
            const vistos = new Map<string, number>(); // clave -> índice en el resultado final
            const cartasSinDuplicar: typeof data.data = [];

            for (const carta of data.data) {
                const clave = `${carta.set}-${carta.collector_number}`;
                const indiceExistente = vistos.get(clave);

                if (indiceExistente === undefined) {
                    vistos.set(clave, cartasSinDuplicar.length);
                    cartasSinDuplicar.push(carta);
                } else if (carta.lang === "es") {
                    cartasSinDuplicar[indiceExistente] = carta;
                }
            }

            data.data = cartasSinDuplicar;
        }

        buildResponse(res, data);

    } catch (error) {
        console.error("Error conectando a scryfall ", error);
        buildError(res, "No se pudo conectar con la api de scryfall", "SCRYFALL_FETCH_ERROR", 500)
    }
}

export const obtenerPorId = async (req: Request, res: Response) => {
    try {
        const { scryfallId } = req.params;

        const dataBruto = await fetch(`https://api.scryfall.com/cards/${scryfallId}`, {
            method: "GET",
            headers: {
                "User-Agent": "deckForge/1.0",
                "Accept": "application/json"
            }
        });

        if (!dataBruto.ok) {
            const errorData = await dataBruto.json();
            throw new Error(errorData.details || "Error desconocido de Scryfall");
        }

        const data = await dataBruto.json();

        const tipoParte = data.type_line.split("—")[0];
        const tiposTraducidos = tipoParte.trim().split(" ").map((t: string) => translator("tipos", t));

        let subtipos: string[] = [];
        if (data.type_line.includes("—")) {
            subtipos = data.type_line.split("—")[1].trim().split(" ");
        }

        const coloresTraducidos = (data.colors || []).map((c: string) => translator("colores", c));

        buildResponse(res, {
            ...data,
            tipos_traducidos: tiposTraducidos,
            subtipos_carta: subtipos,
            colores_traducidos: coloresTraducidos
        });
    } catch (error) {
        console.error("Error obteniendo la carta: ", error);
        buildError(res, "No se pudo obtener la carta", "SCRYFALL_FETCH_ERROR", 500);
    }
};

export const listarExpansiones = async (req: Request, res: Response) => {
    try {
        const ahora = Date.now();

        if (!expansionesCache || ahora - expansionesCacheTimestamp > EXPANSIONES_CACHE_TTL_MS) {
            const dataBruto = await fetch("https://api.scryfall.com/sets", {
                method: "GET",
                headers: {
                    "User-Agent": "deckForge/1.0",
                    "Accept": "application/json"
                }
            });

            if (!dataBruto.ok) {
                const errorData = await dataBruto.json();
                throw new Error(errorData.details || "Error desconocido de Scryfall");
            }

            const data: { data: SetBrutoScryfall[] } = await dataBruto.json();

            expansionesCache = data.data
                .map((set): ExpansionScryfall => ({
                    code: set.code,
                    name: set.name,
                    released_at: set.released_at ?? null,
                    set_type: set.set_type,
                    icon_svg_uri: set.icon_svg_uri ?? null
                }))
                .sort((a, b) => (b.released_at ?? "").localeCompare(a.released_at ?? ""));

            expansionesCacheTimestamp = ahora;
        }

        buildResponse(res, expansionesCache);
    } catch (error) {
        console.error("Error obteniendo las expansiones: ", error);
        buildError(res, "No se pudieron obtener las expansiones", "SCRYFALL_FETCH_ERROR", 500);
    }
};