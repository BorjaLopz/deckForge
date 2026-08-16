import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const Navbar = () => {
    const { usuario, cargando, cerrarSesion } = useAuth();

    const isUserAvailable = !cargando && usuario;
    return (
        <nav>
            <Link to="/">Inicio</Link>
            {isUserAvailable && (
                <>
                    <Link to="/inventario">Inventario</Link>
                    <Link to="/mazos">Mazos</Link>
                </>
            )}

            {!isUserAvailable && (
                <Link to="/login">Iniciar sesión</Link>
            )}


            {!cargando && usuario && (
                <div>
                    <span>{usuario.email}</span>
                    <button onClick={cerrarSesion}>Cerrar sesión</button>
                </div>
            )}

        </nav>
    )
}

export default Navbar;