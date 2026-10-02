import { FORMATOS, type Formato } from "./formatos";
import { tipoPrincipal } from "./tiposDeCarta";

export interface CartaParaEstadisticas {
	nombre: string;
	cantidad: number;
	mana_value: number | null;
	mana_cost: string | null;
	type_line: string | null;
	game_changer: boolean | null;
}

export type ColorMana = "W" | "U" | "B" | "R" | "G" | "C";

export interface NivelCommander {
	bracket: string;
	nombre: string;
	explicacion: string;
}

export interface EstadisticasMazo {
	tierras: number;
	hechizos: number;
	costeMedio: number | null; // de los hechizos (sin tierras), ponderado por copias
	curva: { coste: string; copias: number }[];
	simbolos: Record<ColorMana, number>;
	gameChangers: string[];
	nivel: NivelCommander | null; // solo en Commander
}

const ULTIMO_TRAMO_CURVA = 7; // 7 o más van juntos

/* "{2}{W/U}{B/P}{C}" -> W:1, U:1, B:1, C:1. Los híbridos cuentan para los
   dos colores (cualquiera de ellos sirve para pagarlo) y los pirexianos
   para su color. Los números (maná genérico) y {X} no cuentan. */
export const contarSimbolos = (manaCost: string | null): Record<ColorMana, number> => {
	const cuenta: Record<ColorMana, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
	for (const [, simbolo] of (manaCost ?? "").matchAll(/\{([^}]+)\}/g)) {
		for (const parte of new Set(simbolo!.split("/"))) {
			if (parte in cuenta) cuenta[parte as ColorMana]++;
		}
	}
	return cuenta;
};

/* Brackets oficiales de Commander (2025). Aquí solo se estiman por el número
   de "Game Changers"; los brackets también tienen en cuenta combos de dos
   cartas, turnos extra y destrucción masiva de tierras, que no detectamos. */
export const nivelPorGameChangers = (cantidad: number): NivelCommander => {
	if (cantidad === 0) {
		return { bracket: "1–2", nombre: "Exhibition / Core", explicacion: "Sin Game Changers" };
	}
	if (cantidad <= 3) {
		return { bracket: "3", nombre: "Upgraded", explicacion: `${cantidad} Game Changer${cantidad === 1 ? "" : "s"} (hasta 3)` };
	}
	return { bracket: "4+", nombre: "Optimized", explicacion: `${cantidad} Game Changers (más de 3)` };
};

export const calcularEstadisticas = (cartas: CartaParaEstadisticas[], formato: Formato): EstadisticasMazo => {
	const esTierra = (c: CartaParaEstadisticas) => tipoPrincipal(c.type_line) === "tierra";
	const hechizos = cartas.filter((c) => !esTierra(c));

	const copiasHechizos = hechizos.reduce((s, c) => s + c.cantidad, 0);
	const sumaCostes = hechizos.reduce((s, c) => s + (c.mana_value ?? 0) * c.cantidad, 0);

	const curva = Array.from({ length: ULTIMO_TRAMO_CURVA + 1 }, (_, coste) => ({
		coste: coste === ULTIMO_TRAMO_CURVA ? `${coste}+` : String(coste),
		copias: 0
	}));
	for (const c of hechizos) {
		curva[Math.min(c.mana_value ?? 0, ULTIMO_TRAMO_CURVA)]!.copias += c.cantidad;
	}

	const simbolos: Record<ColorMana, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
	for (const c of cartas) {
		const propios = contarSimbolos(c.mana_cost);
		for (const color of Object.keys(simbolos) as ColorMana[]) {
			simbolos[color] += propios[color] * c.cantidad;
		}
	}

	const gameChangers = cartas.filter((c) => c.game_changer).map((c) => c.nombre);

	return {
		tierras: cartas.filter(esTierra).reduce((s, c) => s + c.cantidad, 0),
		hechizos: copiasHechizos,
		costeMedio: copiasHechizos > 0 ? sumaCostes / copiasHechizos : null,
		curva,
		simbolos,
		gameChangers,
		nivel: FORMATOS[formato].usaComandante ? nivelPorGameChangers(gameChangers.length) : null
	};
};
