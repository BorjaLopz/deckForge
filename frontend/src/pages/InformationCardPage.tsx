import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { obtenerCartaPorId } from "../services/cartasService";

const InformationCardPage = () => {
    const { scryfallId } = useParams();
    const [carta, setCarta] = useState<any>(null);
    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

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
        <div className="max-w-4xl mx-auto p-6 flex flex-col md:flex-row gap-6 text-gray-100">
            <div className="flex-shrink-0">
                {carta.image_uris?.normal && (
                    <img src={carta.image_uris.normal} alt={carta.name} className="w-72 rounded-xl shadow-lg" />
                )}
            </div>

            <div className="flex flex-col gap-3">
                <h1 className="text-2xl font-bold">{carta.name}</h1>
                <p className="text-gray-400">{carta.mana_cost}</p>
                <p className="text-sm text-gray-300">
                    {carta.tipos_traducidos?.join(" ")}
                    {carta.subtipos_carta?.length > 0 && ` — ${carta.subtipos_carta.join(" ")}`}
                </p>
                <p className="text-gray-200 whitespace-pre-line">{carta.oracle_text}</p>
                {(carta.power || carta.toughness) && (
                    <p className="text-gray-300">{carta.power}/{carta.toughness}</p>
                )}
                <p className="text-sm text-gray-500 italic">{carta.set_name} — #{carta.collector_number}</p>
            </div>
        </div>
    );
};

export default InformationCardPage;