import { Request, Response } from "express";
import { buildError, buildResponse } from "../utils/response";

export const buscar = async (req: Request, res: Response) => {
    try {
        const dataBruto = await fetch(`https://api.scryfall.com/cards/search?q=${req.query.nombre}&unique=prints`, {
            method: "GET",
            headers: {
                "User-Agent": "deckForge/1.0",
                "Accept": "application/json"
            }
        })

        if (!dataBruto.ok) {
            const errorData = await dataBruto.json();
            throw new Error(errorData.details || "Error desconocido de Scryfall");
        }

        const data = await dataBruto.json();
        buildResponse(res, data);

    } catch (error) {
        console.error("Error conectando a scryfall ", error);
        buildError(res, "No se pudo conectar con la api de scryfall", "SCRYFALL_FETCH_ERROR", 500)
    }
}