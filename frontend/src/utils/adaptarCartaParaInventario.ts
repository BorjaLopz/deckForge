import type { CartaScryfall } from "../types/scryfall";
import type { CartaParaInventario } from "../types/inventario";

/* Fuerza/resistencia pueden ser "*", "1+*"... y el coste 0.5 (cartas Un-):
   la BD guarda enteros, así que lo no numérico va como null en vez de NaN. */
const aEnteroONull = (valor: string | number | undefined): number | null => {
    const numero = Number(valor);
    return valor !== undefined && valor !== "" && Number.isFinite(numero) ? Math.round(numero) : null;
};

/* `esFoil` lo decide el usuario en la UI: `carta.finishes` solo dice qué
   acabados ofrece ESE print (casi siempre incluye "foil"), no cuál es la
   copia física que está guardando. */
export const adaptarCartaParaInventario = (carta: CartaScryfall, esFoil: boolean): CartaParaInventario => ({
    scryfallId: carta.id,
    oracleId: carta.oracle_id ?? null,
    typeLine: carta.type_line ?? null,
    nombre: carta.printed_name ?? carta.name,
    manaValue: aEnteroONull(carta.cmc),
    manaCost: carta.mana_cost ?? null,
    ataque: aEnteroONull(carta.power),
    vida: aEnteroONull(carta.toughness),
    descripcion: carta.printed_text ?? carta.oracle_text ?? null,
    expansionId: null,
    numeroCarta: carta.collector_number ?? null,
    foil: esFoil,
    imagenUrl: carta.image_uris?.normal ?? null,
    rareza: carta.rarity ?? null,
    colores: carta.colores_traducidos ?? [],
    tipos: [...(carta.tipos_traducidos ?? []), ...(carta.subtipos_carta ?? [])]
});