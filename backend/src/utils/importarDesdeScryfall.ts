import { translator } from "./translator";
import { CartaScryfallBruta } from "../types/scryfall";
import { CartaParaInventario } from "../types/inventario";

/* Fuerza/resistencia pueden ser "*", "1+*", "X"... — no caben en una columna
   entera, así que se guardan como null en vez de reventar con NaN. */
const aEnteroONull = (valor: string | number | undefined): number | null => {
    const numero = Number(valor);
    return valor !== undefined && valor !== "" && Number.isFinite(numero) ? Math.round(numero) : null;
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
        oracleId: carta.oracle_id ?? null,
        typeLine: carta.type_line ?? null,
        nombre: carta.printed_name ?? carta.name,
        manaValue: aEnteroONull(carta.cmc), // las cartas Un- tienen coste 0.5
        manaCost: carta.mana_cost ?? null,
        ataque: aEnteroONull(carta.power),
        vida: aEnteroONull(carta.toughness),
        descripcion: carta.printed_text ?? carta.oracle_text ?? null,
        expansionId: null,
        numeroCarta: carta.collector_number ?? null,
        foil: false,
        // cartas de dos caras no traen image_uris arriba, sino en cada cara
        imagenUrl: carta.image_uris?.normal ?? carta.card_faces?.[0]?.image_uris?.normal ?? null,
        rareza: carta.rarity ?? null,
        colores: coloresTraducidos,
        tipos: [...tiposTraducidos, ...subtipos]
    };
};
