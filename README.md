# R360 Platform

The R360 Platform is a resource management and allocation system designed for modern consultancy operations.

## Architecture

This is a Monorepo containing:
- **`app/`**: Vite + React 19 Frontend (React Router, Tailwind, Shadcn UI)
- **`backend/`**: Node.js Backend (Express, Mongoose, TypeScript)

## Prerequisites

- Node.js 18+
- MongoDB (Local or Atlas)

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
npm run build
cp .env.example .env  # Update with your Mongo URI
npm start
```

### 2. Frontend Setup

```bash
cd app
npm install
cp .env.example .env.local
npm run dev
```

## One-time database migration (role names)

If your `roles` collection still has `ProjectManager` (no space), normalize to `Project Manager`:

```bash
cd backend
npm run migrate:roles
```

Have users sign out and back in after migration so JWT roles refresh.

## AI / Insights (read-only)

- Tool APIs under `/api/ai/*` (dashboard summary, allocation explain, staffing risk, approval anomalies, time-entry suggestions)
- UI: **Insights Center** at `/insights` (replaces legacy `/ai-analytics` mock chat)
- Global search: `GET /api/search?q=` (header search bar)
- Ranking and approvals remain deterministic; AI does not write to the database

## Testing

Run backend tests:
```bash
cd backend
npm test
```

## Operational Readiness

- **Health Check**: `GET /health` (Returns DB status)
- **Logging**: JSON structured logs in Production.
- **Correlation**: All requests include `x-request-id` header.
- **Graceful Shutdown**: Handles SIGTERM/SIGINT to close DB connections safely.

## MCP-Ready Schema Fields

The following fields support MCP (Model Context Protocol) read-only explainability:

| Collection | Field | Type | Purpose |
|------------|-------|------|---------|
| `employees.skills` | `confidenceWeight` | number | Computed: skillType + level + experience |
| `projects` | `businessGoal` | string | Why this project exists |
| `projects` | `staffingStrategy` | enum | BestFit / FastFill / CostAware |
| `project_allocations` | `allocationReason` | string | Why employee was selected |
| `project_allocations` | `createdByRole` | enum | System / Manager / Admin |
| `time_entries` | `normalizedHours` | virtual | hours / 8 (workday ratio) |

> **Note**: MCP accesses data via read-only service APIs only. No direct DB writes.

