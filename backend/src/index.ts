import express from "express"
import cors from "cors"
import dotenv from "dotenv"

dotenv.config();

import cartasRoutes from "./routes/cartas.routes"
import cartasInventario from "./routes/inventario.routes"

const app = express();
app.use(cors());
app.use(express.json());

/* CARTAS */
app.use("/api/cartas", cartasRoutes)

/* INVENTARIO */
app.use("/api/inventario", cartasInventario)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`)
})