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
        <div className="max-w-sm mx-auto mt-16 px-6">
            <h1 className="text-2xl font-heading font-medium text-noc-text mb-6 text-center">
                {isRegister ? "Crear nueva cuenta" : "Iniciar sesión"}
            </h1>

            <form onSubmit={handleOnSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="block text-xs text-noc-neutral-500 mb-1">Email</label>
                    <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-sm bg-noc-surface border border-noc-divider rounded-lg text-noc-text focus:outline-none focus:border-noc-accent transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-xs text-noc-neutral-500 mb-1">Contraseña</label>
                    <input
                        type={isPasswordVisible ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-sm bg-noc-surface border border-noc-divider rounded-lg text-noc-text focus:outline-none focus:border-noc-accent transition-colors"
                    />
                </div>

                <label className="flex items-center gap-2 text-sm text-noc-neutral-500">
                    <input
                        type="checkbox"
                        checked={isPasswordVisible}
                        onChange={() => setIsPasswordVisible((prev) => !prev)}
                        className="accent-noc-accent"
                    />
                    Mostrar contraseña
                </label>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                    type="submit"
                    className="w-full bg-transparent border border-noc-accent text-noc-accent hover:bg-noc-accent-900 transition-colors rounded-lg py-2 text-sm font-medium mt-2"
                >
                    {isRegister ? "Registrame" : "Entrar"}
                </button>
            </form>

            <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="w-full text-center text-sm text-noc-accent hover:text-noc-accent-light transition-colors mt-4"
            >
                {isRegister ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
            </button>
        </div>
    );
}

export default LoginPage;