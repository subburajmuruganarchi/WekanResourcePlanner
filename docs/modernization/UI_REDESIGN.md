# R360 UI Redesign — 2026 Enterprise Direction

**Inspiration (not copy):** Linear clarity, Notion progressive disclosure, Atlassian information density controls, Stripe dashboard polish, Rippling HR workflows, Workday enterprise trust.

---

## 1. Vision

Transform R360 from a **feature-complete MVP** into a **cohesive enterprise workspace** where each role lands on a purposeful home, drills into detail via inspectors (not page hops), and completes tasks with minimal clicks.

---

## 2. Global Shell Redesign

### Current
```
[ Fixed Sidebar 260px ] [ Header + Scrollable Main ]
```

### Target
```
┌─────────────────────────────────────────────────────────┐
│ [≡] R360 · Workspace ▾     🔍 Search ⌘K    🌙 🔔 AI 👤 │
├──────────┬──────────────────────────────────────────────┤
│ Nav      │ Breadcrumb › Title          [Actions]      │
│ (collaps)├──────────────────────────────────────────────┤
│          │ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│          │ │ KPI     │ │ KPI     │ │ KPI     │         │
│          │ └─────────┘ └─────────┘ └─────────┘         │
│          │ ┌──────────────────────┬──────────────────┐ │
│          │ │ Main content       │ Inspector (opt)  │ │
│          │ └──────────────────────┴──────────────────┘ │
└──────────┴──────────────────────────────────────────────┘
```

### Changes
- **Mobile:** Overlay drawer + bottom safe area
- **Theme toggle** in header profile area
- **Sticky page toolbar** below header for filters/actions
- **Optional right inspector** (480px) for entity detail without full navigation

---

## 3. Navigation Redesign

### Persona Home (single entry)
| Role | Home | Label |
|------|------|-------|
| Employee | `/workspace` | Home |
| PM | `/pm` | Projects |
| DM | `/delivery` | Portfolio |
| CEO | `/executive` | Executive |
| Admin | `/dashboard` | Operations |

### Unified section taxonomy
1. **Home** — persona dashboard
2. **Work** — projects, allocation, time
3. **Insights** — reports, AI, risks
4. **Admin** — inputs, users, system (Admin only)

### Command Palette 2.0
- Role-filtered routes + entities (projects, people)
- Recent (last 10), Favorites (pinned)
- Keyboard: ↑↓ navigate, Enter open, Esc close
- Natural language stub → AI search (future)

---

## 4. Visual Language

| Element | Before | After |
|---------|--------|-------|
| Cards | `.dashboard-card` CSS | `<Card>` + semantic tokens |
| Colors | Hardcoded hex | CSS variables + dark mode |
| Typography | Mixed slate/gray | Inter loaded, type scale |
| Spacing | Ad-hoc `space-y-8` | Section tokens |
| Status | Inconsistent badges | `<StatusBadge variant>` |
| Tables | 4 implementations | `<EnterpriseDataGrid>` + mobile cards |

---

## 5. Page-Level Redesigns

### Employee Home
```
┌────────────────────────────────────────────┐
│ Good morning, Alex          [Log Time →]   │
├──────────────┬──────────────┬──────────────┤
│ Today 6h     │ Timesheet    │ OKRs 72%     │
│ planned      │ Draft · 32h  │              │
├──────────────┴──────────────┴──────────────┤
│ My Projects (cards)                        │
├────────────────────────────────────────────┤
│ Recent Activity · Pending Actions          │
└────────────────────────────────────────────┘
```

### PM Home
- Project health cards with RAG stripe
- Pending approvals queue (inline approve)
- Mini timeline (next 2 weeks)
- Team workload bar chart

### DM Home
- Portfolio heatmap summary
- Bench resources panel
- Capacity forecast sparkline
- Top 3 recommendations inline

### CEO Home
- Delivery confidence hero
- Department comparison (when API available)
- AI executive brief card
- Risk radar preview

### Admin Home
- Existing rich dashboard + remove fake trends
- System health strip (sync, errors, users)
- Quick links: Import, Users, Reports

---

## 6. Table Experience (AG Grid Enterprise)

Wrapper features:
- Column chooser drawer
- Saved layouts (localStorage → API later)
- Export CSV/Excel
- Sticky header + frozen columns
- Quick filter + advanced filter row
- Multi-select + bulk actions bar
- Responsive: card list &lt; `md`
- Keyboard: Excel-like navigation

---

## 7. Form Experience

| Feature | Implementation |
|---------|----------------|
| Autosave | Debounced PATCH + "Saved" indicator |
| Draft mode | localStorage backup |
| Validation | Zod + inline field errors |
| Progress | Step indicator on wizards |
| Undo | Toast with undo for destructive |
| A11y | `aria-describedby`, `aria-invalid` |

---

## 8. AI UX Layer

### Copilot Panel (existing `AICopilotPanel` → enhance)
- Docked right, resizable
- Context-aware: current page entity
- Modes: Explain, Recommend, What-if
- Suggested actions as buttons (navigate, don't auto-execute)
- Chat history per session

### Insights page
- Merge into copilot + dashboard cards
- Remove duplicate explain panels

---

## 9. Motion & Micro-interactions

- Page enter: fade + 8px Y translate (200ms)
- List items: stagger 30ms
- Toast: slide from top-right
- Skeleton shimmer on cards
- No motion when `prefers-reduced-motion`

---

## 10. Responsive Strategy

| Breakpoint | Nav | KPI Grid | Tables |
|------------|-----|----------|--------|
| Mobile | Drawer | 1 col | Card list |
| Tablet | Drawer | 2 col | Horizontal scroll + sticky col |
| Desktop | Sidebar | 3–4 col | Full grid |
| Wide | Sidebar + inspector | 6 col | Full + pivot |

---

## 11. Dark Mode

- Toggle: system / light / dark (tri-state)
- Persist: `localStorage.theme`
- Login page respects theme preference post-auth
- Charts: Recharts theme sync

---

## 12. Out of Scope (Phase 1 implementation)

- Full Gantt rebuild
- Revenue/financial widgets (needs backend)
- Org chart module
- Custom theming per tenant

---

## 13. Success Metrics

| Metric | Target |
|--------|--------|
| LCP | &lt; 2.5s |
| Initial JS | &lt; 500KB gzip (route split) |
| Task: log time | ≤ 2 clicks from home |
| WCAG | AA pass on core flows |
| Mobile usability | SUS ≥ 70 |

---

*Generated: July 2026 — R360 Enterprise Modernization Program*
