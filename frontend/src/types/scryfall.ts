export interface CartaScryfall {
    id: string;
    name: string;
    printed_name?: string;
    set: string;
    set_name: string;
    collector_number: string;
    mana_cost?: string;
    cmc?: number;
    power?: string;
    toughness?: string;
    oracle_text?: string;
    printed_text?: string;
    type_line?: string;
    printed_type_line?: string;
    colors?: string[];
    finishes?: string[];
    rarity?: string;
    artist?: string;
    image_uris?: {
        small?: string;
        normal?: string;
        large?: string;
    };
    prices?: {
        eur?: string;
        eur_foil?: string;
    };
    /* Estos tres los añade nuestro backend en obtenerPorId, no vienen de Scryfall */
    tipos_traducidos?: string[];
    subtipos_carta?: string[];
    colores_traducidos?: string[];
}

export interface ListaScryfall {
    object: string;
    total_cards: number;
    data: CartaScryfall[];
}

export interface ExpansionScryfall {
    code: string;
    name: string;
    released_at: string | null;
    set_type: string;
    icon_svg_uri: string | null;
}
