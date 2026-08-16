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
        <section>
            <form onSubmit={handleOnSearch}>
                <label htmlFor="">Buscador de cartas</label>
                <input type="text" placeholder="Introduce el nombre de la carta" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </form>

            {cargando && <p>Buscando...</p>}

            {resultados?.slice(0, 5).map((carta) => (
                <CartaResumen
                    key={carta.id}
                    id={carta.id}
                    nombre={carta.name}
                    imagen={carta.image_uris?.small}
                    expansion={carta.set_name}
                    numeroColeccion={carta.collector_number}
                    variante="lista"
                />
            ))}

            {totalCartas > 5 && (
                <Link to={`/buscar?nombre=${encodeURIComponent(busqueda)}`} state={{ resultadosPrevios: resultados }}>Ver todas ({totalCartas})</Link>
            )
            }
        </section >
    )
}

export default BuscadorCartas;