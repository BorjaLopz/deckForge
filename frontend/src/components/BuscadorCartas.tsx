import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { buscarCartas } from "../services/cartasService";
import CartaResumen from "./CartaResumen";
import type { CartaScryfall } from "../types/scryfall";

const BuscadorCartas = () => {
    const [busqueda, setBusqueda] = useState<string>("");
    const [resultados, setResultados] = useState<CartaScryfall[]>([]);
    const [cargando, setCargando] = useState<boolean>(false);
    const [totalCartas, setTotalCartas] = useState<number>(0);

    /* Guarda la búsqueda en curso para poder cancelarla si llega una más nueva
       antes de que responda: sin esto, una respuesta lenta puede pisar el
       resultado de una búsqueda posterior más rápida. */
    const controladorRef = useRef<AbortController | null>(null);

    const handleOnSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();

        controladorRef.current?.abort();
        const controlador = new AbortController();
        controladorRef.current = controlador;

        setCargando(true);

        if (busqueda.length <= 0) {
            setResultados([]);
            setCargando(false);
            return;
        }

        try {
            const resultado = await buscarCartas(busqueda, undefined, controlador.signal);
            setResultados(resultado.data);
            setTotalCartas(resultado.total_cards);
        } catch (error) {
            if ((error as Error).name === "AbortError") return; // cancelada por una búsqueda más nueva
            console.error("Error buscando la carta: ", error);
        } finally {
            if (!controlador.signal.aborted) setCargando(false);
        }
    }

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            handleOnSearch();
        }, 300)

        return () => {
            clearTimeout(timeoutId);
        }
    }, [busqueda])

    useEffect(() => {
        return () => controladorRef.current?.abort();
    }, [])

    return (
        <section className="w-full">
            <form onSubmit={handleOnSearch} className="flex items-stretch bg-noc-surface rounded-lg shadow-lg overflow-hidden border border-noc-divider">
                <select
                    disabled
                    className="bg-transparent border-none border-r border-noc-divider px-3 text-sm text-noc-neutral-500 focus:outline-none cursor-not-allowed"
                >
                    <option>Magic</option>
                </select>
                <input
                    type="text"
                    placeholder="Busca una carta por nombre..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="flex-1 bg-transparent border-none px-4 py-3 text-sm text-noc-text placeholder:text-noc-neutral-500 focus:outline-none"
                />
                <button
                    type="submit"
                    className="bg-transparent border-l border-noc-divider text-noc-accent hover:bg-noc-accent-900 transition-colors px-5 text-sm font-medium"
                >
                    Buscar
                </button>
            </form>

            {cargando && <p className="text-sm text-noc-neutral-500 mt-2">Buscando...</p>}

            {resultados.length > 0 && (
                <div className="bg-noc-surface rounded-lg mt-2 overflow-hidden border border-noc-divider text-left">
                    {resultados.slice(0, 5).map((carta) => (
                        <CartaResumen
                            key={carta.id}
                            id={carta.id}
                            nombre={carta.printed_name ?? carta.name}
                            imagen={carta.image_uris?.normal}
                            expansion={carta.set_name}
                            numeroColeccion={carta.collector_number}
                        />
                    ))}

                    {totalCartas > 0 && (
                        <Link
                            to={`/buscar?nombre=${encodeURIComponent(busqueda)}`}
                            state={{ resultadosPrevios: resultados }}
                            className="block text-center text-sm text-noc-accent hover:text-noc-accent-light py-2.5 border-t border-noc-divider transition-colors"
                        >
                            Ver todas ({totalCartas})
                        </Link>
                    )}
                </div>
            )}
        </section>
    );
}

export default BuscadorCartas;