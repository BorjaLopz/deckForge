/* EDHREC no tiene API pública documentada: esto usa el JSON que sirve su
   propia web. Puede cambiar sin aviso, así que todo lo que dependa de su
   forma está aquí aislado, y cacheamos para no machacarles a peticiones. */

const EDHREC_BASE_URL = "https://json.edhrec.com/pages/commanders";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const TRADUCCION_CATEGORIAS: Record<string, string> = {
    "New Cards": "Novedades",
    "Top Cards": "Más populares",
    // "lift": cuánto más aparece con este comandante que en Commander en general
    "High Lift Cards": "Muy ligadas a este comandante",
    "Game Changers": "Game Changers",
    "Creatures": "Criaturas",
    "Instants": "Instantáneos",
    "Sorceries": "Conjuros",
    "Utility Artifacts": "Artefactos de utilidad",
    "Enchantments": "Encantamientos",
    "Planeswalkers": "Planeswalkers",
    "Utility Lands": "Tierras de utilidad",
    "Mana Artifacts": "Artefactos de maná",
    "Lands": "Tierras",
    "Battles": "Batallas"
};

interface CardviewEdhrec {
    id: string;
    name: string;
    synergy?: number;
    num_decks?: number;
    potential_decks?: number;
}

interface RespuestaEdhrec {
    container?: {
        json_dict?: {
            card?: { name?: string; num_decks?: number };
            cardlists?: { header: string; cardviews: CardviewEdhrec[] }[];
        };
    };
}

export interface CartaRecomendadaEdhrec {
    scryfallId: string;
    nombreIngles: string;
    inclusion: number; // 0..1 — fracción de mazos de este comandante que la llevan
    sinergia: number;
}

export interface CategoriaEdhrec {
    categoria: string;
    cartas: CartaRecomendadaEdhrec[];
}

export interface RecomendacionesEdhrec {
    numMazos: number;
    categorias: CategoriaEdhrec[];
}

const cache = new Map<string, { timestamp: number; datos: RecomendacionesEdhrec }>();

/* "Atraxa, Praetors' Voice" -> "atraxa-praetors-voice". En cartas de dos
   caras ("A // B") EDHREC usa solo la cara frontal. */
export const slugEdhrec = (nombreIngles: string): string =>
    (nombreIngles.split(" // ")[0] ?? nombreIngles)
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

/* null = EDHREC no tiene página para ese comandante */
export const obtenerRecomendacionesEdhrec = async (nombreIngles: string): Promise<RecomendacionesEdhrec | null> => {
    const slug = slugEdhrec(nombreIngles);
    const enCache = cache.get(slug);
    if (enCache && Date.now() - enCache.timestamp < CACHE_TTL_MS) return enCache.datos;

    const res = await fetch(`${EDHREC_BASE_URL}/${slug}.json`, {
        headers: { "User-Agent": "deckForge/1.0", "Accept": "application/json" }
    });

    if (res.status === 404 || res.status === 403) return null;
    if (!res.ok) throw new Error(`EDHREC respondió ${res.status}`);

    const json = (await res.json()) as RespuestaEdhrec;
    const dict = json.container?.json_dict;
    if (!dict?.cardlists) return null;

    const datos: RecomendacionesEdhrec = {
        numMazos: dict.card?.num_decks ?? 0,
        categorias: dict.cardlists.map((lista) => ({
            categoria: TRADUCCION_CATEGORIAS[lista.header] ?? lista.header,
            cartas: lista.cardviews.map((c) => ({
                scryfallId: c.id,
                nombreIngles: c.name,
                inclusion: c.potential_decks ? (c.num_decks ?? 0) / c.potential_decks : 0,
                sinergia: c.synergy ?? 0
            }))
        }))
    };

    cache.set(slug, { timestamp: Date.now(), datos });
    return datos;
};
