import type { VistaTarjetas } from "../hooks/useVistaTarjetas";

interface SelectorVistaCartasProps {
    vista: VistaTarjetas;
    onCambiar: (vista: VistaTarjetas) => void;
}

const SelectorVistaCartas = ({ vista, onCambiar }: SelectorVistaCartasProps) => (
    <div className="flex items-center gap-0.5 bg-noc-surface border border-noc-divider rounded-full p-0.5">
        <button
            type="button"
            onClick={() => onCambiar("cuadricula")}
            aria-label="Vista de cuadrícula"
            aria-pressed={vista === "cuadricula"}
            className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${vista === "cuadricula" ? "bg-noc-accent-900 text-noc-accent" : "text-noc-neutral-500 hover:text-noc-text"}`}
        >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <rect x="1" y="1" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <rect x="7.5" y="1" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <rect x="1" y="7.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            </svg>
        </button>
        <button
            type="button"
            onClick={() => onCambiar("lista")}
            aria-label="Vista de lista"
            aria-pressed={vista === "lista"}
            className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${vista === "lista" ? "bg-noc-accent-900 text-noc-accent" : "text-noc-neutral-500 hover:text-noc-text"}`}
        >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <path d="M1 2.5H12M1 6.5H12M1 10.5H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
        </button>
    </div>
);

export default SelectorVistaCartas;
