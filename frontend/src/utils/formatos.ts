/* Copia de backend/src/utils/formatos.ts: el backend es quien hace cumplir
   las reglas; aquí solo sirven para avisar antes (desactivar el "+",
   mostrar 87/100...). Mantener ambas en sincronía. */

export interface ReglasFormato {
	etiqueta: string;
	tamano: number;
	tamanoExacto: boolean; // Commander: exactamente 100; el resto: mínimo 60
	maxCopias: number;
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

export const OPCIONES_FORMATO = Object.entries(FORMATOS).map(([clave, reglas]) => ({
	clave: clave as Formato,
	etiqueta: reglas.etiqueta
}));

/* Criatura legendaria, o carta cuyo texto dice que puede ser comandante. */
export const puedeSerComandante = (typeLine: string | null, texto: string | null): boolean => {
	const tipos = (typeLine ?? "").split(" // ")[0]!.split("—")[0]!;
	if (tipos.includes("Legendary") && tipos.includes("Creature")) return true;
	return /puede ser tu comandante|can be your commander/i.test(texto ?? "");
};

export const esTierraBasica = (typeLine: string | null): boolean => {
	const tipos = (typeLine ?? "").split(" // ")[0]!.split("—")[0]!;
	return tipos.includes("Basic") && tipos.includes("Land");
};

/* "87/100" (Commander) o "52/60" con estado: incompleto, completo o pasado. */
export const estadoTamano = (formato: Formato, copias: number) => {
	const reglas = FORMATOS[formato];
	const completo = reglas.tamanoExacto ? copias === reglas.tamano : copias >= reglas.tamano;
	const pasado = reglas.tamanoExacto && copias > reglas.tamano;
	return {
		texto: `${copias}/${reglas.tamano}${reglas.tamanoExacto ? "" : " mín."}`,
		completo,
		pasado
	};
};
