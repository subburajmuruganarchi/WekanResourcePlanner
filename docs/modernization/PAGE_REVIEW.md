# R360 Page-by-Page Review — All Personas

Per-screen analysis: purpose, goals, pain points, and modernization recommendations.

---

## Employee

### `/workspace` — My Workspace

| Field | Detail |
|-------|--------|
| **Purpose** | Daily home for individual contributors |
| **Primary Goal** | Know what to work on today and timesheet status |
| **Secondary Goal** | Quick access to projects, OKRs, announcements |
| **Target User** | Employee, User |
| **Daily Usage** | High (2–5 visits/day) |

**Pain Points**
- "Today's Work" is generic text, not real allocation data
- Pending actions are hardcoded placeholders
- No utilization %, no today's planned hours
- Announcements are static string
- No recent activity feed

**Suggested Improvements**
- Widget: Today's allocation (from weekly grid API)
- Widget: Pending timesheet with submit CTA
- Widget: My utilization (week/month)
- Real notifications integration
- Quick actions: Log time, View OKR, My projects

**Modern Layout:** 2-column on desktop — left: summary cards; right: projects + OKRs  
**Priority Widgets:** Timesheet status, Today's hours, My OKRs, Quick log time  
**Priority:** Critical

---

### `/time-entry` — Time Tracking

| Field | Detail |
|-------|--------|
| **Purpose** | Log daily hours against projects |
| **Primary Goal** | Accurate weekly timesheet submission |
| **Secondary Goal** | View rejection reasons, resubmit |
| **Daily Usage** | High |

**Pain Points**
- Complex layout (`TimeTrackingLayout`) — steep learning curve
- No autosave indicator
- Mobile grid usability unclear

**Improvements:** Autosave draft, week progress ring, keyboard shortcuts (Tab between cells), mobile day-by-day view

**Priority:** High

---

### `/allocation` (Employee view)

| Field | Detail |
|-------|--------|
| **Purpose** | View own allocation in org grid |
| **Primary Goal** | Understand where time is planned |
| **Daily Usage** | Low |

**Pain Points:** Full org grid overwhelming for employees; should default to "My row" filter

**Priority:** Medium

---

### `/okrs` — My OKRs

| Field | Detail |
|-------|--------|
| **Purpose** | Track quarterly objectives |
| **Primary Goal** | Update KR progress |
| **Daily Usage** | Weekly |

**Improvements:** Inline KR editing, progress charts, link OKRs to projects

**Priority:** Medium

---

## Project Manager

### `/pm` — Project Dashboard

| Field | Detail |
|-------|--------|
| **Purpose** | PM command center |
| **Primary Goal** | Monitor project health and team |
| **Secondary Goal** | Navigate to timeline, approvals, risks |
| **Daily Usage** | High |

**Pain Points**
- Only 4 metric cards + project list
- No pending approvals count
- No sprint/milestone progress
- No budget widget
- Duplicate navigation to sub-pages via bottom buttons

**Suggested Widgets:** Project health RAG, Pending approvals, Team workload chart, Risk summary, Delivery progress

**Modern Layout:** KPI strip → Project cards with health → Timeline mini-widget → Pending approvals queue

**Priority:** Critical

---

### `/pm/timeline` — Project Timeline

| Purpose | Gantt-style project view |
| Pain | Basic; not comparable to MS Project / Linear roadmap |
| Priority | High |

### `/pm/team` — Team

| Purpose | Team roster for PM projects |
| Pain | No workload heat per person |
| Priority | Medium |

### `/pm/status-report` — Status Report

| Purpose | Generate PM status narrative |
| Pain | Not in primary nav |
| Priority | Medium |

### `/pm/risks` — Risks

| Purpose | Project risk register |
| Pain | Disconnected from delivery risk engine data |
| Priority | High |

### `/pm/decisions`, `/pm/communication`

| Status | Routed but **not in nav** — discoverability failure |
| Priority | Medium |

### `/pm-approvals` — Approvals

| Purpose | Approve/reject timesheets |
| Pain | Not linked from PM dashboard KPI |
| Priority | High |

### `/projects`, `/projects/:id`

| Purpose | Project CRUD and detail |
| Pain | Mixed admin/PM concerns on same page |
| Priority | High |

