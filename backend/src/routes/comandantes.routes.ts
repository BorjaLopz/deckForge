import { Router, RequestHandler } from "express";
import { recomendaciones } from "../controllers/comandantes.controller";
import { verificarAuth } from "../middlewares/auth.middleware";

const router = Router();

/* Con auth porque cruza las recomendaciones con tu inventario. */
router.get("/recomendaciones", verificarAuth, recomendaciones as unknown as RequestHandler);

export default router;
