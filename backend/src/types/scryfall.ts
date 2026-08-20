/* Lo que Scryfall devuelve por cada set en GET /sets (solo los campos que usamos) */
export interface SetBrutoScryfall {
    code: string;
    name: string;
    released_at?: string;
    set_type: string;
    icon_svg_uri?: string;
}

/* Lo que exponemos nosotros en /api/cartas/expansiones */
export interface ExpansionScryfall {
    code: string;
    name: string;
    released_at: string | null;
    set_type: string;
    icon_svg_uri: string | null;
}

/* Carta bruta de Scryfall (solo los campos que usamos al importar/adaptar) */
export interface CartaScryfallBruta {
    id: string;
    name: string;
    printed_name?: string;
    set: string;
    collector_number: string;
    lang: string;
    type_line: string;
    colors?: string[];
    cmc?: number;
    mana_cost?: string;
    power?: string;
    toughness?: string;
    oracle_text?: string;
    printed_text?: string;
    rarity?: string;
    image_uris?: { normal?: string };
}
