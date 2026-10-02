export interface CartaParaInventario {
    scryfallId: string;
    /* Común a todas las impresiones/idiomas: permite cruzar "Sol Ring" (EDHREC)
       con "Anillo solar" (tu inventario). Opcional por si llega de un cliente viejo. */
    oracleId?: string | null;
    /* Línea de tipo de Scryfall en inglés ("Legendary Creature — Elf"):
       fuente fiable para agrupar por tipo, sin depender del diccionario. */
    typeLine?: string | null;
    /* Legalidad por formato tal cual la da Scryfall; cambia con los baneos,
       por eso se refresca cada vez que la carta se vuelve a guardar. */
    legalidades?: Record<string, string> | null;
    identidadColor?: string | null; // "WUBG", en orden WUBRG; "" = incolora
    gameChanger?: boolean | null;
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
