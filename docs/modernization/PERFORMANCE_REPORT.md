# R360 Frontend Performance Report

**Date:** July 2026  
**Build tool:** Vite 7.3.1  
**Environment:** Production build (`npm run build`)

---

## 1. Bundle Analysis

| Asset | Size | Gzip | Assessment |
|-------|------|------|------------|
| `index-*.js` | **2,350.94 KB** | **677.37 KB** | 🔴 Critical — single monolithic chunk |
| `index-*.css` | 356.98 KB | 60.53 KB | 🟡 High — AG Grid theme contribution |
| `index.html` | 1.68 KB | 0.79 KB | ✅ OK |

**Vite warning:** Chunk exceeds 500 KB minified.

### Root Causes
1. **No route-level code splitting** — all 25+ pages imported synchronously in `App.tsx`
2. **AG Grid** — loaded even when not on allocation page
3. **Recharts** — entire library for dashboard charts
4. **date-fns** — full imports possible in some files
5. **lucide-react** — tree-shaken but many icons across app

---

## 2. Recommendations

### Critical (P0)

| Action | Impact | Effort |
|--------|--------|--------|
| `React.lazy()` all route pages | -60% initial JS | Medium |
| Dynamic import AG Grid only on `/allocation` | -400KB initial | Low |
| `manualChunks` in vite.config | Better caching | Low |

```ts
// vite.config.ts target
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom', 'react-router-dom'],
        charts: ['recharts'],
        grid: ['ag-grid-community', 'ag-grid-react'],
      },
    },
  },
}
```

### High (P1)

| Action | Impact |
|--------|--------|
| SWR deduplication audit — prevent duplicate dashboard fetches | Fewer API calls |
| Memoize heatmap cell rendering | Smoother scroll |
| Virtualize long HTML tables (DM/Executive) | DOM size |
| Font subsetting for Inter | -20KB |

### Medium (P2)

| Action | Impact |
|--------|--------|
| Image optimization (brand logo SVG) | Minimal |
| Prefetch persona home on login | Faster perceived nav |
| Service worker for static assets | Repeat visit |

---

## 3. Runtime Performance

### Observed Patterns

| Issue | Location | Fix |
|-------|----------|-----|
| Dashboard 5 parallel API calls on mount | `dashboard/page.tsx` | Single aggregated endpoint or SWR |
| `useEffect` dependency chains | Multiple pages | SWR keys |
| Large re-renders on period filter change | Dashboard | `useMemo` boundaries |
| AG Grid full re-mount on week change | allocation grid | Delta update |

### No Virtualization
- HTML portfolio tables render all rows (slice to 8 on display but still fetch all)
- Heatmap renders full employee × project matrix

---

## 4. Loading Strategy

| Current | Target |
|---------|--------|
| Full app block until auth | Auth shell + skeleton |
| Spinner per page | Layout skeletons |
| No Suspense | Route-level Suspense boundaries |
| No prefetch | Prefetch on nav hover |

---

## 5. Caching

| Layer | Status |
|-------|--------|
| HTTP cache headers | nginx static — OK for prod |
| SWR client cache | Partial — not all hooks use SWR |
| Report cache | `report-cache.ts` exists |
| localStorage drafts | Not implemented |

---

## 6. Target Metrics

| Metric | Current (est.) | Target |
|--------|----------------|--------|
| Initial JS (gzip) | 677 KB | &lt; 250 KB |
| LCP | ~3–4s | &lt; 2.5s |
| TTI | ~4–5s | &lt; 3.5s |
| Route transition | Instant (no split) | &lt; 200ms with chunk load |

---

## 7. Implementation Checklist

- [ ] Lazy routes in `App.tsx`
- [ ] Vite `manualChunks`
- [ ] Dynamic AG Grid import
- [ ] Route Suspense fallbacks with `PageSkeleton`
- [ ] Consolidate dashboard API calls
- [ ] Lighthouse CI in GitHub Actions

---

*Generated: July 2026*
