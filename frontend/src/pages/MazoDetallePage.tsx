import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { agregarCartaAMazo, agregarCartaPorNombreAMazo, ajustarCantidadEnMazo, eliminarCartaDeMazo, eliminarMazo, fijarComandante, obtenerMazo } from "../services/mazosService";
import { obtenerInventario } from "../services/inventarioService";
import { buscarCartas } from "../services/cartasService";
import { useBuscarEnInventario } from "../hooks/useBuscarEnInventario";
import CartaResumen from "../components/CartaResumen";
import ControlesCantidad from "../components/ControlesCantidad";
import SeccionPlegable from "../components/SeccionPlegable";
import FiltroCategorias from "../components/FiltroCategorias";
import { agruparPorTipo } from "../utils/tiposDeCarta";
import { esTierraBasica, estadoTamano, FORMATOS, puedeSerComandante } from "../utils/formatos";
import { problemasDeCarta } from "../utils/legalidad";
import { calcularEstadisticas } from "../utils/estadisticasMazo";
import EstadisticasMazo from "../components/EstadisticasMazo";
import type { CartaEnMazo, MazoDetalle } from "../types/mazos";

/* Resultado normalizado: de inventario trae cartaId; de Scryfall, el nombre
   en inglés (lo más fiable para que el fuzzy del backend acierte). */
interface ResultadoBusqueda {
    clave: string;
    nombre: string;
    detalle?: string;
    cartaId?: number;
    nombreScryfall?: string;
}

interface ResultadosBusqueda {
    enInventario: boolean;
    items: ResultadoBusqueda[];
}

