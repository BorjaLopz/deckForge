import { useEffect, useRef, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { buscarCartas } from "../services/cartasService";
import CartaResumen from "../components/CartaResumen";
import SelectorExpansion from "../components/SelectorExpansion";
import BotonBusquedaAvanzada from "../components/BotonBusquedaAvanzada";
import PanelColapsable from "../components/PanelColapsable";
import type { CartaScryfall } from "../types/scryfall";
import { COLORES_DISPONIBLES, COLOR_HEX, TIPOS_DISPONIBLES } from "../constants/cartas";

const ListadoCartasPage = () => {
    const [searchParams] = useSearchParams();
    const location = useLocation();

    const resultadosPrevios = location.state?.resultadosPrevios as CartaScryfall[] | undefined;
    const nombreInicial = searchParams.get("nombre") ?? "";

    const [resultados, setResultados] = useState<CartaScryfall[]>(resultadosPrevios ?? []);
    const [cargando, setCargando] = useState<boolean>(!resultadosPrevios);
    const [pagina, setPagina] = useState<number>(1);
    const [avanzadaAbierta, setAvanzadaAbierta] = useState<boolean>(false);

    const [filtros, setFiltros] = useState({
        nombre: nombreInicial,
        colores: [] as string[],
        tipo: "",
        set: "",
        cmcMin: "",
        cmcMax: "",
        ataqueMin: "",
        ataqueMax: "",
        vidaMin: "",
        vidaMax: "",
    });

    const [filtrosAplicados, setFiltrosAplicados] = useState(filtros);

    const aplicarFiltros = () => {
        setPagina(1);
        setFiltrosAplicados(filtros);
    };

    /* Limpia los filtros pero conserva el nombre: es "quitar filtros",
       no "borrar la búsqueda" que trajo aquí al usuario. */
    const limpiarFiltros = () => {
        const filtrosLimpios = {
            ...filtros,
            colores: [] as string[],
            tipo: "",
            set: "",
            cmcMin: "",
            cmcMax: "",
            ataqueMin: "",
            ataqueMax: "",
            vidaMin: "",
            vidaMax: "",
        };
        setFiltros(filtrosLimpios);
        setPagina(1);
        setFiltrosAplicados(filtrosLimpios);
    };

    const actualizarFiltro = <K extends keyof typeof filtros>(campo: K, valor: typeof filtros[K]) => {
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

    /* Solo la primerísima carga puede aprovechar los resultados que ya trajo
       el buscador rápido; cualquier "Aplicar filtros" posterior vuelve a pedir al backend. */
    const primerRenderRef = useRef(true);

    useEffect(() => {
        if (primerRenderRef.current) {
            primerRenderRef.current = false;
            if (resultadosPrevios) return;
        }

        if (!filtrosAplicados.nombre) {
            return; // nada que buscar sin nombre
        }

        const controlador = new AbortController();

        const cargarResultados = async () => {
            setCargando(true);
            try {
                const resultado = await buscarCartas(filtrosAplicados.nombre, {
                    set: filtrosAplicados.set || undefined,
                    colores: filtrosAplicados.colores.join(","),
                    tipo: filtrosAplicados.tipo || undefined,
                    cmcMin: filtrosAplicados.cmcMin ? Number(filtrosAplicados.cmcMin) : undefined,
                    cmcMax: filtrosAplicados.cmcMax ? Number(filtrosAplicados.cmcMax) : undefined,
                    ataqueMin: filtrosAplicados.ataqueMin ? Number(filtrosAplicados.ataqueMin) : undefined,
                    ataqueMax: filtrosAplicados.ataqueMax ? Number(filtrosAplicados.ataqueMax) : undefined,
                    vidaMin: filtrosAplicados.vidaMin ? Number(filtrosAplicados.vidaMin) : undefined,
                    vidaMax: filtrosAplicados.vidaMax ? Number(filtrosAplicados.vidaMax) : undefined,
                }, controlador.signal);
                setResultados(resultado.data);
            } catch (error) {
                if ((error as Error).name === "AbortError") return;
                console.error("Error cargando el listado de cartas: ", error);
            } finally {
                if (!controlador.signal.aborted) setCargando(false);
            }
        };

        cargarResultados();

        return () => controlador.abort();
    }, [filtrosAplicados]);

    const cartasPagina = resultados.slice((pagina - 1) * 25, pagina * 25);
    const totalPaginas = Math.ceil(resultados.length / 25);

    return (
        <div className="max-w-5xl mx-auto px-8 py-6">
            <div className="flex items-baseline justify-between mb-2">
                <h1 className="text-2xl font-heading font-medium text-noc-text">
                    Resultados para "{filtrosAplicados.nombre}"
                </h1>
                <span className="text-sm text-noc-neutral-500">{resultados.length} cartas</span>
            </div>

            <form
                onSubmit={(e) => { e.preventDefault(); aplicarFiltros(); }}
                className="bg-noc-surface rounded-lg p-4 mt-4"
            >
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-noc-neutral-500">Nombre</label>
                        <input
                            type="text"
                            value={filtros.nombre}
                            onChange={(e) => actualizarFiltro("nombre", e.target.value)}
                            className="w-40 bg-noc-bg border border-noc-divider rounded-md px-3 py-1.5 text-sm text-noc-text focus:outline-none focus:border-noc-accent"
                        />
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

                    <SelectorExpansion
                        value={filtros.set}
                        onChange={(codigo) => actualizarFiltro("set", codigo)}
                    />

                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-noc-neutral-500">Mín. maná</label>
                        <input
                            type="number"
                            min={0}
                            value={filtros.cmcMin}
                            onChange={(e) => actualizarFiltro("cmcMin", e.target.value)}
                            className="w-20 bg-noc-bg border border-noc-divider rounded-md px-3 py-1.5 text-sm text-noc-text focus:outline-none focus:border-noc-accent"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-noc-neutral-500">Máx. maná</label>
                        <input
                            type="number"
                            min={0}
                            value={filtros.cmcMax}
                            onChange={(e) => actualizarFiltro("cmcMax", e.target.value)}
                            className="w-20 bg-noc-bg border border-noc-divider rounded-md px-3 py-1.5 text-sm text-noc-text focus:outline-none focus:border-noc-accent"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-noc-neutral-500">Mín. fuerza</label>
                        <input
                            type="number"
                            min={0}
                            value={filtros.ataqueMin}
                            onChange={(e) => actualizarFiltro("ataqueMin", e.target.value)}
                            className="w-20 bg-noc-bg border border-noc-divider rounded-md px-3 py-1.5 text-sm text-noc-text focus:outline-none focus:border-noc-accent"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-noc-neutral-500">Máx. fuerza</label>
                        <input
                            type="number"
                            min={0}
                            value={filtros.ataqueMax}
                            onChange={(e) => actualizarFiltro("ataqueMax", e.target.value)}
                            className="w-20 bg-noc-bg border border-noc-divider rounded-md px-3 py-1.5 text-sm text-noc-text focus:outline-none focus:border-noc-accent"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-noc-neutral-500">Mín. vida</label>
                        <input
                            type="number"
                            min={0}
                            value={filtros.vidaMin}
                            onChange={(e) => actualizarFiltro("vidaMin", e.target.value)}
                            className="w-20 bg-noc-bg border border-noc-divider rounded-md px-3 py-1.5 text-sm text-noc-text focus:outline-none focus:border-noc-accent"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-noc-neutral-500">Máx. vida</label>
                        <input
                            type="number"
                            min={0}
                            value={filtros.vidaMax}
                            onChange={(e) => actualizarFiltro("vidaMax", e.target.value)}
                            className="w-20 bg-noc-bg border border-noc-divider rounded-md px-3 py-1.5 text-sm text-noc-text focus:outline-none focus:border-noc-accent"
                        />
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

            {cargando && <p className="text-noc-neutral-500 mt-4">Cargando...</p>}

            {!cargando && resultados.length === 0 && (
                <p className="text-noc-neutral-500 italic mt-4">
                    No hay cartas con ese criterio.
                </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6 mb-8">
                {cartasPagina.map((carta) => (
                    <CartaResumen
                        key={carta.id}
                        id={carta.id}
                        nombre={carta.printed_name ?? carta.name}
                        imagen={carta.image_uris?.large}
                        expansion={carta.set.toUpperCase()}
                        numeroColeccion={carta.collector_number}
                        rareza={carta.rarity}
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
