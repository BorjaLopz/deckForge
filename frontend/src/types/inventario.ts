/* Carta tal como la devuelve GET /api/inventario (fila de nuestra BD) */
export interface CartaInventario {
    id: number;
    scryfall_id: string;
    nombre: string;
    mana_value: number | null;
    mana_cost: string | null;
    ataque: number | null;
    vida: number | null;
    descripcion: string | null;
    expansion_id: number | null;
    numero_carta: string | null;
    foil: boolean;
    imagen_url: string | null;
    rareza: string | null;
    cantidad_poseida: number;
}

/* Respuesta de POST /api/inventario/importar */
export interface ResultadoImportacion {
    importadas: { linea: string; nombre: string; cantidad: number }[];
    fallidas: { linea: string; motivo: string }[];
}

/* Carta tal como la mandamos en POST /api/inventario (ver adaptarCartaParaInventario) */
export interface CartaParaInventario {
    scryfallId: string;
    nombre: string;
    manaValue: number | null;
    manaCost: string | null;
    ataque: number | null;
    vida: number | null;
    descripcion: string | null;
    expansionId: number | null;
    numeroCarta: string | null;
    foil: boolean;
    imagenUrl: string | null;
    rareza: string | null;
    colores: string[];
    tipos: string[];
}
