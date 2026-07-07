# R360 Wireframes — All Pages

ASCII wireframes for desktop (1440px), tablet (768px), and mobile (375px).  
**Theme variants:** Light (default) / Dark (`data-theme="dark"`)

---

## Global Shell

### Desktop (1440px) — Light
```
┌──────────────────────────────────────────────────────────────────────────┐
│ ☰ │ R360 · Admin Workspace          🔍 Search...  ⌘K   🌙  🔔  ✨AI  👤  │
├───┼────────────────────────────────────────────────────────────────────────┤
│   │ Workspace / Dashboard                                                │
│ D │ Resource Intelligence Dashboard                    [+ Allocate] [Export]│
│ a ├────────────────────────────────────────────────────────────────────────┤
│ s │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│ h │ │ KPI    │ │ KPI    │ │ KPI    │ │ KPI    │ │ KPI    │ │ KPI    │   │
│ b │ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘   │
│ o │ ┌─────────────────────────────┐ ┌─────────────────────────────┐     │
│ a │ │ Utilization Trend Chart     │ │ Allocation Distribution     │     │
│ r │ └─────────────────────────────┘ └─────────────────────────────┘     │
│ d │ ┌───────────────────────────────────────────────────────────────┐   │
│   │ │ Project Performance Table                                     │   │
│   │ └───────────────────────────────────────────────────────────────┘   │
└───┴────────────────────────────────────────────────────────────────────────┘
```

### Mobile (375px) — Light
```
┌─────────────────────────┐
│ ☰  R360        🔔  👤  │
├─────────────────────────┤
│ Dashboard               │
│ ┌─────────────────────┐ │
│ │ KPI (stacked)       │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Chart (full width)  │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Table → Card list   │ │
│ └─────────────────────┘ │
└─────────────────────────┘

[Drawer overlay when ☰ tapped]
┌─────────────────────────┐
│ ✕  Navigation           │
│ ● Dashboard             │
│   Projects              │
│   Allocation            │
│   ...                   │
└─────────────────────────┘
```

### Dark Mode
- Shell bg: `#0c0f14`
- Cards: `#141820` with `border #2a3344`
- Sidebar: same as card, brand accent on active nav

---

## Employee — `/workspace`

### Desktop
```
┌────────────────────────────────────────────────────────────┐
│ Good day, Alex                         [Open Time Tracking]│
├──────────────┬──────────────┬──────────────────────────────┤
│ Today        │ Timesheet    │ My OKRs                      │
│ 6h planned   │ Draft · 32h  │ 72% · 3 objectives           │
├──────────────┴──────────────┴──────────────────────────────┤
│ MY PROJECTS                                                │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│ │ Project A    │ │ Project B    │ │ Project C    │         │
│ └──────────────┘ └──────────────┘ └──────────────┘         │
├────────────────────────────┬───────────────────────────────┤
│ Utilization (sparkline)    │ Pending Actions               │
└────────────────────────────┴───────────────────────────────┘
```

### Mobile — Portrait
- Single column cards
- FAB: Log Time (bottom-right)

---

## PM — `/pm`

### Desktop
```
┌────────────────────────────────────────────────────────────┐
│ Project Dashboard                                          │
├────────┬────────┬────────┬────────┬──────────────────────┤
│Projects│ Active │ Team   │At Risk │ Pending Approvals    │
├────────┴────────┴────────┴────────┴──────────────────────┤
│ PROJECT CARDS (health stripe left border)                  │
│ ┌─🟢────────────────────────────────────────────────────┐  │
│ │ Alpha Platform · 8 team · On track                    │  │
│ └───────────────────────────────────────────────────────┘  │
├────────────────────────────┬───────────────────────────────┤
│ Team Workload (bars)       │ Open Risks                    │
├────────────────────────────┴───────────────────────────────┤
│ Timeline (next 14 days)                                    │
└────────────────────────────────────────────────────────────┘
```

---

## DM — `/delivery`

### Desktop
```
┌────────────────────────────────────────────────────────────┐
│ Delivery Command Center              [Suggested Actions →]   │
├ KPI strip (6 cards) ───────────────────────────────────────┤
│ Portfolio Charts (2-col)                                   │
├────────────────────────────────────────────────────────────┤
│ Portfolio Table (sortable)                                 │
├────────────────────────────────────────────────────────────┤
│ Top Recommendations (inline cards)                         │
└────────────────────────────────────────────────────────────┘
```

---

## CEO — `/executive`

### Desktop
```
┌────────────────────────────────────────────────────────────┐
│ Enterprise Dashboard (read-only)                           │
├ Delivery Health KPIs ──────────────────────────────────────┤
├ Resource Health KPIs ──────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐ │
│ │ DELIVERY CONFIDENCE: 78%                               │ │
│ └────────────────────────────────────────────────────────┘ │
├ Charts + Legend ───────────────────────────────────────────┤
├ Portfolio Table ───────────────────────────────────────────┤
│ AI Executive Brief                                         │
└────────────────────────────────────────────────────────────┘
```

---

## Allocation — `/allocation`

### Desktop
```
┌────────────────────────────────────────────────────────────┐
│ Resource Planning    [Week ◀ ▶] [Filters] [Export] [Views]│
├────────────────────────────────────────────────────────────┤
│ AG GRID (sticky header, frozen employee column)            │
│ Employee │ Proj A │ Proj B │ ... │ Total │                 │
│──────────┼────────┼────────┼─────┼───────│                 │
│ Alice    │  20%   │  40%   │     │  60%  │                 │
└────────────────────────────────────────────────────────────┘
```

### Mobile
```
┌─────────────────────────┐
│ Week: Mar 3–7      [▼]  │
├─────────────────────────┤
│ Alice Chen              │
│ ┌─────────────────────┐ │
│ │ Alpha · 40%         │ │
│ │ Beta · 20%          │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

---

## Login — `/login`

### Desktop — Dark (brand)
```
        ┌─────────────────────────┐
        │      [R360 Logo]        │
        │  Resource Management    │
        │                         │
        │  Email    [___________] │
        │  Password [___________] │
        │       [ Sign In ]       │
        │      ── or ──           │
        │    [ Google SSO ]       │
        └─────────────────────────┘
```

---

## Tablet (768px) — Landscape

- Sidebar: collapsed icon-only (72px) by default
- KPI grid: 2×2
- Charts: stacked
- Tables: horizontal scroll with shadow hint

---

## Component Wireframe Key

| Symbol | Meaning |
|--------|---------|
| `┌─┐` | Card container |
| `●` | Active nav item |
| `🟢🟡🔴` | Health RAG |
| `☰` | Menu / drawer trigger |
| `✨AI` | Copilot panel trigger |

---

*Generated: July 2026 — See UI_REDESIGN.md for interaction specs*
