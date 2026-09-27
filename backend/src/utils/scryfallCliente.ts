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
