import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

type AuthContextType = {
    usuario: User | null,
    cargando: boolean;
    cerrarSesion: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [usuario, setUsuario] = useState<User | null>(null);
    const [cargando, setCargando] = useState<boolean>(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setUsuario(data.session?.user ?? null);
            setCargando(false);
        })

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUsuario(session?.user ?? null);
        })

        return () => {
            listener.subscription.unsubscribe();
        }
    }, [])

    const cerrarSesion = async () => {
        await supabase.auth.signOut();
    }

    return (
        <AuthContext.Provider value={{ usuario, cargando, cerrarSesion }}>
            {children}
        </AuthContext.Provider>
    )
}
