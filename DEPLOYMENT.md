# R360 Production Deployment Guide

Operational checklist for deploying the R360 monorepo (`backend/` + `app/`). No automatic migrations or backups are scheduled by the application — run steps manually.

---

## 1. Deployment order

### 1.1 Backend (API)

1. Set environment variables on the host (see [Environment setup](#5-environment-setup)).
2. Build and start:
   ```bash
   cd backend
   npm ci
   npm run build
   npm start
   ```
3. Confirm probes:
   - `GET /health` → `200` `{ "status": "ok" }`
   - `GET /ready` → `200` when MongoDB is connected

### 1.2 Frontend (Vite SPA)

1. Set `VITE_API_URL` to your deployed API base (e.g. `https://api.example.com/api`).
2. Build and deploy static assets:
   ```bash
   cd app
   npm ci
   npm run build
   ```
3. Serve `app/dist/` via Netlify, Vercel, S3+CloudFront, or nginx.
4. Ensure `FRONTEND_URL` on the backend **exactly matches** the public SPA origin (production CORS is strict).

---

## 2. Database migrations (one-time / as needed)

Run against the **target** database before or immediately after first deploy.

| Step | Command | When |
|------|---------|------|
| Role names | `cd backend && npm run migrate:roles` | If any role is still `ProjectManager` (no space) |
| PM denormalization | `npx ts-node scripts/migrate-pm-ids.ts` | If PM approval queue is empty but Submitted entries exist |

After `migrate:roles`, have all users **log out and log back in** (fresh JWT role).

---

## 3. Smoke checklist

| Role | Check |
|------|--------|
| Employee | Time entry → Submit week → status `Submitted` |
| PM | PM Approvals → approve → `PM_Approved` |
| Admin | Allocation (Admin only), Reports download, Insights, **System Health** |
| Admin | `GET /api/system/verify` → `PASS` or documented `WARN` |
| Ops | Mongo status aggregate (see below) |

**Mongo verification:**

```javascript
db.time_entries.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
db.time_entries.countDocuments({
  status: "Submitted",
  $or: [{ projectManagerUserId: { $exists: false } }, { projectManagerUserId: null }]
})
```

---

## 4. Rollback process

1. **Frontend:** Redeploy previous static build artifact (keep prior `dist/` zip).
2. **Backend:** Redeploy previous container/image or `git checkout <tag>` + `npm run build` + restart.
3. **Database (if schema/data bad):** Restore from backup (see [Backup scripts](#6-backup-and-restore)):
   ```bash
   export MONGO_URI="your-connection-string"
   ./scripts/mongo-restore.sh ./backups/r360-YYYYMMDD-HHMMSS --drop
   ```
4. Re-run smoke checklist on rolled-back version.

---

## 5. Environment setup

### Backend (required)

| Variable | Required | Notes |
|----------|----------|--------|
| `MONGO_URI` or `DATABASE_URL` | Yes | `mongodb://` or `mongodb+srv://` |
| `JWT_SECRET` | Yes | Minimum **32** characters |
| `FRONTEND_URL` | Yes | Public SPA URL, no trailing slash |
| `NODE_ENV` | Optional | `production` in prod |
| `PORT` | Optional | Default `3000` |
| `LOG_LEVEL` | Optional | `info` recommended |
| `GOOGLE_CLIENT_ID` | Optional | Only if Google login enabled |

Startup **fails fast** with clear errors if required vars are invalid.

### Frontend (required)

| Variable | Required | Notes |
|----------|----------|--------|
| `VITE_API_URL` | Yes | e.g. `https://api.example.com/api` |

See `backend/.env.example` and `app/.env.example`.

---

## 6. Backup and restore

Manual scripts only — **not** scheduled by the app.

```bash
# Backup (creates ./backups/r360-TIMESTAMP/, never overwrites)
export MONGO_URI="mongodb+srv://..."
./scripts/mongo-backup.sh

# Restore (interactive confirm; add --drop to replace collections)
./scripts/mongo-restore.sh ./backups/r360-YYYYMMDD-HHMMSS --drop
```

Requires `mongodump` / `mongorestore` in PATH.

---

## 7. Production verification

1. **Security:** Confirm `NODE_ENV=production` — CORS allows only `FRONTEND_URL` (+ localhost blocked).
2. **Rate limits:** Login throttled; reports and `/api/system/verify` throttled; `429` returns `{ status, message, requestId }`.
3. **Headers:** `x-request-id` on responses; Helmet CSP / `X-Frame-Options` / `X-Content-Type-Options` active.
4. **Admin diagnostics:** `/system-health` — smoke verify PASS, review API failure log.
5. **Logs:** Structured JSON logs in production (`LOG_LEVEL=info`).

---

## 8. UAT load (non-production only)

```bash
# Disposable DB only
cd backend
UAT_LOAD_CONFIRM=true npx ts-node scripts/uat-load.ts
```

Refuses to run when `NODE_ENV=production`.
