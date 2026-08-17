import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const Navbar = () => {
    const { usuario, cargando, cerrarSesion } = useAuth();

    return (
        <nav className="flex items-center gap-6 px-8 py-4 bg-noc-surface border-b border-noc-divider">
            <Link to="/" className="text-noc-text hover:text-noc-accent transition-colors font-heading font-medium">
                Inicio
            </Link>

            {!cargando && usuario && (
                <>
                    <Link to="/inventario" className="text-noc-text hover:text-noc-accent transition-colors">
                        Inventario
                    </Link>
                    <Link to="/mazos" className="text-noc-text hover:text-noc-accent transition-colors">
                        Mazos
                    </Link>
                </>
            )}

            {!cargando && !usuario && (
                <Link to="/login" className="ml-auto text-noc-accent hover:text-noc-accent-light transition-colors">
                    Iniciar sesión
                </Link>
            )}

            {!cargando && usuario && (
                <div className="ml-auto flex items-center gap-3">
                    <span className="text-sm text-noc-neutral-500">{usuario.email}</span>
                    <button
                        onClick={cerrarSesion}
                        className="text-sm bg-transparent border border-noc-divider hover:bg-noc-neutral-800 text-noc-text px-3 py-1.5 rounded-md transition-colors"
                    >
                        Cerrar sesión
                    </button>
                </div>
            )}
        </nav>
    );
};

export default Navbar;