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
