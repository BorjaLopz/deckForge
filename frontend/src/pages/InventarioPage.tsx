import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { ajustarCantidadInventario, eliminarDeInventarioService, obtenerInventario } from "../services/inventarioService";
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

    const ajustarCantidad = async (cartaId: number, delta: number) => {
        if (!accessToken) return;
        try {
            await ajustarCantidadInventario(accessToken, cartaId, delta);
            setFiltrosAplicados({ ...filtrosAplicados }); // fuerza recarga del useEffect
        } catch (error) {
            console.error("Error ajustando cantidad: ", error);
        }
    };

    const eliminarCarta = async (cartaId: number) => {
        if (!accessToken) return;
        try {
            await eliminarDeInventarioService(accessToken, cartaId);
            setFiltrosAplicados({ ...filtrosAplicados }); // fuerza recarga
        } catch (error) {
            console.error("Error eliminando carta: ", error);
        }
    };

    useEffect(() => {
        if (!accessToken) return;

        let mostrarCargando = false;
        const timeoutId = setTimeout(() => {
            mostrarCargando = true;
            setCargando(true);
        }, 200);

        const cargarInventario = async () => {
            try {
                const resultado = await obtenerInventario(accessToken, {
                    nombre: filtrosAplicados.nombre || undefined,
                    foil: filtrosAplicados.foil,
                    colores: filtrosAplicados.colores.join(","),
                    tipo: filtrosAplicados.tipo || undefined,
                    manaValueMin: filtrosAplicados.manaValueMin ? Number(filtrosAplicados.manaValueMin) : undefined,
                    manaValueMax: filtrosAplicados.manaValueMax ? Number(filtrosAplicados.manaValueMax) : undefined,
                });
                setCartas(resultado);
            } catch (error) {
                console.error("Error cargando el inventario: ", error);
            } finally {
                clearTimeout(timeoutId);
                if (mostrarCargando) setCargando(false);
            }
        };

        cargarInventario();

        return () => clearTimeout(timeoutId);
    }, [accessToken, filtrosAplicados]);


    return (
        <div className="relative">
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

                {cargando && (
                    <div className="absolute inset-0 bg-noc-bg/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                        <p className="text-noc-text text-sm">Cargando...</p>
                    </div>
                )}

                {!cargando && cartas.length === 0 && (
                    <p className="text-noc-neutral-500 italic">
                        Todavía no tienes cartas en tu inventario.
                    </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {cartas.map((carta) => (
                        <div key={carta.id} className="flex flex-col gap-2">
                            <CartaResumen
                                id={carta.scryfall_id}
                                nombre={carta.nombre}
                                expansion={carta.numero_carta}
                                imagen={carta.imagen_url}
                                numeroColeccion={String(carta.cantidad_poseida)}
                                variante="cuadricula"
                            />
                            <div className="flex items-center justify-between bg-noc-surface rounded-lg px-2 py-1.5">
                                <button
                                    onClick={() => ajustarCantidad(carta.id, -1)}
                                    className="w-6 h-6 flex items-center justify-center text-noc-accent hover:bg-noc-accent-900 rounded-md transition-colors"
                                >
                                    −
                                </button>
                                <span className="text-sm text-noc-text">{carta.cantidad_poseida}</span>
                                <button
                                    onClick={() => ajustarCantidad(carta.id, 1)}
                                    className="w-6 h-6 flex items-center justify-center text-noc-accent hover:bg-noc-accent-900 rounded-md transition-colors"
                                >
                                    +
                                </button>
                                <button
                                    onClick={() => eliminarCarta(carta.id)}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors ml-2"
                                >
                                    Quitar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default InventarioPage;