import { useContext } from "react"
import { AuthContext } from "../context/AuthContext"

export const useAuth = () => {
    const contexto = useContext(AuthContext);

    if (contexto === undefined) {
        throw new Error("useAuth debe usarse dentro de un AuthProvider");
    }

    return contexto;
}