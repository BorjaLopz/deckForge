import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { agregarAInventario, obtenerCartaPorId } from "../services/cartasService";
import { useAuth } from "../hooks/useAuth";

const InformationCardPage = () => {
    const { scryfallId } = useParams();
    const [carta, setCarta] = useState<any>(null);
    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    /* Estados para el inventario */
    const { usuario, accessToken } = useAuth();
    const [guardando, setGuardando] = useState<boolean>(false);
    const [mensaje, setMensaje] = useState<string | null>(null);

    const handleAgregarInventario = async () => {
        if (!accessToken) return;

        setGuardando(true);
        setMensaje(null);

        try {
            await agregarAInventario(carta, accessToken);
            setMensaje("¡Carta Añadida a tu inventario!");
        } catch (error) {
            setMensaje("No se pudo añadir la carta");
        } finally {
            setGuardando(false);
        }

    }

    useEffect(() => {
        if (!scryfallId) return;

        const cargarCarta = async () => {
            setCargando(true);
            setError(null);
            try {
                const resultado = await obtenerCartaPorId(scryfallId);
                setCarta(resultado);
            } catch (err) {
                setError("No se pudo cargar la carta");
            } finally {
                setCargando(false);
            }
        };

        cargarCarta();
    }, [scryfallId]);

    if (cargando) return <p className="text-gray-300 text-center mt-10">Cargando...</p>;
    if (error || !carta) return <p className="text-red-400 text-center mt-10">{error ?? "Carta no encontrada"}</p>;

    return (
        <div className="max-w-4xl mx-auto px-8 py-6 flex flex-col md:flex-row gap-8 text-noc-text">
            <div className="shrink-0">
                {carta.image_uris?.large && (
                    <img
                        src={carta.image_uris.large}
                        alt={carta.name}
                        className="w-72 rounded-lg shadow-lg"
                    />
                )}
            </div>

            <div className="flex flex-col gap-3">
                <span className="inline-flex w-fit text-[11px] tracking-wide px-2.5 py-0.5 rounded-md bg-noc-neutral-800 text-noc-neutral-100">
                    Magic
                </span>

                <h1 className="text-2xl font-heading font-medium">{carta.name}</h1>

                <p className="text-noc-neutral-500 text-sm">
                    {carta.set_name} · {carta.tipos_traducidos?.join(" ")}
                    {carta.subtipos_carta?.length > 0 && ` — ${carta.subtipos_carta.join(" ")}`}
                </p>

                {(carta.prices?.eur || carta.prices?.eur_foil) && (
                    <div className="flex gap-3">
                        {carta.prices?.eur && (
                            <div className="bg-noc-surface rounded-lg p-3 flex-1">
                                <div className="text-[10px] tracking-widest uppercase text-noc-accent mb-1">
                                    Precio
                                </div>
                                <div className="font-heading font-medium text-noc-text">
                                    {carta.prices.eur} €
                                </div>
                            </div>
                        )}
                        {carta.prices?.eur_foil && (
                            <div className="bg-noc-surface rounded-lg p-3 flex-1">
                                <div className="text-[10px] tracking-widest uppercase text-noc-accent mb-1">
                                    Precio (Foil)
                                </div>
                                <div className="font-heading font-medium text-noc-text">
                                    {carta.prices.eur_foil} €
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-noc-surface rounded-lg p-4 mt-2">
                    <div className="text-[10px] tracking-widest uppercase text-noc-accent mb-2">
                        Texto de la carta
                    </div>
                    <p className="text-sm text-noc-text leading-relaxed whitespace-pre-line">
                        {carta.oracle_text}
                    </p>
                </div>

                {(carta.power || carta.toughness) && (
                    <p className="text-noc-neutral-300 text-sm">{carta.power}/{carta.toughness}</p>
                )}

                <p className="text-xs text-noc-neutral-500 italic">
                    {carta.mana_cost} · #{carta.collector_number}
                </p>

                <div className="flex gap-3 mt-2">
                    {usuario ? (
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={handleAgregarInventario}
                                disabled={guardando}
                                className="bg-transparent border border-noc-accent text-noc-accent hover:bg-noc-accent-900 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                {guardando ? "Guardando..." : "Añadir a mi colección"}
                            </button>
                            {mensaje && <p className="text-sm text-noc-neutral-400">{mensaje}</p>}
                        </div>
                    ) : (
                        <p className="text-sm text-noc-neutral-500 italic">
                            Inicia sesión para agregar esta carta a tu inventario
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InformationCardPage;