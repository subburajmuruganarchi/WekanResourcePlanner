# R360 Information Architecture

## 1. Product Taxonomy

```
R360
├── Workspaces (role-based homes)
│   ├── Employee → /workspace
│   ├── Project Manager → /pm
│   ├── Delivery Manager → /delivery
│   ├── CEO → /executive
│   └── Admin → /dashboard
├── Work (execution)
│   ├── Projects (/projects, /projects/:id)
│   ├── Resource Planning (/allocation)
│   ├── Time (/time-entry)
│   └── Approvals (/pm-approvals)
├── Intelligence
│   ├── Reports (/reports)
│   ├── AI Insights (/insights)
│   ├── Risk Radar (/executive/risk-radar)
│   └── OKRs (/okrs)
└── Administration (Admin only)
    ├── Inputs (/inputs)
    ├── Portfolios (/portfolios)
    ├── Users (/user-control)
    └── System (/system-health)
```

---

## 2. Role × Route Matrix

| Route | Admin | CEO | DM | PM | Employee |
|-------|:-----:|:---:|:--:|:--:|:--------:|
| /workspace | — | — | — | — | ● |
| /dashboard | ● | ○ | ○ | ○ | — |
| /executive | — | ● | — | — | — |
| /delivery | — | — | ● | — | — |
| /pm | — | — | — | ● | — |
| /projects | ● | ● | ● | ● | — |
| /allocation | ● | ● | ● | ● | ○ |
| /time-entry | ● | — | ● | ● | ● |
| /pm-approvals | ● | — | ● | ● | — |
| /reports | ● | ● | ● | ● | — |
| /insights | ● | ○ | ● | ● | — |
| /okrs | ● | ● | ● | ● | ● |
| /inputs | ● | — | — | — | — |
| /user-control | ● | — | — | — | — |
| /portfolios | ● | — | — | — | — |
| /system-health | ● | — | — | — | — |

● Primary · ○ Accessible · — Hidden

---

## 3. Navigation Hierarchy (Target)

### Employee
```
Home
├── My Workspace
├── Time Tracking
├── My OKRs
└── My Allocation (filtered view)
```

### Project Manager
```
Projects
├── Dashboard
├── All Projects
├── Timeline
├── Team
├── Risks
├── Reports
└── Time & Approvals
```

### Delivery Manager
```
Portfolio
├── Command Center
├── Projects
├── Allocation
├── Capacity
├── Approvals
├── Reports
└── Recommendations
```

### CEO
```
Executive
├── Dashboard
├── Projects
├── Allocation
├── Risk Radar
├── OKRs
└── Reports
```

### Admin
```
Operations
├── Dashboard
├── Planning
├── Projects
├── Time & Approvals
├── Reports
├── OKRs
└── AI Insights
Admin
├── Inputs
├── Portfolios
├── Users
└── System
```

---

## 4. Search Architecture

| Layer | Scope | Implementation |
|-------|-------|----------------|
| Command Palette | Routes + actions | ⌘K |
| Global Search | Projects, employees, pages | Header |
| In-page filter | Table/grid rows | FilterBar |
| AI Search | Natural language (future) | Copilot |

---

## 5. Content Depth Model

| Level | Example | UI Pattern |
|-------|---------|------------|
| L0 Org | CEO dashboard | KPI + charts |
| L1 Portfolio | DM command | Tables + health |
| L2 Project | Project detail | Tabs + inspector |
| L3 Person | Employee row | Side panel |
| L4 Week/Day | Time entry | Grid/calendar |

---

## 6. Redirects & Legacy Routes

| Legacy | Target | Action |
|--------|--------|--------|
| /weekly-planner | /allocation | Keep redirect |
| /skills | /projects | Keep redirect |
| /ai-analytics | /insights | Keep redirect |
| /executive/brief | /executive | Deprecate or build |

---

## 7. URL Conventions

- Persona homes: single segment (`/pm`, `/delivery`)
- Sub-features: `/pm/timeline`
- Entity detail: `/projects/:id`
- No query-only navigation for primary IA (use path)

---

*Generated: July 2026*
