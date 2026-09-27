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

/* Esquina inferior izquierda: número de colección + código de set ("177/281 M"
   y "DMU • ES" debajo), y justo por debajo el copyright + nombre del
   ilustrador. Probamos a recortar más ajustado para excluir esas líneas de
   ruido, pero cortaba las letras reales por la mitad y empeoraba todo — con
   este alto (0.12) caben las 4 líneas holgadas; el ruido del ilustrador lo
   filtramos en parsearSetYNumero contra la lista real de sets, no aquí. */
export const recortarInfoColeccion = (fotograma: HTMLCanvasElement, marco: MarcoGuia): HTMLCanvasElement =>
    recortarCanvas(
        fotograma,
        marco.x + marco.alto * 0.02,
        marco.y + marco.alto * 0.86,
        marco.ancho * 0.4,
        marco.alto * 0.12
    );

/* La letra de set/número es minúscula y sale "lavada" (poco contraste) al
   capturarla desde el móvil. Ampliamos y estiramos el contraste al rango de
   luminosidad real del recorte — sin asumir texto claro sobre oscuro o al
   revés, porque el borde de la carta cambia de color según el mazo. */
export const mejorarParaOcr = (recorte: HTMLCanvasElement, escala = 5): HTMLCanvasElement => {
    const mejorado = document.createElement("canvas");
    mejorado.width = recorte.width * escala;
    mejorado.height = recorte.height * escala;

    const contexto = mejorado.getContext("2d");
    if (!contexto) throw new Error("No se pudo procesar la imagen");

    contexto.drawImage(recorte, 0, 0, mejorado.width, mejorado.height);

    const datos = contexto.getImageData(0, 0, mejorado.width, mejorado.height);
    const pixeles = datos.data;
    const totalPixeles = pixeles.length / 4;
    const grises = new Uint8ClampedArray(totalPixeles);

    let minGris = 255;
    let maxGris = 0;

    for (let i = 0, p = 0; p < totalPixeles; i += 4, p++) {
        const gris = pixeles[i] * 0.299 + pixeles[i + 1] * 0.587 + pixeles[i + 2] * 0.114;
        grises[p] = gris;
        if (gris < minGris) minGris = gris;
        if (gris > maxGris) maxGris = gris;
    }

    const rango = Math.max(maxGris - minGris, 1);

    for (let i = 0, p = 0; p < totalPixeles; i += 4, p++) {
        const valor = ((grises[p] - minGris) / rango) * 255;
        pixeles[i] = pixeles[i + 1] = pixeles[i + 2] = valor;
    }

    contexto.putImageData(datos, 0, 0);
    return mejorado;
};

/* Mejor esfuerzo sobre texto OCR ruidoso: primer número de 1-4 cifras (el de
   colección suele venir como "0211/280") y código de set. Con `codigosValidos`
   (los ~1047 códigos reales de Scryfall) probamos cada bloque de 3-5 letras
   contra la lista real, en vez de aceptar el primero que salga — así
   "ALEXANDER" (nombre del ilustrador colado en el recorte) no cuela solo por
   parecer un código. Sin la lista, cae al primer bloque encontrado. */
export const parsearSetYNumero = (
    textoOcr: string,
    codigosValidos?: Set<string>
): { set?: string; numero?: string } => {
    const numeroMatch = textoOcr.match(/(\d{1,4})\s*\/\s*\d{1,4}/) ?? textoOcr.match(/\b(\d{1,4})\b/);
    const numero = numeroMatch ? String(Number(numeroMatch[1])) : undefined;

    let set: string | undefined;

    if (codigosValidos) {
        // Con la lista cargada, si ningún candidato es un código real NO caemos
        // al modo sin validar — eso era el bug: aceptaba el primer bloque de
        // letras igualmente ("onao", "ela"...) y anulaba la validación entera.
        const candidatos = textoOcr.match(/[A-Za-z]{3,5}/g) ?? [];
        set = candidatos.map((c) => c.toLowerCase()).find((c) => codigosValidos.has(c));
    } else {
        // Sin lista (todavía no ha cargado, o falló la petición): mejor
        // esfuerzo sin validar, como antes.
        const setMatch = textoOcr.match(/\b([A-Z]{3,5})\b/i);
        set = setMatch ? setMatch[1].toLowerCase() : undefined;
    }

    return { set, numero };
};
