import { Router, Request, Response, NextFunction } from "express";
import { getPool, sql } from "../db";

const router = Router();
const SETTINGS_ID = 1;

router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("Id", sql.Int, SETTINGS_ID)
      .query("SELECT Data FROM dbo.AppSettings WHERE Id = @Id");
    if (result.recordset.length === 0) return res.json({});
    res.json(JSON.parse(result.recordset[0].Data));
  } catch (err) {
    next(err);
  }
});

router.put("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    await pool
      .request()
      .input("Id", sql.Int, SETTINGS_ID)
      .input("Data", sql.NVarChar(sql.MAX), JSON.stringify(req.body ?? {}))
      .query(
        `MERGE dbo.AppSettings AS T
         USING (SELECT @Id AS Id) AS S
         ON T.Id = S.Id
         WHEN MATCHED THEN
           UPDATE SET Data = @Data, UpdatedAt = SYSUTCDATETIME()
         WHEN NOT MATCHED THEN
           INSERT (Id, Data) VALUES (@Id, @Data);`
      );
    res.json(req.body ?? {});
  } catch (err) {
    next(err);
  }
});

export default router;