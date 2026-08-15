import { Router } from "express";
import { agregarInventario } from "../controllers/inventario.controller";
import { verificarAuth } from "../middlewares/auth.middleware";

const router = Router();
router.post("/", verificarAuth, agregarInventario)

export default router;