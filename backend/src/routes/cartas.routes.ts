import { Router } from "express";
import { buscar, obtenerPorId } from "../controllers/cartas.controller";

const router = Router();
router.get("/buscar", buscar)
router.get("/:scryfallId", obtenerPorId); // siempre la última, es la más "genérica"

export default router;