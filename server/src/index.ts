import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import "dotenv/config";
import projectsRouter from "./routes/projects";
import settingsRouter from "./routes/settings";
import { getPool } from "./db";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:8080";

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "25mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query("SELECT 1 AS ok");
    res.json({ status: "ok", db: "connected" });
  } catch (err: unknown) {
    res.status(500).json({ status: "error", db: "disconnected", message: (err as Error).message });
  }
});

app.use("/api/projects", projectsRouter);
app.use("/api/settings", settingsRouter);

// Centralised error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[api]", err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`[api] CostPro server listening on http://localhost:${PORT}`);
  console.log(`[api] CORS origin: ${CORS_ORIGIN}`);
  // Eagerly establish the SQL Server pool so connection errors surface at boot.
  getPool().catch((err) => {
    console.error("[api] Failed to connect to SQL Server at startup:");
    console.error(err.message);
  });
});