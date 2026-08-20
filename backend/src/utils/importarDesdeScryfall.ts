import { translator } from "./translator";
import { CartaScryfallBruta } from "../types/scryfall";
import { CartaParaInventario } from "../types/inventario";

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

export const construirCartaParaInventario = (carta: CartaScryfallBruta): CartaParaInventario => {
    const tipoParte = carta.type_line.split("—")[0] ?? "";
    const tiposTraducidos = tipoParte.trim().split(" ").map((t) => translator("tipos", t));

    let subtipos: string[] = [];
    if (carta.type_line.includes("—")) {
        subtipos = carta.type_line.split("—")[1]!.trim().split(" ");
    }

    const coloresTraducidos = (carta.colors || []).map((c) => translator("colores", c));

    return {
        scryfallId: carta.id,
        nombre: carta.printed_name ?? carta.name,
        manaValue: carta.cmc ?? null,
        manaCost: carta.mana_cost ?? null,
        ataque: carta.power ? Number(carta.power) : null,
        vida: carta.toughness ? Number(carta.toughness) : null,
        descripcion: carta.printed_text ?? carta.oracle_text ?? null,
        expansionId: null,
        numeroCarta: carta.collector_number ?? null,
        foil: false,
        imagenUrl: carta.image_uris?.normal ?? null,
        rareza: carta.rarity ?? null,
        colores: coloresTraducidos,
        tipos: [...tiposTraducidos, ...subtipos]
    };
};
