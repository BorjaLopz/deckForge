export interface OpcionCategoria {
	clave: string;
	etiqueta: string;
	contador: number;
}

interface FiltroCategoriasProps {
	opciones: OpcionCategoria[];
	seleccionada: string | null; // null = todas
	onSeleccionar: (clave: string | null) => void;
}

const claseChip = (activo: boolean) =>
	`shrink-0 rounded-xs border px-2.5 py-1 text-xs transition-colors ${
		activo
			? "border-noc-neutral-500 bg-noc-neutral-800 text-noc-text"
			: "border-noc-divider text-noc-neutral-500 hover:text-noc-text"
	}`;

/* En móvil, scroll horizontal (sin barra visible) para no ocupar media
   pantalla; desde sm hay sitio y salta a varias líneas. */
const FiltroCategorias = ({ opciones, seleccionada, onSeleccionar }: FiltroCategoriasProps) => {
	const total = opciones.reduce((suma, o) => suma + o.contador, 0);

	return (
		<div
			className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible"
			role="group"
			aria-label="Filtrar por categoría"
		>
			<button type="button" aria-pressed={seleccionada === null} onClick={() => onSeleccionar(null)} className={claseChip(seleccionada === null)}>
				Todas <span className="tabular-nums opacity-70">{total}</span>
			</button>
			{opciones.map((o) => (
				<button
					key={o.clave}
					type="button"
					aria-pressed={seleccionada === o.clave}
					onClick={() => onSeleccionar(seleccionada === o.clave ? null : o.clave)}
					className={claseChip(seleccionada === o.clave)}
				>
					{o.etiqueta} <span className="tabular-nums opacity-70">{o.contador}</span>
				</button>
			))}
		</div>
	);
};

export default FiltroCategorias;
