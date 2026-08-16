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