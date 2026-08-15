import { Request, Response } from "express";
import { buildError, buildResponse } from "../utils/response";
import { guardarCartaEnInventario } from "../services/inventario.services";

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