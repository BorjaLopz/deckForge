import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const LoginPage = () => {
    const [isRegister, setIsRegister] = useState<boolean>(false);

    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);

    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();

    const handleOnSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const { error } = isRegister ?
            // Si es registro, necesitamos mandar nueva información a supabase
            await supabase.auth.signUp({ email, password })
            // Si es login, mandamos credenciales para obtener el JWT
            : await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            setError(error.message);
            return;
        }

        // Volvemos siempre a landingPage
        navigate("/");
    }

    return (
        <div>
            <h1 className="text-3xl font-bold">{isRegister ? "Crear nueva cuenta" : "Iniciar sesión"}</h1>

            <form onSubmit={handleOnSubmit}>
                <div>
                    <label htmlFor="">Email</label>
                    <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <div>
                    <label htmlFor="">Contraseña</label>
                    <input type={isPasswordVisible ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>

                <div>
                    <label htmlFor="">Contraseña Visible</label>
                    <input type="checkbox" checked={isPasswordVisible} onChange={(e) => setIsPasswordVisible((prev) => !prev)} />
                </div>

                {error && <p style={{ color: "red" }}>{error}</p>}

                <button type="submit">
                    {isRegister ? "Registrame" : "Entrar"}
                </button>
            </form>

            <button type="button" onClick={() => setIsRegister(!isRegister)}>
                {isRegister ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Registrate"}
            </button>
        </div>
    )
}

export default LoginPage;