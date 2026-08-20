import { Pool, PoolClient } from "pg";

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
})

/* Reserva UN client del pool para toda la callback: así BEGIN/COMMIT/ROLLBACK
   se aplican a la misma conexión y a todas las queries que hagas con `client`. */
export const ejecutarEnTransaccion = async <T>(
    callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const resultado = await callback(client);
        await client.query("COMMIT");
        return resultado;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};