/* Relación ancho/alto real de una carta de Magic (63mm x 88mm) */
export const RELACION_CARTA = 63 / 88;

export interface MarcoGuia {
    x: number;
    y: number;
    ancho: number;
    alto: number;
}

/* El marco guía ocupa el 80% del ancho del vídeo, centrado, con la
   proporción real de una carta física. */
export const calcularMarcoGuia = (anchoVideo: number, altoVideo: number): MarcoGuia => {
    const ancho = anchoVideo * 0.8;
    const alto = ancho / RELACION_CARTA;
    return {
        x: (anchoVideo - ancho) / 2,
        y: (altoVideo - alto) / 2,
        ancho,
        alto
    };
};

const recortarCanvas = (origen: HTMLCanvasElement, x: number, y: number, ancho: number, alto: number): HTMLCanvasElement => {
    const recorte = document.createElement("canvas");
    recorte.width = ancho;
    recorte.height = alto;

    const contexto = recorte.getContext("2d");
    if (!contexto) throw new Error("No se pudo procesar la imagen");

    contexto.drawImage(origen, x, y, ancho, alto, 0, 0, ancho, alto);
    return recorte;
};

/* Esquina inferior izquierda: número de colección + código de set. Son dos
   líneas ("177/281 M" y "DMU • ES" debajo) — el recorte tiene que llegar
   hasta el borde inferior para no cortar la segunda línea. */
export const recortarInfoColeccion = (fotograma: HTMLCanvasElement, marco: MarcoGuia): HTMLCanvasElement =>
    recortarCanvas(
        fotograma,
        marco.x + marco.alto * 0.02,
        marco.y + marco.alto * 0.86,
        marco.ancho * 0.4,
        marco.alto * 0.12
    );

/* Mejor esfuerzo sobre texto OCR ruidoso: primer número de 1-4 cifras (el de
   colección suele venir como "0211/280") y primer bloque de 3-5 letras
   mayúsculas (el código de set). Cualquiera de los dos puede no aparecer. */
export const parsearSetYNumero = (textoOcr: string): { set?: string; numero?: string } => {
    const numeroMatch = textoOcr.match(/(\d{1,4})\s*\/\s*\d{1,4}/) ?? textoOcr.match(/\b(\d{1,4})\b/);
    const numero = numeroMatch ? String(Number(numeroMatch[1])) : undefined;

    const setMatch = textoOcr.match(/\b([A-Z]{3,5})\b/i);
    const set = setMatch ? setMatch[1].toLowerCase() : undefined;

    return { set, numero };
};
