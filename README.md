# Diplay Clothes — interactive clothing rack

A row of garments hangs from a steel rail. Hover, focus or tap a piece and it turns from its
side-on resting pose to a wide front view while the rest of the rack slides aside.

Built with Vite + React + TypeScript and plain CSS. There are no runtime dependencies beyond React.

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + production build
npm run placeholders # regenerate the placeholder artwork (see below)
```

## Files

| Path | Purpose |
| --- | --- |
| `src/components/InteractiveClothingRack/InteractiveClothingRack.tsx` | The reusable component (state, input handling, markup) |
| `src/components/InteractiveClothingRack/InteractiveClothingRack.css` | Rail, hangers, tags, transitions, responsive rules |
| `src/components/InteractiveClothingRack/Hanger.tsx` | SVG wire hook + wooden neck |
| `src/components/InteractiveClothingRack/types.ts` | `RackProduct`, `ProductImage`, `ProductBadge`, props |
| `src/data/products.ts` | Product data, kept separate from rendering |
| `src/App.tsx`, `src/index.css` | Demo page around the rack |
| `public/images/products/*.svg` | **Placeholder** artwork (14 files) |
| `scripts/generate-placeholders.mjs` | Generates that placeholder artwork |

## Using the component

```tsx
import { InteractiveClothingRack } from './components/InteractiveClothingRack';
import { products } from './data/products';

<InteractiveClothingRack
  products={products}
  label="New collection"                       // accessible name
  idleCaption="Crafted in heavyweight fleece." // shown while nothing is active
>
  <a href="/collection">Shop the Collection</a>  {/* optional, rendered under the caption */}
