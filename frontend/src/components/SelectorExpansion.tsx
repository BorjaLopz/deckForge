import { useEffect, useRef, useState } from "react";
import { obtenerExpansiones } from "../services/cartasService";
import type { ExpansionScryfall } from "../types/scryfall";

interface SelectorExpansionProps {
    value: string; // código de set (ej. "war"), vacío = sin filtro
    onChange: (code: string) => void;
}

const SelectorExpansion = ({ value, onChange }: SelectorExpansionProps) => {
    const [expansiones, setExpansiones] = useState<ExpansionScryfall[]>([]);
    const [texto, setTexto] = useState("");
    const [editando, setEditando] = useState(false);
    const contenedorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        obtenerExpansiones()
            .then(setExpansiones)
            .catch((error) => console.error("Error cargando expansiones: ", error));
    }, []);

    useEffect(() => {
        const cerrarSiFuera = (e: MouseEvent) => {
            if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
                setEditando(false);
            }
        };
        document.addEventListener("mousedown", cerrarSiFuera);
        return () => document.removeEventListener("mousedown", cerrarSiFuera);
    }, []);

    /* Nada de useEffect para reflejar `value` en el input: se calcula en cada
       render a partir de los props/estado actuales, así no hay setState en cascada. */
    const nombreSeleccionado = expansiones.find((e) => e.code === value)?.name ?? "";
    const textoMostrado = editando ? texto : nombreSeleccionado;

    const coincidencias = !editando
        ? []
        : texto.trim()
            ? expansiones
                .filter((e) =>
                    e.name.toLowerCase().includes(texto.toLowerCase()) ||
                    e.code.toLowerCase().includes(texto.toLowerCase())
                )
                .slice(0, 8)
            : expansiones.slice(0, 50); // sin filtro: las más recientes primero (ya vienen ordenadas así)

    const seleccionar = (expansion: ExpansionScryfall) => {
        setEditando(false);
        setTexto("");
        onChange(expansion.code);
    };

    const limpiar = () => {
        setEditando(false);
        setTexto("");
        onChange("");
    };

    return (
        <div ref={contenedorRef} className="relative flex flex-col gap-1">
            <label className="text-xs text-noc-neutral-500">Expansión</label>
            <div className="relative">
                <input
                    type="text"
                    value={textoMostrado}
                    placeholder="Buscar set..."
                    onChange={(e) => setTexto(e.target.value)}
                    onFocus={() => {
                        setEditando(true);
                        setTexto("");
                    }}
                    className="w-48 bg-noc-bg border border-noc-divider rounded-md pl-3 pr-7 py-1.5 text-sm text-noc-text focus:outline-none focus:border-noc-accent"
                />
                {textoMostrado && (
                    <button
                        type="button"
                        onClick={limpiar}
                        aria-label="Quitar filtro de expansión"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-noc-neutral-500 hover:text-noc-text transition-colors"
                    >
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
                            <path d="M1 1L8 8M8 1L1 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                    </button>
                )}
            </div>

            {editando && coincidencias.length > 0 && (
                <ul className="absolute top-full mt-1 w-64 max-h-36 overflow-y-auto bg-noc-surface border border-noc-divider rounded-md shadow-[0px_2px_4px_rgba(0,0,0,0.4)] z-20">
                    {coincidencias.map((expansion) => (
                        <li key={expansion.code}>
                            <button
                                type="button"
                                onClick={() => seleccionar(expansion)}
                                className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm text-left text-noc-text hover:bg-noc-accent-900 transition-colors"
                            >
                                <span className="truncate">{expansion.name}</span>
                                <span className="text-xs text-noc-neutral-500 uppercase shrink-0">{expansion.code}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SelectorExpansion;
