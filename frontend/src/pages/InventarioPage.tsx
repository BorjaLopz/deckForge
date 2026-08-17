import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { obtenerInventario } from "../services/inventarioService";
import CartaResumen from "../components/CartaResumen";

const COLORES_DISPONIBLES = ["Blanco", "Azul", "Negro", "Rojo", "Verde", "Incoloro"];

const COLOR_HEX: Record<string, string> = {
    Blanco: "#f8f6d4",
    Azul: "#0e68ab",
    Negro: "#150b00",
    Rojo: "#d3202a",
    Verde: "#00733e",
    Incoloro: "#9c9c9c",
};

const InventarioPage = () => {
    const { accessToken } = useAuth();
    const [cartas, setCartas] = useState<any[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);

    /* Estados para los filtros de inventario */
    const [filtros, setFiltros] = useState({
        nombre: "",
        foil: undefined as boolean | undefined,
        colores: [] as string[],
        tipo: "",
        manaValueMin: "",
        manaValueMax: ""
    })

    const [filtrosAplicados, setFiltrosAplicados] = useState(filtros);

    const aplicarFiltros = () => {
        setFiltrosAplicados(filtros);
    };


    /* Función encargada de actualizar los filtros que se activaran desde el frontend para poder filtrar cartas de nuestro inventario */
    const actualizarFiltro = (campo: keyof typeof filtros, valor: any) => {
        setFiltros((prev) => ({ ...prev, [campo]: valor }));
    };

    const toggleColor = (color: string) => {
        setFiltros((prev) => ({
            ...prev,
            colores: prev.colores.includes(color)
                ? prev.colores.filter((c) => c !== color)
                : [...prev.colores, color]
        }));
    };

    useEffect(() => {
        if (!accessToken) return;

        const cargarInventario = async () => {
            setCargando(true);
            try {
                const resultado = await obtenerInventario(accessToken, {
                    nombre: filtros.nombre || undefined,
                    foil: filtros.foil,
                    colores: filtros.colores.join(","),
                    tipo: filtros.tipo || undefined,
                    manaValueMin: filtros.manaValueMin ? Number(filtros.manaValueMin) : undefined,
                    manaValueMax: filtros.manaValueMax ? Number(filtros.manaValueMax) : undefined,
                });
                setCartas(resultado);
            } catch (error) {
                console.error("Error cargando el inventario: ", error);
            } finally {
                setCargando(false);
            }
        }

        cargarInventario();
    }, [accessToken, filtrosAplicados])


    return (
        <div className="max-w-5xl mx-auto px-8 py-6">
            <h1 className="text-2xl font-heading font-medium text-noc-text mb-6">
                Mi inventario
            </h1>

            <div className="bg-noc-surface rounded-lg p-4 mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-noc-neutral-500">Nombre</label>
                    <input
                        type="text"
                        value={filtros.nombre}
                        onChange={(e) => actualizarFiltro("nombre", e.target.value)}
                        className="bg-noc-bg border border-noc-divider rounded-md px-3 py-1.5 text-sm text-noc-text focus:outline-none focus:border-noc-accent"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs text-noc-neutral-500">Colores</label>
                    <div className="flex gap-1.5">
                        {COLORES_DISPONIBLES.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => toggleColor(color)}
                                title={color}
                                className={`w-7 h-7 rounded-full border-2 transition-all ${filtros.colores.includes(color)
                                    ? "border-noc-accent opacity-100"
                                    : "border-noc-divider opacity-30"
                                    }`}
                            >
                                <div className="w-full h-full rounded-full bg-noc-neutral-700"
                                    style={{ backgroundColor: COLOR_HEX[color] }} />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs text-noc-neutral-500">Mín. maná</label>
                    <input
                        type="number"
                        min={0}
                        value={filtros.manaValueMin}
                        onChange={(e) => actualizarFiltro("manaValueMin", e.target.value)}
                        className="w-20 bg-noc-bg border border-noc-divider rounded-md px-3 py-1.5 text-sm text-noc-text focus:outline-none focus:border-noc-accent"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs text-noc-neutral-500">Máx. maná</label>
                    <input
                        type="number"
                        min={0}
                        value={filtros.manaValueMax}
                        onChange={(e) => actualizarFiltro("manaValueMax", e.target.value)}
                        className="w-20 bg-noc-bg border border-noc-divider rounded-md px-3 py-1.5 text-sm text-noc-text focus:outline-none focus:border-noc-accent"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs text-noc-neutral-500">Foil</label>
                    <select
                        value={filtros.foil === undefined ? "todos" : String(filtros.foil)}
                        onChange={(e) => {
                            const v = e.target.value;
                            actualizarFiltro("foil", v === "todos" ? undefined : v === "true");
                        }}
                        className="bg-noc-bg border border-noc-divider rounded-md px-3 py-1.5 text-sm text-noc-text focus:outline-none focus:border-noc-accent"
                    >
                        <option value="todos">Todos</option>
                        <option value="true">Solo foil</option>
                        <option value="false">Solo no-foil</option>
                    </select>
                </div>

                <button
                    onClick={aplicarFiltros}
                    className="bg-transparent border border-noc-accent text-noc-accent hover:bg-noc-accent-900 transition-colors rounded-lg px-4 py-1.5 text-sm font-medium"
                >
                    Aplicar filtros
                </button>
            </div>

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
                        imagen={carta.imagen_url}
                        numeroColeccion={String(carta.cantidad_poseida)}
                        variante="cuadricula"
                    />
                ))}
            </div>
        </div>
    );
}

export default InventarioPage;