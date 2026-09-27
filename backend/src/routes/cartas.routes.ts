import { Router } from "express";
import { buscar, listarExpansiones, obtenerPorId, reconocerCarta } from "../controllers/cartas.controller";

const router = Router();
router.get("/buscar", buscar)
router.get("/expansiones", listarExpansiones)
router.post("/reconocer", reconocerCarta)
router.get("/:scryfallId", obtenerPorId); // siempre la última, es la más "genérica"

export default router;