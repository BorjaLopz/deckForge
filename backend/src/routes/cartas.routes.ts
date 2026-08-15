import { Router } from "express";
import { buscar } from "../controllers/cartas.controller";

const router = Router();
router.get("/buscar", buscar)

export default router;