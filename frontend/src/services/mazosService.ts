import { BACKEND_BASE_URL } from "../utils/utils";
import type { MazoDetalle, MazoResumen } from "../types/mazos";
import type { Formato } from "../utils/formatos";

const cabeceras = (accessToken: string) => ({
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json"
});

export const crearMazo = async (accessToken: string, nombre: string, formato: Formato): Promise<{ id: number }> => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/mazos`, {
        method: "POST",
        headers: cabeceras(accessToken),
        body: JSON.stringify({ nombre, formato })
    });

    if (!response.ok) throw new Error("Error creando el mazo");

    const data = await response.json();
    return data.data;
};

export const crearMazoDesdeComandante = async (
    accessToken: string,
    nombre: string,
    comandanteScryfallId: string,
    scryfallIds: string[]
): Promise<{ id: number }> => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/mazos/desde-comandante`, {
        method: "POST",
        headers: cabeceras(accessToken),
        body: JSON.stringify({ nombre, comandanteScryfallId, scryfallIds })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) throw new Error(data?.message ?? "Error creando el mazo");

    return data.data;
};

export const completarMazoDesdeComandante = async (
    accessToken: string,
    mazoId: number,
    comandanteScryfallId: string,
    scryfallIds: string[]
): Promise<void> => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/mazos/${mazoId}/desde-comandante`, {
        method: "POST",
        headers: cabeceras(accessToken),
        body: JSON.stringify({ comandanteScryfallId, scryfallIds })
    });

    if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "Error completando el mazo");
    }
};

export const listarMazos = async (accessToken: string): Promise<MazoResumen[]> => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/mazos`, {
        headers: cabeceras(accessToken)
    });

    if (!response.ok) throw new Error("Error obteniendo los mazos");

    const data = await response.json();
    return data.data;
};

export const obtenerMazo = async (accessToken: string, mazoId: number): Promise<MazoDetalle> => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/mazos/${mazoId}`, {
        headers: cabeceras(accessToken)
    });

    if (!response.ok) throw new Error("Error obteniendo el mazo");

    const data = await response.json();
    return data.data;
};

export const eliminarMazo = async (accessToken: string, mazoId: number): Promise<void> => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/mazos/${mazoId}`, {
        method: "DELETE",
        headers: cabeceras(accessToken)
    });

    if (!response.ok) throw new Error("Error eliminando el mazo");
};

export const agregarCartaAMazo = async (
    accessToken: string,
    mazoId: number,
    cartaId: number,
    cantidad: number
): Promise<{ cantidad: number }> => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/mazos/${mazoId}/cartas`, {
        method: "POST",
        headers: cabeceras(accessToken),
        body: JSON.stringify({ cartaId, cantidad })
    });

    if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "Error añadiendo la carta al mazo");
    }

    const data = await response.json();
    return data.data;
};

/* Para cartas que no están en tu inventario ni en el catálogo: se resuelven
   contra Scryfall en el backend y quedan marcadas como "te falta". */
export const agregarCartaPorNombreAMazo = async (
    accessToken: string,
    mazoId: number,
    nombre: string,
    cantidad: number
): Promise<{ cantidad: number }> => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/mazos/${mazoId}/cartas`, {
        method: "POST",
        headers: cabeceras(accessToken),
        body: JSON.stringify({ nombre, cantidad })
    });

    if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "Error añadiendo la carta al mazo");
    }

    const data = await response.json();
    return data.data;
};

export const ajustarCantidadEnMazo = async (
    accessToken: string,
    mazoId: number,
    cartaId: number,
    delta: number
): Promise<{ cantidad: number }> => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/mazos/${mazoId}/cartas/${cartaId}`, {
        method: "PATCH",
        headers: cabeceras(accessToken),
        body: JSON.stringify({ delta })
    });

    if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "Error ajustando la cantidad en el mazo");
    }

    const data = await response.json();
    return data.data;
};

/* cartaId null = quitar el comandante (la carta sigue en el mazo). */
export const fijarComandante = async (accessToken: string, mazoId: number, cartaId: number | null): Promise<void> => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/mazos/${mazoId}/comandante`, {
        method: "PUT",
        headers: cabeceras(accessToken),
        body: JSON.stringify({ cartaId })
    });

    if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "Error cambiando el comandante");
    }
};

export const eliminarCartaDeMazo = async (accessToken: string, mazoId: number, cartaId: number): Promise<void> => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/mazos/${mazoId}/cartas/${cartaId}`, {
        method: "DELETE",
        headers: cabeceras(accessToken)
    });

    if (!response.ok) throw new Error("Error eliminando la carta del mazo");
};
