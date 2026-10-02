import express from "express"
import cors from "cors"
import dotenv from "dotenv"

dotenv.config();

import cartasRoutes from "./routes/cartas.routes"
import cartasInventario from "./routes/inventario.routes"
import mazosRoutes from "./routes/mazos.routes"
import comandantesRoutes from "./routes/comandantes.routes"

const app = express();
app.use(cors());
app.use(express.json());

/* CARTAS */
app.use("/api/cartas", cartasRoutes)

/* INVENTARIO */
app.use("/api/inventario", cartasInventario)

/* MAZOS */
app.use("/api/mazos", mazosRoutes)

/* COMANDANTES (recomendaciones vía EDHREC) */
app.use("/api/comandantes", comandantesRoutes)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`)
})