import { useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { obtenerRecomendacionesComandante } from "../services/comandantesService";
import type { RecomendacionesComandante } from "../types/comandantes";

/* Búsqueda bajo demanda (al enviar, no mientras escribes): cada consulta
   pega a Scryfall + EDHREC, no tiene sentido lanzarla por tecla. */
export const useRecomendacionesComandante = () => {
	const { accessToken } = useAuth();
	const [datos, setDatos] = useState<RecomendacionesComandante | null>(null);
	const [cargando, setCargando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const controladorRef = useRef<AbortController | null>(null);

	useEffect(() => () => controladorRef.current?.abort(), []);

	const buscar = async (nombre: string): Promise<boolean> => {
		if (!accessToken || !nombre.trim()) return false;

		controladorRef.current?.abort();
		const controlador = new AbortController();
		controladorRef.current = controlador;

		setCargando(true);
		setError(null);

		try {
			setDatos(await obtenerRecomendacionesComandante(accessToken, nombre.trim(), controlador.signal));
			return true;
		} catch (err) {
			if ((err as Error).name === "AbortError") return false;
			setError(err instanceof Error ? err.message : "No se pudieron obtener las recomendaciones");
			return false;
		} finally {
			if (!controlador.signal.aborted) setCargando(false);
		}
	};

	return { datos, cargando, error, buscar };
};
