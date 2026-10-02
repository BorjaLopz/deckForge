import { CartaScryfallBruta } from "../types/scryfall";

const cabeceras = {
    "User-Agent": "deckForge/1.0",
    "Accept": "application/json"
};

const buscarCartaPorNombreFuzzy = async (nombre: string): Promise<CartaScryfallBruta> => {
    const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(nombre)}`, {
        method: "GET",
        headers: cabeceras
    });
    const data = await res.json();

    if (data.object === "error") {
        throw new Error(data.details || "No se encontró la carta");
    }

    return data;
};

const buscarPrintEnEspanol = async (set: string, numeroColeccion: string): Promise<CartaScryfallBruta | null> => {
    const q = `set:${set} cn:${numeroColeccion} lang:es`;
    const res = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&unique=prints`, {
        method: "GET",
        headers: cabeceras
    });
    const data = await res.json();

    if (data.object === "list" && Array.isArray(data.data) && data.data.length > 0) {
        return data.data[0];
    }

    return null;
};

/* fuzzy busca por nombre (tolera erratas leves) pero devuelve el print en
   inglés salvo que el propio texto buscado ya esté en español. Buscamos el
   hermano en español del mismo set+número si existe, igual que en la
   deduplicación de /api/cartas/buscar. */
export const resolverCartaPreferentementeEnEspanol = async (nombre: string): Promise<CartaScryfallBruta> => {
    const original = await buscarCartaPorNombreFuzzy(nombre);
    if (original.lang === "es") return original;

    const hermanoEs = await buscarPrintEnEspanol(original.set, original.collector_number);
    return hermanoEs ?? original;
};

const TAMANO_LOTE_COLLECTION = 75; // máximo que acepta /cards/collection
const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* Muchas cartas por id en pocas peticiones (75 por lote) en vez de una por
   carta: para ~300 recomendaciones son 4 llamadas, no 300. */
export const obtenerCartasPorIds = async (ids: string[]): Promise<CartaScryfallBruta[]> => {
    const cartas: CartaScryfallBruta[] = [];

    for (let i = 0; i < ids.length; i += TAMANO_LOTE_COLLECTION) {
        if (i > 0) await esperar(100); // rate limit de Scryfall
        const lote = ids.slice(i, i + TAMANO_LOTE_COLLECTION);
        const res = await fetch("https://api.scryfall.com/cards/collection", {
            method: "POST",
            headers: { ...cabeceras, "Content-Type": "application/json" },
            body: JSON.stringify({ identifiers: lote.map((id) => ({ id })) })
        });

        if (!res.ok) throw new Error("Error pidiendo cartas a Scryfall");

        const data = await res.json();
        cartas.push(...data.data);
    }

    return cartas;
};

/* Plan B cuando el fuzzy no encuentra un nombre en español mal escrito
   ("rey del valle" vs "rey de Valle"): busca comandantes impresos en
   español que contengan esas palabras, sin exigir el nombre exacto. */
export const buscarComandantesEnEspanol = async (palabras: string[]): Promise<CartaScryfallBruta[]> => {
    const q = `is:commander lang:es ${palabras.join(" ")}`;
    const res = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}`, {
        method: "GET",
        headers: cabeceras
    });
    const data = await res.json();

    return data.object === "list" && Array.isArray(data.data) ? data.data : [];
};

/* Fuzzy sin preferencia de idioma: devuelve el nombre canónico en inglés,
   que es lo que necesitan servicios externos como EDHREC. Acepta también
   el nombre en español. */
export const resolverCartaEnIngles = buscarCartaPorNombreFuzzy;

const obtenerCartaExacta = async (set: string, numero: string, lang?: string): Promise<CartaScryfallBruta | null> => {
    const url = lang
        ? `https://api.scryfall.com/cards/${set}/${numero}/${lang}`
        : `https://api.scryfall.com/cards/${set}/${numero}`;

    const res = await fetch(url, { method: "GET", headers: cabeceras });
    if (!res.ok) return null;

    return res.json();
};

/* Lookup exacto por set+número (sin ambigüedad, a diferencia del fuzzy):
   prueba directamente la impresión en español y si no existe cae a inglés. */
export const obtenerCartaExactaPreferentementeEnEspanol = async (
    set: string,
    numero: string
): Promise<CartaScryfallBruta | null> => {
    const enEspanol = await obtenerCartaExacta(set, numero, "es");
    if (enEspanol) return enEspanol;

    return obtenerCartaExacta(set, numero);
};
