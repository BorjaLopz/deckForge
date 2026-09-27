import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Tesseract from "tesseract.js";
import { reconocerCarta } from "../services/cartasService";
import { calcularMarcoGuia, mejorarParaOcr, parsearSetYNumero, recortarInfoColeccion, RELACION_CARTA } from "../utils/reconocimientoCarta";

/* `focusMode` no está en el estándar MediaTrackConstraintSet de TS todavía,
   aunque varios navegadores ya lo soportan como extensión. */
interface RestriccionConEnfoque extends MediaTrackConstraintSet {
    focusMode?: "continuous" | "manual" | "single-shot";
}

type Aviso = { tipo: "buscando" | "encontrada" | "error"; texto: string; imagenUrl?: string | null };

const EscanearPage = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const workerRef = useRef<Tesseract.Worker | null>(null);
    const procesandoRef = useRef(false); // evita solapar intentos del bucle automático
    const pausadoRef = useRef(false); // true tras encontrar una carta, hasta que se navega o se cancela
    const cuentaAtrasRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const navigate = useNavigate();

    const [errorCamara, setErrorCamara] = useState<string | null>(null);
    const [leyendo, setLeyendo] = useState(false);
    const [aviso, setAviso] = useState<Aviso | null>(null);
    const [cuentaAtras, setCuentaAtras] = useState<number | null>(null);

    const [manualAbierto, setManualAbierto] = useState(false);
    const [setManual, setSetManual] = useState("");
    const [numeroManual, setNumeroManual] = useState("");

    /* TODO: quitar este panel de logs — es temporal, para depurar en el móvil
       donde no hay devtools a mano. */
    const [logs, setLogs] = useState<string[]>([]);
    const [logCopiado, setLogCopiado] = useState(false);
    const registrar = (mensaje: string) => {
        console.log("[escanear]", mensaje);
        setLogs((prev) => [...prev, mensaje]);
    };

    const copiarLog = async () => {
        try {
            await navigator.clipboard.writeText(logs.join("\n"));
            setLogCopiado(true);
            setTimeout(() => setLogCopiado(false), 2000);
        } catch (err) {
            console.error("Error copiando el log: ", err);
        }
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
                // del estándar MediaTrackConstraints todavía, de ahí el tipo aparte.
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
            if (cuentaAtrasRef.current) clearInterval(cuentaAtrasRef.current);
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

    const cancelar = () => {
        if (cuentaAtrasRef.current) clearInterval(cuentaAtrasRef.current);
        cuentaAtrasRef.current = null;
        setCuentaAtras(null);
        setAviso(null);
        pausadoRef.current = false;
        registrar("Cancelado por el usuario, sigue escaneando.");
    };

    const buscarPorSetYNumero = async (set: string, numero: string) => {
        pausadoRef.current = true;
        setAviso({ tipo: "buscando", texto: `Buscando ${set.toUpperCase()} #${numero}...` });
        registrar(`Consultando a Scryfall: set="${set}" numero="${numero}"...`);

        try {
            const carta = await reconocerCarta(set, numero);
            registrar(`Resuelto: "${carta.nombre}" (scryfallId=${carta.scryfallId})`);
            setAviso({ tipo: "encontrada", texto: carta.nombre, imagenUrl: carta.imagenUrl });

            // Ventana para cancelar: el OCR de set/número aún falla bastante,
            // mejor dar 3s con opción de frenar que saltar a la carta
            // equivocada sin avisar.
            let restante = 3;
            setCuentaAtras(restante);
            cuentaAtrasRef.current = setInterval(() => {
                restante -= 1;
                if (restante <= 0) {
                    if (cuentaAtrasRef.current) clearInterval(cuentaAtrasRef.current);
                    cuentaAtrasRef.current = null;
                    setCuentaAtras(null);
                    navigate(`/carta/${carta.scryfallId}`);
                } else {
                    setCuentaAtras(restante);
                }
            }, 1000);
        } catch (err) {
            const mensaje = err instanceof Error ? err.message : String(err);
            registrar(`Error: ${mensaje}`);
            console.error("Error reconociendo la carta: ", err);
            setAviso({ tipo: "error", texto: `No se encontró ${set.toUpperCase()} #${numero}` });
            pausadoRef.current = false; // dígito mal leído probablemente: seguimos intentando
            setTimeout(() => {
                setAviso((actual) => (actual?.tipo === "error" ? null : actual));
            }, 2500);
        }
    };

    const capturarYLeer = async (automatico = false) => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || procesandoRef.current || pausadoRef.current) return;

        // El primer intento del bucle puede disparar antes de que el vídeo
        // tenga dimensiones reales (el permiso de cámara puede tardar más que
        // el margen de 1.2s) — sin esto, drawImage revienta con un canvas 0x0.
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            registrar("Cámara aún sin fotograma listo, reintentando...");
            return;
        }

        procesandoRef.current = true;
        setLeyendo(true);

        try {
            const contexto = canvas.getContext("2d");
            if (!contexto) throw new Error("No se pudo procesar la imagen");

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            contexto.drawImage(video, 0, 0);

            const marco = calcularMarcoGuia(video.videoWidth, video.videoHeight);
            const recorteInfo = mejorarParaOcr(recortarInfoColeccion(canvas, marco));

            const worker = await obtenerWorker();

            // Solo dígitos, letras mayúsculas (código de set) y los
            // separadores que realmente aparecen ("/", "•").
            await worker.setParameters({
                tessedit_char_whitelist: "0123456789/•ABCDEFGHIJKLMNOPQRSTUVWXYZ "
            });
            const resultadoInfo = await worker.recognize(recorteInfo);
            registrar(`OCR set/número (crudo): "${resultadoInfo.data.text.trim()}"`);

            const { set, numero } = parsearSetYNumero(resultadoInfo.data.text);
            registrar(`Parseado -> set: ${set ?? "(ninguno)"} | número: ${numero ?? "(ninguno)"}`);

            if (set && numero) {
                await buscarPorSetYNumero(set, numero);
            } else if (!automatico) {
                setAviso({ tipo: "error", texto: "No se leyó el set/número. Prueba a acercar más la carta." });
                setTimeout(() => {
                    setAviso((actual) => (actual?.tipo === "error" ? null : actual));
                }, 2500);
            }
        } catch (err) {
            registrar(`Error: ${err instanceof Error ? err.message : String(err)}`);
            console.error("Error leyendo la carta: ", err);
        } finally {
            setLeyendo(false);
            procesandoRef.current = false;
        }
    };

    /* Bucle de fondo: reintenta la lectura cada ~1.2s. Se pausa en cuanto
       encuentra una carta (hasta que se navega o se cancela) y se para del
       todo si falla la cámara. */
    useEffect(() => {
        if (errorCamara) return;

        let activo = true;

        const ciclo = async () => {
            if (!activo) return;
            if (!pausadoRef.current) {
                await capturarYLeer(true);
            }
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
    }, [errorCamara]);

    const buscarManual = (e: React.FormEvent) => {
        e.preventDefault();
        if (!setManual.trim() || !numeroManual.trim()) return;
        buscarPorSetYNumero(setManual.trim().toLowerCase(), numeroManual.trim());
    };

    return (
        <div className="max-w-2xl mx-auto px-8 py-6">
            <h1 className="text-2xl font-heading font-medium text-noc-text mb-1">
                Escanear carta
            </h1>
            <p className="text-sm text-noc-neutral-500 mb-6">
                Encuadra la esquina inferior de la carta (set y número) dentro del marco — se busca sola en cuanto se lee bien.
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

                        {/* Notificación flotante sobre la propia cámara */}
                        {aviso && (
                            <div className="absolute left-2 right-2 bottom-2 flex items-center gap-3 bg-noc-surface/95 backdrop-blur-sm border border-noc-divider rounded-lg p-3">
                                {aviso.imagenUrl && (
                                    <img src={aviso.imagenUrl} alt={aviso.texto} className="w-10 rounded-md shrink-0" />
                                )}
                                <p className={`flex-1 min-w-0 text-sm truncate ${aviso.tipo === "error" ? "text-red-400" : aviso.tipo === "encontrada" ? "text-noc-text font-medium" : "text-noc-neutral-500"}`}>
                                    {aviso.tipo === "encontrada" ? `¡Encontrada! ${aviso.texto}` : aviso.texto}
                                </p>
                                {cuentaAtras !== null && (
                                    <button
                                        type="button"
                                        onClick={cancelar}
                                        className="shrink-0 bg-transparent border border-noc-divider text-noc-neutral-500 hover:text-noc-text hover:bg-noc-neutral-800 transition-colors rounded-lg px-3 py-1.5 text-xs font-medium"
                                    >
                                        Cancelar ({cuentaAtras})
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <canvas ref={canvasRef} className="hidden" />

                    <div className="flex items-center gap-2 mt-3 text-xs text-noc-neutral-500">
                        <span className={`w-1.5 h-1.5 rounded-full bg-noc-accent ${leyendo ? "animate-pulse" : "opacity-40"}`} aria-hidden="true" />
                        {leyendo ? "Leyendo..." : "Escaneando automáticamente..."}
                    </div>

                    <button
                        type="button"
                        onClick={() => setManualAbierto((v) => !v)}
                        className="text-xs text-noc-neutral-500 hover:text-noc-text transition-colors mt-3 underline underline-offset-2"
                    >
                        {manualAbierto ? "Ocultar" : "¿No lo detecta? Escribir set y número a mano"}
                    </button>

                    {manualAbierto && (
                        <form onSubmit={buscarManual} className="flex gap-2 mt-2">
                            <input
                                type="text"
                                value={setManual}
                                onChange={(e) => setSetManual(e.target.value)}
                                placeholder="set (ej. ltr)"
                                className="w-28 bg-noc-bg border border-noc-divider rounded-md px-3 py-1.5 text-sm text-noc-text placeholder:text-noc-neutral-700 focus:outline-none focus:border-noc-accent"
                            />
                            <input
                                type="text"
                                value={numeroManual}
                                onChange={(e) => setNumeroManual(e.target.value)}
                                placeholder="número (ej. 211)"
                                className="w-32 bg-noc-bg border border-noc-divider rounded-md px-3 py-1.5 text-sm text-noc-text placeholder:text-noc-neutral-700 focus:outline-none focus:border-noc-accent"
                            />
                            <button
                                type="submit"
                                disabled={!setManual.trim() || !numeroManual.trim()}
                                className="bg-transparent border border-noc-accent text-noc-accent hover:bg-noc-accent-900 disabled:opacity-50 transition-colors rounded-lg px-4 py-1.5 text-sm font-medium"
                            >
                                Buscar
                            </button>
                        </form>
                    )}
                </>
            )}

            {/* TODO: quitar — panel de debug temporal para depurar en el móvil */}
            {logs.length > 0 && (
                <div className="mt-6 bg-noc-bg border border-noc-divider rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] tracking-widest uppercase text-noc-accent">
                            Debug (temporal)
                        </p>
                        <button
                            type="button"
                            onClick={copiarLog}
                            className="text-xs text-noc-neutral-500 hover:text-noc-text transition-colors"
                        >
                            {logCopiado ? "¡Copiado!" : "Copiar log"}
                        </button>
                    </div>
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
