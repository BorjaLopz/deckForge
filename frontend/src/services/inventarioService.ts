import { BACKEND_BASE_URL } from "../utils/utils";

export const obtenerInventario = async (accessToken: string, filtros?: { nombre?: string, foil?: boolean }) => {
    const params = new URLSearchParams();

    if (filtros?.nombre) params.set("nombre", filtros.nombre);
    if (filtros?.foil !== undefined) params.set("foil", String(filtros.foil));

    const response = await fetch(`${BACKEND_BASE_URL}/api/inventario?${params.toString()}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`
        }
    })

    if (!response.ok) {
        throw new Error("Error obteniendo el inventario");
    }

    const data = await response.json();
    return data.data;
}