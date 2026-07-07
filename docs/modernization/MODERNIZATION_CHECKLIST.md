# R360 Modernization Checklist

Track implementation progress. Update status as work completes.

**Legend:** ⬜ Not started · 🟡 In progress · ✅ Done

---

## Phase 1 — UX Audit
- ✅ UX_AUDIT.md
- ✅ PAGE_REVIEW.md

## Phase 2 — Documentation
- ✅ UX_AUDIT.md
- ✅ UI_REDESIGN.md
- ✅ DESIGN_SYSTEM.md
- ✅ COMPONENT_LIBRARY.md
- ✅ INFORMATION_ARCHITECTURE.md
- ✅ DASHBOARD_REDESIGN.md
- ✅ PERFORMANCE_REPORT.md
- ✅ ARCHITECTURE_REVIEW.md
- ✅ IMPLEMENTATION_PLAN.md
- ✅ WIREFRAMES.md
- ✅ ACCESSIBILITY_REPORT.md
- ✅ FEATURE_GAP_ANALYSIS.md
- ✅ MODERNIZATION_CHECKLIST.md

## Phase 3 — Design System Implementation
- ✅ Enterprise tokens (light + dark)
- ✅ Theme provider + persistence
- ✅ Global focus + reduced motion styles
- ✅ Inter font loading
- 🟡 Migrate hardcoded colors to tokens

## Phase 4 — Shared Components
- ✅ Skeleton
- ✅ EmptyState
- ✅ ErrorState
- ✅ StatusBadge
- ✅ PageHeader (unified)
- ✅ MetricCard / MetricGrid
- ✅ Toast provider
- ✅ Sheet (drawer) — MobileNav
- ✅ Profile dropdown menu
- ✅ EnterpriseDataTable

## Phase 5 — Layout & Navigation
- ✅ Mobile navigation drawer
- ✅ Theme toggle in header
- ✅ Skip to content link
- ✅ Interactive breadcrumbs
- ✅ Role-aware command palette
- ✅ PM nav: separate Approvals link

## Phase 6 — Performance
- ✅ Lazy route loading
- ✅ Vite manualChunks
- ✅ AG Grid in separate chunk (via lazy routes)
- ✅ Route Suspense skeletons

## Phase 7 — Dashboards
- ✅ Employee: real allocation + utilization widgets
- ✅ PM: pending approvals KPI + workload chart
- ✅ DM: inline recommendations
- ✅ CEO: AI brief on home
- ✅ Admin: ops health strip
- ✅ Remove fake sparkline data

## Phase 8 — Tables & Forms
- ✅ EnterpriseDataTable wrapper
- ✅ Column chooser + export
- ✅ Mobile card table mode
- ✅ FormField pattern
- ✅ Login page FormField migration
- ✅ Time entry autosave indicator

## Phase 9 — Accessibility
- ✅ Command palette keyboard nav
- ✅ Heatmap aria labels
- ✅ Chart data table fallback
- ✅ UtilizationAnalytics accessible fallback
- ✅ axe-core CI (login page)
- ⬜ Screen reader UAT

## Phase 10 — AI UX
- ✅ Copilot context binding
- ✅ Inline suggested actions
- ⬜ What-if allocation (future)

## Phase 11 — New Modules (Phase 2)
- ✅ Approval Center (`/approvals`)
- ✅ Bench Management (`/bench`)
- ✅ Skills Matrix (`/skills-matrix`)
- ✅ Resource Requests (`/resource-requests`)
- ✅ Audit Center (`/audit-center`)

## Phase 12 — QA
- ⬜ Cross-browser (Chrome, Firefox, Safari, Edge)
- ⬜ Mobile devices (iOS, Android)
- ⬜ Dark mode full pass
- ⬜ Role-based UAT (5 personas)
- ⬜ Lighthouse score ≥ 90 performance

---

## Definition of Done (per item)

- [ ] TypeScript strict — no new errors
- [ ] Responsive 320px–4K
- [ ] Dark + light themes
- [ ] Keyboard accessible
- [ ] No API contract changes
- [ ] Build passes (`npm run build`)

---

*Last updated: July 2026*
