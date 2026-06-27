
## Scope (4 tracks)

### 1. Audit & polish
- Gallery: tighten spacing, fix any contrast issues on hover-reveal panel, verify lightbox keyboard nav, ensure tilt disables on `prefers-reduced-motion`.
- Cart: improve empty state copy/illustration, add "Continue shopping" link, show artwork dimensions/medium in line item.
- Admin: fix any mobile layout mush on `/admin/*` tables, ensure AdminNav collapses cleanly under 640px.
- Burger menu: verify focus trap, add backdrop click-to-close, animate logo on open.

### 2. Gallery upgrade
- Masonry/asymmetric grid option (CSS columns) toggle vs. current uniform grid.
- Animated filter chips (layoutId pill).
- Lightbox: arrow-key + swipe navigation between artworks, pinch-zoom via `react-zoom-pan-pinch` (already considered).
- Scroll-linked reveal using Framer `useScroll` for collection headers.

### 3. Cart / checkout UX
- Mini-cart hover preview from header (desktop).
- Post-purchase share card on `/checkout/return` (copy link, share to FB/IG story).
- Better empty cart with featured "available now" suggestions pulled from catalog.
- "Save for later" wishlist in localStorage (no backend).

### 4. Admin strengthening
- **Drag-to-reorder** artworks on `/admin/artworks` using `@dnd-kit/sortable`; persist `display_order` int on `artworks_custom` + static catalog override table.
- **Bulk actions** on `/admin/inventory` and `/admin/artworks`: multi-select checkbox → mark sold/available/delete.
- **Inline image cropper** on artwork upload: `react-easy-crop` modal, outputs square or 4:5 crop before upload.
- **SEO fields** per artwork: `seo_title`, `seo_description`, `alt_text` columns; surface on public artworks page.

## Technical notes
- New deps: `@dnd-kit/core`, `@dnd-kit/sortable`, `react-easy-crop`, `react-zoom-pan-pinch`.
- Migration: add `display_order INT`, `seo_title TEXT`, `seo_description TEXT`, `alt_text TEXT` to `artworks_custom`; new table `artwork_display_order(artwork_id TEXT PK, position INT)` for static catalog ordering.
- Public `artworks.tsx` merges static + custom, sorts by display_order.
- All admin server fns in `admin-content.functions.ts` gated by `assertAdmin`.

## Execution order
1. Migration + deps install.
2. Admin: drag-reorder + bulk + cropper + SEO fields (biggest lift, unblocks public read).
3. Gallery upgrade (masonry, lightbox nav, pinch-zoom).
4. Cart/checkout polish (mini-cart, share card, wishlist, empty state).
5. General audit pass on mobile viewport.

## Out of scope
- No backend changes to orders/payments.
- No new languages or i18n entries beyond strings touched.
- Static catalog `ARTWORKS` stays hardcoded; only display order is editable.

Confirm and I'll start with the migration.
