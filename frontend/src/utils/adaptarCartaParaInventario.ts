import type { CartaScryfall } from "../types/scryfall";
import type { CartaParaInventario } from "../types/inventario";

/* `esFoil` lo decide el usuario en la UI: `carta.finishes` solo dice qué
   acabados ofrece ESE print (casi siempre incluye "foil"), no cuál es la
   copia física que está guardando. */
export const adaptarCartaParaInventario = (carta: CartaScryfall, esFoil: boolean): CartaParaInventario => ({
    scryfallId: carta.id,
    nombre: carta.printed_name ?? carta.name,
    manaValue: carta.cmc ?? null,
    manaCost: carta.mana_cost ?? null,
    ataque: carta.power ? Number(carta.power) : null,
    vida: carta.toughness ? Number(carta.toughness) : null,
    descripcion: carta.printed_text ?? carta.oracle_text ?? null,
    expansionId: null,
    numeroCarta: carta.collector_number ?? null,
    foil: esFoil,
    imagenUrl: carta.image_uris?.normal ?? null,
    rareza: carta.rarity ?? null,
    colores: carta.colores_traducidos ?? [],
    tipos: [...(carta.tipos_traducidos ?? []), ...(carta.subtipos_carta ?? [])]
});