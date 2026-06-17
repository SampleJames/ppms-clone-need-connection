## Goal
Convert the app to a single "Projects" experience (no sign-in, no Shared Projects), and replace cloud/Firebase persistence with a local REST API backed by your local SQL Server.

## Scope of changes

### 1. Frontend cleanup
- Remove the "Shared Projects" nav entry and route (`/collab`, `CollabPage.tsx`, `CollabProjectPage.tsx`, `InviteAcceptPage.tsx`).
- Remove sign-in / auth UI and any auth guards. The app opens directly to Projects.
- Keep: Dashboard/Projects list, ProjectView, Settings, Print, About.
- Update `App.tsx` routes and the main navigation component to show only **Projects** + **Settings** (+ About/Print as today).

### 2. New API controller (frontend)
- Add `src/lib/api.ts` — a typed fetch client with `getProjects`, `getProject`, `createProject`, `updateProject`, `deleteProject` (plus settings GET/PUT).
- Base URL comes from `VITE_API_URL` (defaults to `http://localhost:4000/api`).
- Replace local/Firebase reads/writes in the Projects list and ProjectView with calls to this controller. No in-memory fallback, no localStorage caching of project data.

### 3. New backend (separate folder `server/`)
A small Node + Express + TypeScript server you run locally against your SQL Server instance.

```
server/
  package.json
  tsconfig.json
  .env.example          # DB_SERVER, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
  src/
    index.ts            # express app, CORS, json, mounts routes, listens on 4000
    db.ts               # mssql connection pool (single shared pool)
    sql/schema.sql      # CREATE TABLE Projects, Settings (run once in SSMS)
    routes/
      projects.ts       # GET/POST/PUT/DELETE /api/projects
      settings.ts       # GET/PUT /api/settings
  README.md             # how to run
```

- Uses the official `mssql` driver (Tedious). No ORM, parameterized queries only.
- `Projects` table stores: `Id UNIQUEIDENTIFIER PK`, `Name NVARCHAR(255)`, `Data NVARCHAR(MAX)` (JSON blob of the project document), `CreatedAt`, `UpdatedAt`.
- `Settings` table: single-row key/value or one row of JSON.
- Endpoints:
  - `GET    /api/projects`         → list
  - `GET    /api/projects/:id`     → one
  - `POST   /api/projects`         → create (server generates Id, timestamps)
  - `PUT    /api/projects/:id`     → full update
  - `DELETE /api/projects/:id`     → delete
  - `GET    /api/settings` / `PUT /api/settings`
- CORS allows `http://localhost:8080` (Vite dev).

### 4. Removed/Untouched
- `src/lib/firebase.ts`, `collabStorage.ts`, and Shared-Projects components: removed.
- Estimation logic (`calculations.ts`, excel/pdf exports, templates): untouched — they operate on the project document the API returns.

## How you'll run it locally
1. In SSMS, run `server/sql/schema.sql` against your DB.
2. `cd server && npm install && cp .env.example .env` → fill in SQL Server creds.
3. `npm run dev` → API on `http://localhost:4000`.
4. `bun run dev` in the project root → UI on `http://localhost:8080` talks to the API.

## Open questions
1. **SQL Server auth** — Windows Authentication (`trustedConnection`) or SQL login (user/password)? Default plan assumes SQL login; tell me if you need Windows auth.
2. **Project shape** — OK to store the whole project as a JSON blob in one `Data` column (simple, matches current client model), or do you want normalized tables for line items / ABC schedule / DUPA?
3. **Settings** — keep app settings server-side too, or leave Settings as local-only and only sync Projects?
