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
| POST   | `/api/users/upsert`     | Upsert user on MS sign-in |
| GET    | `/api/users/me?email=`  | Lookup a user by email   |
| GET    | `/api/users`            | List all users (admin)   |
| PUT    | `/api/users/:id/role`   | Change a user's role     |

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

## Microsoft Sign-In (Azure AD) setup

The frontend uses `@azure/msal-browser` to sign users in with their Microsoft
work / school account. Follow these steps to register an Azure AD application:

1. Go to <https://portal.azure.com> → **Microsoft Entra ID** → **App registrations** → **New registration**.
2. Name it (e.g. `PPMS Local`), choose **Accounts in this organizational directory only** (single tenant) or **any directory** as needed.
3. Under **Redirect URI** pick **Single-page application (SPA)** and add:
   - `http://localhost:8080`
   - (Optional, for production) your deployed frontend URL
4. Click **Register**. Copy these two values from the Overview page:
   - **Application (client) ID** → goes into `VITE_AZURE_CLIENT_ID`
   - **Directory (tenant) ID** → goes into `VITE_AZURE_TENANT_ID` (or use `common` for any MS account)
5. Go to **API permissions** and confirm **Microsoft Graph → User.Read** (delegated) is granted. Click **Grant admin consent** if prompted.

Then create a `.env.local` in the project root (next to `package.json`) with:

```env
VITE_API_URL=http://localhost:4000/api
VITE_AZURE_CLIENT_ID=<your-application-client-id>
VITE_AZURE_TENANT_ID=<your-directory-tenant-id>
```

Restart the Vite dev server after editing `.env.local`.

### Roles & default admin

- On every successful Microsoft sign-in the frontend calls `POST /api/users/upsert`
  with the user's email/name/Azure object id.
- New users get role `user`. The email **mjfernandez@tsu.edu.ph** is seeded as
  `admin` by `schema.sql` and is forced back to admin if ever demoted.
- Promote/demote other users with `PUT /api/users/:id/role` (body: `{ "role": "admin" | "user" }`).