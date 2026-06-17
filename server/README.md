# CostPro Local API Server

A small Express + TypeScript server that exposes a REST API backed by your
**local SQL Server** instance. The frontend (`../src`) talks to it via
`src/lib/api.ts`. No in-memory data — everything is persisted in SQL Server.

## Endpoints

| Method | Path                    | Purpose                  |
| ------ | ----------------------- | ------------------------ |
| GET    | `/api/health`           | DB connectivity check    |
| GET    | `/api/projects`         | List all projects        |
| GET    | `/api/projects/:id`     | Get a single project     |
| POST   | `/api/projects`         | Create (or upsert)       |
| PUT    | `/api/projects/:id`     | Update a project         |
| DELETE | `/api/projects/:id`     | Delete a project         |
| GET    | `/api/settings`         | Get app settings JSON    |
| PUT    | `/api/settings`         | Replace app settings     |

## One-time setup

1. **Create the schema.** Open SSMS (or `sqlcmd`) and run
   [`src/sql/schema.sql`](src/sql/schema.sql) against your SQL Server. It
   creates the `CostPro` database and the `Projects` / `AppSettings` tables.
2. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```
3. **Configure your connection:**
   ```bash
   cp .env.example .env
   # edit .env with your SQL Server host, db name, user, password
   ```

## Running it

```bash
npm run dev      # hot-reload via tsx
# or
npm run build && npm run serve
```

Server defaults to `http://localhost:4000` and allows CORS from
`http://localhost:8080` (the Vite dev server). Override via `PORT` and
`CORS_ORIGIN` in `.env`.

## Pointing the frontend at the API

The frontend reads `VITE_API_URL` and defaults to `http://localhost:4000/api`.
To override, create `.env.local` in the **project root** (next to
`package.json`):

```
VITE_API_URL=http://localhost:4000/api
```

## Notes

- All queries use **parameterised SQL** (`mssql`'s `request().input()`), so
  the API is safe from SQL injection.
- Projects are stored as a single `NVARCHAR(MAX)` JSON document — same shape
  as the client's `Project` type — plus indexed `Name`/`Description`/timestamps.
- The pool is created lazily on first request and reused.