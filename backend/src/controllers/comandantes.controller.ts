import { Response } from "express";
import { buildError, buildResponse } from "../utils/response";
import { RequestAutenticado } from "../types/auth";
import { ErrorComandante, obtenerRecomendacionesComandante } from "../services/comandantes.services";

export const recomendaciones = async (req: RequestAutenticado, res: Response) => {
    try {
        const nombre = req.query.nombre ? String(req.query.nombre).trim() : "";

        if (!nombre) {
            return buildError(res, "Falta el nombre del comandante", "COMANDANTE_NOMBRE_REQUERIDO", 400);
        }

        const resultado = await obtenerRecomendacionesComandante(req.usuarioId, nombre);
        buildResponse(res, resultado);
    } catch (error) {
        if (error instanceof ErrorComandante) {
            return buildError(res, error.message, "COMANDANTE_NO_VALIDO", 404);
        }
        console.error("Error obteniendo recomendaciones del comandante: ", error);
        buildError(res, "No se pudieron obtener las recomendaciones", "COMANDANTE_RECOMENDACIONES_ERROR", 502);
    }
};
