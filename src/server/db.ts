import mysql, { type Pool, type PoolConnection, type RowDataPacket } from "mysql2/promise";

export type Row = RowDataPacket & Record<string, unknown>;
export type Db = Pick<PoolConnection, "query">;

const globalState = globalThis as typeof globalThis & { kainnaPool?: Pool; kainnaReady?: Promise<void> };

function pool(): Pool {
  if (!globalState.kainnaPool) {
    const uri = process.env.DATABASE_URL;
    if (!uri) throw new Error("DATABASE_URL is not set");
    globalState.kainnaPool = mysql.createPool({ uri, charset: "utf8mb4", connectionLimit: Number(process.env.DATABASE_POOL_SIZE ?? 5), dateStrings: true, enableKeepAlive: true });
  }
  return globalState.kainnaPool;
}

async function inTransaction<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const connection = await pool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}

/** Create tables and import seed rows once per process, before the first query. */
function ready(): Promise<void> {
  globalState.kainnaReady ??= import("./schema").then(({ initialize }) => inTransaction(initialize)).catch((error) => { globalState.kainnaReady = undefined; throw error; });
  return globalState.kainnaReady;
}

export async function query<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  await ready();
  const [result] = await pool().query<T[]>(sql, params);
  return result;
}

export async function one<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return (await query<T>(sql, params))[0];
}

export async function transaction<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  await ready();
  return inTransaction(fn);
}

export async function rows<T extends Row = Row>(db: Db, sql: string, params: unknown[] = []): Promise<T[]> {
  const [result] = await db.query<T[]>(sql, params);
  return result;
}
