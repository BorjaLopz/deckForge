import { Response } from "express";
import { buildResponseType } from "./responseTypes"


export const buildResponse = <T>(res: Response, data: T) => {
    const respuesta: buildResponseType<T> = {
        status: "ok",
        data: data
    };

    res.json(respuesta);
}

export const buildError = (res: Response, message: string, id_error: string, httpStatus: number) => {
    const respuesta: buildResponseType<null> = {
        status: "error",
        id_error,
        message,
        data: null
    }

    res.status(httpStatus).json(respuesta);
}