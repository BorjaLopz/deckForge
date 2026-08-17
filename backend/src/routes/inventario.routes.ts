import { Router } from "express";
import { agregarInventario, ajustarCantidad, eliminarDeInventario, listarInventario } from "../controllers/inventario.controller";
import { verificarAuth } from "../middlewares/auth.middleware";

const router = Router();
router.post("/", verificarAuth, agregarInventario);
router.get("/", verificarAuth, listarInventario);
router.patch("/:cartaId", verificarAuth, ajustarCantidad);
router.delete("/:cartaId", verificarAuth, eliminarDeInventario);

export default router;