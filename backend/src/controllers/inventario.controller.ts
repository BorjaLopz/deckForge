import { Response } from "express";
import { buildError, buildResponse } from "../utils/response";
import { actualizarCantidadInventario, eliminarCartaDeInventario, guardarCartaEnInventario, obtenerInventario } from "../services/inventario.services";
import { RequestAutenticado } from "../types/auth";
import { CartaParaInventario } from "../types/inventario";
import { construirCartaParaInventario, resolverCartaPreferentementeEnEspanol } from "../utils/importarDesdeScryfall";

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const agregarInventario = async (req: RequestAutenticado, res: Response) => {
    try {
        const carta: CartaParaInventario = req.body;
        const cartaId = await guardarCartaEnInventario(carta, req.usuarioId);
        buildResponse(res, { cartaId });
    } catch (error) {
        console.error("Error al guardar la carta en inventario", error);
        buildError(res, "No se pudo guardar la carta", "INVENTARIO_INSERT_ERROR", 500);
    }
}

export const listarInventario = async (req: RequestAutenticado, res: Response) => {
    try {
        const usuarioId = req.usuarioId;

        const nombre = req.query.nombre ? String(req.query.nombre) : undefined;

        const colores = req.query.colores
            ? String(req.query.colores).split(",")
            : undefined;

        const tipo = req.query.tipo ? String(req.query.tipo) : undefined;
        const foil = req.query.foil !== undefined ? req.query.foil === "true" : undefined;

        /* Confirmamos con seguridad que sean valores numéricos */
        const manaValueMinRaw = req.query.manaValueMin !== undefined ? Number(req.query.manaValueMin) : undefined;
        const manaValueMin = manaValueMinRaw !== undefined && !isNaN(manaValueMinRaw) ? manaValueMinRaw : undefined;

        const manaValueMaxRaw = req.query.manaValueMax !== undefined ? Number(req.query.manaValueMax) : undefined;
        const manaValueMax = manaValueMaxRaw !== undefined && !isNaN(manaValueMaxRaw) ? manaValueMaxRaw : undefined;

        const ordenarPor = req.query.ordenarPor ? String(req.query.ordenarPor) : undefined;
        const direccion = req.query.direccion ? String(req.query.direccion) : undefined;
        const rareza = req.query.rareza ? String(req.query.rareza) : undefined;

        const resultado = await obtenerInventario(usuarioId,
            {
                nombre,
                foil,
                colores,
                tipo,
                manaValueMax,
                manaValueMin,
                rareza,
                ordenarPor,
                direccion
            }
        );
        buildResponse(res, resultado);
    } catch (error) {
        console.error("Error obteniendo el inventario", error);
        buildError(res, "No se pudo obtener el inventario", "INVENTARIO_FETCH_ERROR", 500);
    }
}

export const ajustarCantidad = async (req: RequestAutenticado, res: Response) => {
    try {
        const usuarioId = req.usuarioId;
        const { cartaId } = req.params;
        const { delta } = req.body;

        if (typeof delta !== "number") {
            return buildError(res, "El delta debe de ser un numero", "INVENTARIO_DELTA_INVALIDO", 400);
        }

        const resultado = await actualizarCantidadInventario(usuarioId, Number(cartaId), delta);
        buildResponse(res, resultado)
    } catch (error) {
        console.error("Error ajustando cantidad. ", error);
        buildError(res, "No se pudo ajustar la cantidad", "INVENTARIO_UPDATE_ERROR", 500)
    }
}

/* Formato de línea: "<cantidad> <nombre de la carta>", ej. "4 Lightning Bolt".
   Cada carta es una petición a Scryfall (con pausa entre una y otra para
   respetar su rate limit), así que una lista larga tarda su tiempo. */
export const importarInventario = async (req: RequestAutenticado, res: Response) => {
    try {
        const { texto } = req.body;

        if (!texto || typeof texto !== "string") {
            return buildError(res, "Falta el texto a importar", "INVENTARIO_IMPORTAR_TEXTO_REQUERIDO", 400);
        }

        const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);

        const importadas: { linea: string; nombre: string; cantidad: number }[] = [];
        const fallidas: { linea: string; motivo: string }[] = [];

        for (const linea of lineas) {
            const match = linea.match(/^(\d+)\s+(.+)$/);

            if (!match) {
                fallidas.push({ linea, motivo: 'Formato no reconocido (esperado: "cantidad nombre")' });
                continue;
            }

            const cantidad = Number(match[1]);
            const nombreBuscado = match[2]!.trim();

            try {
                const cartaBruta = await resolverCartaPreferentementeEnEspanol(nombreBuscado);
                const cartaParaInventario = construirCartaParaInventario(cartaBruta);
                await guardarCartaEnInventario(cartaParaInventario, req.usuarioId, cantidad);
                importadas.push({ linea, nombre: cartaParaInventario.nombre, cantidad });
            } catch (error) {
                fallidas.push({ linea, motivo: error instanceof Error ? error.message : "Error desconocido" });
            }

            await esperar(100);
        }

        buildResponse(res, { importadas, fallidas });
    } catch (error) {
        console.error("Error importando inventario: ", error);
        buildError(res, "No se pudo importar el inventario", "INVENTARIO_IMPORTAR_ERROR", 500);
    }
}

export const eliminarDeInventario = async (req: RequestAutenticado, res: Response) => {
    try {
        const usuarioId = req.usuarioId;
        const { cartaId } = req.params;
        await eliminarCartaDeInventario(usuarioId, Number(cartaId));
        buildResponse(res, { eliminado: true });
    } catch (error) {
        console.error("Error eliminando del inventario. ", error);
        buildError(res, "No se pudo eliminar la carta", "INVENTARIO_DELETE_ERROR", 500);
    }
}