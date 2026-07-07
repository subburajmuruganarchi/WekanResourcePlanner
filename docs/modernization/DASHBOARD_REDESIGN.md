# R360 Dashboard Redesign Specification

## Design Goals

1. **One glance comprehension** — 3-second scan per persona
2. **Actionable** — every widget links to resolution path
3. **Honest data** — no synthetic trends
4. **Consistent grid** — 4-col KPI → 2-col charts → full-width tables

---

## Employee Dashboard (`/workspace`)

### Widgets (priority order)

| Widget | Data Source | Actions |
|--------|-------------|---------|
| Daily Summary | Greeting + date | — |
| Today's Allocation | `weekly-allocations` (employee filter) | Log time |
| Timesheet Status | `time-entries?week=` | Submit / View |
| Week Hours Progress | Ring chart 0–40h | Open time entry |
| My OKRs | `useOkrs` | Update progress |
| My Utilization | `utilization` (scoped) | — |
| My Projects | `useProjects` | Open project |
| Pending Actions | Derived from timesheet + notifications | CTA each |
| Recent Activity | `notifications` / audit (future) | — |
| Quick Actions | Static + context | Log time, OKRs, Projects |

### Layout (desktop)
```
[ Header + Log Time CTA ]
[ Today | Timesheet | OKRs ]  (3-col)
[ My Projects grid ]
[ Utilization chart | Pending Actions ]
[ Recent Activity ]
```

---

## PM Dashboard (`/pm`)

| Widget | API | Priority |
|--------|-----|----------|
| Project Health Summary | projects + risks | P0 |
| Pending Approvals Count | `dashboard/stats` or time-entries pending | P0 |
| Team Workload | utilization by project | P0 |
| At Risk Projects | `fetchDeliveryRisks` | P0 |
| Sprint Progress | future / milestone % | P1 |
| Budget vs Actual | future API | P2 |
| Mini Timeline | projects dates | P1 |
| Quick Links | nav shortcuts | P1 |

### Layout
```
[ KPI: Projects | Active | Team | At Risk | Pending Approvals ]
[ Project cards with health stripe ]
[ Team workload chart | Risk list ]
[ Timeline preview ]
```

---

## DM Dashboard (`/delivery`)

| Widget | Priority |
|--------|----------|
| Portfolio Health KPIs | P0 |
| Resource Conflicts | P0 |
| Bench Resources | P0 |
| Capacity Forecast | P0 |
| Utilization Trend | P0 |
| Cross-project Dependencies | P2 |
| Delivery Risks | P0 |
| Recommendations (top 3 inline) | P0 |

---

## CEO Dashboard (`/executive`)

| Widget | Priority |
|--------|----------|
| Executive KPIs | P0 |
| Delivery Confidence | P0 |
| Company Utilization | P0 |
| Portfolio Summary Table | P0 |
| Top Risks | P0 |
| AI Insights Narrative | P1 |
| Revenue Indicators | P2 (backend) |
| Profitability | P2 (backend) |
| Department Comparison | P2 (backend) |

---

## Admin Dashboard (`/dashboard`)

| Widget | Priority |
|--------|----------|
| Workforce KPIs (6) | P0 — reduce to 4 primary + expand |
| Utilization Analytics | P0 |
| Project Performance Grid | P0 |
| Allocation Heatmap | P0 |
| Delivery Risk Cards | P0 |
| AI Executive Summary | P1 |
| System Health Strip | P1 — sync, users, errors |
| Quick Admin Actions | P1 |

### Admin Ops Strip (new)
```
[ Users: 142 ] [ Last Sync: 2h ago ✓ ] [ Errors: 0 ] [ Storage: OK ]
```

---

## Shared Dashboard Components

```tsx
<DashboardLayout>
  <DashboardHeader />
  <MetricGrid columns={{ sm: 2, lg: 4, xl: 6 }} />
  <DashboardSection title="..." />
</DashboardLayout>
```

---

## KPI Definitions (canonical)

| KPI | Formula | Roles |
|-----|---------|-------|
| Utilization | allocated_hours / available_hours × 100 | All management |
| Bench | employees where allocation &lt; 20% | DM, Admin, CEO |
| Pending Approvals | count(time_entries status=SUBMITTED) | PM, DM, Admin |
| At Risk | count(risk level MEDIUM|HIGH) | PM, DM, CEO |
| Delivery Confidence | blended score from API | CEO |

---

## Remove / Fix

- ❌ `sparkFrom()` synthetic sparklines — replace with real weekly data or remove
- ❌ Hardcoded "Leave" slice value `2` in distribution chart
- ❌ Duplicate dashboard access for CEO on `/dashboard` and `/executive`

---

*Generated: July 2026*
