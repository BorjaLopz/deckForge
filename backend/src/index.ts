import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { Pool } from "pg";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
})

app.get("/api/ping", (req, res) => {
    res.json({ message: "pong desde Render", timestamp: Date.now() })
})

app.get("/api/db-check", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.json({ status: "ok", dbTime: result.rows[0].now });
    } catch (error) {
        console.error("Error conectando a la base de datos: ", error);
        res.status(500).json({ status: "error", message: "No se pudo conectar a la base de datos de supabase" });
    }
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`)
})