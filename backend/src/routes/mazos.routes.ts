import { Router, RequestHandler } from "express";
import { agregarCarta, ajustarCantidad, cambiarComandante, completarDesdeComandante, crear, crearDesdeComandante, eliminar, eliminarCarta, listar, obtener } from "../controllers/mazos.controller";
import { verificarAuth } from "../middlewares/auth.middleware";

const router = Router();

/* Mismo motivo que en inventario.routes.ts: verificarAuth garantiza
   req.usuarioId, pero Express solo conoce Request, de ahí el cast. */
router.post("/", verificarAuth, crear as unknown as RequestHandler);
router.post("/desde-comandante", verificarAuth, crearDesdeComandante as unknown as RequestHandler);
router.get("/", verificarAuth, listar as unknown as RequestHandler);
router.get("/:mazoId", verificarAuth, obtener as unknown as RequestHandler);
router.delete("/:mazoId", verificarAuth, eliminar as unknown as RequestHandler);
router.post("/:mazoId/cartas", verificarAuth, agregarCarta as unknown as RequestHandler);
router.put("/:mazoId/comandante", verificarAuth, cambiarComandante as unknown as RequestHandler);
router.post("/:mazoId/desde-comandante", verificarAuth, completarDesdeComandante as unknown as RequestHandler);
router.patch("/:mazoId/cartas/:cartaId", verificarAuth, ajustarCantidad as unknown as RequestHandler);
router.delete("/:mazoId/cartas/:cartaId", verificarAuth, eliminarCarta as unknown as RequestHandler);

export default router;