</InteractiveClothingRack>
```

A product is a plain object:

```ts
{
  id: 'forest-green-hoodie',                      // stable + unique (React key)
  name: 'Forest Green Hoodie',
  meta: 'Oversized fit · Bottle green',           // optional, shown under the name
  hangingImage: { src: '/images/products/forest-green-hoodie-hanging.webp' },
  frontImage:   { src: '/images/products/forest-green-hoodie-front.webp' },
  href: '/products/forest-green-hoodie',          // optional → renders a link, else a button
  badge: { label: 'Only 3 left', tone: 'dark' },  // optional hang-tag; tone: 'dark' | 'light'
  alt: { hanging: '…', front: '…' },              // optional; sensible defaults are generated
}
```

`ProductImage` also accepts `srcSet` / `sizes` for responsive WebP/AVIF.

### Add another clothing item

1. Drop two images in `public/images/products/` (spec below).
2. Add one object to the array in `src/data/products.ts` (or one `piece(...)` call there).

That's it — spacing, sizing, the rail length and the number of slots are all derived from
`products.length`.

## Product image assets

Every product needs **two images on an identical canvas**:

| File | Pose | Content |
| --- | --- | --- |
| `<slug>-hanging.webp` | Resting pose on the rail | The garment seen side-on (narrow). Shown while idle. |
| `<slug>-front.webp` | Hover / focus / tap pose | The garment seen from the front (wide). |

Rules, so every piece lines up with its hanger and with the rest of the collection:

- **Canvas 4:5 portrait, transparent background** — e.g. 1200 × 1500, or 800 × 1000 for a lighter file.
  The component sizes everything from this ratio. A different ratio will be letter-boxed.
- **Garment centred horizontally** on the canvas, in both images (the hook sits on the centre line).
- **Collar / top of the garment about 7 % from the top** of the canvas (y ≈ 70 of 1000) in both images.
  The hanger's wooden neck is drawn behind the garment and ends there.
- **Same scale in both images and across products** — shoot/crop every product with the same framing, so a long
  hoodie hangs lower than a tee (hoodies end near 90 % of the canvas, a tee near 75 %).
- Leave the hanger out of the photo (the hook and neck are drawn by the component). Arms hidden inside
  the garment are fine.
- Prefer **WebP or AVIF**, ~80–120 KB each at 1200 px wide. Supply a `srcSet` for retina/mobile if wanted.

> The 14 SVGs currently in `public/images/products/` are **generated placeholders**, not photography.
> They follow the rules above, so replacing a file (and its path in `products.ts`) is all that's needed.
> If you replace everything, `scripts/generate-placeholders.mjs` can be deleted along with the `placeholders` script.

## How the rail and hangers work

Everything is CSS + one inline SVG — no image is needed for the hardware.

- **Units.** All geometry is a multiple of `--u` (1/1000 of the artwork height). One variable
  (`--ph` on `.rack__scroller`) therefore scales the rail, hooks, tags and garments together.
- **Rail.** `.rack__rail` is a full-width rounded bar with a vertical steel gradient (bright top edge, darker
  belly, bounce light), a very faint brushed texture, a 1 px specular line (`::before`), a soft contact shadow and a
  wall shadow (`::after`). It sits outside the product slots, so it can never move when a product animates.
- **Hanger.** `Hanger.tsx` draws a thin wire hook that curls over the rail and ends at its top edge (so it reads as
  wrapping round the tube) plus a small wooden neck. It lives inside the same `.rack__piece` as the garment, so
  hook, neck, tag and garment always move and scale as one object.
- **Anchoring.** A piece scales from `transform-origin: 50% 0` — the rail centre line — so on hover the hook stays
  exactly where it hangs and only the garment grows.
- **Tags.** `badge` renders a small hang-tag on the hook (string + slight tilt), like the "-20%" / "NEW" /
  "ONLY 3 LEFT" tags in the reference.

## Interaction model

- Each product owns a **fixed-width slot** (the hit area) that never moves or resizes; only the artwork inside it
  animates. This is what makes hover flicker-free: the hanger nearest the pointer always wins, and the
  pieces sliding apart can never pull a hit area out from under the cursor.
- **Active:** the front image cross-dissolves in (380 ms), the old pose lingers ~115 ms so the garment never looks
  see-through, the piece scales to 1.03 around the hook, and it is raised above its neighbours.
- **Neighbours** slide outward by `--push` (240 u) on a 480 ms ease-out — pieces on the left go left, on the right go
  right, as in the reference. They are not dimmed, because the reference doesn't dim them.
- **Leave** reverses everything with the same transitions.
- **Caption:** the idle text and every product name share one grid cell and cross-fade, so changing text never shifts layout.
- **Keyboard:** products are real `<a>`/`<button>` elements in a list. Focus activates a piece (with a visible focus
  ring); Tab / Shift+Tab move through the rack; Enter follows the link.
- **Touch:** there is no hover, so the first tap on a piece activates it (and scrolls it to the centre); a second
  tap follows its link. Previous/next buttons (44 px) appear on touch devices and narrow screens.
- **Responsive:** the rack is sized to fit its container. Once pieces would drop below their minimum size (about
  816 px wide for seven pieces) it becomes a horizontally scrollable rack that scrolls inside itself (never the
  page), with scroll-snap. On phones the pieces are larger and the first and last can still be centred.
- **Reduced motion:** with `prefers-reduced-motion: reduce` the slide/scale transitions are removed and the
  cross-fade is shortened to 150 ms; programmatic scrolling is no longer smooth.

## Relationship to the reference video

Matched from the supplied screen recording: side-on resting pose → wide front view on hover, thin steel rail running
edge to edge, wire hook + wooden neck, hang-tags, the rest of the rack making room, an idle description that swaps to the
product name on hover, the pill call-to-action, light studio backdrop, small tracked uppercase labels.

**Not** reproduced: the reference's real garment photography (placeholders are used), the product page it opens
(with a Front / Back toggle), its exact typeface, and exact timings — durations are estimated from frames sampled at
2 fps, so treat them as approximate. This is not a pixel-accurate copy.

## Known limitations

- Artwork is placeholder vector drawings until real transparent product images are supplied.
- Images must share the 4:5 canvas convention above; the layout does not adapt to arbitrary ratios.
- Container-query units (`cqw`) and `svh` are used for sizing — current evergreen browsers only.
- Product links in the demo data are hash links (`#/products/<id>`) that go nowhere; point `href` at real routes.
- The demo page's header and CTA are minimal stand-ins, not a full site.
