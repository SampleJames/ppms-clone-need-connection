import { Router, Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { getPool, sql } from "../db";

const router = Router();

const DEFAULT_ADMIN_EMAIL = "mjfernandez@tsu.edu.ph";

type UserRow = {
  Id: string;
  Email: string;
  Name: string;
  Role: "admin" | "user";
  AzureOid: string | null;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
};

function rowToUser(r: UserRow) {
  return {
    id: r.Id,
    email: r.Email,
    name: r.Name,
    role: r.Role,
    azureOid: r.AzureOid ?? undefined,
    isActive: r.IsActive,
    createdAt: r.CreatedAt?.toISOString?.() ?? r.CreatedAt,
    updatedAt: r.UpdatedAt?.toISOString?.() ?? r.UpdatedAt,
  };
}

// POST /api/users/upsert  — called on every Microsoft sign-in
router.post("/upsert", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const name = String(req.body?.name ?? "").trim() || email;
    const azureOid = req.body?.azureOid ? String(req.body.azureOid) : null;
    if (!email) return res.status(400).json({ error: "email is required" });

    const pool = await getPool();

    // Look up existing user by email.
    const existing = await pool
      .request()
      .input("Email", sql.NVarChar(320), email)
      .query<UserRow>("SELECT * FROM dbo.Users WHERE LOWER(Email) = @Email");

    if (existing.recordset.length > 0) {
      const current = existing.recordset[0];
      await pool
        .request()
        .input("Id", sql.UniqueIdentifier, current.Id)
        .input("Name", sql.NVarChar(255), name)
        .input("AzureOid", sql.NVarChar(128), azureOid)
        .query(
          `UPDATE dbo.Users
             SET Name = @Name,
                 AzureOid = COALESCE(@AzureOid, AzureOid),
                 UpdatedAt = SYSUTCDATETIME()
           WHERE Id = @Id`
        );
      const refreshed = await pool
        .request()
        .input("Id", sql.UniqueIdentifier, current.Id)
        .query<UserRow>("SELECT * FROM dbo.Users WHERE Id = @Id");
      return res.json(rowToUser(refreshed.recordset[0]));
    }

    // Insert new user. Default role is 'user' unless the email matches the seed admin.
    const id = randomUUID();
    const role: "admin" | "user" = email === DEFAULT_ADMIN_EMAIL ? "admin" : "user";
    await pool
      .request()
      .input("Id", sql.UniqueIdentifier, id)
      .input("Email", sql.NVarChar(320), email)
      .input("Name", sql.NVarChar(255), name)
      .input("Role", sql.NVarChar(20), role)
      .input("AzureOid", sql.NVarChar(128), azureOid)
      .query(
        `INSERT INTO dbo.Users (Id, Email, Name, Role, AzureOid, IsActive)
         VALUES (@Id, @Email, @Name, @Role, @AzureOid, 1)`
      );

    const inserted = await pool
      .request()
      .input("Id", sql.UniqueIdentifier, id)
      .query<UserRow>("SELECT * FROM dbo.Users WHERE Id = @Id");
    res.status(201).json(rowToUser(inserted.recordset[0]));
  } catch (err) {
    next(err);
  }
});

// GET /api/users/me?email=...
router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = String(req.query.email ?? "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "email is required" });
    const pool = await getPool();
    const result = await pool
      .request()
      .input("Email", sql.NVarChar(320), email)
      .query<UserRow>("SELECT * FROM dbo.Users WHERE LOWER(Email) = @Email");
    if (result.recordset.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rowToUser(result.recordset[0]));
  } catch (err) {
    next(err);
  }
});

// GET /api/users — admin list
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .query<UserRow>("SELECT * FROM dbo.Users ORDER BY CreatedAt DESC");
    res.json(result.recordset.map(rowToUser));
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id/role
router.put("/:id/role", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.body?.role;
    if (role !== "admin" && role !== "user") {
      return res.status(400).json({ error: "role must be 'admin' or 'user'" });
    }
    const pool = await getPool();
    await pool
      .request()
      .input("Id", sql.UniqueIdentifier, req.params.id)
      .input("Role", sql.NVarChar(20), role)
      .query("UPDATE dbo.Users SET Role = @Role, UpdatedAt = SYSUTCDATETIME() WHERE Id = @Id");
    const refreshed = await pool
      .request()
      .input("Id", sql.UniqueIdentifier, req.params.id)
      .query<UserRow>("SELECT * FROM dbo.Users WHERE Id = @Id");
    if (refreshed.recordset.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rowToUser(refreshed.recordset[0]));
  } catch (err) {
    next(err);
  }
});

export default router;