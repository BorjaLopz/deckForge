import type { Formato } from "../utils/formatos";

/* Mazo tal como lo devuelve GET /api/mazos (fila simple + resumen) */
export interface MazoResumen {
    id: number;
    nombre: string;
    formato: Formato;
    comandante_id: number | null;
    usuario_id: string;
    total_cartas: number;
    total_copias: number;
}

/* Carta dentro de un mazo: mismas columnas que `cartas` + `cantidad` de
   mazo_cartas (ojo, aquí se llama `cantidad`, no `cantidad_poseida` como en
   inventario — son tablas distintas). */
export interface CartaEnMazo {
    id: number;
    scryfall_id: string;
    oracle_id: string | null;
    type_line: string | null;
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
    cantidad: number;
    cantidad_en_inventario: number;
    cantidad_faltante: number;
}

/* GET /api/mazos/:id — el mazo con sus cartas ya resueltas */
export interface MazoDetalle {
    id: number;
    nombre: string;
    formato: Formato;
    comandante_id: number | null;
    usuario_id: string;
    cartas: CartaEnMazo[];
}
