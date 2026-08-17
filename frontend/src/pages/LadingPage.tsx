import { Link } from "react-router-dom";
import BuscadorCartas from "../components/BuscadorCartas";

const LandingPage = () => {
    return (
        <div>
            <section className="max-w-2xl mx-auto px-8 pt-20 pb-2 text-center">
                <span className="inline-block text-xs border border-noc-accent text-noc-accent px-3 py-1 rounded-md mb-4">
                    Colección · Mazos · Cartas
                </span>
                <h1 className="text-4xl md:text-5xl font-heading font-medium leading-tight mb-4 text-noc-text">
                    Tu colección de Magic, organizada de verdad.
                </h1>
                <p className="text-noc-neutral-400 text-base leading-relaxed max-w-md mx-auto mb-8">
                    Busca cualquier carta y añádela a tu colección o a tus mazos en segundos.
                </p>

                <div className="max-w-xl mx-auto">
                    <BuscadorCartas />
                </div>
            </section>

            <section id="features" className="max-w-4xl mx-auto px-8 py-20 border-t border-noc-divider">
                <h2 className="text-2xl font-heading font-medium mb-6 text-noc-text">
                    Todo lo que necesitas para jugar en serio
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-noc-surface rounded-lg p-4 flex flex-col gap-2">
                        <div className="text-[10px] tracking-widest uppercase text-noc-accent">Colección</div>
                        <div className="font-heading font-medium text-noc-text">Tu binder, digital</div>
                        <p className="text-sm text-noc-neutral-500">Registra cada carta, cantidad y edición en segundos.</p>
                    </div>
                    <div className="bg-noc-surface rounded-lg p-4 flex flex-col gap-2">
                        <div className="text-[10px] tracking-widest uppercase text-noc-accent">Mazos</div>
                        <div className="font-heading font-medium text-noc-text">Constructor de mazos</div>
                        <p className="text-sm text-noc-neutral-500">Arma mazos desde tu colección con validación en vivo.</p>
                    </div>
                    <div className="bg-noc-surface rounded-lg p-4 flex flex-col gap-2">
                        <div className="text-[10px] tracking-widest uppercase text-noc-accent">Sinergias</div>
                        <div className="font-heading font-medium text-noc-text">Sugerencias inteligentes</div>
                        <p className="text-sm text-noc-neutral-500">Descubre qué comprar para mejorar tus mazos.</p>
                    </div>
                </div>
            </section>

            <section className="max-w-4xl mx-auto px-8 py-20 border-t border-noc-divider text-center">
                <h2 className="text-2xl font-heading font-medium mb-3 text-noc-text">
                    Empieza a organizar tu colección hoy
                </h2>
                <p className="text-noc-neutral-400 text-sm mb-6">
                    Gratis para empezar. Sin tarjeta de crédito.
                </p>
                <Link
                    to="/login"
                    className="inline-block bg-transparent border border-noc-accent text-noc-accent hover:bg-noc-accent-900 transition-colors rounded-lg px-5 py-2.5 text-sm font-medium"
                >
                    Crear cuenta
                </Link>
            </section>
        </div>
    );
};

export default LandingPage;