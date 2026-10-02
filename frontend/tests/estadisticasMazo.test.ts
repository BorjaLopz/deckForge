import { describe, expect, it } from "vitest";
import { calcularEstadisticas, contarSimbolos, nivelPorGameChangers, type CartaParaEstadisticas } from "../src/utils/estadisticasMazo";

const carta = (nombre: string, mana_value: number | null, mana_cost: string | null, type_line: string, cantidad = 1, game_changer = false): CartaParaEstadisticas =>
	({ nombre, mana_value, mana_cost, type_line, cantidad, game_changer });

describe("contarSimbolos", () => {
	it.each([
		["{2}{W}{W}", { W: 2 }],
		["{W/U}", { W: 1, U: 1 }], // híbrido: cuenta para los dos
		["{B/P}{B/P}", { B: 2 }], // pirexiano: cuenta para su color
		["{2/G}", { G: 1 }], // híbrido monocolor
		["{X}{R}", { R: 1 }],
		["{C}{C}", { C: 2 }],
		["{4}", {}],
		[null, {}]
	])("%s", (coste, esperado) => {
		expect(contarSimbolos(coste)).toEqual({ W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, ...esperado });
	});
});

describe("nivelPorGameChangers", () => {
	it.each([
		[0, "1–2"],
		[1, "3"],
		[3, "3"],
		[4, "4+"]
	])("%i Game Changers → bracket %s", (cantidad, bracket) => {
		expect(nivelPorGameChangers(cantidad).bracket).toBe(bracket);
	});
});

describe("calcularEstadisticas", () => {
	const mazo = [
		carta("Bosque", 0, null, "Basic Land — Forest", 10),
		carta("Dryad Arbor", 0, null, "Land Creature — Forest Dryad"), // cuenta como criatura, no tierra
		carta("Anillo solar", 1, "{1}", "Artifact"),
		carta("Elfo", 1, "{G}", "Creature — Elf", 4),
		carta("Rhystic Study", 3, "{2}{U}", "Enchantment", 1, true),
		carta("Eldrazi", 10, "{10}", "Creature — Eldrazi")
	];

	it("separa tierras de hechizos y calcula el coste medio ponderado por copias", () => {
		const e = calcularEstadisticas(mazo, "commander");
		expect(e.tierras).toBe(10);
		expect(e.hechizos).toBe(8); // Dryad Arbor + 1 + 4 + 1 + 1
		expect(e.costeMedio).toBeCloseTo((0 + 1 + 4 + 3 + 10) / 8);
	});

	it("curva sin tierras, con el último tramo en 7+", () => {
		const curva = calcularEstadisticas(mazo, "commander").curva;
		expect(curva.map((t) => t.coste)).toEqual(["0", "1", "2", "3", "4", "5", "6", "7+"]);
		expect(curva.map((t) => t.copias)).toEqual([1, 5, 0, 1, 0, 0, 0, 1]);
	});

	it("símbolos de color multiplicados por copias", () => {
		const { simbolos } = calcularEstadisticas(mazo, "commander");
		expect(simbolos).toMatchObject({ G: 4, U: 1, W: 0 });
	});

	it("nivel solo en Commander", () => {
		expect(calcularEstadisticas(mazo, "commander").nivel?.bracket).toBe("3");
		expect(calcularEstadisticas(mazo, "commander").gameChangers).toEqual(["Rhystic Study"]);
		expect(calcularEstadisticas(mazo, "modern").nivel).toBeNull();
	});

	it("mazo vacío o solo tierras: sin coste medio", () => {
		expect(calcularEstadisticas([], "standard").costeMedio).toBeNull();
		expect(calcularEstadisticas([carta("Isla", 0, null, "Basic Land — Island", 20)], "standard").costeMedio).toBeNull();
	});
});
