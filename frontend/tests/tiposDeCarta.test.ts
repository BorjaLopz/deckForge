import { describe, expect, it } from "vitest";
import { agruparPorTipo, tipoPrincipal } from "../src/utils/tiposDeCarta";

describe("tipoPrincipal", () => {
	it.each([
		// criatura gana a cualquier otro tipo
		["Artifact Creature — Golem", "criatura"],
		["Enchantment Creature — God", "criatura"],
		["Land Creature — Forest Dryad", "criatura"], // Dryad Arbor
		["Legendary Creature — Elf Druid", "criatura"],
		["Legendary Planeswalker — Jace", "planeswalker"],
		["Battle — Siege", "batalla"],
		["Instant", "instantaneo"],
		["Kindred Instant — Elf", "instantaneo"],
		["Sorcery", "conjuro"],
		["Artifact — Equipment", "artefacto"],
		["Artifact — Vehicle", "artefacto"], // los vehículos no son criaturas hasta que se tripulan
		["Legendary Enchantment Artifact", "artefacto"], // artefacto va antes que encantamiento
		["Enchantment — Aura", "encantamiento"],
		["Basic Land — Forest", "tierra"],
		["Land", "tierra"],
		// cartas de dos caras: solo la frontal
		["Instant // Land", "instantaneo"],
		["Enchantment — Saga // Legendary Creature — Human Samurai", "encantamiento"],
		// tipos raros o sin dato
		["Conspiracy", "otro"],
		[null, "otro"]
	] as const)("%s → %s", (typeLine, esperado) => {
		expect(tipoPrincipal(typeLine)).toBe(esperado);
	});

	it("ignora lo que va detrás del guion (subtipos)", () => {
		// "Land" aparece en el subtipo pero no es tierra
		expect(tipoPrincipal("Enchantment — Aura Land")).toBe("encantamiento");
	});
});

describe("agruparPorTipo", () => {
	const carta = (nombre: string, typeLine: string | null) => ({ nombre, typeLine });

	it("agrupa en orden fijo, omite grupos vacíos y deja 'Otros' al final", () => {
		const grupos = agruparPorTipo(
			[
				carta("Bosque", "Basic Land — Forest"),
				carta("Plan raro", "Conspiracy"),
				carta("Elfo", "Creature — Elf"),
				carta("Anillo solar", "Artifact"),
				carta("Otro elfo", "Creature — Elf")
			],
			(c) => c.typeLine
		);

		expect(grupos.map((g) => g.clave)).toEqual(["criatura", "artefacto", "tierra", "otro"]);
		expect(grupos[0]!.etiqueta).toBe("Criaturas");
		expect(grupos[0]!.items.map((c) => c.nombre)).toEqual(["Elfo", "Otro elfo"]); // conserva el orden de entrada
	});

	it("sin cartas devuelve una lista vacía", () => {
		expect(agruparPorTipo([], () => null)).toEqual([]);
	});
});
