import { describe, expect, it } from "vitest";
import * as reglasFrontend from "../src/utils/formatos";
import * as reglasBackend from "../../backend/src/utils/formatos";

/* Las reglas están copiadas en frontend (avisos de UI) y backend (quien las
   hace cumplir). Pasamos los mismos casos por las dos copias: si alguien
   cambia una y no la otra, esto falla. */
describe.each([
	["frontend", reglasFrontend],
	["backend", reglasBackend]
])("reglas de formato (%s)", (_, reglas) => {
	describe("FORMATOS", () => {
		it("Commander: 100 exactas, singleton", () => {
			expect(reglas.FORMATOS.commander).toMatchObject({ tamano: 100, tamanoExacto: true, maxCopias: 1, usaComandante: true });
		});

		it("el resto: mínimo 60, hasta 4 copias, sin comandante", () => {
			for (const formato of ["standard", "pioneer", "modern", "legacy", "vintage", "pauper"] as const) {
				expect(reglas.FORMATOS[formato]).toMatchObject({ tamano: 60, tamanoExacto: false, maxCopias: 4, usaComandante: false });
			}
		});
	});

	describe("esTierraBasica", () => {
		it.each([
			["Basic Land — Forest", true],
			["Basic Snow Land — Island", true],
			["Basic Land", true], // Wastes: básica sin subtipo
			["Land — Forest Island", false], // Breeding Pool: tiene tipos de básica pero no es básica
			["Legendary Land", false],
			["Land Creature — Forest Dryad", false], // Dryad Arbor
			["Instant", false],
			[null, false]
		])("%s → %s", (typeLine, esperado) => {
			expect(reglas.esTierraBasica(typeLine)).toBe(esperado);
		});
	});

	describe("puedeSerComandante", () => {
		it.each([
			["Legendary Creature — Phyrexian Angel Horror", null, true],
			["Legendary Artifact Creature — Golem", null, true],
			["Creature — Elf Druid", null, false],
			["Legendary Enchantment", null, false],
			["Legendary Planeswalker — Jace", "+1: Roba una carta.", false],
			["Legendary Planeswalker — Teferi", "Teferi, Temporal Archmage can be your commander.", true],
			["Legendary Planeswalker — Teferi", "Teferi, archimago temporal puede ser tu comandante.", true],
			// cartas de dos caras: cuenta la frontal
			["Legendary Creature — Human Wizard // Legendary Planeswalker — Jace", null, true],
			["Enchantment — Saga // Legendary Creature — Human Samurai", null, false],
			[null, null, false]
		])("%s (texto: %s) → %s", (typeLine, texto, esperado) => {
			expect(reglas.puedeSerComandante(typeLine, texto)).toBe(esperado);
		});
	});
});

describe("estadoTamano (solo frontend)", () => {
	const { estadoTamano } = reglasFrontend;

	it.each([
		["commander", 99, "99/100", false, false],
		["commander", 100, "100/100", true, false],
		["commander", 101, "101/100", false, true],
		["standard", 59, "59/60 mín.", false, false],
		["standard", 60, "60/60 mín.", true, false],
		["standard", 75, "75/60 mín.", true, false] // en 60 cartas pasarse no es ilegal
	] as const)("%s con %i cartas → %s", (formato, copias, texto, completo, pasado) => {
		expect(estadoTamano(formato, copias)).toEqual({ texto, completo, pasado });
	});
});
