import { adaptarCartaParaInventario } from "../utils/adaptarCartaParaInventario";
import { BACKEND_BASE_URL } from "../utils/utils"
import type { CartaScryfall, ExpansionScryfall, ListaScryfall } from "../types/scryfall";

export const buscarCartas = async (
    nombre: string,
    filtros?: {
        set?: string,
        colores?: string,
        tipo?: string,
        cmcMin?: number,
        cmcMax?: number,
        ataqueMin?: number,
        ataqueMax?: number,
        vidaMin?: number,
        vidaMax?: number
    },
    signal?: AbortSignal
): Promise<ListaScryfall> => {
    const params = new URLSearchParams();
    params.set("nombre", nombre);
    if (filtros?.set) params.set("set", filtros.set);
    if (filtros?.colores) params.set("colores", filtros.colores);
    if (filtros?.tipo) params.set("tipo", filtros.tipo);
    if (filtros?.cmcMin !== undefined) params.set("cmcMin", String(filtros.cmcMin));
    if (filtros?.cmcMax !== undefined) params.set("cmcMax", String(filtros.cmcMax));
    if (filtros?.ataqueMin !== undefined) params.set("ataqueMin", String(filtros.ataqueMin));
    if (filtros?.ataqueMax !== undefined) params.set("ataqueMax", String(filtros.ataqueMax));
    if (filtros?.vidaMin !== undefined) params.set("vidaMin", String(filtros.vidaMin));
    if (filtros?.vidaMax !== undefined) params.set("vidaMax", String(filtros.vidaMax));

    const response = await fetch(
        BACKEND_BASE_URL + `/api/cartas/buscar?${params.toString()}`,
        { method: "GET", signal }
    )

    if (!response.ok) {
        throw new Error("Error buscando la carta");
    }

    const data = await response.json();
    return data.data; // el objeto "List" de Scryfall: { object, total_cards, data }
};

/* La lista de expansiones cambia poco: se cachea en memoria del navegador
   durante la sesión, no hace falta volver a pedirla en cada montaje. */
let expansionesCache: ExpansionScryfall[] | null = null;

export const obtenerExpansiones = async (): Promise<ExpansionScryfall[]> => {
    if (expansionesCache) return expansionesCache;

    const response = await fetch(BACKEND_BASE_URL + `/api/cartas/expansiones`, { method: "GET" });

    if (!response.ok) {
        throw new Error("Error obteniendo las expansiones");
    }

    const data = await response.json();
    expansionesCache = data.data;
    return data.data;
};


export const agregarAInventario = async (carta: CartaScryfall, accessToken: string, esFoil: boolean) => {
    const cartaAdaptada = adaptarCartaParaInventario(carta, esFoil);

    const response = await fetch(BACKEND_BASE_URL + `/api/inventario`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(cartaAdaptada)
    });

    if (!response.ok) {
        throw new Error("Error añadiendo la carta al inventario");
    }

    const data = await response.json();
    return data.data;
};

export const obtenerCartaPorId = async (id: string): Promise<CartaScryfall> => {
    const response = await fetch(BACKEND_BASE_URL + `/api/cartas/${id}`, { method: "GET" });

    if (!response.ok) {
        throw new Error("Error obteniendo la carta");
    }

    const data = await response.json();
    return data.data;
};