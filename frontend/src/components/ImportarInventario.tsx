import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { importarInventario } from "../services/inventarioService";
import PanelColapsable from "./PanelColapsable";
import type { ResultadoImportacion } from "../types/inventario";

interface ImportarInventarioProps {
    onImportado: () => void;
}

const ImportarInventario = ({ onImportado }: ImportarInventarioProps) => {
    const { accessToken } = useAuth();
    const [abierto, setAbierto] = useState(false);
    const [texto, setTexto] = useState("");
    const [cargando, setCargando] = useState(false);
    const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);

    const handleArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const archivo = e.target.files?.[0];
        if (!archivo) return;

        const lector = new FileReader();
        lector.onload = () => setTexto(String(lector.result ?? ""));
        lector.readAsText(archivo);

        e.target.value = ""; // permite volver a elegir el mismo archivo si hace falta
    };

    const handleImportar = async () => {
        if (!accessToken || !texto.trim()) return;

        setCargando(true);
        setResultado(null);

        try {
            const res = await importarInventario(accessToken, texto);
            setResultado(res);
            if (res.importadas.length > 0) onImportado();
        } catch (error) {
            console.error("Error importando inventario: ", error);
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="mb-6">
            <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                aria-expanded={abierto}
                className="flex items-center gap-1.5 text-sm text-noc-accent hover:text-noc-accent-light transition-colors"
            >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                Importar cartas
            </button>

            <PanelColapsable abierta={abierto}>
                <div className="flex flex-col gap-3 w-full">
                    <p className="text-xs text-noc-neutral-500">
                        Una carta por línea: cantidad y nombre, ej. "4 Lightning Bolt". Se guardan como no-foil.
                    </p>

                    <textarea
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        rows={6}
                        placeholder={"4 Lightning Bolt\n1 Sol Ring"}
                        className="w-full bg-noc-bg border border-noc-divider rounded-md px-3 py-2 text-sm text-noc-text placeholder:text-noc-neutral-700 focus:outline-none focus:border-noc-accent"
                    />

                    <div className="flex items-center gap-3">
                        <label className="text-sm text-noc-neutral-500 border border-noc-divider rounded-lg px-4 py-1.5 cursor-pointer hover:bg-noc-neutral-800 hover:text-noc-text transition-colors">
                            Subir archivo
                            <input type="file" accept=".txt,.csv" onChange={handleArchivo} className="hidden" />
                        </label>
                        <button
                            type="button"
                            onClick={handleImportar}
                            disabled={cargando || !texto.trim()}
                            className="bg-transparent border border-noc-accent text-noc-accent hover:bg-noc-accent-900 disabled:opacity-50 transition-colors rounded-lg px-4 py-1.5 text-sm font-medium"
                        >
                            {cargando ? "Importando..." : "Importar"}
                        </button>
                    </div>

                    {resultado && (
                        <div className="flex flex-col gap-2">
                            {resultado.importadas.length > 0 && (
                                <p className="text-sm text-noc-accent">
                                    {resultado.importadas.length} carta{resultado.importadas.length === 1 ? "" : "s"} importada{resultado.importadas.length === 1 ? "" : "s"}.
                                </p>
                            )}
                            {resultado.fallidas.length > 0 && (
                                <div className="bg-noc-bg border border-noc-divider rounded-md p-3">
                                    <p className="text-xs text-red-400 mb-1.5">
                                        {resultado.fallidas.length} línea{resultado.fallidas.length === 1 ? "" : "s"} fallida{resultado.fallidas.length === 1 ? "" : "s"}:
                                    </p>
                                    <ul className="flex flex-col gap-1">
                                        {resultado.fallidas.map((f, i) => (
                                            <li key={i} className="text-xs text-noc-neutral-500">
                                                <span className="text-noc-text">{f.linea}</span> — {f.motivo}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </PanelColapsable>
        </div>
    );
};

export default ImportarInventario;
