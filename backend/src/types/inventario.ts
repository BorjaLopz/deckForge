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
