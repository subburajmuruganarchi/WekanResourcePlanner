# R360 Component Library — Enterprise UI Kit

**Location:** `app/src/components/`  
**Convention:** Feature-based imports from `@/components/ui` (primitives) and `@/components/patterns` (composites)

---

## Primitives (`components/ui/`)

| Component | Status | Notes |
|-----------|--------|-------|
| `Button` | ✅ Exists | Migrate to semantic tokens |
| `Input` | ✅ Exists | Add error state, `aria-invalid` |
| `Label` | ✅ Exists | — |
| `Select` | ✅ Exists | Radix |
| `Dialog` | ✅ Exists | Add focus trap audit |
| `Popover` | ✅ Exists | — |
| `Tabs` | ✅ Exists | — |
| `Card` | ✅ Exists | Underused vs `dashboard-card` |
| `Badge` | ✅ Exists | Extend status variants |
| `Table` | ✅ Exists | Base HTML table styles |

### New Primitives (Modernization)

| Component | Purpose |
|-----------|---------|
| `Skeleton` | Line, card, table row variants |
| `EmptyState` | Icon + title + description + CTA |
| `ErrorState` | Retry + support link |
| `StatusBadge` | success/warning/critical/info/neutral |
| `Tooltip` | Radix tooltip wrapper |
| `DropdownMenu` | Profile, context actions |
| `Sheet` | Mobile drawer, right inspector |
| `Toast` | Global notifications |
| `Switch` | Theme toggle, settings |
| `Checkbox` | Bulk select |
| `Avatar` | User profile |
| `Separator` | Visual divider |
| `ScrollArea` | Custom scroll regions |

---

## Layout (`components/layout/`)

| Component | Status | Modernization |
|-----------|--------|---------------|
| `AppShell` | ✅ | Mobile drawer, theme bg tokens |
| `Sidebar` | ✅ | Responsive overlay, tooltips |
| `Header` | ✅ | Profile menu, theme toggle |
| `PageContainer` | ✅ | Semantic padding tokens |
| `GlobalSearch` | ✅ | Mobile visible |
| `CommandPalette` | ✅ | Role-aware, keyboard nav |
| `MobileNav` | 🆕 | Drawer navigation |
| `PageToolbar` | 🆕 | Sticky filters + actions |
| `Breadcrumbs` | 🆕 | Interactive links |

---

## Patterns (`components/patterns/`)

| Component | Purpose |
|-----------|---------|
| `PageHeader` | Unified eyebrow + title + description + actions |
| `MetricCard` | KPI with optional trend (real data only) |
| `MetricGrid` | Responsive KPI grid + skeleton |
| `Section` | Titled section with optional action |
| `DataTable` | AG Grid enterprise wrapper |
| `FilterBar` | Search + date + multi-select filters |
| `SavedViews` | Pin/filter presets |
| `BulkActionBar` | Floating bar on multi-select |
| `InspectorPanel` | Right-side entity detail |
| `ConfirmDialog` | Destructive action guard |
| `FormField` | Label + input + error + hint |

---

## Dashboard (`components/dashboard/`)

| Component | Status |
|-----------|--------|
| `KPICard` | ✅ Rich; remove fake sparklines |
| `DashboardCard` | ✅ |
| `DashboardSectionHeader` | ✅ |
| `UtilizationAnalytics` | ✅ |
| `EnterpriseHeatmap` | ✅ |
| `ProjectPerformanceGrid` | ✅ |
| `RiskCard` | ✅ |
| `InsightCard` | ✅ |

---

## Workspace (`components/workspaces/`)

| Component | Status |
|-----------|--------|
| `WorkspacePageHeader` | ✅ → merge into `PageHeader` |
| `WorkspaceMetricCard` | ✅ → merge into `MetricCard` |
| `WorkspaceSection` | ✅ → merge into `Section` |
| `HealthBadge` | ✅ → `StatusBadge` |
| `AICopilotPanel` | ✅ Enhance |

---

## Time Tracking (`components/time-tracking/`)

Specialized — keep feature folder; adopt shared tokens and `EmptyState`.

---

## Composition Examples

### Dashboard KPI Row
```tsx
<MetricGrid loading={loading} columns={4}>
  <MetricCard label="Active Projects" value={12} icon={FolderKanban} />
</MetricGrid>
```

### Page with Empty State
```tsx
<PageHeader title="Projects" action={<Button>New</Button>} />
{items.length === 0 ? (
  <EmptyState
    icon={FolderKanban}
    title="No projects yet"
    description="Create a project or import from planner."
    action={<Button onClick={onCreate}>Create project</Button>}
  />
) : (
  <ProjectList items={items} />
)}
```

### Enterprise Table
```tsx
<EnterpriseDataGrid
  columnDefs={cols}
  rowData={rows}
  enableExport
  savedLayoutsKey="projects-grid"
  onRowClick={openInspector}
/>
```

---

## Naming Conventions

- Primitives: PascalCase, single word (`Button`, `Card`)
- Patterns: descriptive (`PageHeader`, `FilterBar`)
- Feature components: domain prefix optional (`TimesheetGrid`)
- Props: `variant`, `size`, `className` via `cn()`

---

## Import Rules

```tsx
// ✅ Good
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/patterns/page-header';

// ❌ Avoid
import { Button } from '../../../components/ui/button';
```

---

*Generated: July 2026 — R360 Enterprise Modernization Program*
