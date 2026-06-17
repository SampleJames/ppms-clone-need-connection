import { Router, Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { getPool, sql } from "../db";

const router = Router();

function rowToProject(row: { Id: string; Data: string }) {
  const parsed = JSON.parse(row.Data);
  // Ensure the id matches the row (in case the JSON drifted).
  parsed.id = row.Id;
  return parsed;
}

// GET /api/projects
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      "SELECT Id, Data FROM dbo.Projects ORDER BY UpdatedAt DESC"
    );
    res.json(result.recordset.map(rowToProject));
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("Id", sql.UniqueIdentifier, req.params.id)
      .query("SELECT Id, Data FROM dbo.Projects WHERE Id = @Id");
    if (result.recordset.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rowToProject(result.recordset[0]));
  } catch (err) {
    next(err);
  }
});

// POST /api/projects
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body ?? {};
    const id: string = body.id || randomUUID();
    const name: string = body.name ?? "Untitled";
    const description: string | null = body.description ?? null;
    const now = new Date().toISOString();
    const project = { ...body, id, createdAt: body.createdAt || now, updatedAt: now };

    const pool = await getPool();
    await pool
      .request()
      .input("Id", sql.UniqueIdentifier, id)
      .input("Name", sql.NVarChar(255), name)
      .input("Description", sql.NVarChar(1000), description)
      .input("Data", sql.NVarChar(sql.MAX), JSON.stringify(project))
      .query(
        `MERGE dbo.Projects AS T
         USING (SELECT @Id AS Id) AS S
         ON T.Id = S.Id
         WHEN MATCHED THEN
           UPDATE SET Name = @Name, Description = @Description, Data = @Data, UpdatedAt = SYSUTCDATETIME()
         WHEN NOT MATCHED THEN
           INSERT (Id, Name, Description, Data) VALUES (@Id, @Name, @Description, @Data);`
      );
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id
router.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const body = req.body ?? {};
    const name: string = body.name ?? "Untitled";
    const description: string | null = body.description ?? null;
    const project = { ...body, id, updatedAt: new Date().toISOString() };

    const pool = await getPool();
    const result = await pool
      .request()
      .input("Id", sql.UniqueIdentifier, id)
      .input("Name", sql.NVarChar(255), name)
      .input("Description", sql.NVarChar(1000), description)
      .input("Data", sql.NVarChar(sql.MAX), JSON.stringify(project))
      .query(
        `MERGE dbo.Projects AS T
         USING (SELECT @Id AS Id) AS S
         ON T.Id = S.Id
         WHEN MATCHED THEN
           UPDATE SET Name = @Name, Description = @Description, Data = @Data, UpdatedAt = SYSUTCDATETIME()
         WHEN NOT MATCHED THEN
           INSERT (Id, Name, Description, Data) VALUES (@Id, @Name, @Description, @Data)
         OUTPUT $action AS Action;`
      );
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", sql.UniqueIdentifier, req.params.id)
      .query("DELETE FROM dbo.Projects WHERE Id = @Id");
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;