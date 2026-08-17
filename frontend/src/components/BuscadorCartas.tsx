import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { buscarCartas } from "../services/cartasService";
import CartaResumen from "./CartaResumen";

const BuscadorCartas = () => {
    const [busqueda, setBusqueda] = useState<string>("");
    const [resultados, setResultados] = useState<any[]>([]);
    const [cargando, setCargando] = useState<boolean>(false);
    const [totalCartas, setTotalCartas] = useState<number>(0);

    const handleOnSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setCargando(true);

        if (busqueda.length <= 0) {
            setResultados([]);
            setCargando(false);
            return;
        }

        try {
            const resultado = await buscarCartas(busqueda);
            setResultados(resultado.data);
            setTotalCartas(resultado.total_cards);
        } catch (error) {
            console.error("Error buscando la carta: ", error);
        } finally {
            setCargando(false);
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
                            nombre={carta.name}
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