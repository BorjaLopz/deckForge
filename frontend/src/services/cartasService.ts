import { adaptarCartaParaInventario } from "../utils/adaptarCartaParaInventario";
import { BACKEND_BASE_URL } from "../utils/utils"

export const buscarCartas = async (nombre: string) => {
    const response = await fetch(
        BACKEND_BASE_URL + `/api/cartas/buscar?nombre=${encodeURIComponent(nombre)}`,
        { method: "GET" }
    )

    if (!response.ok) {
        throw new Error("Error buscando la carta");
    }

    const data = await response.json();
    return data.data; // el objeto "List" de Scryfall: { object, total_cards, data }
};


export const agregarAInventario = async (carta: any, accessToken: string) => {
    const cartaAdaptada = adaptarCartaParaInventario(carta);

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

export const obtenerCartaPorId = async (id: string) => {
    const response = await fetch(BACKEND_BASE_URL + `/api/cartas/${id}`, { method: "GET" });

    if (!response.ok) {
        throw new Error("Error obteniendo la carta");
    }

    const data = await response.json();
    return data.data;
};