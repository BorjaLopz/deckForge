import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { obtenerInventario } from "../services/inventarioService";
import CartaResumen from "../components/CartaResumen";

const InventarioPage = () => {
    const { accessToken } = useAuth();
    const [cartas, setCartas] = useState<any[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);

    useEffect(() => {
        if (!accessToken) return;

        const cargarInventario = async () => {
            setCargando(true);
            try {
                const resultado = await obtenerInventario(accessToken);
                setCartas(resultado);
            } catch (error) {
                console.error("Error cargando el inventario: ", error);
            } finally {
                setCargando(false);
            }
        }

        cargarInventario();
    }, [accessToken])

    return (
        <div className="max-w-5xl mx-auto px-8 py-6">
            <h1 className="text-2xl font-heading font-medium text-noc-text mb-6">
                Mi inventario
            </h1>

            {cargando && <p className="text-noc-neutral-500">Cargando...</p>}

            {!cargando && cartas.length === 0 && (
                <p className="text-noc-neutral-500 italic">
                    Todavía no tienes cartas en tu inventario.
                </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {cartas.map((carta) => (
                    <CartaResumen
                        key={carta.id}
                        id={carta.scryfall_id}
                        nombre={carta.nombre}
                        expansion={carta.numero_carta}
                        numeroColeccion={String(carta.cantidad_poseida)}
                        variante="cuadricula"
                    />
                ))}
            </div>
        </div>
    );
}

export default InventarioPage;