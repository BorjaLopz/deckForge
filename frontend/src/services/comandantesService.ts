import { BACKEND_BASE_URL } from "../utils/utils";
import type { RecomendacionesComandante } from "../types/comandantes";

export const obtenerRecomendacionesComandante = async (
	accessToken: string,
	nombre: string,
	signal?: AbortSignal
): Promise<RecomendacionesComandante> => {
	const response = await fetch(
		`${BACKEND_BASE_URL}/api/comandantes/recomendaciones?nombre=${encodeURIComponent(nombre)}`,
		{ headers: { "Authorization": `Bearer ${accessToken}` }, signal }
	);

	const data = await response.json().catch(() => null);

	if (!response.ok) {
		throw new Error(data?.message ?? "Error obteniendo las recomendaciones");
	}

	return data.data;
};
