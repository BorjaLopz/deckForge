import { useState } from "react";

const CLAVE_VISTA = "deckforge_vista_cartas";

export type VistaTarjetas = "cuadricula" | "lista";

const leerVistaGuardada = (): VistaTarjetas => {
    try {
        const guardada = localStorage.getItem(CLAVE_VISTA);
        return guardada === "lista" ? "lista" : "cuadricula";
    } catch {
        return "cuadricula"; // localStorage puede fallar (privado, bloqueado, etc.)
    }
};

/* Preferencia compartida entre InventarioPage y ListadoCartasPage: si
   cambias a lista en una, se mantiene al entrar en la otra. */
export const useVistaTarjetas = () => {
    const [vista, setVistaState] = useState<VistaTarjetas>(leerVistaGuardada);

    const setVista = (nuevaVista: VistaTarjetas) => {
        setVistaState(nuevaVista);
        try {
            localStorage.setItem(CLAVE_VISTA, nuevaVista);
        } catch {
            // sin persistencia si el navegador la bloquea, no es crítico
        }
    };

    return { vista, setVista };
};
