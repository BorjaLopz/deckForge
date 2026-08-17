import { useEffect, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { buscarCartas } from "../services/cartasService";
import CartaResumen from "../components/CartaResumen";

const ListadoCartasPage = () => {
    const [searchParams] = useSearchParams();
    const location = useLocation();

    const resultadosPrevios = location.state?.resultadosPrevios;
    const nombre = searchParams.get("nombre");

    const [resultados, setResultados] = useState<any[]>(resultadosPrevios ?? []);
    const [cargando, setCargando] = useState<boolean>(!resultadosPrevios);
    const [pagina, setPagina] = useState<number>(1);

    useEffect(() => {
        if (resultadosPrevios) {
            return; // ya tenemos los datos, no hace falta pedirlos otra vez
        }

        if (!nombre) {
            return; // no hay término de búsqueda en la URL, nada que buscar
        }

        const cargarResultados = async () => {
            setCargando(true);
            try {
                const resultado = await buscarCartas(nombre);
                setResultados(resultado.data);
            } catch (error) {
                console.error("Error cargando el listado de cartas: ", error);
            } finally {
                setCargando(false);
            }
        };

        cargarResultados();
    }, [nombre]);

    const cartasPagina = resultados.slice((pagina - 1) * 25, pagina * 25);
    const totalPaginas = Math.ceil(resultados.length / 25);

    return (
        <div className="max-w-5xl mx-auto px-8 py-6">
            <div className="flex items-baseline justify-between mb-2">
                <h1 className="text-2xl font-heading font-medium text-noc-text">
                    Resultados para "{nombre}"
                </h1>
                <span className="text-sm text-noc-neutral-500">{resultados.length} cartas</span>
            </div>

            {cargando && <p className="text-noc-neutral-500 mt-4">Cargando...</p>}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6 mb-8">
                {cartasPagina.map((carta) => (
                    <CartaResumen
                        key={carta.id}
                        id={carta.id}
                        nombre={carta.name}
                        imagen={carta.image_uris?.large}
                        expansion={carta.set_name}
                        numeroColeccion={carta.collector_number}
                        variante="cuadricula"
                    />
                ))}
            </div>

            <div className="flex justify-center items-center gap-2">
                <button
                    disabled={pagina === 1}
                    onClick={() => setPagina((p) => p - 1)}
                    className="text-sm border border-noc-divider text-noc-text px-3 py-1.5 rounded-md hover:bg-noc-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    Anterior
                </button>
                <span className="text-sm text-noc-neutral-500 px-2">
                    Página {pagina} de {totalPaginas}
                </span>
                <button
                    disabled={pagina === totalPaginas}
                    onClick={() => setPagina((p) => p + 1)}
                    className="text-sm border border-noc-divider text-noc-text px-3 py-1.5 rounded-md hover:bg-noc-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    Siguiente
                </button>
            </div>
        </div>
    );
}

export default ListadoCartasPage;