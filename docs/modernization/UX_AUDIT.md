# R360 UX Audit — July 2026

**Auditor lens:** Principal UX / Enterprise SaaS (Linear, Workday, Rippling tier)  
**Scope:** Full frontend — navigation, IA, layouts, visual system, interactions, accessibility, responsiveness  
**Verdict:** Functional MVP with inconsistent enterprise polish. Strong domain coverage; weak design-system discipline, no dark mode, poor mobile IA, and uneven loading/empty/error patterns.

---

## Executive Summary

R360 delivers the right *modules* for enterprise resource management but reads as a **junior-built product**: hardcoded colors, duplicated page patterns, fake KPI trends, placeholder content, and navigation that does not adapt to viewport or role context. The Admin dashboard is comparatively mature; Employee/PM workspaces are thin shells. AG Grid is used only on allocation grids without enterprise table affordances.

| Area | Score (1–5) | Priority |
|------|-------------|----------|
| Information Architecture | 3 | High |
| Visual Consistency | 2 | Critical |
| Role-based UX | 3 | High |
| Loading / Empty / Error | 2 | Critical |
| Accessibility | 2 | Critical |
| Mobile / Tablet | 1 | Critical |
| Dark Mode | 0 | High |
| Performance UX | 2 | High |
| Forms & Validation | 2 | High |
| Discoverability | 3 | Medium |

---

## 1. Navigation & Information Architecture

### Issues

| ID | Issue | Severity | Location |
|----|-------|----------|----------|
| NAV-01 | **No mobile navigation** — sidebar is fixed 260px; no drawer/hamburger on `< lg` | Critical | `app-shell.tsx`, `sidebar.tsx` |
| NAV-02 | **Duplicate mental models** — `/dashboard` (Admin) vs `/executive` (CEO) vs `/pm` vs `/delivery` overlap in KPIs without clear hierarchy | High | Multiple dashboards |
| NAV-03 | **Dead routes redirect** — `/weekly-planner`, `/skills`, `/executive/brief` silently redirect; breaks bookmarks & muscle memory | Medium | `App.tsx` |
| NAV-04 | **Command palette is static** — 8 hardcoded items; not role-aware, no recent/favorites, no entity search | High | `header.tsx` |
| NAV-05 | **Breadcrumbs non-interactive** — display-only text; no click-to-navigate | Medium | `header.tsx` |
| NAV-06 | **PM sub-routes hidden** — Timeline, Decisions, Communication exist in routes but not in PM nav | High | `navigation-config.ts` |
| NAV-07 | **Employee sees "Resource Allocation"** — read-only grid with no clear employee value; cognitive load | Medium | Employee nav |
| NAV-08 | **Settings = System Health** — misleading label for admins | Low | Admin nav |
| NAV-09 | **No workspace switcher** — multi-role users cannot preview other personas | Low | Global |
| NAV-10 | **Sign out only in header** — no profile menu, preferences, theme toggle | Medium | `header.tsx` |

### Recommendations

- Collapsible mobile drawer with overlay + focus trap
- Role-scoped command palette with recent items (localStorage)
- Interactive breadcrumbs via `react-router` links
- Consolidate dashboard naming: "Home" per persona with consistent section taxonomy
- Surface PM sub-pages in nav or grouped under "Project Tools"

---

## 2. Layout, Spacing & Visual Hierarchy

### Issues

| ID | Issue | Severity |
|----|-------|----------|
| LAY-01 | **Hardcoded hex colors** (`#f8fafc`, `#111827`, `#64748b`) bypass design tokens | Critical |
| LAY-02 | **Inconsistent page headers** — Admin uses custom header; workspaces use `WorkspacePageHeader`; some pages have none | High |
| LAY-03 | **`dashboard-card` CSS class** vs `Card` component — two parallel card systems | High |
| LAY-04 | **Max-width 1600px** only on `PageContainer`; heatmaps/tables break visual rhythm | Medium |
| LAY-05 | **No sticky section headers** on long dashboard scroll | Medium |
| LAY-06 | **Header duplicates page title** — breadcrumb + h1 in header AND page body on some routes | Medium |
| LAY-07 | **Sidebar collapse loses labels** with no tooltip on nav items (only `title` attr) | Low |

