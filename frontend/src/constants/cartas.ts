export const COLORES_DISPONIBLES = ["Blanco", "Azul", "Negro", "Rojo", "Verde", "Incoloro"];

export const COLOR_HEX: Record<string, string> = {
    Blanco: "#f8f6d4",
    Azul: "#0e68ab",
    Negro: "#150b00",
    Rojo: "#d3202a",
    Verde: "#00733e",
    Incoloro: "#9c9c9c",
};

export const TIPOS_DISPONIBLES = ["Criatura", "Artefacto", "Encantamiento", "Instantáneo", "Conjuro", "Tierra", "Planeswalker", "Battle"];

/* Claves = valor tal cual lo manda Scryfall (carta.rarity) y como lo guardamos en BD */
export const RAREZA_LABEL: Record<string, string> = {
    common: "Común",
    uncommon: "Infrecuente",
    rare: "Rara",
    mythic: "Mítica",
    special: "Especial",
    bonus: "Bonus",
};

export const RAREZA_HEX: Record<string, string> = {
    common: "#8A8F98",
    uncommon: "#7FB6C4",
    rare: "#D4AF37",
    mythic: "#D3691E",
    special: "#B07FD4",
    bonus: "#B07FD4",
};
