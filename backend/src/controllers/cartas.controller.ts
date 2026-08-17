import { Request, Response } from "express";
import { buildError, buildResponse } from "../utils/response";
import { translator } from "../utils/translator";

export const buscar = async (req: Request, res: Response) => {
    try {

        const { nombre } = req.query;

        const partesQuery = [
            nombre,
            "(lang:en or lang:es)"
        ].filter(Boolean).join(" ");

        const dataBruto = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(partesQuery)}&unique=prints`, {
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

export const obtenerPorId = async (req: Request, res: Response) => {
    try {
        const { scryfallId } = req.params;

        const dataBruto = await fetch(`https://api.scryfall.com/cards/${scryfallId}`, {
            method: "GET",
            headers: {
                "User-Agent": "deckForge/1.0",
                "Accept": "application/json"
            }
        });

        if (!dataBruto.ok) {
            const errorData = await dataBruto.json();
            throw new Error(errorData.details || "Error desconocido de Scryfall");
        }

        const data = await dataBruto.json();

        const tipoParte = data.type_line.split("—")[0];
        const tiposTraducidos = tipoParte.trim().split(" ").map((t: string) => translator("tipos", t));

        let subtipos: string[] = [];
        if (data.type_line.includes("—")) {
            subtipos = data.type_line.split("—")[1].trim().split(" ");
        }

        const coloresTraducidos = (data.colors || []).map((c: string) => translator("color", c));

        buildResponse(res, {
            ...data,
            tipos_traducidos: tiposTraducidos,
            subtipos_carta: subtipos,
            colores_traducidos: coloresTraducidos
        });
    } catch (error) {
        console.error("Error obteniendo la carta: ", error);
        buildError(res, "No se pudo obtener la carta", "SCRYFALL_FETCH_ERROR", 500);
    }
};