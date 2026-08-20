import { Request, Response, NextFunction } from "express"
import { supabase } from "../db/supabase"
import { buildError } from "../utils/response"
import { RequestAutenticado } from "../types/auth"

export const verificarAuth = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader?.startsWith("Bearer ")) {
        return buildError(res, "Token no proporcionado", "AUTH_TOKEN_MISSING", 401);
    }

    const access_token = authHeader.split(" ")[1]; // Obtenemos el access_token quitando el Bearer

    const { data, error } = await supabase.auth.getUser(access_token);

    if (error || !data.user) {
        return buildError(res, "Token inválido o expirado", "AUTH_TOKEN_INVALID", 401)
    }

    (req as RequestAutenticado).usuarioId = data.user.id;

    next();

}