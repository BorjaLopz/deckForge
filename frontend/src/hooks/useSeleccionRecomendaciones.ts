import { useState } from "react";
import type { CartaRecomendada } from "../types/comandantes";

export const MAX_CARTAS_COMMANDER = 99; // + el comandante = 100

const porInclusion = (a: CartaRecomendada, b: CartaRecomendada) => b.inclusion - a.inclusion;

/* `max` = huecos libres: 99 en un mazo nuevo, menos si completas uno que
   ya tiene cartas. Las funciones reciben solo las cartas seleccionables
   (las que ya están en el mazo las filtra quien llama). */
export const useSeleccionRecomendaciones = () => {
	const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());

	const alternar = (scryfallId: string) => {
		setSeleccionadas((prev) => {
			const nuevo = new Set(prev);
			if (nuevo.has(scryfallId)) nuevo.delete(scryfallId);
			else nuevo.add(scryfallId);
			return nuevo;
		});
	};

	const anadirHasta = (cartasEnOrden: CartaRecomendada[], max: number) => {
		setSeleccionadas((prev) => {
			const nuevo = new Set(prev);
			for (const c of cartasEnOrden) {
				if (nuevo.size >= max) break;
				nuevo.add(c.scryfallId);
			}
			return nuevo;
		});
	};

	const marcarPoseidas = (cartas: CartaRecomendada[], max: number) =>
		anadirHasta(cartas.filter((c) => c.cantidadEnInventario > 0).sort(porInclusion), max);

	/* Generador mínimo: respeta lo ya marcado, añade primero las que tienes y
	   luego las más jugadas según EDHREC hasta llenar los huecos. */
	const completar = (cartas: CartaRecomendada[], max: number) => {
		const poseidas = cartas.filter((c) => c.cantidadEnInventario > 0).sort(porInclusion);
		const resto = cartas.filter((c) => c.cantidadEnInventario === 0).sort(porInclusion);
		anadirHasta([...poseidas, ...resto], max);
	};

	const limpiar = () => setSeleccionadas(new Set());

	return { seleccionadas, alternar, marcarPoseidas, completar, limpiar };
};
