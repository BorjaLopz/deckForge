interface BotonBusquedaAvanzadaProps {
    abierta: boolean;
    onToggle: () => void;
}

const BotonBusquedaAvanzada = ({ abierta, onToggle }: BotonBusquedaAvanzadaProps) => (
    <button
        type="button"
        onClick={onToggle}
        aria-expanded={abierta}
        className="flex items-center gap-1.5 text-sm text-noc-neutral-500 hover:text-noc-text transition-colors pb-1.5"
    >
        Búsqueda avanzada
        <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"
            className={`transition-transform duration-200 ease-out ${abierta ? "rotate-180" : ""}`}
        >
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    </button>
);

export default BotonBusquedaAvanzada;
