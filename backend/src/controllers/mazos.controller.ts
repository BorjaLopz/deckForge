import { Response } from "express";
import { buildError, buildResponse } from "../utils/response";
import { RequestAutenticado } from "../types/auth";
import { esFormatoValido } from "../utils/formatos";
import {
    agregarCartaAMazo,
    agregarCartaPorNombreAMazo,
    ajustarCantidadEnMazo,
    crearMazo,
    completarMazoDesdeComandante,
    crearMazoDesdeComandante,
    eliminarCartaDeMazo,
    eliminarMazo,
    fijarComandante,
    listarMazos,
    obtenerMazo
} from "../services/mazos.services";

export const crear = async (req: RequestAutenticado, res: Response) => {
    try {
        const { nombre, comandanteCartaId, formato = "commander" } = req.body;

        if (!nombre || typeof nombre !== "string") {
            return buildError(res, "Falta el nombre del mazo", "MAZO_NOMBRE_REQUERIDO", 400);
        }
        if (!esFormatoValido(formato)) {
            return buildError(res, "Formato de mazo no válido", "MAZO_FORMATO_INVALIDO", 400);
        }

        const id = await crearMazo(req.usuarioId, nombre, comandanteCartaId ? Number(comandanteCartaId) : null, formato);
        buildResponse(res, { id });
    } catch (error) {
        console.error("Error creando el mazo: ", error);
        buildError(res, "No se pudo crear el mazo", "MAZO_CREAR_ERROR", 500);
    }
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CARTAS_MAZO = 99; // Commander: 99 + comandante

/* Devuelve el mensaje de error, o null si el cuerpo es válido. */
const validarCartasDeComandante = (comandanteScryfallId: unknown, scryfallIds: unknown): string | null => {
    const idsValidos = Array.isArray(scryfallIds) && scryfallIds.every((id) => typeof id === "string" && UUID_REGEX.test(id));

    if (typeof comandanteScryfallId !== "string" || !UUID_REGEX.test(comandanteScryfallId) || !idsValidos) {
        return "Datos del mazo inválidos";
    }
    if (scryfallIds.length > MAX_CARTAS_MAZO) {
        return `Un mazo Commander lleva como mucho ${MAX_CARTAS_MAZO} cartas además del comandante`;
    }
    return null;
};

export const crearDesdeComandante = async (req: RequestAutenticado, res: Response) => {
    try {
        const { nombre, comandanteScryfallId, scryfallIds } = req.body;

        const errorValidacion = !nombre || typeof nombre !== "string"
            ? "Falta el nombre del mazo"
            : validarCartasDeComandante(comandanteScryfallId, scryfallIds);
        if (errorValidacion) {
            return buildError(res, errorValidacion, "MAZO_COMANDANTE_DATOS_INVALIDOS", 400);
        }

        const id = await crearMazoDesdeComandante(req.usuarioId, nombre.trim(), comandanteScryfallId, scryfallIds);
        buildResponse(res, { id });
    } catch (error) {
        console.error("Error creando el mazo desde comandante: ", error);
        buildError(res, "No se pudo crear el mazo", "MAZO_COMANDANTE_CREAR_ERROR", 500);
    }
};

export const completarDesdeComandante = async (req: RequestAutenticado, res: Response) => {
    try {
        const { mazoId } = req.params;
        const { comandanteScryfallId, scryfallIds } = req.body;

        const errorValidacion = validarCartasDeComandante(comandanteScryfallId, scryfallIds);
        if (errorValidacion) {
            return buildError(res, errorValidacion, "MAZO_COMANDANTE_DATOS_INVALIDOS", 400);
        }

        await completarMazoDesdeComandante(req.usuarioId, Number(mazoId), comandanteScryfallId, scryfallIds);
        buildResponse(res, { id: Number(mazoId) });
    } catch (error) {
        console.error("Error completando el mazo desde comandante: ", error);
        buildError(res, error instanceof Error ? error.message : "No se pudo completar el mazo", "MAZO_COMANDANTE_COMPLETAR_ERROR", 400);
    }
};

export const listar = async (req: RequestAutenticado, res: Response) => {
    try {
        const mazos = await listarMazos(req.usuarioId);
        buildResponse(res, mazos);
    } catch (error) {
        console.error("Error listando los mazos: ", error);
        buildError(res, "No se pudieron obtener los mazos", "MAZO_LISTAR_ERROR", 500);
    }
};

export const obtener = async (req: RequestAutenticado, res: Response) => {
    try {
        const { mazoId } = req.params;
        const mazo = await obtenerMazo(req.usuarioId, Number(mazoId));

        if (!mazo) {
            return buildError(res, "Mazo no encontrado", "MAZO_NO_ENCONTRADO", 404);
        }

        buildResponse(res, mazo);
    } catch (error) {
        console.error("Error obteniendo el mazo: ", error);
        buildError(res, "No se pudo obtener el mazo", "MAZO_OBTENER_ERROR", 500);
    }
};

export const eliminar = async (req: RequestAutenticado, res: Response) => {
    try {
        const { mazoId } = req.params;
        const eliminado = await eliminarMazo(req.usuarioId, Number(mazoId));

        if (!eliminado) {
            return buildError(res, "Mazo no encontrado", "MAZO_NO_ENCONTRADO", 404);
        }

        buildResponse(res, { eliminado: true });
    } catch (error) {
        console.error("Error eliminando el mazo: ", error);
        buildError(res, "No se pudo eliminar el mazo", "MAZO_ELIMINAR_ERROR", 500);
    }
};

/* Dos formas de añadir una carta: por cartaId (ya la conocemos, viene de una
   búsqueda en el inventario) o por nombre (no la tenemos ni en inventario ni
   en catálogo — se resuelve contra Scryfall y queda marcada como "falta"). */
export const agregarCarta = async (req: RequestAutenticado, res: Response) => {
    try {
        const { mazoId } = req.params;
        const { cartaId, nombre, cantidad } = req.body;

        if (typeof cantidad !== "number" || cantidad <= 0) {
            return buildError(res, "Falta la cantidad a añadir", "MAZO_CARTA_DATOS_INVALIDOS", 400);
        }

        const cantidadFinal = cartaId
            ? await agregarCartaAMazo(req.usuarioId, Number(mazoId), Number(cartaId), cantidad)
            : nombre && typeof nombre === "string"
                ? await agregarCartaPorNombreAMazo(req.usuarioId, Number(mazoId), nombre, cantidad)
                : null;

        if (cantidadFinal === null) {
            return buildError(res, "Falta cartaId o nombre de la carta a añadir", "MAZO_CARTA_DATOS_INVALIDOS", 400);
        }

        buildResponse(res, { cantidad: cantidadFinal });
    } catch (error) {
        console.error("Error añadiendo la carta al mazo: ", error);
        buildError(res, error instanceof Error ? error.message : "No se pudo añadir la carta", "MAZO_CARTA_AGREGAR_ERROR", 400);
    }
};

export const ajustarCantidad = async (req: RequestAutenticado, res: Response) => {
    try {
        const { mazoId, cartaId } = req.params;
        const { delta } = req.body;

        if (typeof delta !== "number") {
            return buildError(res, "El delta debe de ser un número", "MAZO_CARTA_DELTA_INVALIDO", 400);
        }

        const resultado = await ajustarCantidadEnMazo(req.usuarioId, Number(mazoId), Number(cartaId), delta);
        buildResponse(res, resultado);
    } catch (error) {
        console.error("Error ajustando cantidad en el mazo: ", error);
        buildError(res, error instanceof Error ? error.message : "No se pudo ajustar la cantidad", "MAZO_CARTA_AJUSTAR_ERROR", 400);
    }
};

export const cambiarComandante = async (req: RequestAutenticado, res: Response) => {
    try {
        const { mazoId } = req.params;
        const { cartaId } = req.body;

        if (cartaId !== null && typeof cartaId !== "number") {
            return buildError(res, "cartaId debe ser un número o null", "MAZO_COMANDANTE_INVALIDO", 400);
        }

        await fijarComandante(req.usuarioId, Number(mazoId), cartaId);
        buildResponse(res, { comandanteId: cartaId });
    } catch (error) {
        console.error("Error cambiando el comandante: ", error);
        buildError(res, error instanceof Error ? error.message : "No se pudo cambiar el comandante", "MAZO_COMANDANTE_CAMBIAR_ERROR", 400);
    }
};

export const eliminarCarta = async (req: RequestAutenticado, res: Response) => {
    try {
        const { mazoId, cartaId } = req.params;
        await eliminarCartaDeMazo(req.usuarioId, Number(mazoId), Number(cartaId));
        buildResponse(res, { eliminado: true });
    } catch (error) {
        console.error("Error eliminando la carta del mazo: ", error);
        buildError(res, error instanceof Error ? error.message : "No se pudo eliminar la carta", "MAZO_CARTA_ELIMINAR_ERROR", 400);
    }
};
