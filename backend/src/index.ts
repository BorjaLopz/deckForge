import express from "express"
import cors from "cors"
import dotenv from "dotenv"

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/ping", (req, res) => {
    res.json({ message: "pong desde Render", timestamp: Date.now() })
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`)
})