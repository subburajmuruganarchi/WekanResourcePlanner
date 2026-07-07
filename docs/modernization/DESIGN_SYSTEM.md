# R360 Design System — 2026 Enterprise Standards

**Version:** 1.0.0  
**Brand:** WeKan R360 (coral + navy)  
**Stack:** Tailwind CSS 4 + CSS custom properties + Radix primitives

---

## 1. Design Principles

1. **Clarity over density** — executives and ICs scan in &lt;3 seconds
2. **Semantic color** — never decorative accent without meaning
3. **Progressive disclosure** — summary → detail → inspector
4. **Accessible by default** — WCAG AA minimum, AAA where feasible
5. **Theme parity** — light and dark are first-class, not inverted afterthought

---

## 2. Color Tokens

### Brand

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--brand-50` … `--brand-700` | Coral scale | Adjusted for contrast | CTAs, active nav, links |
| `--navy` | `#001c2a` | `#0a1628` | Sidebar, login, chrome |
| `--navy-muted` | `#0a2d3f` | `#132337` | Elevated navy surfaces |

### Semantic Surfaces

| Token | Light | Dark |
|-------|-------|------|
| `--background` | `#fafafa` | `#0c0f14` |
| `--foreground` | `#111011` | `#f4f4f5` |
| `--card` | `#ffffff` | `#141820` |
| `--card-foreground` | `#111827` | `#f4f4f5` |
| `--muted` | `#f1f5f9` | `#1e2430` |
| `--muted-foreground` | `#64748b` | `#94a3b8` |
| `--border` | `#dce4ea` | `#2a3344` |
| `--ring` | `#ee2f58` | `#f37555` |

### Status

| Role | Foreground | Background | Border |
|------|------------|------------|--------|
| **Success** | `#059669` | `#ecfdf5` | `#a7f3d0` |
| **Warning** | `#d97706` | `#fffbeb` | `#fde68a` |
| **Critical** | `#dc2626` | `#fef2f2` | `#fecaca` |
| **Info** | `#2563eb` | `#eff6ff` | `#bfdbfe` |
| **Neutral** | `#64748b` | `#f8fafc` | `#e2e8f0` |

Dark mode status backgrounds use 15% opacity overlays on base surface.

---

## 3. Typography Scale

**Font family:** `Inter, ui-sans-serif, system-ui, sans-serif`  
**Load:** `@fontsource/inter` weights 400, 500, 600, 700

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `text-display` | 2.25rem (36px) | 700 | 1.2 | Page titles |
| `text-h1` | 1.875rem (30px) | 700 | 1.25 | Section heroes |
| `text-h2` | 1.5rem (24px) | 600 | 1.3 | Section titles |
| `text-h3` | 1.125rem (18px) | 600 | 1.4 | Card titles |
| `text-body` | 0.875rem (14px) | 400 | 1.5 | Body |
| `text-body-sm` | 0.8125rem (13px) | 400 | 1.5 | Secondary |
| `text-caption` | 0.75rem (12px) | 500 | 1.4 | Labels, meta |
| `text-overline` | 0.6875rem (11px) | 600 | 1.3 | Eyebrows, uppercase tracking-wider |

**Responsive:** `clamp()` for display on mobile: `clamp(1.5rem, 4vw, 2.25rem)`

---

## 4. Spacing Scale (4px base)

| Token | Value |
|-------|-------|
| `--space-0` | 0 |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

**Page padding:** `--page-px: clamp(1rem, 4vw, 2rem)`  
**Section gap:** `--section-gap: 2rem` (32px)

---

## 5. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Chips, badges |
| `--radius-md` | 10px | Inputs, buttons |
| `--radius-lg` | 14px | Cards |
| `--radius-xl` | 18px | Modals, drawers |
| `--radius-full` | 9999px | Avatars, pills |

---

## 6. Elevation & Shadows

| Token | Value |
|-------|-------|
| `--shadow-xs` | `0 1px 2px rgb(0 28 42 / 0.04)` |
| `--shadow-sm` | `0 1px 3px rgb(0 28 42 / 0.06), 0 1px 2px rgb(0 28 42 / 0.04)` |
| `--shadow-md` | `0 4px 12px rgb(0 28 42 / 0.06)` |
| `--shadow-lg` | `0 12px 28px rgb(0 28 42 / 0.08)` |
| `--shadow-xl` | `0 24px 48px rgb(0 28 42 / 0.12)` |

Dark mode: reduce opacity 50%, add subtle border `1px solid var(--border)`.

---

## 7. Grid & Breakpoints

| Name | Min Width | Layout |
|------|-----------|--------|
| `xs` | 320px | Single column, drawer nav |
| `sm` | 640px | 2-col KPI |
| `md` | 768px | Tablet drawer |
| `lg` | 1024px | Persistent sidebar |
| `xl` | 1280px | 3–4 col dashboards |
| `2xl` | 1536px | Max content 1600px centered |
| `3xl` | 1920px | Optional inspector column |

**12-column grid** with `gap-4` (16px) default; `gap-6` (24px) for dashboard sections.

---

## 8. Animation Tokens

| Token | Duration | Easing |
|-------|----------|--------|
| `--duration-fast` | 150ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--duration-normal` | 200ms | same |
| `--duration-slow` | 300ms | same |
| `--duration-slower` | 500ms | `cubic-bezier(0.16, 1, 0.3, 1)` |

**Reduced motion:** `@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; } }`

---

## 9. Interactive States

### Focus
```css
:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

### Hover
- Cards: `shadow-md`, border `brand-200/30`
- Buttons: darken 5% or `opacity-90` on gradient
- Nav items: `bg-muted`

### Pressed
- `scale(0.98)` on buttons (optional, respect reduced motion)
- `bg-muted` darker on nav

### Disabled
- `opacity-50`, `pointer-events-none`, `cursor-not-allowed`

---

## 10. Iconography

- **Library:** Lucide React, 18px nav, 16px inline, 20px cards
- **Stroke:** 1.75–2px consistent
- **Semantic pairing:** every KPI has one icon; status uses icon + text

---

## 11. Illustration Guidelines

- Empty states: simple line illustrations (Lucide large icon + muted circle bg)
- No stock photos
- Error states: neutral illustration + clear recovery CTA

---

## 12. Component Token Mapping

| Component | Background | Border | Radius |
|-----------|------------|--------|--------|
| Card | `--card` | `--border` | `--radius-lg` |
| Input | `--card` | `--border` | `--radius-md` |
| Popover | `--card` | `--border` | `--radius-lg` |
| Sidebar | `--card` | `--border` | — |
| Header | `--card/80` + blur | bottom `--border` | — |

---

## 13. Implementation Files

| File | Purpose |
|------|---------|
| `app/src/styles/enterprise-tokens.css` | Token definitions |
| `app/src/styles/theme.css` | Light/dark overrides |
| `app/src/lib/theme-context.tsx` | Theme provider |
| `app/src/components/ui/*` | Primitives |

---

*Generated: July 2026 — R360 Enterprise Modernization Program*
