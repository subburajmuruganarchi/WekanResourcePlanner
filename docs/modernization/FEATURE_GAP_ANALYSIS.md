# R360 Feature Gap Analysis — Enterprise Modules

Comparison against 2026 enterprise RM platforms (Workday, Rippling, Oracle Fusion, Monday.com, SAP SuccessFactors).

---

## Currently Implemented ✅

| Module | Maturity | Notes |
|--------|----------|-------|
| Resource Planning / Allocation | High | AG Grid weekly planner |
| Time Tracking | High | Full workflow |
| Timesheet Approvals | Medium | PM/DM/Admin |
| Utilization Dashboards | Medium | Admin/DM/CEO |
| Delivery Risk Engine | Medium | Rule-based |
| OKRs | Medium | Personal + org |
| Reports (Excel) | Medium | Export focused |
| Planner Import | Medium | Excel + Google Sheets |
| AI Insights | Low-Med | Read-only explainability |
| Notifications | Low | Basic list |
| Global Search | Low | Limited scope |
| Role-based Workspaces | Medium | 5 personas |
| Command Palette | Low | Static items |
| Portfolios | Low | Admin assignment |

---

## Gaps — High Value for R360

| Module | Business Value | Backend Required | Priority |
|--------|----------------|------------------|----------|
| **Approval Center** (unified) | High | No — aggregate existing | P0 |
| **Skills Matrix** | High | Partial — skills exist | P1 |
| **Bench Management** | High | No — derive from allocation | P1 |
| **Resource Requests** | High | Yes | P1 |
| **Saved Views / Filters** | High | No (localStorage first) | P0 |
| **Audit Center** | High | Yes — partial system logs | P1 |
| **Leave Planning** | Medium | Yes | P2 |
| **Org Chart** | Medium | Yes | P2 |
| **Demand Forecasting** | High | Yes | P2 |
| **Financial Forecasting** | Medium | Yes | P3 |

---

## Gaps — Medium Value

| Module | Notes |
|--------|-------|
| Succession Planning | Needs career data model |
| Certification Tracking | HR integration |
| Learning / LMS | Out of core RM scope |
| Vendor Resources | Contractor type in employees |
| Hiring Pipeline | ATS integration |
| Expenses / Travel | ERP scope |
| Knowledge Base | Could start as markdown wiki |
| Meeting Notes | Integrate Notion/Confluence |
| Goals / Roadmaps | Extend OKRs |
| Release Planning | Extend PM timeline |

---

## AI Feature Gaps

| Capability | Current | Target |
|------------|---------|--------|
| Copilot panel | Basic | Context-aware dock |
| Explainability | Static panels | Inline per widget |
| What-if analysis | None | Allocation simulator |
| Predictive allocation | Ranking only | ML suggestions |
| Risk prediction | Rule engine | Trend + ML |
| NL search | None | Copilot query |
| Suggested actions | Separate page | Inline chips |

---

## Competitive Positioning

| Capability | R360 | Monday | Workday |
|------------|------|--------|---------|
| Weekly allocation grid | ✅ Strong | ⚠️ Basic | ✅ |
| Time + approvals | ✅ | ⚠️ | ✅ |
| Google Sheet sync | ✅ Unique | ❌ | ❌ |
| Executive dashboards | ⚠️ | ⚠️ | ✅ |
| Mobile UX | ❌ | ✅ | ✅ |
| Dark mode | ❌ | ✅ | ✅ |
| Skills matrix | ❌ | ⚠️ | ✅ |
| Financial planning | ❌ | ⚠️ | ✅ |

**R360 differentiator:** Planner sheet sync + delivery risk on allocation data.

---

## Recommended Phase 2 Modules

1. **Approval Center** — `/approvals` unified queue
2. **Bench Management** — `/bench` from heatmap underutilized
3. **Skills Matrix** — `/skills` heatmap (restore route)
4. **Resource Requests** — employee request → DM approve → allocate
5. **Audit Center** — admin view of override logs + sync history

---

*Generated: July 2026*
