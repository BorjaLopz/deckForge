/* Reglas de construcción por formato. Mantener en sincronía con
   frontend/src/utils/formatos.ts y con el CHECK de mazos.formato en BD. */

export interface ReglasFormato {
    etiqueta: string;
    tamano: number;      // nº de cartas del mazo principal (comandante incluido en Commander)
    tamanoExacto: boolean; // Commander: exactamente 100; el resto: mínimo 60
    maxCopias: number;   // por carta (por oracle_id), salvo tierras básicas
    usaComandante: boolean;
}

const CONSTRUIDO_60: Omit<ReglasFormato, "etiqueta"> = {
    tamano: 60,
    tamanoExacto: false,
    maxCopias: 4,
    usaComandante: false
};

export const FORMATOS = {
    commander: { etiqueta: "Commander", tamano: 100, tamanoExacto: true, maxCopias: 1, usaComandante: true },
    standard: { etiqueta: "Standard", ...CONSTRUIDO_60 },
    pioneer: { etiqueta: "Pioneer", ...CONSTRUIDO_60 },
    modern: { etiqueta: "Modern", ...CONSTRUIDO_60 },
    legacy: { etiqueta: "Legacy", ...CONSTRUIDO_60 },
    vintage: { etiqueta: "Vintage", ...CONSTRUIDO_60 },
    pauper: { etiqueta: "Pauper", ...CONSTRUIDO_60 }
} satisfies Record<string, ReglasFormato>;

export type Formato = keyof typeof FORMATOS;

export const esFormatoValido = (valor: unknown): valor is Formato =>
    typeof valor === "string" && Object.prototype.hasOwnProperty.call(FORMATOS, valor);

/* Criatura legendaria, o carta que lo dice en su texto ("puede ser tu
   comandante" / "can be your commander": algunos planeswalkers, p. ej.).
   Miramos la cara frontal, que es la que cuenta como comandante. */
export const puedeSerComandante = (typeLine: string | null, texto: string | null): boolean => {
    const tipos = (typeLine ?? "").split(" // ")[0]!.split("—")[0]!;
    if (tipos.includes("Legendary") && tipos.includes("Creature")) return true;
    return /puede ser tu comandante|can be your commander/i.test(texto ?? "");
};

/* "Basic Land — Forest", "Basic Snow Land — Island", "Basic Land" (Wastes):
   en todos los formatos se pueden llevar tantas como quieras. */
export const esTierraBasica = (typeLine: string | null): boolean => {
    const tipos = (typeLine ?? "").split(" // ")[0]!.split("—")[0]!;
    return tipos.includes("Basic") && tipos.includes("Land");
};
