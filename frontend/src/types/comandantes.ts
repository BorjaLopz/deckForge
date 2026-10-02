export interface CartaRecomendada {
	scryfallId: string;
	oracleId: string | null; // común a todas las impresiones: sirve para saber si ya está en un mazo
	nombre: string; // tu nombre guardado si la tienes (ej. "Anillo solar"), si no el inglés
	nombreIngles: string;
	imagenUrl: string | null;
	imagenPequena: string | null;
	inclusion: number; // 0..1 — fracción de mazos de este comandante en EDHREC que la llevan
	sinergia: number;
	cantidadEnInventario: number;
}

export interface CategoriaRecomendada {
	categoria: string;
	cartas: CartaRecomendada[];
}

export interface ComandanteResumen {
	scryfallId: string;
	oracleId: string | null;
	nombre: string;
	nombreIngles: string;
	imagenUrl: string | null;
	cantidadEnInventario: number;
}

export interface RecomendacionesComandante {
	comandante: ComandanteResumen;
	numMazos: number;
	categorias: CategoriaRecomendada[];
}