### Recommendations

- Single `PageHeader` primitive with eyebrow, title, description, actions slot
- Semantic CSS variables for all surfaces (`--surface`, `--foreground`, `--muted`)
- Sticky sub-nav for PM/DM workspace sections

---

## 3. Typography & Color System

### Issues

| ID | Issue | Severity |
|----|-------|----------|
| TYP-01 | **Inter assumed but not loaded** — falls back to system UI; no font-display strategy | Medium |
| TYP-02 | **6+ gray scales** — slate, gray, ink, ink-muted used interchangeably | High |
| TYP-03 | **Accent sprawl** — indigo, violet, sky, brand coral on same dashboard without semantic meaning | Medium |
| COL-01 | **No dark theme** — zero `dark:` classes or theme provider | Critical |
| COL-02 | **Status colors inconsistent** — `HealthBadge` uses emerald/amber/rose; KPI uses indigo/violet/sky | Medium |
| COL-03 | **Login page inline styles** — not token-driven | Low |

### Recommendations

- Load Inter via `@fontsource/inter` or Google Fonts with `font-display: swap`
- Map accents to semantic roles: `primary`, `success`, `warning`, `critical`, `info`
- First-class light/dark via `data-theme` on `<html>`

---

## 4. Consistency & Component Reuse

### Issues

| ID | Issue | Severity |
|----|-------|----------|
| CON-01 | **Tables implemented 4 ways** — raw `<table>`, `ui/table`, AG Grid, Recharts wrappers | High |
| CON-02 | **Loading: spinner vs skeleton vs text** — no standard | High |
| CON-03 | **Empty states: plain `<p>`** — no illustration, CTA, or guidance | High |
| CON-04 | **Error boundary** — red crash page; not branded, no recovery paths | Medium |
| CON-05 | **Button variants use `gray-*`** while pages use `slate-*` | Medium |
| CON-06 | **`"use client"` on login** — Next.js artifact in Vite app | Low |

---

## 5. Accessibility (WCAG AA)

| ID | Issue | WCAG | Severity |
|----|-------|------|----------|
| A11Y-01 | No skip-to-content link | 2.4.1 | High |
| A11Y-02 | Command palette lacks arrow-key roving focus | 2.1.1 | High |
| A11Y-03 | Notification popover: click-only mark read; no keyboard | 2.1.1 | Medium |
| A11Y-04 | Heatmap cells likely lack text alternatives | 1.1.1 | High |
| A11Y-05 | Color-only status in allocation grids | 1.4.1 | High |
| A11Y-06 | Focus ring only on Button; many interactive divs/buttons without `focus-visible` | 2.4.7 | High |
| A11Y-07 | No `prefers-reduced-motion` handling | 2.3.3 | Medium |
| A11Y-08 | Sidebar collapse button may overlap focus order | 2.4.3 | Low |
| A11Y-09 | Form errors on login lack `aria-live` | 4.1.3 | Medium |
| A11Y-10 | Table headers on delivery/executive pages lack `scope` | 1.3.1 | Low |

---

## 6. Responsiveness

| Viewport | Status | Issues |
|----------|--------|--------|
| **320–767px (mobile)** | Broken | Sidebar consumes space; no drawer; KPI grids stack but tables overflow without card fallback |
| **768–1023px (tablet)** | Poor | Global search hidden; command palette trigger hidden below `sm` |
| **1024–1439px (laptop)** | Acceptable | Dashboard 6-col KPI grid cramped |
| **1440px+ (desktop)** | Good | Heatmaps and grids usable |
| **4K** | Untested | `max-w-[1600px]` leaves excessive margins |

---

## 7. Dark Mode

**Status: Not implemented.**

- No theme toggle, no `prefers-color-scheme` listener, no dark tokens
- Login page is dark; app shell is light — jarring post-auth transition

---

## 8. Loading, Error & Empty States

| Pattern | Current | Gap |
|---------|---------|-----|
| Page load | Centered `Loader2` spinner (PM) or `KPIGridSkeleton` (Admin) | Inconsistent |
| Section load | "Loading charts…" text | No skeleton |
| Error | `console.error` + null state | No user-facing retry |
| Empty | Gray paragraph | No icon, CTA, or role-specific guidance |
| Optimistic UI | None | — |

