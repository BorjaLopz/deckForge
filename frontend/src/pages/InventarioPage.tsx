import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { ajustarCantidadInventario, eliminarDeInventarioService, obtenerInventario } from "../services/inventarioService";
import CartaResumen from "../components/CartaResumen";
import BotonBusquedaAvanzada from "../components/BotonBusquedaAvanzada";
import PanelColapsable from "../components/PanelColapsable";
import ImportarInventario from "../components/ImportarInventario";
import type { CartaInventario } from "../types/inventario";
import { COLORES_DISPONIBLES, COLOR_HEX, TIPOS_DISPONIBLES, RAREZA_LABEL } from "../constants/cartas";

const InventarioPage = () => {
    const { accessToken } = useAuth();
    const [cartas, setCartas] = useState<CartaInventario[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [avanzadaAbierta, setAvanzadaAbierta] = useState<boolean>(false);

    /* Estados para los filtros de inventario */
    const [filtros, setFiltros] = useState({
        nombre: "",
        foil: undefined as boolean | undefined,
        colores: [] as string[],
        tipo: "",
        manaValueMin: "",
        manaValueMax: "",
        rareza: "",
        ordenarPor: "nombre",
        direccion: "asc"
    })

    const [filtrosAplicados, setFiltrosAplicados] = useState(filtros);

    const aplicarFiltros = () => {
        setFiltrosAplicados(filtros);
    };

    /* Limpia los filtros pero conserva nombre y orden: es "quitar filtros",
       no "resetear la vista" (mismo criterio que en ListadoCartasPage). */
    const limpiarFiltros = () => {
        const filtrosLimpios = {
            ...filtros,
            foil: undefined as boolean | undefined,
            colores: [] as string[],
            tipo: "",
            manaValueMin: "",
            manaValueMax: "",
            rareza: "",
        };
        setFiltros(filtrosLimpios);
        setFiltrosAplicados(filtrosLimpios);
    };

    /* Función encargada de actualizar los filtros que se activaran desde el frontend para poder filtrar cartas de nuestro inventario */
    const actualizarFiltro = <K extends keyof typeof filtros>(campo: K, valor: typeof filtros[K]) => {
        setFiltros((prev) => ({ ...prev, [campo]: valor }));
    };

    const cambiarOrden = (ordenarPor: string, direccion: string) => {
        setFiltros((prev) => ({ ...prev, ordenarPor, direccion }));
        setFiltrosAplicados((prev) => ({ ...prev, ordenarPor, direccion }));
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
                    rareza: filtrosAplicados.rareza || undefined,
                    ordenarPor: filtrosAplicados.ordenarPor,
                    direccion: filtrosAplicados.direccion,
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
                <h1 className="text-2xl font-heading font-medium text-noc-text mb-3">
                    Mi inventario
                </h1>

                <ImportarInventario onImportado={() => setFiltrosAplicados({ ...filtrosAplicados })} />

                <form
                    onSubmit={(e) => { e.preventDefault(); aplicarFiltros(); }}
                    className="bg-noc-surface rounded-lg p-4 mb-6"
                >
                    <div className="flex flex-wrap gap-4 items-end">
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
                            <label className="text-xs text-noc-neutral-500">Ordenar por</label>
                            <select
                                value={`${filtros.ordenarPor}:${filtros.direccion}`}
                                onChange={(e) => {
                                    const [ordenarPor, direccion] = e.target.value.split(":");
                                    cambiarOrden(ordenarPor, direccion);
                                }}
                                className="bg-noc-bg border border-noc-divider rounded-md px-3 py-1.5 text-sm text-noc-text focus:outline-none focus:border-noc-accent"
                            >
                                <option value="nombre:asc">Nombre (A-Z)</option>
                                <option value="nombre:desc">Nombre (Z-A)</option>
                                <option value="numero_carta:asc">Nº de carta</option>
                                <option value="cantidad:desc">Cantidad (mayor primero)</option>
                                <option value="cantidad:asc">Cantidad (menor primero)</option>
                            </select>
                        </div>

                        <BotonBusquedaAvanzada abierta={avanzadaAbierta} onToggle={() => setAvanzadaAbierta((v) => !v)} />

                        <button
                            type="submit"
                            className="bg-transparent border border-noc-accent text-noc-accent hover:bg-noc-accent-900 transition-colors rounded-lg px-4 py-1.5 text-sm font-medium"
                        >
                            Aplicar filtros
                        </button>
                    </div>

                    <PanelColapsable abierta={avanzadaAbierta}>
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
                            <label className="text-xs text-noc-neutral-500">Tipo</label>
                            <select
                                value={filtros.tipo}
                                onChange={(e) => actualizarFiltro("tipo", e.target.value)}
                                className="bg-noc-bg border border-noc-divider rounded-md px-3 py-1.5 text-sm text-noc-text focus:outline-none focus:border-noc-accent"
                            >
                                <option value="">Todos</option>
                                {TIPOS_DISPONIBLES.map((tipo) => (
                                    <option key={tipo} value={tipo}>{tipo}</option>
                                ))}
                            </select>
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

                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-noc-neutral-500">Rareza</label>
                            <select
                                value={filtros.rareza}
                                onChange={(e) => actualizarFiltro("rareza", e.target.value)}
                                className="bg-noc-bg border border-noc-divider rounded-md px-3 py-1.5 text-sm text-noc-text focus:outline-none focus:border-noc-accent"
                            >
                                <option value="">Todas</option>
                                {Object.entries(RAREZA_LABEL).map(([valor, etiqueta]) => (
                                    <option key={valor} value={valor}>{etiqueta}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={limpiarFiltros}
                            className="bg-transparent border border-noc-divider text-noc-neutral-500 hover:text-noc-text hover:bg-noc-neutral-800 transition-colors rounded-lg px-4 py-1.5 text-sm font-medium"
                        >
                            Limpiar filtros
                        </button>
                    </PanelColapsable>
                </form>

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
                                expansion={carta.numero_carta ?? ""}
                                imagen={carta.imagen_url ?? undefined}
                                numeroColeccion={String(carta.cantidad_poseida)}
                                rareza={carta.rareza ?? undefined}
                                variante="cuadricula"
                            />
                            <div className="flex items-center justify-between bg-noc-surface border border-noc-divider rounded-lg px-1.5 py-1 shadow-[0px_1.2px_0px_rgba(0,0,0,0.03)]">
                                <div className="flex items-center gap-0.5 bg-noc-bg rounded-full p-0.5">
                                    <button
                                        onClick={() => ajustarCantidad(carta.id, -1)}
                                        aria-label="Quitar una unidad"
                                        className="w-6 h-6 flex items-center justify-center rounded-full text-noc-neutral-500 hover:text-noc-text hover:bg-noc-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-noc-accent"
                                    >
                                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                                            <path d="M1 5H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                    <span className="w-6 text-center text-sm font-medium text-noc-text tabular-nums">
                                        {carta.cantidad_poseida}
                                    </span>
                                    <button
                                        onClick={() => ajustarCantidad(carta.id, 1)}
                                        aria-label="Añadir una unidad"
                                        className="w-6 h-6 flex items-center justify-center rounded-full text-noc-neutral-500 hover:text-noc-text hover:bg-noc-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-noc-accent"
                                    >
                                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                                            <path d="M5 1V9M1 5H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                </div>

                                <button
                                    onClick={() => eliminarCarta(carta.id)}
                                    aria-label="Quitar carta del inventario"
                                    className="w-7 h-7 flex items-center justify-center rounded-md text-noc-neutral-500 hover:text-red-400 hover:bg-red-950/30 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-noc-accent"
                                >
                                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                                        <path d="M2 3.5H11M5 3.5V2.5C5 2 5.4 1.5 6 1.5H7C7.6 1.5 8 2 8 2.5V3.5M4.5 3.5V10.5C4.5 11 4.9 11.5 5.5 11.5H7.5C8.1 11.5 8.5 11 8.5 10.5V3.5"
                                            stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
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