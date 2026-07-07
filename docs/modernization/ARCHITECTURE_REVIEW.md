# R360 Frontend Architecture Review

**Scope:** `app/src/`  
**Date:** July 2026

---

## 1. Current Structure

```
app/src/
├── app/              # Pages (feature folders) — GOOD
├── components/
│   ├── ui/           # Primitives (10 files) — THIN
│   ├── layout/       # Shell — GOOD
│   ├── dashboard/    # Dashboard widgets — OK
│   ├── workspaces/   # Persona shared — OK
│   ├── time-tracking/# Feature — OK
│   └── ai/           # AI panels — OK
├── lib/              # Hooks, API, utils — MIXED
├── types/            # Shared types — GOOD
└── styles/           # Tokens — MINIMAL
```

**Pattern:** Hybrid feature folders (`app/`) + type-based components (`components/`)

---

## 2. Assessment

| Criterion | Score | Notes |
|-----------|-------|-------|
| Feature boundaries | 3/5 | Pages colocated; shared logic leaks to `lib/` |
| Reusability | 2/5 | Duplicate headers, cards, tables |
| Scalability | 3/5 | Works to ~30 routes; needs patterns layer |
| Maintainability | 3/5 | Consistent TS; inconsistent UI patterns |
| Testability | 1/5 | Zero frontend tests |
| State management | 3/5 | Context + SWR + local state — no global store |

---

## 3. Issues

### Structural

| ID | Issue |
|----|-------|
| ARCH-01 | `lib/` is a junk drawer — 30+ hooks/files without subfolders |
| ARCH-02 | `api.ts` and `api-client.ts` duplicate |
| ARCH-03 | No `components/patterns/` for composite UI |
| ARCH-04 | CSS classes (`dashboard-card`) parallel to React components |
| ARCH-05 | `"use client"` in Vite login page — copy-paste artifact |

### Component

| ID | Issue |
|----|-------|
| ARCH-06 | `WorkspacePrimitives` duplicates `KPICard` / dashboard components |
| ARCH-07 | Page components 400+ lines (dashboard) — need extraction |
| ARCH-08 | AG Grid config inline in page files |

### Data

| ID | Issue |
|----|-------|
| ARCH-09 | Mixed fetch patterns: raw `api.get`, SWR hooks, `useEffect` |
| ARCH-10 | No error boundary per route |
| ARCH-11 | MVP config loaded once — no reactive feature flags |

---

## 4. Recommended Target Architecture

**Feature-Driven Design + Shared Patterns**

```
app/src/
├── features/
│   ├── allocation/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── api.ts
│   ├── dashboard/
│   ├── time-tracking/
│   └── ...
├── shared/
│   ├── ui/           # Primitives
│   ├── patterns/     # PageHeader, MetricCard, DataTable
│   ├── layout/       # AppShell, Sidebar
│   └── lib/          # cn, api client, auth
├── styles/
└── main.tsx
```

**Migration:** Incremental — alias `@/features` alongside existing `@/app` paths.

---

## 5. Atomic Design Fit

| Level | R360 Mapping |
|-------|--------------|
| Atoms | `ui/button`, `ui/input` |
| Molecules | `MetricCard`, `StatusBadge` |
| Organisms | `Sidebar`, `TimesheetGrid` |
| Templates | `PageContainer` + `PageHeader` |
| Pages | `app/*/page.tsx` |

**Verdict:** Use Atomic at `shared/` level only; features stay vertical slices.

---

## 6. Technical Debt Register

| Item | Severity | Effort |
|------|----------|--------|
| Monolithic App.tsx imports | High | M |
| Duplicate API clients | Medium | S |
| No frontend tests | High | L |
| Hardcoded colors | High | M |
| Fake dashboard sparklines | Medium | S |
| Missing dark mode | High | M |
| lib/ organization | Medium | M |

---

## 7. Naming Conventions (target)

- Pages: `page.tsx` default export
- Hooks: `use-*.ts`
- Types: `*.types.ts` or `types/`
- Components: PascalCase files
- Constants: `SCREAMING_SNAKE` in `*.constants.ts`

---

## 8. Scalability Path

1. **Phase 1:** `shared/patterns` + design tokens (this sprint)
2. **Phase 2:** Lazy routes + feature API modules
3. **Phase 3:** Gradual `app/` → `features/` move
4. **Phase 4:** Vitest + Testing Library for patterns
5. **Phase 5:** Storybook for component library

---

*Generated: July 2026*
