import { BACKEND_BASE_URL } from "../utils/utils";

export const obtenerInventario = async (accessToken: string,
    filtros?: {
        nombre?: string,
        foil?: boolean,
        colores?: string,
        tipo?: string,
        manaValueMin?: number,
        manaValueMax?: number
    }
) => {
    const params = new URLSearchParams();

    if (filtros?.nombre) params.set("nombre", filtros.nombre);
    if (filtros?.foil !== undefined) params.set("foil", String(filtros.foil));
    if (filtros?.colores) params.set("colores", filtros.colores);
    if (filtros?.tipo) params.set("tipo", filtros.tipo);
    if (filtros?.manaValueMin !== undefined) params.set("manaValueMin", String(filtros.manaValueMin));
    if (filtros?.manaValueMax !== undefined) params.set("manaValueMax", String(filtros.manaValueMax));


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