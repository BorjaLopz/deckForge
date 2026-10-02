interface ControlesCantidadProps {
    cantidad: number;
    onIncrementar: () => void;
    onDecrementar: () => void;
    onEliminar: () => void;
    className?: string;
    /* Motivo para no dejar sumar (ej. límite de copias del formato); se
       muestra como tooltip. Sin motivo, el "+" está activo. */
    motivoNoIncrementar?: string;
}

const ControlesCantidad = ({ cantidad, onIncrementar, onDecrementar, onEliminar, className = "", motivoNoIncrementar }: ControlesCantidadProps) => (
    <div className={`flex items-center justify-between bg-noc-surface border border-noc-divider rounded-lg px-1.5 py-1 shadow-[0px_1.2px_0px_rgba(0,0,0,0.03)] ${className}`}>
        <div className="flex items-center gap-0.5 bg-noc-bg rounded-full p-0.5">
            <button
                onClick={onDecrementar}
                aria-label="Quitar una unidad"
                className="w-6 h-6 flex items-center justify-center rounded-full text-noc-neutral-500 hover:text-noc-text hover:bg-noc-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-noc-accent"
            >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M1 5H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            </button>
            <span className="w-6 text-center text-sm font-medium text-noc-text tabular-nums">
                {cantidad}
            </span>
            <button
                onClick={onIncrementar}
                disabled={motivoNoIncrementar !== undefined}
                title={motivoNoIncrementar}
                aria-label={motivoNoIncrementar ?? "Añadir una unidad"}
                className="w-6 h-6 flex items-center justify-center rounded-full text-noc-neutral-500 hover:text-noc-text hover:bg-noc-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-noc-accent disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-noc-neutral-500 disabled:cursor-not-allowed"
            >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M5 1V9M1 5H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            </button>
        </div>

        <button
            onClick={onEliminar}
            aria-label="Quitar carta del inventario"
            className="w-7 h-7 flex items-center justify-center rounded-md text-noc-neutral-500 hover:text-red-400 hover:bg-red-950/30 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-noc-accent"
        >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <path d="M2 3.5H11M5 3.5V2.5C5 2 5.4 1.5 6 1.5H7C7.6 1.5 8 2 8 2.5V3.5M4.5 3.5V10.5C4.5 11 4.9 11.5 5.5 11.5H7.5C8.1 11.5 8.5 11 8.5 10.5V3.5"
                    stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </button>
    </div>
);

export default ControlesCantidad;
