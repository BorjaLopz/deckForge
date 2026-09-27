import { translator } from "./translator";
import { CartaScryfallBruta } from "../types/scryfall";
import { CartaParaInventario } from "../types/inventario";

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
