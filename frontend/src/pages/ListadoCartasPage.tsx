import { useEffect, useState } from "react";
import { useSearchParams, useLocation, Link } from "react-router-dom";
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
        <div>
            <h1>Resultados para "{nombre}"</h1>

            {cargando && <p>Cargando...</p>}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">

                {cartasPagina.map((carta) => (
                    <CartaResumen
                        key={carta.id}
                        id={carta.id}
                        nombre={carta.name}
                        imagen={carta.image_uris?.small}
                        expansion={carta.set_name}
                        numeroColeccion={carta.collector_number}
                        variante="cuadricula"
                    />
                ))}
            </div>

            <button disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}>
                Anterior
            </button>
            <span>Página {pagina} de {totalPaginas}</span>
            <button disabled={pagina === totalPaginas} onClick={() => setPagina((p) => p + 1)}>
                Siguiente
            </button>
        </div>
    );
}

export default ListadoCartasPage;