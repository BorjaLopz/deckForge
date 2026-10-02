import type { ColorMana, EstadisticasMazo as Estadisticas } from "../utils/estadisticasMazo";

const COLORES_MANA: { color: ColorMana; nombre: string; hex: string }[] = [
	{ color: "W", nombre: "Blanco", hex: "#F8F6D8" },
	{ color: "U", nombre: "Azul", hex: "#0E68AB" },
	{ color: "B", nombre: "Negro", hex: "#3A3332" },
	{ color: "R", nombre: "Rojo", hex: "#D3202A" },
	{ color: "G", nombre: "Verde", hex: "#00733E" },
	{ color: "C", nombre: "Incoloro", hex: "#CBC2BF" }
];

const ALTURA_BARRAS_PX = 72;

interface EstadisticasMazoProps {
	estadisticas: Estadisticas;
}

const Dato = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
	<div className="flex flex-col">
		<span className="text-lg font-medium text-noc-text tabular-nums">{valor}</span>
		<span className="text-xs text-noc-neutral-500">{etiqueta}</span>
	</div>
);

const EstadisticasMazo = ({ estadisticas: e }: EstadisticasMazoProps) => {
	const maxCurva = Math.max(...e.curva.map((t) => t.copias), 1);
	const colores = COLORES_MANA.filter((c) => e.simbolos[c.color] > 0);

	return (
		<div className="bg-noc-surface border border-noc-divider rounded-lg p-4 grid gap-6 sm:grid-cols-2">
			<div className="flex flex-col gap-4">
				<div className="flex gap-6">
					<Dato etiqueta="tierras" valor={String(e.tierras)} />
					<Dato etiqueta="hechizos" valor={String(e.hechizos)} />
					<Dato etiqueta="coste medio" valor={e.costeMedio === null ? "—" : e.costeMedio.toFixed(2)} />
				</div>

				{colores.length > 0 && (
					<div>
						<p className="text-xs text-noc-neutral-500 mb-1.5">Símbolos de maná en los costes</p>
						<div className="flex flex-wrap gap-x-4 gap-y-1">
							{colores.map((c) => (
								<span key={c.color} className="flex items-center gap-1.5 text-xs text-noc-text tabular-nums" title={c.nombre}>
									<span className="w-2.5 h-2.5 rounded-full border border-noc-divider" style={{ backgroundColor: c.hex }} aria-hidden="true" />
									<span className="sr-only">{c.nombre}:</span>
									{e.simbolos[c.color]}
								</span>
							))}
						</div>
					</div>
				)}

				{e.nivel && (
					<div>
						<p className="text-xs text-noc-neutral-500 mb-0.5">Nivel orientativo</p>
						<p className="text-sm text-noc-text">
							Bracket {e.nivel.bracket} <span className="text-noc-neutral-500">· {e.nivel.nombre}</span>
						</p>
						<p className="text-xs text-noc-neutral-500">
							{e.nivel.explicacion}
							{e.gameChangers.length > 0 && `: ${e.gameChangers.join(", ")}`}
						</p>
						<p className="text-[11px] text-noc-neutral-500 mt-1">
							Solo cuenta Game Changers; no detecta combos, turnos extra ni destrucción de tierras.
						</p>
					</div>
				)}
			</div>

			<div>
				<p className="text-xs text-noc-neutral-500 mb-2">Curva de maná (sin tierras)</p>
				<div className="flex items-end gap-1.5" style={{ height: ALTURA_BARRAS_PX + 32 }} role="img"
					aria-label={`Curva de maná: ${e.curva.map((t) => `${t.copias} de coste ${t.coste}`).join(", ")}`}>
					{e.curva.map((t) => (
						<div key={t.coste} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
							<span className="text-[11px] text-noc-neutral-500 tabular-nums">{t.copias > 0 ? t.copias : ""}</span>
							<div
								className="w-full rounded-xs bg-noc-neutral-500/60"
								style={{ height: `${(t.copias / maxCurva) * ALTURA_BARRAS_PX}px`, minHeight: t.copias > 0 ? 2 : 0 }}
							/>
							<span className="text-[11px] text-noc-neutral-500 tabular-nums">{t.coste}</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default EstadisticasMazo;
