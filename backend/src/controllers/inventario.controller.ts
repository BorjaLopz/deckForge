import { Request, Response } from "express";
import { buildError, buildResponse } from "../utils/response";
import { actualizarCantidadInventario, eliminarCartaDeInventario, guardarCartaEnInventario, obtenerInventario } from "../services/inventario.services";

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

        const colores = req.query.colores
            ? String(req.query.colores).split(",")
            : undefined;

        const tipo = req.query.tipo ? String(req.query.tipo) : undefined;
        const foil = req.query.foil !== undefined ? req.query.foil === "true" : undefined;

        /* Confirmamos con seguridad que sean valores numéricos */
        const manaValueMinRaw = req.query.manaValueMin !== undefined ? Number(req.query.manaValueMin) : undefined;
        const manaValueMin = manaValueMinRaw !== undefined && !isNaN(manaValueMinRaw) ? manaValueMinRaw : undefined;

        const manaValueMaxRaw = req.query.manaValueMax !== undefined ? Number(req.query.manaValueMax) : undefined;
        const manaValueMax = manaValueMaxRaw !== undefined && !isNaN(manaValueMaxRaw) ? manaValueMaxRaw : undefined;

        const resultado = await obtenerInventario(usuarioId,
            {
                nombre,
                foil,
                colores,
                tipo,
                manaValueMax,
                manaValueMin
            }
        );
        buildResponse(res, resultado);
    } catch (error) {
        console.error("Error obteniendo el inventario", error);
        buildError(res, "No se pudo obtener el inventario", "INVENTARIO_FETCH_ERROR", 500);
    }
}

export const ajustarCantidad = async (req: Request, res: Response) => {
    try {
        const usuarioId = (req as any).usuarioId;
        const { cartaId } = req.params;
        const { delta } = req.body;

        if (typeof delta !== "number") {
            return buildError(res, "El delta debe de ser un numero", "INVENTARIO_DELTA_INVALIDO", 400);
        }

        const resultado = await actualizarCantidadInventario(usuarioId, Number(cartaId), delta);
        buildResponse(res, resultado)
    } catch (error) {
        console.error("Error ajustando cantidad. ", error);
        buildError(res, "No se pudo ajustar la cantidad", "INVENTARIO_UPDATE_ERROR", 500)
    }
}

export const eliminarDeInventario = async (req: Request, res: Response) => {
    try {
        const usuarioId = (req as any).usuarioId;
        const { cartaId } = req.params;
        await eliminarCartaDeInventario(usuarioId, Number(cartaId));
        buildResponse(res, { eliminado: true });
    } catch (error) {
        console.error("Error eliminando del inventario. ", error);
        buildError(res, "No se pudo eliminar la carta", "INVENTARIO_DELETE_ERROR", 500);
    }
}