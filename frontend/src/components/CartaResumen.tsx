import { Link } from "react-router-dom"
import { RAREZA_HEX } from "../constants/cartas"

interface CartaResumenProps {
    id: string,
    nombre: string,
    imagen?: string,
    expansion: string,
    numeroColeccion: string,
    rareza?: string,
    variante?: "lista" | "cuadricula"
}

const CartaResumen = ({ id, nombre, imagen, expansion, numeroColeccion, rareza, variante = "lista" }: CartaResumenProps) => {
    if (variante === "cuadricula") {
        return (
            <Link
                to={`/carta/${id}`}
                className="flex flex-col rounded-lg overflow-hidden border border-noc-divider shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-150 bg-noc-surface"
            >
                {imagen ? (
                    <img src={imagen} alt={nombre} className="w-full aspect-5/7 object-cover" />
                ) : (
                    <div className="w-full aspect-5/7 bg-noc-neutral-800 flex items-center justify-center text-noc-neutral-500 text-sm">
                        Sin imagen
                    </div>
                )}
                <div className="p-2 flex flex-col gap-0.5">
                    <p className="font-medium text-sm text-noc-text truncate">{nombre}</p>
                    <p className="text-xs text-noc-neutral-500 flex items-center gap-1.5 uppercase tracking-wide">
                        {rareza && (
                            <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: RAREZA_HEX[rareza] ?? "#8A8F98" }}
                                aria-hidden="true"
                            />
                        )}
                        {expansion} · #{numeroColeccion}
                    </p>
                </div>
            </Link>
        )
    }

    return (
        <Link
            to={`/carta/${id}`}
            className="flex items-center gap-3 px-3 py-2 border-b border-noc-divider hover:bg-noc-accent-900 transition-colors duration-150"
        >
            {imagen ? (
                <img src={imagen} alt={nombre} className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
                <div className="w-10 h-10 rounded-full bg-noc-neutral-800 flex items-center justify-center text-noc-neutral-500 text-xs shrink-0">
                    ?
                </div>
            )}
            <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm text-noc-text truncate">
                    {nombre} <span className="font-normal text-noc-neutral-500">#{numeroColeccion}</span>
                </span>
            </div>
            <span className="ml-auto text-xs italic text-noc-neutral-500 shrink-0">{expansion}</span>
        </Link>
    )
}

export default CartaResumen;