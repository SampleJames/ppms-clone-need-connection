import sql from "mssql";
import "dotenv/config";

const {
  DB_SERVER = "localhost",
  DB_PORT = "1433",
  DB_NAME = "CostPro",
  DB_USER,
  DB_PASSWORD,
  DB_ENCRYPT = "false",
  DB_TRUST_SERVER_CERTIFICATE = "true",
  DB_INSTANCE,
} = process.env;

const config: sql.config = {
  server: DB_SERVER,
  port: DB_INSTANCE ? undefined : Number(DB_PORT),
  database: DB_NAME,
  user: DB_USER || undefined,
  password: DB_PASSWORD || undefined,
  options: {
    encrypt: DB_ENCRYPT === "true",
    trustServerCertificate: DB_TRUST_SERVER_CERTIFICATE === "true",
    instanceName: DB_INSTANCE || undefined,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then((pool) => {
        console.log(`[db] Connected to SQL Server ${DB_SERVER}/${DB_NAME}`);
        pool.on("error", (err) => console.error("[db] Pool error:", err));
        return pool;
      })
      .catch((err) => {
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}

export { sql };