# R360 Accessibility Report — WCAG 2.2 AA

**Audit date:** July 2026  
**Standard:** WCAG 2.2 Level AA (target AA+ on core flows)

---

## Executive Summary

R360 **does not currently meet WCAG AA** on several core flows. Critical gaps: keyboard navigation in command palette, missing skip links, color-only status encoding, no reduced-motion support, and inconsistent focus indicators.

| Category | Pass | Fail | Partial |
|----------|------|------|---------|
| Perceivable | 4 | 6 | 3 |
| Operable | 3 | 7 | 2 |
| Understandable | 5 | 3 | 2 |
| Robust | 4 | 2 | 2 |

---

## Critical Failures

### 1.4.1 Use of Color (Fail)
- Allocation heatmap cells use background color only for intensity
- **Fix:** Add `%` text in cell + `aria-label`

### 2.1.1 Keyboard (Fail)
- Command palette: no arrow key navigation between results
- Notification items: click-only, not keyboard activatable
- Project cards as `<button>` — OK; some `<div onClick>` — Fail

### 2.4.1 Bypass Blocks (Fail)
- No skip-to-main-content link

### 2.4.7 Focus Visible (Partial Fail)
- Only `Button` has `focus-visible:ring`
- Nav links, icon buttons, cards lack consistent focus

### 1.4.3 Contrast (Partial)
- `text-slate-400` on white: 2.96:1 — **Fail** for small text
- `text-slate-500` on white: 4.48:1 — Pass for body
- Brand coral on white: verify per shade

---

## Operable Issues

| Criterion | Issue | Fix |
|-----------|-------|-----|
| 2.4.3 Focus Order | Mobile drawer not in DOM order when closed | Portal + focus trap |
| 2.1.2 No Keyboard Trap | Command palette OK; verify modals | Radix Dialog audit |
| 2.5.5 Target Size | Sidebar collapse btn 24px | Increase to 44px touch target on mobile |
| 2.3.3 Animation | `animate-spin`, `fade-in` always on | `prefers-reduced-motion` |

---

## Understandable Issues

| Criterion | Issue | Fix |
|-----------|-------|-----|
| 3.3.1 Error Identification | Login error in div, no `role="alert"` | `aria-live="polite"` |
| 3.2.4 Consistent Identification | "Settings" vs System Health | Rename |
| 3.1.1 Language | `<html lang="en">` — verify in index.html | Set explicitly |

---

## Robust Issues

| Criterion | Issue | Fix |
|-----------|-------|-----|
| 4.1.2 Name, Role, Value | Heatmap grid lacks `role="grid"` | Semantic table or ARIA grid |
| 4.1.3 Status Messages | No toast aria-live region | Toast provider |

---

## Screen Reader Testing Plan

| Flow | NVDA/JAWS | VoiceOver |
|------|-----------|-----------|
| Login | Required | Required |
| Employee time entry | Required | Required |
| PM approvals | Required | — |
| Admin dashboard | — | Required |

---

## Remediation Roadmap

### Sprint 1 (Critical)
1. Skip link component
2. Global `focus-visible` styles
3. `prefers-reduced-motion` in CSS
4. Login `role="alert"` on errors
5. Command palette roving tabindex

### Sprint 2
6. Heatmap `aria-label` per cell
7. Status badges: icon + text always
8. Chart accessible data table toggle
9. `lang="en"` on html

### Sprint 3
10. axe-core in CI
11. Manual screen reader UAT
12. High contrast mode tokens

---

## High Contrast Mode (Future)

```css
@media (prefers-contrast: more) {
  :root {
    --border: #000000;
    --foreground: #000000;
  }
}
```

---

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

*Generated: July 2026*
