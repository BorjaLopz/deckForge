import type { ReactNode } from "react";

interface SeccionPlegableProps {
	titulo: string;
	detalle?: string;
	children: ReactNode;
}

/* <details> nativo: plegar/desplegar sin estado de React, accesible por
   teclado y lector de pantalla gratis. Empieza abierta. */
const SeccionPlegable = ({ titulo, detalle, children }: SeccionPlegableProps) => (
	<details open className="group">
		<summary className="flex items-center gap-2 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden px-1 py-1.5 mb-1 text-xs font-medium text-noc-neutral-500 uppercase tracking-wide hover:text-noc-text transition-colors">
			<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className="transition-transform duration-150 group-open:rotate-90">
				<path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
			{titulo}
			{detalle && <span className="normal-case tracking-normal font-normal">· {detalle}</span>}
		</summary>
		{children}
	</details>
);

export default SeccionPlegable;
