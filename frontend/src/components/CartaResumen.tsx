const CartaResumen = ({ id, nombre, imagen, expansion, numeroColeccion, variante = "lista" }: CartaResumenProps) => {
    if (variante === "cuadricula") {
        return (
            <Link
                to={`/carta/${id}`}
                className="flex flex-col rounded-lg overflow-hidden border border-gray-700 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-150 bg-gray-800"
            >
                {imagen ? (
                    <img src={imagen} alt={nombre} className="w-full aspect-[5/7] object-cover" />
                ) : (
                    <div className="w-full aspect-[5/7] bg-gray-700 flex items-center justify-center text-gray-400 text-sm">
                        Sin imagen
                    </div>
                )}
                <div className="p-2 flex flex-col gap-0.5">
                    <p className="font-medium text-sm text-gray-100 truncate">{nombre}</p>
                    <p className="text-xs text-gray-400 truncate">{expansion} — #{numeroColeccion}</p>
                </div>
            </Link>
        )
    }

    return (
        <Link
            to={`/carta/${id}`}
            className="flex items-center gap-3 px-3 py-2 border-b border-gray-700 hover:bg-gray-800 transition-colors duration-150"
        >
            {imagen ? (
                <img src={imagen} alt={nombre} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            ) : (
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                    ?
                </div>
            )}
            <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm text-gray-100 truncate">
                    {nombre} <span className="font-normal text-gray-400">#{numeroColeccion}</span>
                </span>
            </div>
            <span className="ml-auto text-xs italic text-gray-400 flex-shrink-0">{expansion}</span>
        </Link>
    )
}