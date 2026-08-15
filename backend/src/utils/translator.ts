import { dictionaries } from "./dictionaries";

export const translator = (category: string, valueToTranslate: string): string => {
    const chosenDictionary = dictionaries[category];
    const foundValue = chosenDictionary?.[valueToTranslate];

    let translatedValue: string;
    if (!foundValue) {
        console.warn(`Diccionario no encontrado: La palabra ${valueToTranslate} no se ha podido traducir`);
        translatedValue = valueToTranslate;
    } else {
        translatedValue = foundValue;
    }

    return translatedValue;
};