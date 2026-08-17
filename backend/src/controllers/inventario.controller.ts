import { Request, Response } from "express";
import { buildError, buildResponse } from "../utils/response";
import { guardarCartaEnInventario, obtenerInventario } from "../services/inventario.services";

export const agregarInventario = async (req: Request, res: Response) => {
    try {
        const carta = req.body;
        const cartaId = await guardarCartaEnInventario(carta, (req as any).usuarioId);
        buildResponse(res, { cartaId });
    } catch (error) {
        console.error("Error al guardar la carta en inventario", error);
        buildError(res, "No se pudo guardar la carta", "INVENTARIO_INSERT_ERROR", 500);
    }
}

export const listarInventario = async (req: Request, res: Response) => {
    try {
        const usuarioId = (req as any).usuarioId;

        const nombre = req.query.nombre ? String(req.query.nombre) : undefined;
        const foil = req.query.foil !== undefined ? req.query.foil === "true" : undefined;

        const resultado = await obtenerInventario(usuarioId, { nombre, foil });
        buildResponse(res, resultado);
    } catch (error) {
        console.error("Error obteniendo el inventario", error);
        buildError(res, "No se pudo obtener el inventario", "INVENTARIO_FETCH_ERROR", 500);
    }
}