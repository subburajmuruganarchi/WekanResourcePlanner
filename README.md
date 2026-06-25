# R360 Platform

R360 is a resource management and allocation system for consultancy operations: employees, projects, weekly planning, time entry, PM approvals, utilization, and Excel reports.

## Architecture

Monorepo with two deployable apps:

| Path | Stack | Purpose |
|------|-------|---------|
| **`app/`** | React 19, Vite 7, TypeScript, Tailwind CSS, React Router | SPA frontend |
| **`backend/`** | Node.js, Express, TypeScript, Mongoose | REST API |

**Database:** MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

```
Browser → React SPA (static) → Express API (/api/*) → MongoDB
```

Frontend and backend can be deployed separately. See [DEPLOYMENT.md](./DEPLOYMENT.md) for production.

## Prerequisites

- **Node.js 18+** (Node 20 recommended)
- **MongoDB** connection string (`mongodb://` or `mongodb+srv://`)
- npm

## Quick Start (local)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` — minimum required:

```env
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/resource-360?retryWrites=true&w=majority
JWT_SECRET=replace_with_at_least_32_random_characters
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
PORT=3000
```

Start API:

```bash
npm run dev
```

Verify: [http://localhost:3000/ready](http://localhost:3000/ready) → `"db": "connected"`

### 2. Frontend

```bash
cd app
npm install
```

Create `app/.env.local`:

```env
VITE_API_URL=http://localhost:3000/api
```

Optional (Google login):

```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Start dev server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 3. Seed demo data

From `backend/` (with MongoDB reachable):

```bash
npm run seed:planner
```

Imports Excel files from `backend/data/planner/`:

- `Resource.xlsx` — employees, roles, skills
- `Project.xlsx` — projects
- `Project_Allocation.xlsx` — allocations and weekly grid

**Default logins** (password for all seeded users: `Admin123!`):

| Role | Email |
|------|--------|
| Admin | `admin@r360.com` |
| CEO | `ceo@r360.com` |
| Delivery Manager | `dm@r360.com` |
| Project Manager | `pm@r360.com` |
| Employee | `employee@r360.com` |

For a smaller demo dataset with sample timesheets (draft, submitted, approved, rejected), run `npm run seed:dev`.

Admins can also upload planner files via **Inputs** in the sidebar (`/inputs`).

## Documentation

- **[Role Feature Guide (PM / DM / CEO)](./docs/ROLE_FEATURE_GUIDE.md)** — persona workspaces, module features, and screenshots

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Notes |
|----------|----------|--------|
| `MONGO_URI` or `DATABASE_URL` | Yes | MongoDB connection |
| `JWT_SECRET` | Yes | Min 32 characters |
| `FRONTEND_URL` | Yes | SPA origin for CORS (no trailing slash) |
| `NODE_ENV` | Optional | `development` / `production` |
| `PORT` | Optional | Default `3000` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth |
| `FEATURE_WEEKLY_ALLOCATIONS_ENABLED` | Optional | Weekly planner API (`true` to enable) |
| `FEATURE_UTILIZATION_API_ENABLED` | Optional | Utilization endpoints |

Full list: [`backend/.env.example`](./backend/.env.example)

### Frontend (build-time — Vite)

| Variable | Required | Notes |
|----------|----------|--------|
| `VITE_API_URL` | Yes | e.g. `http://localhost:3000/api` |
| `VITE_GOOGLE_CLIENT_ID` | Optional | Google sign-in button |

See [`app/.env.example`](./app/.env.example)

> `VITE_*` values are baked in at `npm run build`. Set them in your CI/host before building for production.

## Docker (optional)

```bash
# From repo root — uses backend/.env and builds SPA with local API URL
docker compose up --build
```

- API: [http://localhost:3000](http://localhost:3000)
- Web: [http://localhost:8080](http://localhost:8080)

MongoDB is **not** included in Compose; point `MONGO_URI` in `backend/.env` to Atlas or a local instance.

## Features

R360 supports five access roles: **Employee**, **Project Manager**, **Delivery Manager**, **CEO**, and **Admin**. Navigation and API access are scoped per role.

### Platform capabilities

| Capability | Description |
|------------|-------------|
| **Resource planning** | Project × employee allocation grid with weekly planned hours |
| **Weekly planner** | Plan vs actual vs delta (approved time) by week |
| **Time tracking** | Daily time entry by project; weekly submit with Mon–Fri validation |
| **Timesheet approvals** | PM/DM/Admin approve or reject with reason; employee resubmit flow |
| **Utilization & dashboard** | Workforce utilization trends, heatmaps, capacity signals |
| **Delivery risk** | Portfolio and project risk engine with suggested actions |
| **OKRs** | Personal and org objectives with rollup views |
| **Reports** | Excel exports for staffing, utilization, and delivery |
| **Planner import** | Excel upload (Resource, Project, Allocation) + Google Sheet sync |
| **AI insights** | Read-only explainability over allocations and approvals (no auto-approve) |

### Employee

| Feature | Route |
|---------|-------|
| My Workspace — projects, timesheet status, OKR snapshot | `/workspace` |
| Time Tracking — log hours, save draft, submit week | `/time-entry` |
| My OKRs | `/okrs` |

Own time entries only. Can edit and resubmit rejected timesheets with PM feedback shown in-app.

### Project Manager

| Feature | Route |
|---------|-------|
| Project Dashboard | `/pm` |
| Timeline & team roster | `/pm/timeline`, `/pm/team` |
| Resource allocation (view) | `/allocation` |
| Status reports & project risks | `/pm/status-report`, `/pm/risks` |
| Time entry & approvals | `/time-entry`, `/pm-approvals` |

Scoped to **projects you manage**. Approve/reject team timesheets; rejection reasons are captured and visible to employees.

### Delivery Manager

| Feature | Route |
|---------|-------|
| Delivery Command Center | `/delivery` |
| Portfolio projects | `/projects` |
| Resource planning (edit, portfolio scope) | `/allocation` |
| Capacity forecast | `/delivery/capacity` |
| Timesheet approvals (portfolio) | `/pm-approvals` |
| Reports & suggested actions | `/reports`, `/delivery/recommendations` |

Scoped to **projects in assigned delivery portfolios**.

### CEO

| Feature | Route |
|---------|-------|
| Executive dashboard | `/executive` |
| Risk radar | `/executive/risk-radar` |
| OKR alignment & reports | `/okrs`, `/reports` |

Read-only executive view — no timesheet approval or allocation editing.

### Admin

| Feature | Route |
|---------|-------|
| Resource intelligence dashboard | `/dashboard` |
| Projects, allocation, weekly planner | `/projects`, `/allocation`, `/weekly-planner` |
| Time tracking & approvals (org-wide) | `/time-entry`, `/pm-approvals` |
| OKRs, reports, AI insights | `/okrs`, `/reports`, `/insights` |
| Planner upload, portfolios, users | `/inputs`, `/portfolios`, `/user-control` |
| System health & settings | `/system-health` |

Full org access including Excel import and delivery portfolio assignment.

### API overview

| Area | Routes |
|------|--------|
| Dashboard & metrics | `/api/dashboard/*` |
| Employees & projects | `/api/employees`, `/api/projects` |
| Allocations & weekly planner | `/api/allocations`, `/api/weekly-allocations` |
| Time entries & submit | `/api/time-entries`, `/api/time-entries/submit` |
| Approve / reject | `/api/time-entries/approve`, `/api/time-entries/reject` |
| OKRs | `/api/okrs` |
| Reports (Excel) | `/api/reports/*` |
| Planner import | `/api/planner-import` |
| AI (read-only) | `/api/ai/*` |

Persona walkthroughs and screenshots: **[docs/ROLE_FEATURE_GUIDE.md](./docs/ROLE_FEATURE_GUIDE.md)**

## Scripts

### Backend

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run production build |
| `npm test` | Jest unit tests |
| `npm run seed:dev` | Idempotent dev seed with sample timesheets |
| `npm run seed:planner` | Import planner Excel sheets |
| `npm run seed:resource` | Import `Resource.xlsx` only |
| `npm run migrate:roles` | Normalize `ProjectManager` → `Project Manager` |
| `npm run sync:weekly-legacy` | Sync legacy allocations → weekly grid |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (:5173) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |

## Database migration (one-time)

If roles still use `ProjectManager` (no space):

```bash
cd backend
npm run migrate:roles
```

Users must log out and back in so JWT roles refresh.

## Testing

```bash
cd backend
npm test
```

CI (`.github/workflows/validate.yml`) runs `npm run build` for both `backend/` and `app/` on push/PR.

## Operational readiness

- **Health:** `GET /health` — process up
- **Readiness:** `GET /ready` — MongoDB connected
- **Logging:** Structured JSON logs in production
- **Tracing:** `x-request-id` on responses
- **Shutdown:** SIGTERM/SIGINT closes HTTP and DB cleanly

## Deployment

Production checklist, CORS, smoke tests, backups:

**[DEPLOYMENT.md](./DEPLOYMENT.md)**

Recommended hosting: MongoDB Atlas + Render/Fly.io (API) + Vercel/Netlify/Cloudflare Pages (SPA).

## Project layout

```
r360/
├── app/                 # React SPA (Vite)
├── backend/
│   ├── src/             # Express API source
│   ├── scripts/         # Seed & migration scripts
│   └── data/planner/    # Default Excel seed files
├── scripts/             # Mongo backup/restore
├── docker-compose.yml
├── DEPLOYMENT.md
└── README.md
```

## MCP-ready fields

Fields that support read-only AI explainability:

| Collection | Field | Purpose |
|------------|-------|---------|
| `project_allocations` | `allocationReason` | Why an employee was assigned |
| `project_allocations` | `createdByRole` | Admin / Manager / System |
| `projects` | `businessGoal` | Project rationale |
| `projects` | `staffingStrategy` | BestFit / FastFill / CostAware |

AI routes under `/api/ai/*` are read-only; ranking and approvals remain deterministic.

## License

ISC (see `backend/package.json`)
