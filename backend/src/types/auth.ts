import { Request } from "express";

export interface RequestAutenticado extends Request {
    usuarioId: string;
}
