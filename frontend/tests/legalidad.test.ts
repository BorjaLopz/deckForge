import { describe, expect, it } from "vitest";
import { problemasDeCarta, type CartaParaLegalidad } from "../src/utils/legalidad";

const carta = (legalidades: Record<string, string> | null, identidad_color: string | null = "", cantidad = 1): CartaParaLegalidad =>
	({ legalidades, identidad_color, cantidad });

const tipos = (...args: Parameters<typeof problemasDeCarta>) => problemasDeCarta(...args).map((p) => p.tipo);

describe("problemasDeCarta", () => {
	it("legal: sin problemas", () => {
		expect(tipos(carta({ standard: "legal" }), "standard", null, false)).toEqual([]);
	});

	it("prohibida y no legal según Scryfall", () => {
		expect(tipos(carta({ commander: "banned" }), "commander", null, false)).toEqual(["prohibida"]);
		expect(tipos(carta({ standard: "not_legal" }), "standard", null, false)).toEqual(["no_legal"]);
	});

	it("restringida solo es problema con más de 1 copia", () => {
		expect(tipos(carta({ vintage: "restricted" }, "", 1), "vintage", null, false)).toEqual([]);
		expect(tipos(carta({ vintage: "restricted" }, "", 2), "vintage", null, false)).toEqual(["restringida"]);
	});

	it("sin datos de legalidad no inventa avisos", () => {
		expect(tipos(carta(null), "standard", null, false)).toEqual([]);
	});

	describe("identidad de color en Commander", () => {
		it("dentro de los colores, o incolora: bien", () => {
			expect(tipos(carta({ commander: "legal" }, "WU"), "commander", "WUBG", false)).toEqual([]);
			expect(tipos(carta({ commander: "legal" }, ""), "commander", "G", false)).toEqual([]);
		});

		it("con un color que el comandante no tiene: fuera", () => {
			expect(tipos(carta({ commander: "legal" }, "R"), "commander", "WUBG", false)).toEqual(["fuera_de_colores"]);
			expect(tipos(carta({ commander: "legal" }, "UR"), "commander", "WU", false)).toEqual(["fuera_de_colores"]);
		});

		it("no se comprueba sin comandante elegido, ni sobre el propio comandante, ni fuera de Commander", () => {
			expect(tipos(carta({ commander: "legal" }, "R"), "commander", null, false)).toEqual([]);
			expect(tipos(carta({ commander: "legal" }, "WUBG"), "commander", "WUBG", true)).toEqual([]);
			expect(tipos(carta({ modern: "legal" }, "R"), "modern", "WU", false)).toEqual([]);
		});

		it("puede acumular problemas", () => {
			expect(tipos(carta({ commander: "banned" }, "R"), "commander", "U", false)).toEqual(["prohibida", "fuera_de_colores"]);
		});
	});
});