**Fake data concern:** Admin dashboard KPI sparklines use `sparkFrom()` synthetic data — misleading for executives.

---

## 9. Forms & Validation

| Issue | Location |
|-------|----------|
| No autosave on time entry / allocation drafts | Time tracking, allocation |
| Inline validation inconsistent | Project dialogs, OKR form |
| No progress indicator on multi-step flows | Planner import |
| No undo/redo | Global |
| Select/Input not wired to unified form library | Various |

---

## 10. Tables & Data Grids

| Issue | Severity |
|-------|----------|
| AG Grid: no column chooser, saved views, export from grid | High |
| AG Grid bundle contributes to **2.35MB JS** single chunk | Critical |
| HTML tables: no sort, filter, pagination | High |
| No responsive card mode for tables on mobile | Critical |
| Inline edit only on allocation grid | Medium |

---

## 11. Charts

- Recharts used on Admin/DM/Executive — acceptable
- Hardcoded chart colors (`#4f46e5`) not from tokens
- No chart accessibility (data table fallback)
- "Leave" slice in allocation distribution uses hardcoded `value: 2`

---

## 12. Search & Filtering

- `GlobalSearch` exists but limited; hidden on mobile
- No saved filters / pinned views
- Planner filters exist (`weekly-planner-filters.tsx`) but not reusable globally
- No advanced filter builder pattern

---

## 13. Micro-interactions & Animation

- `animate-in fade-in` on PageContainer — good start
- No page transition between routes
- Card hover shadow — consistent on `dashboard-card`
- Missing: toast system, optimistic list updates, drag feedback on allocation

---

## 14. Cognitive Load & Task Flows

### Employee: Submit timesheet
1. Login → Workspace → "Open Time Tracking" → Time Entry → log hours → submit  
**Issues:** 3 clicks minimum; workspace doesn't show today's allocation; pending actions are static placeholder list

### PM: Approve timesheet
1. No direct nav to approvals in PM primary nav (must use Time & Approvals or command palette)  
**Issues:** Approvals buried; PM dashboard doesn't surface pending count

### DM: Resolve capacity conflict
1. Delivery → Capacity → Allocation — fragmented  
**Issues:** Recommendations page disconnected from heatmap

### Admin: Import planner
1. Inputs page — functional but no progress wizard UX

---

## 15. Role-Based Usability Gaps

| Role | Gap |
|------|-----|
| Employee | No daily summary, utilization, holidays, real activity feed |
| PM | Thin dashboard; no sprint/budget widgets; timeline is basic |
| DM | Good structure; lacks bench management, dependency view |
| CEO | Solid read-only narrative; no revenue/profitability (data may not exist in API) |
| Admin | Best dashboard; system health not unified ops center |

---

## 16. Priority Fix Matrix

### Critical (Sprint 1)
1. Mobile navigation drawer
2. Design token migration (remove hardcoded colors)
3. Dark mode foundation
4. Unified loading skeletons + empty states
5. Route-level code splitting (2.35MB bundle)
6. Accessible focus states globally

### High (Sprint 2–3)
7. Role-aware command palette
8. Enterprise table wrapper (AG Grid config)
9. Dashboard parity per persona
10. Interactive breadcrumbs
11. Toast / notification UX
12. Remove fake KPI sparkline data or label as illustrative

### Medium (Sprint 4+)
13. Saved views & filters
14. Right-side inspector panels
15. Form autosave
16. Page transitions
17. AI copilot integration depth

---

## Appendix: Files Reviewed

- `app/src/components/layout/*`
- `app/src/app/dashboard/page.tsx`
- `app/src/app/workspace/page.tsx`
- `app/src/app/pm-workspace/page.tsx`
- `app/src/app/delivery/page.tsx`
- `app/src/app/executive/page.tsx`
- `app/src/styles/enterprise-tokens.css`
- `app/src/index.css`
- `app/src/App.tsx`

---

*Generated: July 2026 — R360 Enterprise Modernization Program*
