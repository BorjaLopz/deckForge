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

    /* TODO: quitar este panel de logs — es temporal, para depurar en el móvil
       donde no hay devtools a mano. */
    const [logs, setLogs] = useState<string[]>([]);
    const registrar = (mensaje: string) => {
        console.log("[escanear]", mensaje);
        setLogs((prev) => [...prev, mensaje]);
    };

    useEffect(() => {
        let stream: MediaStream | null = null;

        const iniciarCamara = async () => {
            try {
                registrar("Pidiendo acceso a la cámara...");
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
                // del estándar MediaTrackConstraints todavía, de ahí el `any`.
                // Best-effort — si falla, seguimos con el enfoque por defecto.
                try {
                    const [pista] = stream.getVideoTracks();
                    const restriccion: RestriccionConEnfoque = { focusMode: "continuous" };
                    await pista?.applyConstraints({ advanced: [restriccion] });
                } catch {
                    // el navegador no lo soporta, no pasa nada
                }

                registrar("Cámara conectada.");
            } catch (err) {
                registrar(`Error de cámara: ${err instanceof Error ? err.message : String(err)}`);
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
            registrar("Cargando motor de OCR (primera vez descarga datos, tarda más)...");
            workerRef.current = await Tesseract.createWorker(["eng", "spa"]);
            registrar("Motor de OCR listo.");
        }
        return workerRef.current;
    };

    const capturarYLeer = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || leyendo) return;

        setLeyendo(true);
        setError(null);
        setResultado(null);
        setCampos(null);

        try {
            registrar(`Capturando fotograma (${video.videoWidth}x${video.videoHeight})...`);
            const contexto = canvas.getContext("2d");
            if (!contexto) throw new Error("No se pudo procesar la imagen");

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            contexto.drawImage(video, 0, 0);

            const marco = calcularMarcoGuia(video.videoWidth, video.videoHeight);
            const recorteTitulo = recortarTitulo(canvas, marco);
            const recorteInfo = recortarInfoColeccion(canvas, marco);

            const worker = await obtenerWorker();

            registrar("Leyendo título...");
            const resultadoTitulo = await worker.recognize(recorteTitulo);
            registrar(`OCR título (crudo): "${resultadoTitulo.data.text.trim()}"`);

            registrar("Leyendo set/número...");
            const resultadoInfo = await worker.recognize(recorteInfo);
            registrar(`OCR set/número (crudo): "${resultadoInfo.data.text.trim()}"`);

            const nombre = resultadoTitulo.data.text.trim().split("\n")[0]?.trim() ?? "";
            const { set, numero } = parsearSetYNumero(resultadoInfo.data.text);
            registrar(`Parseado -> nombre: "${nombre}" | set: ${set ?? "(ninguno)"} | número: ${numero ?? "(ninguno)"}`);

            // Siempre pasamos a la pantalla de revisión, aunque el OCR no
            // haya leído nada: mejor dejar corregir/rellenar a mano que
            // dejar al usuario sin salida.
            setCampos({ nombre, set: set ?? "", numero: numero ?? "" });
        } catch (err) {
            const mensaje = err instanceof Error ? err.message : String(err);
            registrar(`Error: ${mensaje}`);
            console.error("Error leyendo la carta: ", err);
            setError("No se pudo procesar la foto. Inténtalo de nuevo.");
        } finally {
            setLeyendo(false);
        }
    };

    const buscarCarta = async () => {
        if (!campos || !campos.nombre.trim() || buscando) return;

        setBuscando(true);
        setError(null);

        try {
            registrar(`Consultando a Scryfall: nombre="${campos.nombre}" set="${campos.set}" numero="${campos.numero}"...`);
            const carta = await reconocerCarta(campos.nombre.trim(), campos.set.trim() || undefined, campos.numero.trim() || undefined);
            registrar(`Resuelto: "${carta.nombre}" (scryfallId=${carta.scryfallId})`);
            setResultado(carta);
        } catch (err) {
            const mensaje = err instanceof Error ? err.message : String(err);
            registrar(`Error: ${mensaje}`);
            console.error("Error reconociendo la carta: ", err);
            setError("No se encontró ninguna carta con ese nombre. Revisa cómo lo has escrito.");
        } finally {
            setBuscando(false);
        }
    };

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
                Encuadra la carta dentro del marco y pulsa el botón. Cuanta más luz y menos ángulo, mejor sale.
            </p>

            {errorCamara ? (
                <p className="text-sm text-red-400">{errorCamara}</p>
            ) : !campos ? (
                <>
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

                    <canvas ref={canvasRef} className="hidden" />

                    <button
                        type="button"
                        onClick={capturarYLeer}
                        disabled={leyendo}
                        className="w-full mt-4 bg-transparent border border-noc-accent text-noc-accent hover:bg-noc-accent-900 disabled:opacity-50 transition-colors rounded-lg py-2.5 text-sm font-medium"
                    >
                        {leyendo ? "Leyendo..." : "Capturar y leer"}
                    </button>

                    {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
                </>
            ) : (
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

            {/* TODO: quitar — panel de debug temporal para depurar en el móvil */}
            {logs.length > 0 && (
                <div className="mt-6 bg-noc-bg border border-noc-divider rounded-md p-3">
                    <p className="text-[10px] tracking-widest uppercase text-noc-accent mb-2">
                        Debug (temporal)
                    </p>
                    <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                        {logs.map((linea, i) => (
                            <p key={i} className="text-xs text-noc-neutral-500 break-words">
                                {linea}
                            </p>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EscanearPage;
