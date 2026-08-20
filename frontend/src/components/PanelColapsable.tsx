interface PanelColapsableProps {
    abierta: boolean;
    children: React.ReactNode;
}

/* grid-template-rows 0fr -> 1fr: anima a "altura de contenido" sin medir
   nada por JS ni instalar una lib de animación. `inert` evita que el
   contenido colapsado (invisible) siga siendo alcanzable con Tab. */
const PanelColapsable = ({ abierta, children }: PanelColapsableProps) => (
    <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: abierta ? "1fr" : "0fr" }}
    >
        <div className="overflow-hidden min-h-0" inert={!abierta}>
            <div className="flex flex-wrap gap-4 items-end pt-4 mt-4 border-t border-noc-divider">
                {children}
            </div>
        </div>
    </div>
);

export default PanelColapsable;
