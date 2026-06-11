# CostPro — Construction Cost Estimation Suite

A complete browser-based **construction cost estimation** platform built for Philippine
infrastructure / building projects. It produces:

- **ABC (Approved Budget for the Contract)** schedules of works
- **DUPA (Detailed Unit Price Analysis)** for every line item
- **S-Curve** project progress / cash-flow charts
- **Price Lists** of materials, labor, and equipment
- **Templates** library of reusable DUPAs
- **Real-time Collaboration** mode (multi-user editing via Firebase)
- Excel + PDF export of every artifact
- Pixel-accurate **print previews** with configurable headers/footers

Everything runs in the browser. Projects are stored in **`localStorage`**
by default, and optionally synced to **Firebase Firestore** when a user
opens a project in *Collab* mode.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Prerequisites](#prerequisites)
3. [Local Setup](#local-setup)
4. [Available Scripts](#available-scripts)
5. [Project Structure](#project-structure)
6. [Where to Find Each Feature](#where-to-find-each-feature)
   - [Local Storage / Persistence](#local-storage--persistence)
   - [ABC Table](#abc-table)
   - [DUPA (Detailed Unit Price Analysis)](#dupa-detailed-unit-price-analysis)
   - [S-Curve](#s-curve)
   - [Price List](#price-list)
   - [Templates / Playground](#templates--playground)
   - [Calculations Engine](#calculations-engine)
   - [Formula Engine](#formula-engine)
   - [Excel Import / Export](#excel-import--export)
   - [PDF Export & Print](#pdf-export--print)
   - [Settings & Config Backup](#settings--config-backup)
   - [Collaboration (Firebase)](#collaboration-firebase)
   - [Authentication](#authentication)
7. [Data Model (`src/types/index.ts`)](#data-model)
8. [Routing](#routing)
9. [Styling / Design System](#styling--design-system)
10. [Testing](#testing)
11. [Building for Production](#building-for-production)
12. [Troubleshooting](#troubleshooting)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | **React 18** + **TypeScript** |
| Build tool | **Vite 5** (`@vitejs/plugin-react-swc`) |
| Styling | **Tailwind CSS 3** + **shadcn/ui** (Radix primitives) |
| Routing | **react-router-dom v6** (`src/App.tsx`) |
| State | React hooks + `localStorage` (no Redux) |
| Data fetching | `@tanstack/react-query` |
| Charts | **Recharts** (S-Curve) |
| Excel I/O | **ExcelJS** + **xlsx** (SheetJS) |
| PDF | **jsPDF** + **jspdf-autotable** + **html2canvas** |
| Forms | **react-hook-form** + **zod** |
| Collab backend | **Firebase 12** (Auth + Firestore) |
| Testing | **Vitest** + **@testing-library/react** + **Playwright** |
| Icons | **lucide-react** |

---

## Prerequisites

You need the following installed locally:

| Tool | Minimum version | Why |
|---|---|---|
| **Node.js** | **18.x or 20.x LTS** (22 also works) | Vite 5 + Firebase 12 |
| **npm** | bundled with Node | Default package manager |
| **Git** | any recent | Cloning the repo |
| (optional) **bun** | `>=1.0` | Faster installs; this repo already ships a `bun.lock` |

Install Node via [nvm](https://github.com/nvm-sh/nvm) (recommended):

```bash
nvm install 20
nvm use 20
node -v   # should print v20.x.x
npm -v
```

---

## Local Setup

```bash
# 1. Clone
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# 2. Install dependencies
npm install
#   …or, for a faster install:
# bun install

# 3. (Optional) Firebase — only required if you want Collab mode
#    The repo ships with a working Firebase config baked into
#    src/lib/firebase.ts. Replace it with your own project if you
#    want to host your own collab backend.

# 4. Run the dev server (hot reload on http://localhost:8080)
npm run dev
```

Open <http://localhost:8080> (Vite's default for this template — check the
terminal output if it differs).

The first time you open the app it will create an empty project in your
browser's `localStorage`. No backend is needed for solo use.

---

## Available Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check & build a production bundle into `dist/` |
| `npm run build:dev` | Same, but with development mode (source maps, no minify) |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | Run ESLint over `src/` |
| `npm run test` | Run the Vitest test suite once |
| `npm run test:watch` | Run Vitest in watch mode |

---

## Project Structure

```
src/
├── App.tsx                    # Top-level router + providers
├── main.tsx                   # React root mount
├── index.css / styles.css     # Global Tailwind + design tokens
├── components/                # All UI components
│   ├── ABCTable.tsx           # ABC schedule editor
│   ├── DUPAList.tsx           # DUPA picker (dropdown of work items)
│   ├── DUPADetail.tsx         # The full DUPA worksheet
│   ├── SCurve.tsx             # S-curve chart & schedule
│   ├── SCurveDateRanges.tsx   # Date-range editor for S-curve
│   ├── PriceList.tsx          # Master price list (materials/labor/equipment)
│   ├── Templates.tsx          # Saved DUPA templates browser
│   ├── Playground.tsx         # Quick "what-if" calculator
│   ├── PrintLayoutPreview.tsx # Pixel-accurate print preview
│   ├── PrintSettingsEditor.tsx# Header/footer/margins/logos config
│   ├── UpdatePricelistDialog.tsx
│   ├── ConfigImportLoader.tsx # Bootstraps a backup file on first load
│   ├── AppLayout.tsx          # Sidebar/topbar shell
│   ├── NavLink.tsx
│   ├── ScrollToTop.tsx
│   ├── formula-cell.tsx       # Spreadsheet-style formula input
│   ├── auth/                  # SignInScreen, UserMenu
│   ├── collab/                # PresenceAvatars, MembersPopover,
│   │                          # InviteDialog, ActivityDrawer
│   └── ui/                    # shadcn/ui primitives (Button, Dialog, …)
│
├── pages/                     # Route-level components
│   ├── Dashboard.tsx          # Project list (home)
│   ├── ProjectView.tsx        # Tabbed project editor (ABC/DUPA/S-curve/…)
│   ├── SettingsPage.tsx       # Project-level settings (% OCM, VAT, …)
│   ├── PrintPage.tsx          # Print-ready output
│   ├── AboutPage.tsx
│   ├── Index.tsx
│   ├── NotFound.tsx
│   ├── CollabPage.tsx         # List of shared/collab projects
│   ├── CollabProjectPage.tsx  # Real-time collab editor (adapter)
│   └── InviteAcceptPage.tsx   # Accepts an invite link
│
├── lib/                       # All business logic (no React)
│   ├── storage.ts             # localStorage CRUD for projects
│   ├── calculations.ts        # Cost math (ABC totals, DUPA roll-up)
│   ├── formulas.ts            # Mini formula parser/evaluator
│   ├── dupaDefaults.ts        # Empty-row factories for DUPA
│   ├── sampleData.ts          # Seed project / demo data
│   ├── sampleTemplates.ts     # Default template library
│   ├── templates.ts           # Template CRUD (localStorage)
│   ├── excel.ts               # ABC + DUPA → Excel (ExcelJS)
│   ├── pricelistExcel.ts      # Price list ↔ Excel
│   ├── scurveExcel.ts         # S-curve → Excel
│   ├── categoryExcel.ts       # Category sheet helpers
│   ├── importDupaTemplate.ts  # Import a DUPA template file
│   ├── pdf.ts                 # ABC/DUPA → PDF (jsPDF)
│   ├── pdfText.ts             # PDF text helpers
│   ├── scurvePdf.ts           # S-curve → PDF
│   ├── printSettings.ts       # Header/footer/page setup persistence
│   ├── configBackup.ts        # Export/import the entire app config
│   ├── specBackfill.ts        # Migrations for older saved projects
│   ├── firebase.ts            # Firebase init (Auth + Firestore)
│   ├── collabStorage.ts       # Realtime CRUD for collab projects
│   ├── error-capture.ts       # Global error reporting
│   ├── error-page.ts
│   └── utils.ts               # cn() helper, misc.
│
├── contexts/
│   └── AuthContext.tsx        # Firebase auth provider (used by collab)
│
├── hooks/                     # use-toast, use-mobile, …
├── types/index.ts             # All TypeScript domain types
└── test/                      # Vitest setup + sample tests
```

> The repo also contains a TanStack-Start scaffold (`src/routes/`, `src/router.tsx`,
> `src/server.ts`, `src/start.ts`, `src/routeTree.gen.ts`) left over from the
> Lovable template. The **active** router is `react-router-dom` wired up in
> `src/App.tsx`. You can ignore the `src/routes/*` files unless you intend to
> migrate to TanStack Start.

---

## Where to Find Each Feature

### Local Storage / Persistence

All solo (non-collab) data lives in the browser's `localStorage`.

- **`src/lib/storage.ts`** — the single source of truth.
  - `getProjects()` / `getProject(id)` — read
  - `saveProject(project)` — upsert
  - `deleteProject(id)` — remove
  - `STORAGE_KEY` constant — the localStorage namespace
  - On load it runs `specBackfill.ts` to migrate older payloads
- **`src/lib/templates.ts`** — same pattern for the DUPA template library.
- **`src/lib/printSettings.ts`** — per-project print/header settings.
- **`src/lib/configBackup.ts`** — exports/imports **everything** in
  localStorage as a single JSON file (used in Settings → *Backup config*).
- **`src/components/ConfigImportLoader.tsx`** — auto-imports a config
  bundle the first time the app boots (useful for shipping defaults).

> To inspect or wipe local data: DevTools → Application → Local Storage →
> `http://localhost:8080`. Keys are prefixed (see `STORAGE_KEY` in
> `storage.ts`).

### ABC Table

- **UI**: `src/components/ABCTable.tsx`
- **Page**: rendered inside `src/pages/ProjectView.tsx` (tab: *ABC*)
- **Math**: `recalcABCItem()` and `syncDupaToABC()` in
  `src/lib/calculations.ts`
- **Types**: `ABCItem` in `src/types/index.ts`
- **Excel export**: `src/lib/excel.ts` + `src/lib/categoryExcel.ts`
- **PDF export**: `src/lib/pdf.ts`

Each row is either a **category** (header, no math) or a **line item**
(quantity × unit cost, with OCM/Profit/VAT markups). When a line item has a
linked DUPA, the costs are pulled from the DUPA via `syncDupaToABC`.

### DUPA (Detailed Unit Price Analysis)

- **Picker UI**: `src/components/DUPAList.tsx` — dropdown of every ABC
  line item; creates a blank DUPA on first selection.
- **Worksheet UI**: `src/components/DUPADetail.tsx` — the full
  Materials / Labor / Equipment editor (with Excel-like zoom).
- **Empty-row factories**: `src/lib/dupaDefaults.ts` (5 blank rows per
  section by default — see `DEFAULT_DUPA_ROW_COUNT`).
- **Math**: `recalcDupa()` in `src/lib/calculations.ts` (totals → indirect →
  VAT → unit price).
- **Types**: `DUPAItem`, `MaterialItem`, `LaborItem`, `EquipmentItem` in
  `src/types/index.ts`.
- **Templates**: see [Templates / Playground](#templates--playground).
- **Import a DUPA template**: `src/lib/importDupaTemplate.ts`.

### S-Curve

- **Chart UI**: `src/components/SCurve.tsx` (Recharts)
- **Date-range editor**: `src/components/SCurveDateRanges.tsx`
- **Excel export**: `src/lib/scurveExcel.ts`
- **PDF export**: `src/lib/scurvePdf.ts`
- **Types**: `SCurveData`, `SCurveItem` (etc.) in `src/types/index.ts`

The chart consumes ABC totals + per-item date ranges to produce planned
% progress over time, plus monthly cash flow.

### Price List

- **UI**: `src/components/PriceList.tsx`
- **Update dialog**: `src/components/UpdatePricelistDialog.tsx` — bulk
  push current prices back into every DUPA.
- **Excel I/O**: `src/lib/pricelistExcel.ts`
- **Storage**: lives inside each `Project` (see `priceList` field in
  `src/types/index.ts`), persisted via `storage.ts`.

### Templates / Playground

- **Templates browser**: `src/components/Templates.tsx`
- **Seed data**: `src/lib/sampleTemplates.ts`
- **CRUD**: `src/lib/templates.ts`
- **Playground (sandbox calculator)**: `src/components/Playground.tsx` —
  lets you tinker with a DUPA without saving it to a project.

### Calculations Engine

Single file: **`src/lib/calculations.ts`**. Notable exports:

| Function | Purpose |
|---|---|
| `r2(n)` | Round to 2 decimals (matches Excel) |
| `calcMaterialTotal / calcLaborTotal / calcEquipmentTotal` | Row totals |
| `resolveDupaFormulaSections(...)` | Evaluate every formula cell |
| `recalcDupa(dupa)` | Recompute a DUPA end-to-end |
| `recalcABCItem(item)` | Recompute one ABC line (direct + markups + VAT) |
| `syncDupaToABC(abcItems, dupaItems)` | Push DUPA totals back into ABC |
| `formatCurrency(n)` | `"1,234.56"` style display |

Indirect cost = `OCM% + Profit%`. VAT is applied on `(direct + indirect)`.
Unit price = `totalPrice / quantity` (or `0` if qty is `0`).

### Formula Engine

- **`src/lib/formulas.ts`** — tiny spreadsheet-style evaluator.
- **`src/components/formula-cell.tsx`** — input that lets users type
  formulas like `A1.t * 0.05` or `qty * 1.1`.
- Reference syntax (see `resolveDupaFormulaSections`):
  - `A{n}` / `A{n}.u` / `A{n}.t` — material n's qty / unit cost / total
  - `B{n}` / `B{n}.w` / `B{n}.t` — labor n's man-days / wage / total
  - `C{n}` / `C{n}.r` / `C{n}.t` — equipment n's period / rate / total
  - `qty` — the parent DUPA quantity

### Excel Import / Export

| File | Handles |
|---|---|
| `src/lib/excel.ts` | ABC schedule + DUPA worksheets |
| `src/lib/categoryExcel.ts` | Per-category sheets |
| `src/lib/pricelistExcel.ts` | Price list round-trip |
| `src/lib/scurveExcel.ts` | S-curve sheet |
| `src/lib/importDupaTemplate.ts` | Import a DUPA template file |

Underlying libraries: **ExcelJS** (rich formatting) and **xlsx**/SheetJS
(fast reads).

### PDF Export & Print

- **`src/lib/pdf.ts`** — ABC + DUPA PDFs via jsPDF + autoTable
- **`src/lib/pdfText.ts`** — shared typography helpers
- **`src/lib/scurvePdf.ts`** — S-curve PDF
- **Print preview UI**: `src/components/PrintLayoutPreview.tsx`
- **Print settings UI**: `src/components/PrintSettingsEditor.tsx`
  (persisted via `src/lib/printSettings.ts`)
- **Print page route**: `src/pages/PrintPage.tsx` — uses `html2canvas`
  for pixel-accurate browser print.

### Settings & Config Backup

- **Page**: `src/pages/SettingsPage.tsx`
- **Per-project settings**: `Project.settings` (see `src/types/index.ts`) —
  default OCM%, Profit%, VAT%, currency, etc.
- **Whole-app backup**: `src/lib/configBackup.ts` — export / import
  every key in localStorage as a single JSON file. The bootstrap loader
  is `src/components/ConfigImportLoader.tsx`.

### Collaboration (Firebase)

- **Firebase init**: `src/lib/firebase.ts` (config + recommended
  Firestore security rules in a code comment at the bottom of the file)
- **Realtime CRUD**: `src/lib/collabStorage.ts`
  - `subscribeProject(id, cb)` — `onSnapshot` listener
  - `queueProjectWrite(...)` — 400ms debounced writes
  - Tracks `lastEditedBy`, `updatedAt` (`serverTimestamp()`)
- **Dashboard**: `src/pages/CollabPage.tsx`
- **Editor (adapter)**: `src/pages/CollabProjectPage.tsx` — re-uses the
  exact same ABC/DUPA/S-curve/PriceList components by swapping the
  `onSave` plumbing to Firestore.
- **Invites**: `src/components/collab/InviteDialog.tsx` +
  `src/pages/InviteAcceptPage.tsx`
- **Member management**: `src/components/collab/MembersPopover.tsx`
  (owner / editor / viewer roles)
- **Live presence**: `src/components/collab/PresenceAvatars.tsx`
  (15-second heartbeat; shows which tab each user is on)
- **Activity feed**: `src/components/collab/ActivityDrawer.tsx`

#### Firestore data model

```
collabProjects/{projectId}
  ├── ownerId, memberIds[], data (full Project blob), updatedAt, lastEditedBy
  ├── members/{uid}          — { role, displayName, email, photoURL, joinedAt }
  ├── invites/{token}        — { role, createdBy, expiresAt, used }
  ├── presence/{uid}         — { displayName, photoURL, color, lastSeen, currentTab }
  └── activity/{autoId}      — { uid, displayName, action, target, at }
```

#### Pointing it at your own Firebase project

1. Create a Firebase project at <https://console.firebase.google.com>.
2. Enable **Authentication** → providers: Email/Password + Google.
3. Create a **Firestore** database (Native mode).
4. Copy your web app config into `src/lib/firebase.ts` (replace the
   `firebaseConfig` object).
5. Paste the security rules block from the bottom of `firebase.ts` into
   Firestore → Rules and **Publish**.

### Authentication

- **Context**: `src/contexts/AuthContext.tsx` — wraps the app, exposes
  `user`, `signIn`, `signUp`, `signInWithGoogle`, `signOut`.
- **Sign-in UI**: `src/components/auth/SignInScreen.tsx`
- **User menu**: `src/components/auth/UserMenu.tsx` (shown in the header
  when signed in).

Authentication is only required for Collab mode. Solo mode never asks
for a login.

---

## Data Model

All domain types live in **`src/types/index.ts`**. The top-level shape is:

```ts
Project {
  id, name, createdAt, updatedAt,
  settings: { ocmPercent, profitPercent, vatPercent, … },
  abcItems:  ABCItem[],
  dupaItems: DUPAItem[],
  priceList: PriceListItem[],
  sCurve:    SCurveData,
  // …
}
```

`DUPAItem` contains three arrays — `materials: MaterialItem[]`,
`labor: LaborItem[]`, `equipment: EquipmentItem[]` — plus all derived
totals (regenerated by `recalcDupa`).

---

## Routing

`src/App.tsx` wires up react-router-dom:

| Path | Component |
|---|---|
| `/` | `pages/Dashboard.tsx` |
| `/project/:id` | `pages/ProjectView.tsx` (tabs: ABC, DUPA, S-curve, Price List, Templates, Playground) |
| `/project/:id/print` | `pages/PrintPage.tsx` |
| `/settings` | `pages/SettingsPage.tsx` |
| `/about` | `pages/AboutPage.tsx` |
| `/collab` | `pages/CollabPage.tsx` |
| `/collab/project/:id` | `pages/CollabProjectPage.tsx` |
| `/collab/invite/:token` | `pages/InviteAcceptPage.tsx` |
| `*` | `pages/NotFound.tsx` |

Sidebar/topbar live in `src/components/AppLayout.tsx`.

---

## Styling / Design System

- Tailwind config: `tailwind.config.ts`
- Design tokens (CSS variables, `oklch` colors): `src/styles.css` +
  `src/index.css`
- shadcn/ui components: `src/components/ui/*` — generated via
  `components.json`. Don't hand-edit unless you know what you're doing;
  re-add via `npx shadcn@latest add <name>` if missing.

---

## Testing

- **Unit / component tests**: Vitest + Testing Library.
  - Config: `vitest.config.ts`
  - Setup file: `src/test/setup.ts`
  - Example: `src/test/example.test.ts`
  - Run: `npm run test` or `npm run test:watch`
- **E2E**: Playwright.
  - Config: `playwright.config.ts`
  - Fixture: `playwright-fixture.ts`
  - Run: `npx playwright test`

---

## Building for Production

```bash
npm run build       # → dist/
npm run preview     # serve dist/ locally to verify
```

The output is a fully static SPA — deploy `dist/` to Vercel, Netlify,
Cloudflare Pages, Firebase Hosting, S3+CloudFront, or any static host.
Make sure the host rewrites unknown paths to `index.html` (SPA fallback)
so that deep links like `/project/abc` work on refresh.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `command not found: vite` | Run `npm install` first |
| Blank page after `npm run dev` | Check the terminal port (Vite picks the next free one); open that URL |
| `Failed to resolve import "firebase/..."` | `npm install` — the `firebase` package must be present |
| Collab tab says "not signed in" forever | Confirm Firebase Auth provider is enabled (Email/Password or Google) in your Firebase console |
| "Missing or insufficient permissions" from Firestore | Paste the security rules block from `src/lib/firebase.ts` into Firestore → Rules |
| Lost all my projects after clearing cookies | Local data lives in `localStorage`. Use Settings → *Backup config* regularly. |
| Excel export opens but numbers look off | All math is rounded with `r2()` in `src/lib/calculations.ts` to match Excel — check that file if you need a different precision |
| Print preview cuts off content | Adjust margins/header height in `PrintSettingsEditor` (`src/components/PrintSettingsEditor.tsx`) |

---

Happy estimating! For deeper dives, the best entry points are
**`src/types/index.ts`** (the data model) and
**`src/lib/calculations.ts`** (the math). Everything else is UI on top
of those two files.
