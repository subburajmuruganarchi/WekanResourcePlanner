# R360 — Host on AWS (migrate from Vercel + Render)

**What this guide is for:** You already run R360 in production on **Vercel** (React SPA) and **Render** (Node API). You want to **move hosting to AWS** — same app, same users, same MongoDB data. You are **not** starting from scratch.

**Related:** [DEPLOYMENT.md](../DEPLOYMENT.md) · [README.md](../README.md)

---

## What to request from the company

Before AWS work starts, get these from **IT / DevOps / management**. Without them, deployment will block.

### Access & accounts

| # | Ask the company for | Why |
|---|---------------------|-----|
| 1 | **AWS account** (or dedicated sub-account) + IAM admin or scoped deploy role | Provision S3, CloudFront, ECS, ALB, Secrets Manager |
| 2 | **Render dashboard access** (or env export) | Copy all backend secrets — `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL`, Google vars, feature flags |
| 3 | **Vercel project access** (or env export) | Copy `VITE_API_URL` and build settings |
| 4 | **MongoDB Atlas access** (or connection string + IP allowlist admin) | Same DB as today; whitelist AWS egress IPs |
| 5 | **DNS / domain admin** (Route 53 or registrar) | Point `app.` and `api.` domains to AWS after cutover |
| 6 | **Google Workspace / Sheet owner** (if sheet sync is used) | Update Apps Script webhook to new API URL; confirm sync secret |

### Decisions (company must choose)

| # | Question for company | Example answer |
|---|----------------------|----------------|
| 1 | **App URL** — keep current domain or new? | `https://r360.wekancode.com` |
| 2 | **API URL** — subdomain or path? | `https://api.wekancode.com` |
| 3 | **Cutover window** — when can DNS switch? | Weekend, low-traffic hours |
| 4 | **Keep Vercel/Render running after go-live?** | Yes, 48h for rollback |
| 5 | **Who approves production DNS change?** | Named contact |
| 6 | **AWS region?** | `ap-south-1` (Mumbai) or `us-east-1` |
| 7 | **Budget / instance size** | e.g. 1× Fargate 0.5 vCPU, 1 GB RAM |

### Information to export (no guessing)

| Source | Export |
|--------|--------|
| **Render** | Full environment variable list (screenshot or `.env` export) |
| **Vercel** | All env vars for Production; build command; output directory |
| **MongoDB** | `MONGO_URI` (same string — do not create new DB for migration) |
| **Google** | Spreadsheet ID, Apps Script deploy URL, `GOOGLE_SHEET_SYNC_SECRET` value |
| **Current URLs** | Live app URL, live API URL, custom domains |

### What the company does **not** need to provide

- New application code (you already have the repo)
- Re-seeding the database (migration keeps existing data)
- New user accounts (existing logins stay the same if `JWT_SECRET` and `MONGO_URI` are unchanged)
- Moving MongoDB into AWS (Atlas can stay as-is)

### One-page email template (send to company IT)

```
Subject: R360 migration Vercel+Render → AWS — information needed

We are moving R360 hosting from Vercel (frontend) and Render (backend) to AWS.
No feature changes — same app, same data, new infrastructure.

Please provide:

1. AWS account access (or DevOps to provision: S3, CloudFront, ECS, ALB, Secrets Manager)
2. Export of all Render environment variables for the production API service
3. Export of all Vercel production environment variables
4. MongoDB Atlas: connection string (or confirm we reuse existing) + ability to add AWS IP allowlist
5. DNS: authority to create/update records for app and API domains
6. Confirmed production URLs after migration (app + API)
7. Maintenance window for DNS cutover
8. Google Sheet / Apps Script contact (if planner sync is in use)

We will handle: Docker build, ECS deploy, frontend rebuild, smoke tests, and rollback plan.
```

---

## Migration at a glance

### What stays the same

| Item | Action |
|------|--------|
| Application code | Same repo (`app/` + `backend/`) |
| MongoDB | **Keep your existing database** — users, projects, allocations, all data |
| `JWT_SECRET` | **Copy from Render** — avoids forcing everyone to re-login |
| Render environment variables | Copy all to AWS Secrets Manager / ECS task env |
| Google Sheet | Same spreadsheet — only change webhook URL to new API host |
| User accounts & passwords | Unchanged |

### What changes (hosting only)

