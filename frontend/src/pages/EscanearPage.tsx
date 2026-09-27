import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Tesseract from "tesseract.js";
import { reconocerCarta } from "../services/cartasService";
import { calcularMarcoGuia, parsearSetYNumero, recortarInfoColeccion, recortarTitulo, RELACION_CARTA } from "../utils/reconocimientoCarta";
import type { ResultadoReconocimiento } from "../types/scryfall";

/* `focusMode` no está en el estándar MediaTrackConstraintSet de TS todavía,
   aunque varios navegadores ya lo soportan como extensión. */
interface RestriccionConEnfoque extends MediaTrackConstraintSet {
    focusMode?: "continuous" | "manual" | "single-shot";
}

const EscanearPage = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const workerRef = useRef<Tesseract.Worker | null>(null);
    const procesandoRef = useRef(false); // evita solapar intentos del bucle automático
    const navigate = useNavigate();

    const [errorCamara, setErrorCamara] = useState<string | null>(null);
    const [leyendo, setLeyendo] = useState(false);
    const [buscando, setBuscando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resultado, setResultado] = useState<ResultadoReconocimiento | null>(null);

    /* Una vez capturada una foto, se revisan/corrigen estos campos a mano
       antes de mandarlos a Scryfall: el OCR es un punto de partida, no la
       verdad final. */
    const [campos, setCampos] = useState<{ nombre: string; set: string; numero: string } | null>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;

        const iniciarCamara = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "environment",
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                // Enfoque continuo si el navegador lo soporta: no es parte
                // del estándar MediaTrackConstraints todavía, de ahí el tipo aparte.
                // Best-effort — si falla, seguimos con el enfoque por defecto.
                try {
                    const [pista] = stream.getVideoTracks();
                    const restriccion: RestriccionConEnfoque = { focusMode: "continuous" };
                    await pista?.applyConstraints({ advanced: [restriccion] });
                } catch {
                    // el navegador no lo soporta, no pasa nada
                }
            } catch (err) {
                console.error("Error accediendo a la cámara: ", err);
                setErrorCamara("No se pudo acceder a la cámara. Revisa los permisos del navegador.");
            }
        };

        iniciarCamara();

        return () => {
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, []);

    useEffect(() => {
        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const obtenerWorker = async (): Promise<Tesseract.Worker> => {
        if (!workerRef.current) {
            workerRef.current = await Tesseract.createWorker(["eng", "spa"]);
        }
        return workerRef.current;
    };

    const capturarYLeer = async (automatico = false) => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || procesandoRef.current) return;

        procesandoRef.current = true;
        setLeyendo(true);
        setError(null);
        if (!automatico) {
            setResultado(null);
            setCampos(null);
        }

        try {
            const contexto = canvas.getContext("2d");
            if (!contexto) throw new Error("No se pudo procesar la imagen");

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            contexto.drawImage(video, 0, 0);

            const marco = calcularMarcoGuia(video.videoWidth, video.videoHeight);
            const recorteTitulo = recortarTitulo(canvas, marco);
            const recorteInfo = recortarInfoColeccion(canvas, marco);

            const worker = await obtenerWorker();

            // Un nombre de carta nunca lleva dígitos ni símbolos: si se le
            // cuela borde del coste de maná, que Tesseract ni se plantee
            // leerlo como número — solo letras (con acentos) y puntuación básica.
            await worker.setParameters({
                tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚÜÑáéíóúüñÆæ'-,."
            });
            const resultadoTitulo = await worker.recognize(recorteTitulo);

            // Aquí es al revés: solo dígitos, letras mayúsculas (código de
            // set) y los separadores que realmente aparecen ("/", "•").
            await worker.setParameters({
                tessedit_char_whitelist: "0123456789/•ABCDEFGHIJKLMNOPQRSTUVWXYZ "
            });
            const resultadoInfo = await worker.recognize(recorteInfo);

            const nombre = resultadoTitulo.data.text.trim().split("\n")[0]?.trim() ?? "";
            const { set, numero } = parsearSetYNumero(resultadoInfo.data.text);

            const setYNumeroOk = Boolean(set && numero);
            const nombrePlausible = nombre.length >= 4;

            if (automatico && !setYNumeroOk && !nombrePlausible) {
                // Todavía no hay nada legible: seguimos en la cámara, el
                // bucle de fondo lo reintentará solo, sin molestar al usuario.
                return;
            }

            setCampos({ nombre, set: set ?? "", numero: numero ?? "" });

            // Con set+número detectados, el backend hace lookup exacto y el
            // nombre deja de ser decisivo (por eso acierta aunque el OCR del
            // título salga sucio) — no hace falta esperar a que el usuario
            // pulse el botón. Sin ambos, el camino es el fuzzy por nombre,
            // mucho menos fiable con texto sucio: ahí sí espera revisión manual.
            if (setYNumeroOk) {
                await buscarPorValores(nombre || set!, set, numero);
            }
        } catch (err) {
            console.error("Error leyendo la carta: ", err);
            // En modo automático no plantamos un error visible por cada
            // intento fallido de fondo — solo si el usuario pidió la captura.
            if (!automatico) {
                setError("No se pudo procesar la foto. Inténtalo de nuevo.");
            }
        } finally {
            setLeyendo(false);
            procesandoRef.current = false;
        }
    };

    const buscarPorValores = async (nombre: string, set?: string, numero?: string) => {
        if (!nombre.trim() || buscando) return;

        setBuscando(true);
        setError(null);

        try {
            const carta = await reconocerCarta(nombre.trim(), set?.trim() || undefined, numero?.trim() || undefined);
            setResultado(carta);
        } catch (err) {
            console.error("Error reconociendo la carta: ", err);
            setError("No se encontró ninguna carta con ese nombre. Revisa cómo lo has escrito.");
        } finally {
            setBuscando(false);
        }
    };

    const buscarCarta = () => {
        if (!campos) return;
        buscarPorValores(campos.nombre, campos.set, campos.numero);
    };

    /* Bucle de fondo: mientras no haya nada detectado (campos === null),
       reintenta la lectura cada ~1.2s. Se para solo al detectar algo
       plausible (capturarYLeer se encarga de decidir eso) o al salir de la
       pantalla de cámara; se reactiva al volver con "Volver a la cámara". */
    useEffect(() => {
        if (errorCamara || campos) return;

        let activo = true;

        const ciclo = async () => {
            if (!activo) return;
            await capturarYLeer(true);
            if (activo) {
                setTimeout(ciclo, 1200);
            }
        };

        const id = setTimeout(ciclo, 1200);

        return () => {
            activo = false;
            clearTimeout(id);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [errorCamara, campos]);

    const volverACapturar = () => {
        setCampos(null);
        setResultado(null);
        setError(null);
    };

    return (
        <div className="max-w-2xl mx-auto px-8 py-6">
            <h1 className="text-2xl font-heading font-medium text-noc-text mb-1">
                Escanear carta
            </h1>
            <p className="text-sm text-noc-neutral-500 mb-6">
                Encuadra la carta dentro del marco — se lee sola en cuanto haya algo legible. Cuanta más luz y menos ángulo, mejor sale.
            </p>

            {errorCamara && <p className="text-sm text-red-400">{errorCamara}</p>}

            {/* La cámara vive SIEMPRE montada, aunque no se vea: si se
                desmonta al pasar a la revisión, se pierde la conexión con el
                stream y "Volver a la cámara" la deja muerta (el efecto que
                pide getUserMedia solo corre una vez, al montar la página). */}
            <div hidden={!!errorCamara || !!campos}>
                <div className="relative w-full rounded-lg overflow-hidden bg-black">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-auto block"
                    />

                    {/* Marco guía: misma proporción de carta real que se usa para recortar */}
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-noc-accent rounded-lg pointer-events-none"
                        style={{
                            width: "80%",
                            aspectRatio: RELACION_CARTA,
                        }}
                    />
                </div>

                <div className="flex items-center gap-2 mt-3 text-xs text-noc-neutral-500">
                    <span className={`w-1.5 h-1.5 rounded-full bg-noc-accent ${leyendo ? "animate-pulse" : "opacity-40"}`} aria-hidden="true" />
                    {leyendo ? "Leyendo..." : "Escaneando automáticamente — encuadra la carta y espera."}
                </div>

                <button
                    type="button"
                    onClick={() => capturarYLeer(false)}
                    disabled={leyendo}
                    className="w-full mt-2 bg-transparent border border-noc-divider text-noc-neutral-500 hover:text-noc-text hover:bg-noc-neutral-800 disabled:opacity-50 transition-colors rounded-lg py-2 text-sm font-medium"
                >
                    Capturar ahora
                </button>

                {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {!errorCamara && campos && (
                <div className="flex flex-col gap-3">
                    <p className="text-xs text-noc-neutral-500">
                        Revisa y corrige lo que haga falta antes de buscar — el OCR es solo un punto de partida.
                    </p>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-noc-neutral-500">Nombre</label>
                        <input
                            type="text"
                            value={campos.nombre}
                            onChange={(e) => setCampos({ ...campos, nombre: e.target.value })}
                            autoFocus
                            className="w-full bg-noc-bg border border-noc-divider rounded-md px-3 py-2 text-sm text-noc-text focus:outline-none focus:border-noc-accent"
                        />
                    </div>

                    <div className="flex gap-3">
                        <div className="flex flex-col gap-1 flex-1">
                            <label className="text-xs text-noc-neutral-500">Set (opcional)</label>
                            <input
                                type="text"
                                value={campos.set}
                                onChange={(e) => setCampos({ ...campos, set: e.target.value })}
                                placeholder="ej. ltr"
                                className="w-full bg-noc-bg border border-noc-divider rounded-md px-3 py-2 text-sm text-noc-text placeholder:text-noc-neutral-700 focus:outline-none focus:border-noc-accent"
                            />
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                            <label className="text-xs text-noc-neutral-500">Número (opcional)</label>
                            <input
                                type="text"
                                value={campos.numero}
                                onChange={(e) => setCampos({ ...campos, numero: e.target.value })}
                                placeholder="ej. 211"
                                className="w-full bg-noc-bg border border-noc-divider rounded-md px-3 py-2 text-sm text-noc-text placeholder:text-noc-neutral-700 focus:outline-none focus:border-noc-accent"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 mt-1">
                        <button
                            type="button"
                            onClick={buscarCarta}
                            disabled={buscando || !campos.nombre.trim()}
                            className="bg-transparent border border-noc-accent text-noc-accent hover:bg-noc-accent-900 disabled:opacity-50 transition-colors rounded-lg px-4 py-2 text-sm font-medium"
                        >
                            {buscando ? "Buscando..." : "Buscar carta"}
                        </button>
                        <button
                            type="button"
                            onClick={volverACapturar}
                            className="bg-transparent border border-noc-divider text-noc-neutral-500 hover:text-noc-text hover:bg-noc-neutral-800 transition-colors rounded-lg px-4 py-2 text-sm font-medium"
                        >
                            Volver a la cámara
                        </button>
                    </div>

                    {error && <p className="text-sm text-red-400">{error}</p>}

                    {resultado && (
                        <div className="flex items-center gap-4 bg-noc-surface border border-noc-divider rounded-lg p-4">
                            {resultado.imagenUrl && (
                                <img src={resultado.imagenUrl} alt={resultado.nombre} className="w-20 rounded-md shrink-0" />
                            )}
                            <div className="flex flex-col gap-2 min-w-0">
                                <p className="text-sm text-noc-neutral-500">¿Es esta carta?</p>
                                <p className="font-medium text-noc-text truncate">{resultado.nombre}</p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/carta/${resultado.scryfallId}`)}
                                        className="bg-transparent border border-noc-accent text-noc-accent hover:bg-noc-accent-900 transition-colors rounded-lg px-3 py-1.5 text-sm font-medium"
                                    >
                                        Sí, ver ficha
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setResultado(null)}
                                        className="bg-transparent border border-noc-divider text-noc-neutral-500 hover:text-noc-text hover:bg-noc-neutral-800 transition-colors rounded-lg px-3 py-1.5 text-sm font-medium"
                                    >
                                        No, corregir
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default EscanearPage;
