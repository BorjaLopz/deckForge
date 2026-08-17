const diccionarioPrueba: Record<string, string> = {
    Creature: "Criatura",
    Legendary: "Legendaria",
    Artifact: "Artefacto"
}

const colores: Record<string, string> = {
    White: "Blanco",
    Green: "Verde",
    Blue: "Azul",
    Black: "Negro",
    Red: "Rojo",
    W: "Blanco",
    G: "Verde",
    U: "Azul",
    B: "Negro",
    R: "Rojo",
}


export const dictionaries: Record<string, Record<string, string>> = {
    tipos: diccionarioPrueba,
    colores: colores
}