import { Router, RequestHandler } from "express";
import { agregarInventario, ajustarCantidad, eliminarDeInventario, importarInventario, listarInventario } from "../controllers/inventario.controller";
import { verificarAuth } from "../middlewares/auth.middleware";

const router = Router();

/* verificarAuth garantiza req.usuarioId antes de llegar aquí: por eso
   el cast a RequestHandler, único punto donde Express (que solo conoce
   Request) y RequestAutenticado necesitan encontrarse. */
router.post("/", verificarAuth, agregarInventario as unknown as RequestHandler);
router.post("/importar", verificarAuth, importarInventario as unknown as RequestHandler);
router.get("/", verificarAuth, listarInventario as unknown as RequestHandler);
router.patch("/:cartaId", verificarAuth, ajustarCantidad as unknown as RequestHandler);
router.delete("/:cartaId", verificarAuth, eliminarDeInventario as unknown as RequestHandler);

export default router;