import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const RutaProtegida = ({ children }: { children: React.ReactNode }) => {
    const { usuario, cargando } = useAuth();

    if (cargando) {
        return <div>Cargando...</div>
    }

    if (!usuario) {
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}

export default RutaProtegida;