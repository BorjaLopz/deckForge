export type buildResponseType<T> = {
    status: "ok" | "error",
    message?: string,
    id_error?: string,
    data: T | null
}