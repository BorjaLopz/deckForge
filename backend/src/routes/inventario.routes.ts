import { Router } from "express";
import { agregarInventario, listarInventario } from "../controllers/inventario.controller";
import { verificarAuth } from "../middlewares/auth.middleware";

const router = Router();
router.post("/", verificarAuth, agregarInventario);
router.get("/", verificarAuth, listarInventario);

export default router;