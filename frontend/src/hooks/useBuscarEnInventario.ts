import { useState } from "react";

const CLAVE_BUSCAR_EN_INVENTARIO = "deckforge_mazo_buscar_en_inventario";

const leerPreferenciaGuardada = (): boolean => {
	try {
		return localStorage.getItem(CLAVE_BUSCAR_EN_INVENTARIO) !== "false";
	} catch {
		return true;
	}
};

/* Recuerda entre búsquedas (y visitas) si el buscador del mazo mira en tu
   inventario o en todo Scryfall. Por defecto: inventario. */
export const useBuscarEnInventario = () => {
	const [buscarEnInventario, setEstado] = useState<boolean>(leerPreferenciaGuardada);

	const setBuscarEnInventario = (valor: boolean) => {
		setEstado(valor);
		try {
			localStorage.setItem(CLAVE_BUSCAR_EN_INVENTARIO, String(valor));
		} catch {
			// sin persistencia si el navegador la bloquea, no es crítico
		}
	};

	return { buscarEnInventario, setBuscarEnInventario };
};
