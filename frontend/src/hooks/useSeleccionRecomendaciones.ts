import { useState } from "react";
import type { CartaRecomendada } from "../types/comandantes";

export const MAX_CARTAS_COMMANDER = 99; // + el comandante = 100

const porInclusion = (a: CartaRecomendada, b: CartaRecomendada) => b.inclusion - a.inclusion;

const sumarCopias = (seleccion: Map<string, number>) => [...seleccion.values()].reduce((suma, n) => suma + n, 0);

/* Guarda id -> copias: casi todo es 1, pero las básicas vienen con la
   cantidad del mazo medio de EDHREC (4 Forest ocupan 4 huecos, no 1).
   `max` = huecos libres: 99 en un mazo nuevo, menos si completas uno que
   ya tiene cartas. Las funciones reciben solo las cartas seleccionables
   (las que ya están en el mazo las filtra quien llama). */
export const useSeleccionRecomendaciones = () => {
	const [seleccionadas, setSeleccionadas] = useState<Map<string, number>>(new Map());

	const alternar = (carta: CartaRecomendada) => {
		setSeleccionadas((prev) => {
			const nuevo = new Map(prev);
			if (nuevo.has(carta.scryfallId)) nuevo.delete(carta.scryfallId);
			else nuevo.set(carta.scryfallId, carta.cantidadSugerida);
			return nuevo;
		});
	};

	/* Añade en orden mientras quepan; una carta que no cabe entera (4 Forest
	   con 2 huecos) se salta y se sigue con la siguiente. */
	const anadirHasta = (cartasEnOrden: CartaRecomendada[], max: number) => {
		setSeleccionadas((prev) => {
			const nuevo = new Map(prev);
			let total = sumarCopias(nuevo);
			for (const c of cartasEnOrden) {
				if (nuevo.has(c.scryfallId) || total + c.cantidadSugerida > max) continue;
				nuevo.set(c.scryfallId, c.cantidadSugerida);
				total += c.cantidadSugerida;
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

	const limpiar = () => setSeleccionadas(new Map());

	return { seleccionadas, totalCopias: sumarCopias(seleccionadas), alternar, marcarPoseidas, completar, limpiar };
};