const MazoDetallePage = () => {
    const { mazoId } = useParams();
    const { accessToken } = useAuth();
    const navigate = useNavigate();

    const [mazo, setMazo] = useState<MazoDetalle | null>(null);
    const [cargando, setCargando] = useState(true);

    const [buscando, setBuscando] = useState("");
    const { buscarEnInventario, setBuscarEnInventario } = useBuscarEnInventario();
    const [resultados, setResultados] = useState<ResultadosBusqueda>({ enInventario: true, items: [] });
    const controladorRef = useRef<AbortController | null>(null);

    const [agregandoClave, setAgregandoClave] = useState<string | null>(null);
    const [errorAgregar, setErrorAgregar] = useState<string | null>(null);

    const [copiado, setCopiado] = useState(false);
    const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
    const [errorCantidad, setErrorCantidad] = useState<string | null>(null);

    /* Truco igual que en InventarioPage/MazosPage: cambiar esta dependencia
       fuerza la recarga sin llamar a una función externa desde dentro del
       efecto (eso dispara react-hooks/set-state-in-effect). */
    const [recargar, setRecargar] = useState(0);

    useEffect(() => {
        if (!accessToken || !mazoId) return;

        const cargar = async () => {
            try {
                const resultado = await obtenerMazo(accessToken, Number(mazoId));
                setMazo(resultado);
            } catch (err) {
                console.error("Error cargando el mazo: ", err);
            } finally {
                setCargando(false);
            }
        };

        cargar();
    }, [accessToken, mazoId, recargar]);

    /* Un solo buscador con dos orígenes: tu inventario (añade por cartaId) o
       Scryfall (añade por nombre, queda como "falta"). Si `buscando` está
       vacío no se lanza nada — los resultados visibles se derivan en el
       render, sin "limpiar" estado aquí (evita setState síncrono en efecto). */
    useEffect(() => {
        if (!accessToken || !buscando.trim()) return;

        controladorRef.current?.abort();
        const controlador = new AbortController();
        controladorRef.current = controlador;

        const timeoutId = setTimeout(async () => {
            try {
                const items: ResultadoBusqueda[] = buscarEnInventario
                    ? (await obtenerInventario(accessToken, { nombre: buscando })).map((c) => ({
                        clave: `inv-${c.id}`,
                        nombre: c.nombre,
                        cartaId: c.id
                    }))
                    : (await buscarCartas(buscando, undefined, controlador.signal)).data.map((c) => ({
                        clave: `scry-${c.id}`,
                        nombre: c.printed_name ?? c.name,
                        detalle: c.set_name,
                        nombreScryfall: c.name
                    }));
                // obtenerInventario no acepta signal: descartamos a mano respuestas viejas
                if (controlador.signal.aborted) return;
                setResultados({ enInventario: buscarEnInventario, items });
            } catch (err) {
                if ((err as Error).name === "AbortError") return;
                console.error("Error buscando cartas: ", err);
            }
        }, 300);

        return () => {
            clearTimeout(timeoutId);
            controlador.abort();
        };
    }, [accessToken, buscando, buscarEnInventario]);

    const handleAgregar = async (resultado: ResultadoBusqueda) => {
        if (!accessToken || !mazoId || agregandoClave) return;

        setAgregandoClave(resultado.clave);
        setErrorAgregar(null);

        try {
            if (resultado.cartaId !== undefined) {
                await agregarCartaAMazo(accessToken, Number(mazoId), resultado.cartaId, 1);
            } else {
                await agregarCartaPorNombreAMazo(accessToken, Number(mazoId), resultado.nombreScryfall ?? resultado.nombre, 1);
            }
            setRecargar((r) => r + 1);
        } catch (err) {
            console.error("Error añadiendo la carta al mazo: ", err);
            setErrorAgregar(err instanceof Error ? err.message : "No se pudo añadir esa carta");
        } finally {
            setAgregandoClave(null);
        }
    };

    const handleAjustar = async (cartaId: number, delta: number) => {
        if (!accessToken || !mazoId) return;
        setErrorCantidad(null);
        try {
            await ajustarCantidadEnMazo(accessToken, Number(mazoId), cartaId, delta);
            setRecargar((r) => r + 1);
        } catch (err) {
            console.error("Error ajustando cantidad en el mazo: ", err);
            setErrorCantidad(err instanceof Error ? err.message : "No se pudo cambiar la cantidad");
        }
    };

    const handleComandante = async (cartaId: number | null) => {
        if (!accessToken || !mazoId) return;
        setErrorCantidad(null);
        try {
            await fijarComandante(accessToken, Number(mazoId), cartaId);
            setRecargar((r) => r + 1);
        } catch (err) {
            console.error("Error cambiando el comandante: ", err);
            setErrorCantidad(err instanceof Error ? err.message : "No se pudo cambiar el comandante");
        }
    };

    const handleQuitar = async (cartaId: number) => {
        if (!accessToken || !mazoId) return;
        try {
            await eliminarCartaDeMazo(accessToken, Number(mazoId), cartaId);
            setRecargar((r) => r + 1);
        } catch (err) {
            console.error("Error quitando la carta del mazo: ", err);
        }
    };

    const handleExportarFaltantes = async () => {
        if (!mazo) return;
        const faltantes = mazo.cartas.filter((c) => c.cantidad_faltante > 0);
        const texto = faltantes.map((c) => `${c.cantidad_faltante}x ${c.nombre}`).join("\n");

        try {
            await navigator.clipboard.writeText(texto);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } catch (err) {
            console.error("Error copiando al portapapeles: ", err);
        }
    };

    const handleEliminarMazo = async () => {
        if (!accessToken || !mazoId) return;
        try {
            await eliminarMazo(accessToken, Number(mazoId));
            navigate("/mazos");
        } catch (err) {
            console.error("Error eliminando el mazo: ", err);
        }
    };

    if (cargando) return <p className="max-w-3xl mx-auto px-8 py-6 text-noc-neutral-500">Cargando...</p>;
    if (!mazo) return <p className="max-w-3xl mx-auto px-8 py-6 text-red-400">Mazo no encontrado.</p>;

    const reglas = FORMATOS[mazo.formato];

    /* Copias por carta "lógica" (oracle_id): dos impresiones suman juntas,
       igual que en la comprobación del backend. */
    const claveCarta = (c: CartaEnMazo) => c.oracle_id ?? `id-${c.id}`;
    const copiasPorCarta = new Map<string, number>();
    for (const c of mazo.cartas) {
        copiasPorCarta.set(claveCarta(c), (copiasPorCarta.get(claveCarta(c)) ?? 0) + c.cantidad);
    }
    const enLimite = (c: CartaEnMazo) =>
        !esTierraBasica(c.type_line) && (copiasPorCarta.get(claveCarta(c)) ?? 0) >= reglas.maxCopias;
    const motivoLimite = reglas.maxCopias === 1
        ? `${reglas.etiqueta}: 1 copia por carta`
        : `${reglas.etiqueta}: máximo ${reglas.maxCopias} copias`;

    /* Para un resultado del buscador: ¿qué carta del mazo es? (por id si
       viene del inventario, por nombre si viene de Scryfall). */
    const cartaDelMazo = (r: ResultadoBusqueda) => r.cartaId !== undefined
        ? mazo.cartas.find((c) => c.id === r.cartaId)
        : mazo.cartas.find((c) => c.nombre.toLowerCase() === r.nombre.toLowerCase());
    const noSePuedeAnadir = (r: ResultadoBusqueda) => {
        const carta = cartaDelMazo(r);
        return carta !== undefined && enLimite(carta);
    };
    const tamano = estadoTamano(mazo.formato, mazo.cartas.reduce((s, c) => s + c.cantidad, 0));
    /* Si cambias el checkbox, los resultados del otro origen no se muestran
       hasta que llegue la búsqueda nueva. */
    const resultadosVisibles = buscando.trim() && resultados.enInventario === buscarEnInventario
        ? resultados.items
        : [];
    const cartasFaltantes = mazo.cartas.filter((c) => c.cantidad_faltante > 0);
    const copiasFaltantes = cartasFaltantes.reduce((s, c) => s + c.cantidad_faltante, 0);
    /* Sin comandante fijado (mazo hecho a mano): si solo hay una carta, lo
       normal es que sea el comandante; si no, probamos con el nombre del
       mazo. Es solo el texto inicial del buscador, se puede corregir. */
    const nombreComandante = mazo.cartas.find((c) => c.id === mazo.comandante_id)?.nombre
        ?? (mazo.cartas.length === 1 ? mazo.cartas[0]!.nombre : mazo.nombre);

    /* El comandante va en su propia sección, arriba; el resto por tipo. */
    const comandante = mazo.cartas.filter((c) => c.id === mazo.comandante_id);
    const esCandidata = (c: CartaEnMazo) =>
        reglas.usaComandante && c.id !== mazo.comandante_id && puedeSerComandante(c.type_line, c.descripcion);
    const candidatas = mazo.cartas.filter(esCandidata);
    const grupos = [
        ...(comandante.length > 0 ? [{ clave: "comandante", etiqueta: "Comandante", items: comandante }] : []),
        ...agruparPorTipo(mazo.cartas.filter((c) => c.id !== mazo.comandante_id), (c) => c.type_line)
    ];
    const copias = (cartas: CartaEnMazo[]) => cartas.reduce((suma, c) => suma + c.cantidad, 0);

    /* Legalidad: avisa, no bloquea (puedes estar armando un mazo casual).
       "Con problemas" es un grupo extra que solo se ve al filtrar por él,
       para no repetir cartas en la vista "Todas". */
    const identidadComandante = comandante[0]?.identidad_color ?? null;
    const problemasPorCarta = new Map(mazo.cartas.map((c) => [
        c.id,
        problemasDeCarta(c, mazo.formato, identidadComandante, c.id === mazo.comandante_id)
    ]));
    const conProblemas = mazo.cartas.filter((c) => problemasPorCarta.get(c.id)!.length > 0);
    const grupoProblemas = { clave: "problemas", etiqueta: "Con problemas", items: conProblemas };
    const opcionesFiltro = [...grupos, ...(conProblemas.length > 0 ? [grupoProblemas] : [])];

    // si quitas la última carta del tipo filtrado, volvemos a "Todas"
    const filtroEfectivo = opcionesFiltro.some((g) => g.clave === filtroTipo) ? filtroTipo : null;
    const gruposVisibles = filtroEfectivo === "problemas"
        ? [grupoProblemas]
        : grupos.filter((g) => filtroEfectivo === null || g.clave === filtroEfectivo);

    return (
        <div className="max-w-3xl mx-auto px-8 py-6">
            <Link to="/mazos" className="text-xs text-noc-neutral-500 hover:text-noc-text transition-colors">
                ← Volver a mis mazos
            </Link>

            <div className="flex items-center justify-between mt-2 mb-1">
                <h1 className="text-2xl font-heading font-medium text-noc-text">{mazo.nombre}</h1>
                <button
                    type="button"
                    onClick={handleEliminarMazo}
                    className="text-xs text-noc-neutral-500 hover:text-red-400 transition-colors"
                >
                    Eliminar mazo
                </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-6">
                <p className="text-xs text-noc-neutral-500">
                    {reglas.etiqueta} · <span className={`tabular-nums ${tamano.pasado ? "text-red-400" : tamano.completo ? "text-noc-accent" : "text-noc-text"}`}>
                        {tamano.texto}
                    </span> cartas
                    {mazo.cartas.length > 0 && <>
                        {" · "}{mazo.cartas.length - cartasFaltantes.length} de {mazo.cartas.length} ya las tienes
                        {copiasFaltantes > 0 && ` · te ${copiasFaltantes === 1 ? "falta 1 copia" : `faltan ${copiasFaltantes} copias`}`}
                    </>}
                </p>
                {reglas.usaComandante && (
                    <Link
                        to={`/mazos/comandante?mazo=${mazo.id}&nombre=${encodeURIComponent(nombreComandante)}`}
                        className="text-xs text-noc-neutral-500 hover:text-noc-text transition-colors"
                    >
                        Completar con recomendaciones →
                    </Link>
                )}
            </div>

            {errorCantidad && <p className="text-xs text-red-400 -mt-4 mb-4">{errorCantidad}</p>}

            {conProblemas.length > 0 && (
                <button
                    type="button"
                    onClick={() => setFiltroTipo("problemas")}
                    className="w-full text-left border border-red-400/30 rounded-lg px-4 py-3 mb-6 text-xs text-red-400 hover:border-red-400/60 transition-colors"
                >
                    {conProblemas.length === 1 ? "1 carta no es legal" : `${conProblemas.length} cartas no son legales`} en este mazo {reglas.etiqueta}.
                    <span className="text-noc-neutral-500"> Ver cuáles →</span>
                </button>
            )}

            {reglas.usaComandante && comandante.length === 0 && mazo.cartas.length > 0 && (
                <div className="border border-noc-divider rounded-lg px-4 py-3 mb-6 text-xs text-noc-neutral-500">
                    <p className="text-noc-text mb-1">Este mazo aún no tiene comandante.</p>
                    {candidatas.length === 0 ? (
                        <p>Añade una criatura legendaria y podrás elegirla aquí.</p>
                    ) : (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>Elegir:</span>
                            {candidatas.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => handleComandante(c.id)}
                                    className="text-noc-accent hover:text-noc-text transition-colors"
                                >
                                    {c.nombre}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="bg-noc-surface rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <label htmlFor="buscador-mazo" className="text-xs text-noc-neutral-500">Añadir carta</label>
                    <label className="flex items-center gap-1.5 text-xs text-noc-neutral-500 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={buscarEnInventario}
                            onChange={(e) => setBuscarEnInventario(e.target.checked)}
                            className="accent-noc-accent"
                        />
                        Solo en mi inventario
                    </label>
                </div>
                <input
                    id="buscador-mazo"
                    type="text"
                    value={buscando}
                    onChange={(e) => setBuscando(e.target.value)}
                    placeholder={buscarEnInventario ? "Busca en tu inventario..." : "Busca en todas las cartas..."}
                    className="w-full bg-noc-bg border border-noc-divider rounded-md px-3 py-2 text-sm text-noc-text placeholder:text-noc-neutral-500 focus:outline-none focus:border-noc-accent"
                />

                {resultadosVisibles.length > 0 && (
                    <div className="flex flex-col gap-1 mt-2">
                        {resultadosVisibles.slice(0, 10).map((r) => (
                            <div key={r.clave} className="flex items-center justify-between gap-2 px-2 py-1.5">
                                <span className="text-sm text-noc-text truncate">
                                    {r.nombre}
                                    {r.detalle && <span className="text-xs text-noc-neutral-500"> · {r.detalle}</span>}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleAgregar(r)}
                                    disabled={noSePuedeAnadir(r) || agregandoClave !== null}
                                    title={noSePuedeAnadir(r) ? motivoLimite : undefined}
                                    className="shrink-0 text-xs bg-transparent border border-noc-accent text-noc-accent hover:bg-noc-accent-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-md px-3 py-1"
                                >
                                    {noSePuedeAnadir(r)
                                        ? (reglas.maxCopias === 1 ? "Ya en el mazo" : `Máx. ${reglas.maxCopias}`)
                                        : agregandoClave === r.clave ? "Añadiendo..."
                                        : cartaDelMazo(r) ? "Otra copia" : "Añadir"}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {errorAgregar && <p className="text-xs text-red-400 mt-1">{errorAgregar}</p>}

                {cartasFaltantes.length > 0 && (
                    <button
                        type="button"
                        onClick={handleExportarFaltantes}
                        className="text-xs text-noc-neutral-500 hover:text-noc-text transition-colors mt-3"
                    >
                        {copiado ? "¡Copiado!" : `Copiar lista de faltantes (${cartasFaltantes.length})`}
                    </button>
                )}
            </div>

            {mazo.cartas.length === 0 ? (
                <p className="text-noc-neutral-500 italic">
                    Este mazo todavía no tiene cartas. Busca arriba para empezar a añadir.
                </p>
            ) : (
                <div className="flex flex-col gap-4">
                    <SeccionPlegable titulo="Estadísticas">
                        <EstadisticasMazo estadisticas={calcularEstadisticas(mazo.cartas, mazo.formato)} />
                    </SeccionPlegable>
                    <FiltroCategorias
                        opciones={opcionesFiltro.map((g) => ({ clave: g.clave, etiqueta: g.etiqueta, contador: copias(g.items) }))}
                        total={copias(mazo.cartas)}
                        seleccionada={filtroEfectivo}
                        onSeleccionar={setFiltroTipo}
                    />
                    {gruposVisibles
                        .map((g) => (
                            <SeccionPlegable key={g.clave} titulo={g.etiqueta} detalle={String(copias(g.items))}>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-2">
                                    {g.items.map((carta) => (
                                        <div key={carta.id} className="flex flex-col gap-2">
                                            <CartaResumen
                                                id={carta.scryfall_id}
                                                nombre={carta.nombre}
                                                expansion=""
                                                imagen={carta.imagen_url ?? undefined}
                                                numeroColeccion={carta.numero_carta ?? "—"}
                                                rareza={carta.rareza ?? undefined}
                                                variante="cuadricula"
                                            />
                                            <span className={`text-[11px] text-center ${carta.cantidad_faltante > 0 ? "text-noc-neutral-500" : "text-noc-accent"}`}>
                                                {carta.cantidad_faltante > 0 ? `Faltan ${carta.cantidad_faltante}` : "En tu inventario"}
                                            </span>
                                            {problemasPorCarta.get(carta.id)!.map((p) => (
                                                <span key={p.tipo} className="text-[11px] text-center text-red-400">{p.mensaje}</span>
                                            ))}
                                            {carta.id === mazo.comandante_id ? (
                                                <button type="button" onClick={() => handleComandante(null)} className="text-[11px] text-noc-neutral-500 hover:text-noc-text transition-colors">
                                                    Quitar como comandante
                                                </button>
                                            ) : esCandidata(carta) && (
                                                <button type="button" onClick={() => handleComandante(carta.id)} className="text-[11px] text-noc-neutral-500 hover:text-noc-text transition-colors">
                                                    Hacer comandante
                                                </button>
                                            )}
                                            <ControlesCantidad
                                                cantidad={carta.cantidad}
                                                onDecrementar={() => handleAjustar(carta.id, -1)}
                                                onIncrementar={() => handleAjustar(carta.id, 1)}
                                                onEliminar={() => handleQuitar(carta.id)}
                                                motivoNoIncrementar={enLimite(carta) ? motivoLimite : undefined}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </SeccionPlegable>
                        ))}
                </div>
            )}
        </div>
    );
};

export default MazoDetallePage;
