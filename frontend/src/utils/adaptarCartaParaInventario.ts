export const adaptarCartaParaInventario = (carta: any) => ({
    scryfallId: carta.id,
    nombre: carta.printed_name ?? carta.name,
    manaValue: carta.cmc ?? null,
    manaCost: carta.mana_cost ?? null,
    ataque: carta.power ? Number(carta.power) : null,
    vida: carta.toughness ? Number(carta.toughness) : null,
    descripcion: carta.printed_text ?? carta.oracle_text ?? null,
    expansionId: null,
    numeroCarta: carta.collector_number ?? null,
    foil: carta.finishes?.includes("foil") ?? false,
    imagenUrl: carta.image_uris?.normal ?? null,
    colores: carta.colores_traducidos ?? [],
    tipos: [...(carta.tipos_traducidos ?? []), ...(carta.subtipos_carta ?? [])]
});