---

## Delivery Manager

### `/delivery` — Delivery Command Center

| Field | Detail |
|-------|--------|
| **Purpose** | Portfolio operational cockpit |
| **Primary Goal** | Spot at-risk projects and capacity gaps |
| **Secondary Goal** | Navigate to recommendations and capacity |
| **Daily Usage** | High |

**Pain Points**
- HTML table without sort/filter
- "Active Releases (est.)" vague metric
- Suggested actions tease without inline preview

**Suggested Widgets:** Portfolio health, Resource conflicts, Bench count, Capacity forecast chart, Cross-project dependencies, Top risks

**Priority:** Critical

---

### `/delivery/capacity` — Capacity Forecast

| Purpose | Forward-looking capacity |
| Pain | Needs tie-in to allocation heatmap |
| Priority | High |

### `/delivery/recommendations` — Suggested Actions

| Purpose | Rule-based staffing recommendations |
| Pain | Should be side panel on delivery home, not separate page |
| Priority | High |

---

## CEO

### `/executive` — Enterprise Dashboard

| Field | Detail |
|-------|--------|
| **Purpose** | Read-only org-wide pulse |
| **Primary Goal** | Delivery confidence and workforce health |
| **Secondary Goal** | Drill to risk radar and projects |
| **Daily Usage** | Daily–weekly |

**Strengths:** Good explanatory copy, health legend, delivery confidence score

**Pain Points**
- No revenue/profitability (may need backend)
- Department comparison missing
- AI insights not surfaced on executive home

**Suggested Widgets:** Executive KPIs, Company utilization, Portfolio summary, Top risks, AI narrative, Department comparison

**Priority:** High

---

### `/executive/risk-radar` — Risk Radar

| Purpose | Concentrated risk view |
| Priority | Medium |

---

## Admin

### `/dashboard` — Resource Intelligence

| Field | Detail |
|-------|--------|
| **Purpose** | Org-wide workforce intelligence |
| **Primary Goal** | Utilization, heatmap, delivery risk |
| **Daily Usage** | Daily |

**Strengths:** Richest dashboard — KPIs, charts, heatmap, AI narrative

**Pain Points**
- Fake sparkline trends (`sparkFrom`)
- 6-column KPI grid overwhelming
- CEO can also access — role blur

**Priority:** High (polish, not rebuild)

---

### `/inputs` — Planner Import

| Purpose | Excel upload + sheet sync |
| Pain | No multi-step wizard, no sync status dashboard |
| Priority | High |

### `/user-control` — User Management

| Purpose | CRUD employees, roles |
| Pain | Basic table UX |
| Priority | Medium |

### `/portfolios` — Portfolios

| Purpose | DM portfolio assignment |
| Priority | Medium |

### `/system-health` — Settings

| Purpose | System verification |
| Pain | Mislabeled "Settings"; should be Admin Ops Center |
| Priority | Medium |

### `/insights` — AI Insights

| Purpose | Explainability panels |
| Pain | Disconnected from copilot; not proactive |
| Priority | High

### `/reports` — Reports

| Purpose | Excel report generation |
| Pain | Preview UX heavy; needs saved report templates |
| Priority | Medium

---

## Shared Pages (Multi-Role)

### `/allocation` — Resource Planning

| Purpose | Weekly allocation grid (AG Grid) |
| Pain | No saved views, mobile unusable, heavy bundle |
| Priority | Critical |

### `/projects` — Projects List

| Pain | Card vs table mode inconsistency |
| Priority | High |

### `/okrs` — OKRs

| All roles | Needs org rollup view for management |
| Priority | Medium |

### `/login`

| Strengths | Polished dark gradient |
| Pain | `"use client"` artifact; no SSO beyond Google |
| Priority | Low |

---

## Cross-Cutting Page Patterns

| Pattern | Recommendation |
|---------|----------------|
| Page header | Unify `WorkspacePageHeader` + dashboard custom headers |
| KPI row | `MetricCard` with real trends from API only |
| Tables | `DataTable` enterprise wrapper |
| Empty | `EmptyState` with role-specific CTA |
| Loading | `PageSkeleton` per layout type |

---

*Generated: July 2026 — R360 Enterprise Modernization Program*
