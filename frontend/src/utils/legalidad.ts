import { FORMATOS, type Formato } from "./formatos";

export type TipoProblema = "prohibida" | "no_legal" | "restringida" | "fuera_de_colores";

export interface ProblemaLegalidad {
	tipo: TipoProblema;
	mensaje: string;
}

export interface CartaParaLegalidad {
	legalidades: Record<string, string> | null;
	identidad_color: string | null;
	cantidad: number;
}

/* Las claves de formato de Scryfall coinciden con las nuestras
   ("commander", "standard"...), así que se consulta directamente.
   Sin datos de legalidad (carta antigua sin rellenar) no avisamos de nada:
   mejor callar que dar un falso "no legal". */
export const problemasDeCarta = (
	carta: CartaParaLegalidad,
	formato: Formato,
	identidadComandante: string | null,
	esComandante: boolean
): ProblemaLegalidad[] => {
	const problemas: ProblemaLegalidad[] = [];
	const { etiqueta } = FORMATOS[formato];
	const estado = carta.legalidades?.[formato];

	if (estado === "banned") {
		problemas.push({ tipo: "prohibida", mensaje: `Prohibida en ${etiqueta}` });
	} else if (estado === "not_legal") {
		problemas.push({ tipo: "no_legal", mensaje: `No legal en ${etiqueta}` });
	} else if (estado === "restricted" && carta.cantidad > 1) {
		problemas.push({ tipo: "restringida", mensaje: `Restringida en ${etiqueta}: máximo 1 copia` });
	}

	/* Commander: cada carta tiene que caber en la identidad de color del
	   comandante ("WUG" admite "WU", "G" o incolora; no admite "R"). */
	if (FORMATOS[formato].usaComandante && identidadComandante !== null && !esComandante && carta.identidad_color !== null) {
		const fuera = [...carta.identidad_color].some((color) => !identidadComandante.includes(color));
		if (fuera) {
			problemas.push({ tipo: "fuera_de_colores", mensaje: "Fuera de los colores del comandante" });
		}
	}

	return problemas;
};
