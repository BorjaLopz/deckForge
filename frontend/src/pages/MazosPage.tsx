import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { crearMazo, eliminarMazo, listarMazos } from "../services/mazosService";
import type { MazoResumen } from "../types/mazos";
import { estadoTamano, FORMATOS, OPCIONES_FORMATO, type Formato } from "../utils/formatos";

const MazosPage = () => {
    const { accessToken } = useAuth();
    const [mazos, setMazos] = useState<MazoResumen[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [nombreNuevo, setNombreNuevo] = useState("");
    const [formatoNuevo, setFormatoNuevo] = useState<Formato>("commander");
    const [creando, setCreando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /* Truco igual que en InventarioPage: para forzar una recarga tras crear
       un mazo, cambiamos esta dependencia en vez de llamar a una función
       externa desde dentro del efecto (eso dispara el lint de
       react-hooks/set-state-in-effect: solo puede verificar que el setState
       es seguro si la función async vive dentro del propio efecto). */
    const [recargar, setRecargar] = useState(0);

    useEffect(() => {
        if (!accessToken) return;

        const cargar = async () => {
            try {
                const resultado = await listarMazos(accessToken);
                setMazos(resultado);
            } catch (err) {
                console.error("Error cargando los mazos: ", err);
            } finally {
                setCargando(false);
            }
        };

        cargar();
    }, [accessToken, recargar]);

    const handleCrear = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken || !nombreNuevo.trim() || creando) return;

        setCreando(true);
        setError(null);

        try {
            await crearMazo(accessToken, nombreNuevo.trim(), formatoNuevo);
            setNombreNuevo("");
            setRecargar((r) => r + 1);
        } catch (err) {
            console.error("Error creando el mazo: ", err);
            setError("No se pudo crear el mazo.");
        } finally {
            setCreando(false);
        }
    };

    const handleEliminar = async (mazoId: number) => {
        if (!accessToken) return;
        try {
            await eliminarMazo(accessToken, mazoId);
            setMazos((prev) => prev.filter((m) => m.id !== mazoId));
        } catch (err) {
            console.error("Error eliminando el mazo: ", err);
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between gap-2 mb-6">
                <h1 className="text-2xl font-heading font-medium text-noc-text">
                    Mis mazos
                </h1>
                <Link
                    to="/mazos/comandante"
                    className="text-sm text-noc-neutral-500 hover:text-noc-text transition-colors"
                >
                    Desde comandante →
                </Link>
            </div>

            <form onSubmit={handleCrear} className="flex flex-wrap sm:flex-nowrap gap-2 mb-1">
                <input
                    type="text"
                    value={nombreNuevo}
                    onChange={(e) => setNombreNuevo(e.target.value)}
                    placeholder="Nombre del mazo nuevo..."
                    aria-label="Nombre del mazo nuevo"
                    className="flex-1 min-w-0 basis-full sm:basis-auto bg-noc-surface border border-noc-divider rounded-md px-3 py-2 text-sm text-noc-text placeholder:text-noc-neutral-500 focus:outline-none focus:border-noc-accent"
                />
                <select
                    value={formatoNuevo}
                    onChange={(e) => setFormatoNuevo(e.target.value as Formato)}
                    aria-label="Formato del mazo"
                    className="flex-1 sm:flex-none bg-noc-surface border border-noc-divider rounded-md px-3 py-2 text-sm text-noc-text focus:outline-none focus:border-noc-accent"
                >
                    {OPCIONES_FORMATO.map((o) => (
                        <option key={o.clave} value={o.clave}>{o.etiqueta}</option>
                    ))}
                </select>
                <button
                    type="submit"
                    disabled={creando || !nombreNuevo.trim()}
                    className="bg-transparent border border-noc-accent text-noc-accent hover:bg-noc-accent-900 disabled:opacity-50 transition-colors rounded-lg px-4 py-2 text-sm font-medium shrink-0"
                >
                    {creando ? "Creando..." : "Crear mazo"}
                </button>
            </form>
            <p className="text-xs text-noc-neutral-500 mb-6">
                {FORMATOS[formatoNuevo].tamanoExacto
                    ? `${FORMATOS[formatoNuevo].tamano} cartas exactas con el comandante, 1 copia de cada (salvo tierras básicas).`
                    : `Mínimo ${FORMATOS[formatoNuevo].tamano} cartas, hasta ${FORMATOS[formatoNuevo].maxCopias} copias de cada (salvo tierras básicas).`}
            </p>

            {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

            {cargando && <p className="text-noc-neutral-500">Cargando...</p>}

            {!cargando && mazos.length === 0 && (
                <p className="text-noc-neutral-500 italic">
                    Todavía no tienes ningún mazo. Crea uno arriba para empezar.
                </p>
            )}

            <div className="flex flex-col gap-2">
                {mazos.map((mazo) => (
                    <div
                        key={mazo.id}
                        className="flex items-center justify-between bg-noc-surface border border-noc-divider rounded-lg px-4 py-3"
                    >
                        <Link to={`/mazos/${mazo.id}`} className="flex flex-col gap-0.5 min-w-0 hover:text-noc-accent transition-colors">
                            <span className="font-medium text-noc-text truncate">{mazo.nombre}</span>
                            <span className="text-xs text-noc-neutral-500">
                                {FORMATOS[mazo.formato].etiqueta} · <span className={`tabular-nums ${estadoTamano(mazo.formato, mazo.total_copias).completo ? "text-noc-accent" : ""}`}>
                                    {estadoTamano(mazo.formato, mazo.total_copias).texto}
                                </span> cartas
                            </span>
                        </Link>
                        <button
                            type="button"
                            onClick={() => handleEliminar(mazo.id)}
                            aria-label={`Eliminar mazo ${mazo.nombre}`}
                            className="shrink-0 text-xs text-noc-neutral-500 hover:text-red-400 transition-colors ml-3"
                        >
                            Eliminar
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MazosPage;
