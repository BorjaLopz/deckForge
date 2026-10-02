import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useRecomendacionesComandante } from "../hooks/useRecomendacionesComandante";
import { MAX_CARTAS_COMMANDER, useSeleccionRecomendaciones } from "../hooks/useSeleccionRecomendaciones";
import { completarMazoDesdeComandante, crearMazoDesdeComandante, obtenerMazo } from "../services/mazosService";
import FilaRecomendacion from "../components/FilaRecomendacion";
import SeccionPlegable from "../components/SeccionPlegable";
import FiltroCategorias from "../components/FiltroCategorias";
import type { CartaRecomendada } from "../types/comandantes";
import type { MazoDetalle } from "../types/mazos";

/* Dos modos: sin `?mazo=` crea un mazo nuevo; con `?mazo=ID` completa ese
   mazo (las cartas que ya tiene salen como "En el mazo" y no cuentan). */
const ComandantePage = () => {
	const { accessToken } = useAuth();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const mazoIdParam = searchParams.get("mazo");
	const mazoId = mazoIdParam ? Number(mazoIdParam) : null;

	const [busqueda, setBusqueda] = useState(searchParams.get("nombre") ?? "");
	const { datos, cargando, error, buscar } = useRecomendacionesComandante();
	const { seleccionadas, alternar, marcarPoseidas, completar, limpiar } = useSeleccionRecomendaciones();

	const [mazoACompletar, setMazoACompletar] = useState<MazoDetalle | null>(null);
	const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);
	const [nombreMazo, setNombreMazo] = useState("");
	const [guardando, setGuardando] = useState(false);
	const [errorGuardar, setErrorGuardar] = useState<string | null>(null);

	useEffect(() => {
		if (!accessToken || mazoId === null) return;

		const cargar = async () => {
			try {
				setMazoACompletar(await obtenerMazo(accessToken, mazoId));
			} catch (err) {
				console.error("Error cargando el mazo a completar: ", err);
			}
		};

		cargar();
	}, [accessToken, mazoId]);

	const handleBuscar = async (e: React.FormEvent) => {
		e.preventDefault();
		const ok = await buscar(busqueda);
		if (ok) {
			limpiar();
			setNombreMazo("");
			setFiltroCategoria(null); // otro comandante puede no tener esa categoría
		}
	};

	const todas = datos ? datos.categorias.flatMap((c) => c.cartas) : [];
	const poseidas = todas.filter((c) => c.cantidadEnInventario > 0).length;

	const oraclesEnMazo = new Set(
		(mazoACompletar?.cartas ?? []).map((c) => c.oracle_id).filter((id): id is string => Boolean(id))
	);
	const estaEnMazo = (c: CartaRecomendada) => c.oracleId !== null && oraclesEnMazo.has(c.oracleId);
	const seleccionables = todas.filter((c) => !estaEnMazo(c));

	// el comandante no ocupa hueco de los 99
	const copiasYaEnMazo = (mazoACompletar?.cartas ?? [])
		.filter((c) => !datos || c.oracle_id !== datos.comandante.oracleId)
		.reduce((suma, c) => suma + c.cantidad, 0);
	const maxSeleccion = Math.max(MAX_CARTAS_COMMANDER - copiasYaEnMazo, 0);
	const lleno = seleccionadas.size >= maxSeleccion;

	const handleGuardar = async () => {
		if (!accessToken || !datos || seleccionadas.size === 0 || guardando) return;

		setGuardando(true);
		setErrorGuardar(null);

		try {
			if (mazoId !== null) {
				await completarMazoDesdeComandante(accessToken, mazoId, datos.comandante.scryfallId, [...seleccionadas]);
				navigate(`/mazos/${mazoId}`);
			} else {
				const { id } = await crearMazoDesdeComandante(
					accessToken,
					nombreMazo.trim() || datos.comandante.nombre,
					datos.comandante.scryfallId,
					[...seleccionadas]
				);
				navigate(`/mazos/${id}`);
			}
		} catch (err) {
			setErrorGuardar(err instanceof Error ? err.message : "No se pudo guardar el mazo");
			setGuardando(false);
		}
	};

	return (
		<div className="max-w-3xl mx-auto px-4 sm:px-8 py-6">
			<Link
				to={mazoId !== null ? `/mazos/${mazoId}` : "/mazos"}
				className="text-xs text-noc-neutral-500 hover:text-noc-text transition-colors"
			>
				← {mazoId !== null ? "Volver al mazo" : "Volver a mis mazos"}
			</Link>

			<h1 className="text-2xl font-heading font-medium text-noc-text mt-2 mb-1">
				{mazoId !== null ? `Completar «${mazoACompletar?.nombre ?? "…"}»` : "Mazo desde comandante"}
			</h1>
			<p className="text-sm text-noc-neutral-500 mb-6">
				Recomendaciones según los mazos publicados en EDHREC, cruzadas con tu inventario.
			</p>

			<form onSubmit={handleBuscar} className="flex gap-2 mb-2">
				<input
					type="text"
					value={busqueda}
					onChange={(e) => setBusqueda(e.target.value)}
					placeholder="Nombre del comandante (inglés o español)..."
					className="flex-1 min-w-0 bg-noc-surface border border-noc-divider rounded-md px-3 py-2 text-sm text-noc-text placeholder:text-noc-neutral-500 focus:outline-none focus:border-noc-accent"
				/>
				<button
					type="submit"
					disabled={cargando || !busqueda.trim()}
					className="bg-transparent border border-noc-accent text-noc-accent hover:bg-noc-accent-900 disabled:opacity-50 transition-colors rounded-lg px-4 py-2 text-sm font-medium shrink-0"
				>
					{cargando ? "Buscando..." : "Buscar"}
				</button>
			</form>

			{error && <p className="text-sm text-red-400 mb-4">{error}</p>}

			{datos && (
				<>
					<div className="flex gap-4 items-start bg-noc-surface border border-noc-divider rounded-lg p-4 mt-4 mb-4">
						{datos.comandante.imagenUrl && (
							<img
								src={datos.comandante.imagenUrl}
								alt={datos.comandante.nombre}
								className="w-28 sm:w-36 rounded-md shrink-0"
							/>
						)}
						<div className="min-w-0 flex flex-col gap-1">
							<h2 className="text-lg font-medium text-noc-text">{datos.comandante.nombre}</h2>
							<p className="text-xs text-noc-neutral-500">
								{datos.numMazos.toLocaleString("es-ES")} mazos en EDHREC
							</p>
							<p className={`text-xs ${datos.comandante.cantidadEnInventario > 0 ? "text-noc-accent" : "text-noc-neutral-500"}`}>
								{datos.comandante.cantidadEnInventario > 0 ? "Tienes este comandante" : "No tienes este comandante"}
							</p>
							<p className="text-xs text-noc-neutral-500">
								Tienes {poseidas} de las {todas.length} cartas recomendadas
							</p>
							{mazoACompletar && (
								<p className="text-xs text-noc-neutral-500">
									El mazo ya tiene {copiasYaEnMazo} cartas además del comandante
								</p>
							)}
						</div>
					</div>

					<div className="sticky top-0 z-10 bg-noc-bg py-3 mb-2 border-b border-noc-divider flex flex-col gap-2">
						<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
							<span className={`tabular-nums ${lleno ? "text-noc-accent" : "text-noc-text"}`}>
								{seleccionadas.size} / {maxSeleccion} {mazoId !== null ? "huecos" : "seleccionadas"}
							</span>
							<button type="button" onClick={() => marcarPoseidas(seleccionables, maxSeleccion)} className="text-noc-neutral-500 hover:text-noc-text transition-colors">
								Marcar las que tengo
							</button>
							<button type="button" onClick={() => completar(seleccionables, maxSeleccion)} className="text-noc-neutral-500 hover:text-noc-text transition-colors">
								Completar hasta {MAX_CARTAS_COMMANDER}
							</button>
							<button type="button" onClick={limpiar} className="text-noc-neutral-500 hover:text-noc-text transition-colors">
								Limpiar
							</button>
						</div>
						<div className="flex gap-2">
							{mazoId === null && (
								<input
									type="text"
									value={nombreMazo}
									onChange={(e) => setNombreMazo(e.target.value)}
									placeholder={datos.comandante.nombre}
									aria-label="Nombre del mazo"
									className="flex-1 min-w-0 bg-noc-surface border border-noc-divider rounded-md px-3 py-1.5 text-sm text-noc-text placeholder:text-noc-neutral-500 focus:outline-none focus:border-noc-accent"
								/>
							)}
							<button
								type="button"
								onClick={handleGuardar}
								disabled={guardando || seleccionadas.size === 0}
								className={`bg-noc-text text-noc-bg hover:opacity-90 disabled:opacity-40 transition-opacity rounded-full px-4 py-1.5 text-sm font-medium shrink-0 ${mazoId !== null ? "ml-auto" : ""}`}
							>
								{guardando
									? "Guardando..."
									: mazoId !== null ? `Añadir ${seleccionadas.size} al mazo` : "Crear mazo"}
							</button>
						</div>
						{errorGuardar && <p className="text-xs text-red-400">{errorGuardar}</p>}
					</div>

					<div className="mb-4">
						<FiltroCategorias
							opciones={datos.categorias.map((cat) => ({ clave: cat.categoria, etiqueta: cat.categoria, contador: cat.cartas.length }))}
							seleccionada={filtroCategoria}
							onSeleccionar={setFiltroCategoria}
						/>
					</div>

					<div className="flex flex-col gap-4">
						{datos.categorias.filter((cat) => filtroCategoria === null || cat.categoria === filtroCategoria).map((cat) => {
							const marcadas = cat.cartas.filter((c) => seleccionadas.has(c.scryfallId) || estaEnMazo(c)).length;
							return (
								<SeccionPlegable key={cat.categoria} titulo={cat.categoria} detalle={`${marcadas}/${cat.cartas.length}`}>
									<div className="flex flex-col">
										{cat.cartas.map((carta) => {
											const enMazo = estaEnMazo(carta);
											const seleccionada = enMazo || seleccionadas.has(carta.scryfallId);
											return (
												<FilaRecomendacion
													key={carta.scryfallId}
													carta={carta}
													seleccionada={seleccionada}
													enMazo={enMazo}
													deshabilitada={enMazo || (lleno && !seleccionada)}
													onAlternar={() => alternar(carta.scryfallId)}
												/>
											);
										})}
									</div>
								</SeccionPlegable>
							);
						})}
					</div>

					<p className="text-xs text-noc-neutral-500 mt-8">
						Datos de recomendaciones: <a href="https://edhrec.com" target="_blank" rel="noreferrer" className="underline hover:text-noc-text">EDHREC</a>.
						El % es la proporción de mazos de este comandante que incluyen la carta.
					</p>
				</>
			)}
		</div>
	);
};

export default ComandantePage;
