import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Tesseract from "tesseract.js";
import { reconocerCarta } from "../services/cartasService";
import { calcularMarcoGuia, parsearSetYNumero, recortarInfoColeccion, recortarTitulo, RELACION_CARTA } from "../utils/reconocimientoCarta";
import type { ResultadoReconocimiento } from "../types/scryfall";

const EscanearPage = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const workerRef = useRef<Tesseract.Worker | null>(null);
    const navigate = useNavigate();

    const [errorCamara, setErrorCamara] = useState<string | null>(null);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resultado, setResultado] = useState<ResultadoReconocimiento | null>(null);

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
                    video: { facingMode: "environment" }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
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

    const capturarYReconocer = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || procesando) return;

        setProcesando(true);
        setError(null);
        setResultado(null);

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

            const nombre = resultadoTitulo.data.text.trim().split("\n")[0]?.trim();

            if (!nombre) {
                registrar("No se leyó ningún nombre en el recorte de título.");
                setError("No se pudo leer el nombre. Encuadra mejor la carta e inténtalo de nuevo.");
                return;
            }

            const { set, numero } = parsearSetYNumero(resultadoInfo.data.text);
            registrar(`Parseado -> nombre: "${nombre}" | set: ${set ?? "(ninguno)"} | número: ${numero ?? "(ninguno)"}`);

            registrar("Consultando a Scryfall...");
            const carta = await reconocerCarta(nombre, set, numero);
            registrar(`Resuelto: "${carta.nombre}" (scryfallId=${carta.scryfallId})`);
            setResultado(carta);
        } catch (err) {
            const mensaje = err instanceof Error ? err.message : String(err);
            registrar(`Error: ${mensaje}`);
            console.error("Error reconociendo la carta: ", err);
            setError("No se pudo reconocer la carta. Inténtalo de nuevo.");
        } finally {
            setProcesando(false);
        }
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
            ) : (
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
                        onClick={capturarYReconocer}
                        disabled={procesando}
                        className="w-full mt-4 bg-transparent border border-noc-accent text-noc-accent hover:bg-noc-accent-900 disabled:opacity-50 transition-colors rounded-lg py-2.5 text-sm font-medium"
                    >
                        {procesando ? "Reconociendo..." : "Capturar y reconocer"}
                    </button>

                    {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

                    {resultado && (
                        <div className="flex items-center gap-4 bg-noc-surface border border-noc-divider rounded-lg p-4 mt-4">
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
                                        Reintentar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
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
