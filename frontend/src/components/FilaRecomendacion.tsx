import type { CartaRecomendada } from "../types/comandantes";

interface FilaRecomendacionProps {
	carta: CartaRecomendada;
	seleccionada: boolean;
	deshabilitada: boolean;
	enMazo?: boolean;
	onAlternar: () => void;
}

const FilaRecomendacion = ({ carta, seleccionada, deshabilitada, enMazo = false, onAlternar }: FilaRecomendacionProps) => {
	const laTienes = carta.cantidadEnInventario > 0;

	return (
		<label
			className={`flex items-center gap-3 px-3 py-1.5 rounded-md transition-colors ${
				deshabilitada ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-noc-neutral-800"
			}`}
		>
			<input
				type="checkbox"
				checked={seleccionada}
				disabled={deshabilitada}
				onChange={onAlternar}
				className="accent-noc-accent shrink-0"
			/>
			{carta.imagenPequena ? (
				<img
					src={carta.imagenPequena}
					alt=""
					loading="lazy"
					className="w-7 h-10 object-cover rounded-sm shrink-0"
				/>
			) : (
				<div className="w-7 h-10 rounded-sm bg-noc-neutral-800 shrink-0" />
			)}
			<span className="flex-1 min-w-0">
				<span className="block text-sm text-noc-text truncate">{carta.nombre}</span>
				{carta.nombre !== carta.nombreIngles && (
					<span className="block text-xs text-noc-neutral-500 truncate">{carta.nombreIngles}</span>
				)}
			</span>
			{enMazo ? (
				<span className="text-[11px] text-noc-neutral-500 shrink-0">En el mazo</span>
			) : laTienes && (
				<span className="text-[11px] text-noc-accent shrink-0">
					La tienes{carta.cantidadEnInventario > 1 ? ` (${carta.cantidadEnInventario})` : ""}
				</span>
			)}
			<span className="text-xs text-noc-neutral-500 tabular-nums w-10 text-right shrink-0">
				{Math.round(carta.inclusion * 100)}%
			</span>
		</label>
	);
};

export default FilaRecomendacion;
