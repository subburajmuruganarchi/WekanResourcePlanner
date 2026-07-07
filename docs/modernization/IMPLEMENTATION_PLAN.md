# R360 Implementation Plan — Enterprise Modernization

**Program duration:** 12 weeks  
**Team assumption:** 2 frontend engineers + 1 designer (part-time)

---

## Priority Framework

| Priority | Definition |
|----------|------------|
| **Critical** | Blocks enterprise adoption, a11y fail, mobile broken |
| **High** | Major UX debt, performance, persona gaps |
| **Medium** | Polish, nice-to-have modules |
| **Low** | Future modules, backend-dependent |

---

## Week-by-Week Roadmap

### Week 1 — Foundation (Critical)
| Task | Complexity | Deps | Risk |
|------|------------|------|------|
| Design tokens + dark mode | M | — | Low |
| Theme provider + toggle | S | tokens | Low |
| `Skeleton`, `EmptyState`, `ErrorState` | S | tokens | Low |
| `PageHeader`, `MetricCard` patterns | M | tokens | Low |
| Mobile nav drawer | M | Sheet component | Med |
| Skip link + focus styles | S | — | Low |

**Deliverables:** Theme works, mobile nav, shared patterns

---

### Week 2 — Performance (Critical)
| Task | Complexity | Deps | Risk |
|------|------------|------|------|
| Lazy route loading | M | — | Med |
| Vite manualChunks | S | — | Low |
| Dynamic AG Grid import | M | lazy routes | Med |
| Page skeleton fallbacks | S | Skeleton | Low |
| Remove fake KPI sparklines | S | — | Low |

**Deliverables:** Initial JS &lt; 300KB gzip

---

### Week 3 — Shell & Navigation (High)
| Task | Complexity | Deps | Risk |
|------|------------|------|------|
| Interactive breadcrumbs | S | — | Low |
| Role-aware command palette | M | auth | Low |
| Profile dropdown menu | S | — | Low |
| PM nav: add missing sub-routes | S | — | Low |
| Header/page title dedup | S | PageHeader | Low |

---

### Week 4 — Employee + PM Dashboards (High)
| Task | Complexity | Deps | Risk |
|------|------------|------|------|
| Employee workspace widgets (real data) | M | APIs exist | Low |
| PM dashboard: approvals KPI | S | API | Low |
| PM team workload chart | M | utilization API | Med |
| Unified MetricGrid | S | patterns | Low |

---

### Week 5 — DM + CEO Dashboards (High)
| Task | Complexity | Deps | Risk |
|------|------------|------|------|
| DM inline recommendations | M | — | Low |
| CEO AI brief on home | S | insights API | Low |
| Admin ops health strip | M | system API | Med |
| Portfolio table → DataTable | L | AG Grid wrapper | Med |

---

### Week 6 — Tables & Forms (High)
| Task | Complexity | Deps | Risk |
|------|------------|------|------|
| EnterpriseDataGrid wrapper | L | AG Grid | Med |
| Column chooser + export | M | wrapper | Low |
| FormField + inline errors | M | — | Low |
| Time entry autosave indicator | M | API | Med |

---

### Week 7 — Accessibility (Critical)
| Task | Complexity | Deps | Risk |
|------|------------|------|------|
| Command palette keyboard nav | M | — | Low |
| Chart data table fallbacks | M | — | Med |
| aria-live on forms/toasts | S | Toast | Low |
| Color contrast audit + fixes | M | dark mode | Low |
| axe-core CI | S | — | Low |

---

### Week 8 — AI UX (Medium)
| Task | Complexity | Deps | Risk |
|------|------------|------|------|
| Copilot context binding | M | — | Low |
| Suggested actions chips | S | — | Low |
| Merge insights into copilot | M | — | Low |

---

### Week 9–10 — New Modules (Medium)
| Module | Complexity | Backend needed |
|--------|------------|----------------|
| Approval Center (unified) | M | No |
| Resource Requests | L | Yes |
| Skills Matrix view | M | Partial |
| Bench Management | M | No (from heatmap) |
| Audit Center | L | Yes |

---

### Week 11 — Wireframes → Polish
- Tablet layouts
- Animation pass
- Empty state illustrations
- Login theme sync

---

### Week 12 — QA & Launch
- Cross-browser QA
- Role-based UAT scripts
- Performance regression
- Documentation update

---

## Dependency Graph

```
Tokens → Theme → Patterns → Pages
                ↓
         Lazy Routes → AG Grid Split
                ↓
         DataTable → Table Pages
```

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| AG Grid refactor breaks allocation | Feature flag, parallel component |
| Dark mode contrast failures | Automated contrast tests |
| Scope creep on new modules | Phase 2 backlog |
| API gaps for CEO financials | UI placeholders + "Coming soon" |

---

## Engineering Estimates (person-days)

| Phase | Days |
|-------|------|
| Foundation + theme | 8 |
| Performance | 5 |
| Navigation | 5 |
| Dashboards | 12 |
| Tables/forms | 10 |
| A11y | 6 |
| AI UX | 4 |
| New modules | 15 |
| QA/polish | 8 |
| **Total** | **~73 days** |

---

*Generated: July 2026*
