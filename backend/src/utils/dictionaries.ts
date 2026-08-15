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
}


export const dictionaries: Record<string, Record<string, string>> = {
    tipos: diccionarioPrueba,
    color: colores
}