| Today | AWS replacement |
|-------|-----------------|
| Vercel hosts static SPA | **S3 + CloudFront** (or Amplify Hosting) |
| Render runs Express API | **ECS Fargate** or **App Runner** (`backend/Dockerfile`) |
| Vercel domain / `*.vercel.app` | App domain → CloudFront |
| Render API / `*.onrender.com` | API domain → ALB → ECS |
| Vercel build env `VITE_API_URL` | Rebuild SPA with new API URL in CI |
| Render env `FRONTEND_URL` | Set to your public app URL (for CORS) |

### Architecture before and after

```
TODAY (Vercel + Render)
  Browser → Vercel (SPA) → Render (API :3000) → MongoDB Atlas

AFTER (AWS)
  Browser → CloudFront → S3 (SPA) → ALB → ECS (API :3000) → MongoDB Atlas (same DB)
```

**MongoDB does not need to move to AWS.** Keep Atlas (or current host); only update **network allowlist** for AWS outbound IPs.

**You do not need seed scripts** when migrating — production data is already in MongoDB.

---

## Step-by-step: Vercel + Render → AWS

### Phase 1 — Collect from current hosts

**From Render (backend dashboard → Environment):**

Copy every variable. Minimum required:

| Variable | Notes |
|----------|--------|
| `MONGO_URI` / `DATABASE_URL` | Same connection string on AWS |
| `JWT_SECRET` | Must be identical |
| `FRONTEND_URL` | Current app URL (update after DNS if domain changes) |
| `NODE_ENV` | `production` |
| `GOOGLE_SHEET_SYNC_SECRET` | If sheet sync is used |
| `GOOGLE_APPS_SCRIPT_WEB_APP_URL` | If sheet sync is used |
| `GOOGLE_SHEET_ID` | If used |
| All `FEATURE_*` flags | MVP mode, weekly allocations, etc. |

**From Vercel (Project → Settings → Environment Variables):**

| Variable | Notes |
|----------|--------|
| `VITE_API_URL` | Currently points to Render — will change to AWS API URL |
| `VITE_FEATURE_*` | Any MVP overrides |

Also note: custom domains, build command (`npm run build` in `app/`), output dir (`dist`).

### Phase 2 — Provision AWS (one-time)

| AWS resource | Purpose |
|--------------|---------|
| **ECR** | Store `backend/Dockerfile` image |
| **ECS Fargate** + **ALB** | Run API (replaces Render web service) |
| **ACM certificate** | TLS for `api.yourdomain.com` |
| **S3 bucket** + **CloudFront** | Host SPA (replaces Vercel) |
| **ACM certificate** (us-east-1) | TLS for `app.yourdomain.com` on CloudFront |
| **Route 53** (or DNS provider) | Point domains to CloudFront + ALB |
| **Secrets Manager** | Store Render env vars securely |
| **CloudWatch Logs** | API logs (replaces Render logs) |
| **NAT Gateway** (if ECS in private subnet) | Outbound to MongoDB Atlas + Google |

Repo already has:

- `backend/Dockerfile` — API image, health check on `/health`
- `app/Dockerfile` — optional; prefer S3+CloudFront for SPA
- `app/nginx.conf` — SPA routing (`try_files` → `index.html`)

### Phase 3 — Deploy API on AWS (parallel to Render)

1. Build and push API image:
   ```bash
   cd backend
   docker build -t r360-api .
   # tag, push to ECR
   ```
2. Create ECS service with **same env vars as Render** (especially `MONGO_URI`, `JWT_SECRET`).
3. Set `FRONTEND_URL` to your **current** Vercel app URL first (so you can test API before frontend cutover).
4. In **MongoDB Atlas → Network Access**, allow AWS NAT egress IP (or temporarily allow migration traffic).
5. Verify:
   - `GET https://<aws-api-domain>/health` → `200`
   - `GET https://<aws-api-domain>/ready` → `"db": "connected"`
6. Test login via curl/Postman if needed — same users as production.

Render can **stay live** during this phase.

### Phase 4 — Deploy frontend on AWS

1. Build with **new** API URL (baked at compile time):
   ```bash
   cd app
   export VITE_API_URL=https://<aws-api-domain>/api
   npm ci && npm run build
   ```
2. Upload `app/dist/` to S3; enable CloudFront with:
   - Default root object: `index.html`
   - Custom error: 403/404 → `/index.html` (SPA client routing)
3. Test via CloudFront URL **before** DNS cutover:
   - Login as each role
   - Dashboards, allocation grid, one project detail

### Phase 5 — Wire CORS and integrations

