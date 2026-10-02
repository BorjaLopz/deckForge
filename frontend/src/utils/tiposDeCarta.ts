export type TipoPrincipal =
	| "criatura" | "planeswalker" | "batalla" | "instantaneo" | "conjuro"
	| "artefacto" | "encantamiento" | "tierra" | "otro";

/* El orden importa dos veces: es el orden de las secciones y también la
   prioridad cuando una carta tiene varios tipos — "Artifact Creature" va
   a Criaturas, "Enchantment Land" a Encantamientos... igual que Moxfield. */
const TIPOS: { clave: TipoPrincipal; etiqueta: string; palabra: string }[] = [
	{ clave: "criatura", etiqueta: "Criaturas", palabra: "Creature" },
	{ clave: "planeswalker", etiqueta: "Planeswalkers", palabra: "Planeswalker" },
	{ clave: "batalla", etiqueta: "Batallas", palabra: "Battle" },
	{ clave: "instantaneo", etiqueta: "Instantáneos", palabra: "Instant" },
	{ clave: "conjuro", etiqueta: "Conjuros", palabra: "Sorcery" },
	{ clave: "artefacto", etiqueta: "Artefactos", palabra: "Artifact" },
	{ clave: "encantamiento", etiqueta: "Encantamientos", palabra: "Enchantment" },
	{ clave: "tierra", etiqueta: "Tierras", palabra: "Land" }
];

/* Solo la cara frontal ("Instant // Land" cuenta como instantáneo) y solo
   la parte antes del guion largo (los subtipos no deciden nada). */
export const tipoPrincipal = (typeLine: string | null): TipoPrincipal => {
	const tipos = (typeLine ?? "").split(" // ")[0]!.split("—")[0]!;
	return TIPOS.find((t) => tipos.includes(t.palabra))?.clave ?? "otro";
};

export interface GrupoPorTipo<T> {
	clave: TipoPrincipal;
	etiqueta: string;
	items: T[];
}

/* Grupos en orden fijo, solo los que tienen algo. */
export const agruparPorTipo = <T>(items: T[], typeLineDe: (item: T) => string | null): GrupoPorTipo<T>[] => {
	const grupos = [...TIPOS, { clave: "otro" as const, etiqueta: "Otros", palabra: "" }].map((t) => ({
		clave: t.clave,
		etiqueta: t.etiqueta,
		items: [] as T[]
	}));

	for (const item of items) {
		const clave = tipoPrincipal(typeLineDe(item));
		grupos.find((g) => g.clave === clave)!.items.push(item);
	}

	return grupos.filter((g) => g.items.length > 0);
};