1. Set API `FRONTEND_URL` to CloudFront/app domain (exact origin, **no trailing slash**).
2. Restart ECS tasks.
3. Update **Google Apps Script** webhook:
   - `POST https://<aws-api-domain>/api/google-sheet-sync/webhook`
   - Same `GOOGLE_SHEET_SYNC_SECRET` as Render
4. Run a test sheet sync from Admin → Inputs.

### Phase 6 — DNS cutover

| Record | From | To |
|--------|------|-----|
| `app.yourdomain.com` | Vercel | CloudFront distribution |
| `api.yourdomain.com` | Render | ALB |

1. Lower TTL on DNS records 24h before cutover if possible.
2. Switch records.
3. Rebuild frontend if `VITE_API_URL` uses the final custom API domain (not temporary ALB URL).
4. Confirm `FRONTEND_URL` matches final app domain.

### Phase 7 — Decommission old hosts

After **24–48 hours** stable on AWS:

1. Disable/delete Vercel project (or keep as rollback artifact).
2. Suspend/delete Render web service.
3. Remove old IPs from MongoDB allowlist if no longer needed.

---

## Environment variables reference

### Backend (copy from Render → AWS)

See [`backend/.env.example`](../backend/.env.example). Startup fails if `MONGO_URI`, `JWT_SECRET`, or `FRONTEND_URL` are invalid.

### Frontend (rebuild required — copy from Vercel, update API URL)

```env
VITE_API_URL=https://api.yourdomain.com/api
```

Optional: `VITE_FEATURE_MVP_MODE`, `VITE_FEATURE_TIME_ENTRY_ENABLED`, etc.

> `VITE_*` values are embedded in the JS bundle at `npm run build`. Changing API URL always requires a **new build and redeploy** of the SPA.

---

## AWS services mapping

| Vercel / Render | AWS equivalent |
|-----------------|----------------|
| Vercel static hosting | S3 + CloudFront |
| Vercel HTTPS / CDN | CloudFront + ACM |
| Vercel env at build | CodeBuild / GitHub Actions secrets |
| Render web service | ECS Fargate or App Runner |
| Render HTTPS | ALB + ACM |
| Render env vars | Secrets Manager → ECS task definition |
| Render health checks | ALB target group → `/ready` |
| MongoDB (external) | **Keep Atlas** — whitelist AWS egress |

Not required for current app: Redis, S3 for uploads, SQS, Lambda (unless you add them later).

---

## Smoke tests after cutover

From [DEPLOYMENT.md §3](../DEPLOYMENT.md#3-smoke-checklist):

| Role | Check |
|------|--------|
| Admin | Login → dashboard → allocation → System Health |
| CEO | Executive dashboard loads with data |
| DM | Delivery command + capacity focus |
| PM | Project dashboard + managed projects |
| Employee | My Workspace + read-only allocation |
| Integrations | Google Sheet sync (if used) |

---

## Common mistakes

| Mistake | Result |
|---------|--------|
| New empty MongoDB instead of same `MONGO_URI` | App looks “fresh” — no users/projects |
| New `JWT_SECRET` | Everyone logged out |
| Forgot to rebuild SPA with new `VITE_API_URL` | Browser still calls Render API |
| `FRONTEND_URL` wrong | CORS errors on all API calls |
| No SPA fallback on CloudFront | `/workspace`, `/pm` etc. return 404 on refresh |
| Apps Script still points to Render | Sheet sync breaks |

---

## Rollback

If AWS cutover fails:

1. Point DNS back to Vercel + Render.
2. Redeploy last known-good Vercel build (still pointing to Render API if API wasn’t switched).
3. MongoDB unchanged — no data rollback needed unless a bad migration script was run.

---

## Optional: brand-new AWS environment (empty DB)

Only if you need a **separate** staging stack with **no** production data:

- API auto-creates `admin@r360.com`, `pm@r360.com`, `ceo@r360.com`, `dm@r360.com` with password `Admin123!` on first start.
- Run `cd backend && npm run seed:planner` or restore a mongo backup to load data.

**This is not the Vercel→Render migration path** — production migration keeps your existing database.

---

## Handoff checklist for DevOps

- [ ] Render env export (full)
- [ ] Vercel env export (full)
- [ ] MongoDB URI + Atlas network access for AWS
- [ ] Custom domains for app + API
- [ ] Dockerfiles in repo (`backend/Dockerfile`, optional `app/Dockerfile`)
- [ ] Health: `/health`, `/ready`
- [ ] Google Apps Script URL update plan
- [ ] DNS TTL + cutover window
- [ ] Rollback plan (keep Vercel/Render alive 48h)
