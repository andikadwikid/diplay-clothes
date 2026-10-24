# Diplay Clothes — interactive clothing rack

A row of garments hangs from a steel rail. Hover, focus or tap a piece and it turns from its
side-on resting pose to a wide front view while the rest of the rack slides aside.

The storefront is built with Vite + React + TypeScript and plain CSS (no runtime dependencies beyond
React). Products are managed in an **admin panel** backed by a Go (Gin) API, PostgreSQL and MinIO —
see [Admin panel & backend](#admin-panel--backend-go--gin-postgresql-minio) below.

```bash
npm install
npm run dev          # http://localhost:5173 (proxies /api and /media to the backend on :8080)
npm run build        # typecheck + production build
npm run placeholders # regenerate the placeholder artwork (see below)
```

Without the backend running, the storefront falls back to the bundled demo products
(`src/data/products.ts`), so the rack can still be developed on its own.

## Admin panel & backend (Go + Gin, PostgreSQL, MinIO)

*(Bagian ini berbahasa Indonesia, sesuai bahasa panel admin.)*

### Menjalankan dengan Docker

```bash
docker compose up --build
```

| Alamat | Isi |
| --- | --- |
| http://localhost:3000 | Toko (rak pakaian), data diambil dari API |
| http://localhost:3000/admin | **Panel admin** — login `admin` / `admin12345` (bawaan) |
| http://localhost:9001 | Konsol web MinIO — `minioadmin` / `minioadmin123` (opsional) |
| http://127.0.0.1:8080 | API langsung (untuk curl/Postman dengan Bearer token) |

> **Build pertama lama.** MinIO tidak lagi menyediakan image siap pakai (Docker Hub, quay.io, dan
> ghcr.io sudah tidak punya image `minio/minio`), jadi `deploy/minio/Dockerfile` **mengompilasi MinIO
> dari source** pada versi yang dikunci. Di mesin saya itu sekitar 2–3 menit (bisa lebih lama di mesin
> yang lebih lambat, dan kompilasi Go cukup berat jadi beri Docker memori yang lega), tapi hanya sekali;
> build berikutnya memakai cache. Butuh koneksi internet saat build.

Perintah berguna:

```bash
docker compose logs -f backend     # log API
docker compose down                # hentikan (data tetap ada di volume)
docker compose down -v             # hentikan DAN hapus semua data (database + gambar)
cp .env.example .env               # ubah password/secret/port (semua opsional)
```

### Memakai panel admin

1. Buka `/admin` dan masuk.
2. **+ Produk baru** → isi nama, deskripsi singkat, link produk (opsional), dan tag gantung (opsional).
3. Unggah **dua gambar**: *tampak samping (menggantung)* dan *tampak depan (saat hover)*. Tarik-lepas atau klik.
   Peringatan muncul bila rasio bukan 4:5, resolusi kecil, atau formatnya JPEG (tidak transparan).
4. **Pratinjau di rak** di sisi kanan memakai komponen rak yang sama dengan toko; arahkan kursor untuk
   melihat tampak depan.
5. Centang **Terbitkan di toko** (hanya bisa bila kedua gambar ada) lalu **Simpan**.
6. Di daftar produk: ubah urutan (↑ ↓, sama dengan urutan di rak), **Sembunyikan/Terbitkan**, **Edit**, **Hapus**.
   Menghapus produk juga menghapus kedua filenya dari MinIO.

Gambar: PNG, WebP, JPEG, atau SVG, maksimal **5 MB** (`MAX_UPLOAD_MB`), 100–8000 px per sisi. Format dikenali dari
isi file, bukan dari nama/ekstensi. Untuk hasil terbaik ikuti aturan di bagian [Product image assets](#product-image-assets)
(kanvas 4:5 transparan, garmen di tengah). SVG yang berisi skrip ditolak. File bawaan di
`public/images/products/*.svg` bisa langsung diunggah untuk mencoba.

### Arsitektur

```
Browser ──► nginx :3000 ──┬─ /            file statis (toko + admin, React)
                          ├─ /api/*  ──►  Go/Gin :8080 ──► PostgreSQL   (produk, admin)
                          └─ /media/* ──► Go/Gin :8080 ──► MinIO bucket  (gambar, PRIVAT)
```

- Semua lewat **satu origin**, jadi cookie login berfungsi tanpa CORS.
- Bucket MinIO **privat**; gambar hanya keluar lewat `/media/*` di backend, yang memasang header
  `Content-Security-Policy: sandbox`, `X-Content-Type-Options: nosniff`, ETag, dukungan Range, dan cache
  `immutable` (nama file unik di setiap unggahan).
- Kunci objek dibuat server (`products/<id>/<pose>-<acak>.<ext>`), tidak pernah dari nama file pengguna.
- Halaman admin adalah chunk terpisah, sehingga pengunjung toko tidak mengunduhnya.

### Autentikasi (JWT)

- `POST /api/auth/login` memverifikasi password (**bcrypt**, tabel `admin_users`) dan mengembalikan **JWT HS256**
  (klaim `iss`, `sub`, `iat`, `nbf`, `exp`, `jti`; masa berlaku `JWT_TTL`, bawaan 12 jam).
- Token dikirim **dua cara**: cookie `admin_token` (**HttpOnly**, `SameSite=Lax`, `Secure` bila `COOKIE_SECURE=true`) yang dipakai
  panel admin — jadi token tidak pernah bisa dibaca JavaScript — dan di body respons untuk klien API:

  ```bash
  TOKEN=$(curl -s localhost:8080/api/auth/login -H 'content-type: application/json' \
    -d '{"username":"admin","password":"admin12345"}' | jq -r .token)
  curl -s localhost:8080/api/admin/products -H "Authorization: Bearer $TOKEN"
  ```
- Verifikasi hanya menerima **HS256** (algoritma `none`/lainnya ditolak), mewajibkan `exp`, dan memeriksa `iss`.
- Perlindungan lain: pembatas login 10 percobaan/menit/IP (HTTP 429), perbandingan bcrypt tetap dijalankan untuk
  username yang tidak ada, penolakan request lintas-situs (`Sec-Fetch-Site`) untuk perubahan data berbasis cookie.
- **Logout** menghapus cookie. JWT bersifat stateless, jadi token yang sudah disalin tetap sah sampai kedaluwarsa;
  mengganti `JWT_SECRET` membatalkan semua token sekaligus.
- Akun admin disinkronkan dari `ADMIN_USERNAME`/`ADMIN_PASSWORD` setiap backend start (env = sumber kebenaran).
  Mengubah password di `.env` lalu `docker compose up -d` sudah cukup.

### API

| Method & path | Auth | Fungsi |
| --- | --- | --- |
| `GET /api/products` | – | Produk terbit, bentuknya sama dengan `RackProduct` di rak |
| `GET /media/products/…` | – | Mengalirkan gambar dari MinIO |
| `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | – / – / ✔ | Sesi |
| `GET/POST /api/admin/products` | ✔ | Daftar semua produk / buat produk (draf) |
| `GET/PUT/DELETE /api/admin/products/:id` | ✔ | Baca / ubah / hapus (beserta file) |
| `PUT /api/admin/products/:id/images/:view` | ✔ | Unggah gambar (`multipart`, field `file`); `view` = `hanging` \| `front` |
| `DELETE /api/admin/products/:id/images/:view` | ✔ | Hapus satu gambar (produk otomatis jadi draf) |
| `POST /api/admin/products/reorder` | ✔ | Body `{"ids":[…]}` — urutan baru (harus memuat semua id) |
| `GET /healthz`, `GET /readyz` | – | Liveness / readiness (cek Postgres + MinIO) |

Error selalu berbentuk `{"error":{"code","message","fields"?}}`; validasi mengembalikan 422 dengan kode per kolom.

### Konfigurasi (environment backend)

| Variabel | Bawaan | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | – (wajib) | `postgres://user:pass@host:5432/db?sslmode=disable` (karakter khusus di password harus di-URL-encode) |
| `JWT_SECRET` | – (wajib) | ≥ 32 karakter. Buat dengan `openssl rand -hex 32` |
| `JWT_TTL` | `12h` | Masa berlaku token |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `admin` / – (wajib, ≥ 8) | Akun admin |
| `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | – (wajib) | Endpoint S3 (`host:port`) dan kunci |
| `MINIO_BUCKET` / `MINIO_USE_SSL` | `diplay-media` / `false` | Bucket dibuat otomatis bila belum ada |
| `MAX_UPLOAD_MB` | `5` | Batas ukuran satu gambar (1–50) |
| `COOKIE_SECURE` | `false` | Set `true` bila disajikan lewat HTTPS |
| `TRUSTED_PROXIES` | kosong | CIDR proxy tepercaya untuk `X-Forwarded-For` (compose mengisinya dengan jaringan privat Docker) |
| `MEDIA_BASE_URL` | `/media` | Prefix URL gambar |
| `PORT` | `8080` | |

Backend menolak start jika konfigurasi wajib kosong/terlalu pendek, dan mencatat peringatan bila masih memakai
secret/password contoh dari `.env.example`.

### Pengembangan tanpa Docker penuh

```bash
# 1. Postgres + MinIO saja, dengan port dibuka ke localhost
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres minio

# 2. Backend (Go ≥ 1.26)
cd backend
export DATABASE_URL='postgres://diplay:diplay_dev_password@127.0.0.1:5432/diplay?sslmode=disable' \
       JWT_SECRET='dev-only-secret-change-me-before-deploying-0123456789' \
       ADMIN_PASSWORD=admin12345 \
       MINIO_ENDPOINT=127.0.0.1:9000 MINIO_ACCESS_KEY=minioadmin MINIO_SECRET_KEY=minioadmin123
go run ./cmd/server

# 3. Frontend (terminal lain) — Vite meneruskan /api dan /media ke :8080
npm run dev            # lalu buka http://localhost:5173/admin
```

Tes backend (butuh PostgreSQL; tanpa `TEST_DATABASE_URL` tes API dilewati):

```bash
cd backend
TEST_DATABASE_URL='postgres://diplay:diplay_dev_password@127.0.0.1:5432/postgres?sslmode=disable' go test ./... -p 1
```
> Tes mengosongkan tabel `products` pada database tersebut, jadi arahkan ke database tes, bukan data Anda.

### Sebelum dipakai di luar komputer sendiri

- Ganti **semua** nilai contoh: `ADMIN_PASSWORD`, `JWT_SECRET`, password Postgres, dan kunci MinIO. Untuk MinIO,
  buat access key khusus aplikasi alih-alih memakai root user (compose memakai root demi kemudahan lokal).
- Sajikan lewat **HTTPS** (mis. reverse proxy/CDN di depan nginx) dan set `COOKIE_SECURE=true`.
- Jangan publikasikan port Postgres/MinIO ke internet; cadangkan volume `pgdata` dan `miniodata`.
- Keterbatasan yang disengaja: satu akun admin dari env, tanpa refresh token/pencabutan token per-sesi, tanpa
  pengubahan ukuran/konversi gambar di server (unggah file yang sudah siap), tanpa riwayat perubahan.
- MinIO berlisensi AGPLv3; periksa implikasinya bila Anda mendistribusikannya.

## Files

| Path | Purpose |
| --- | --- |
| `src/components/InteractiveClothingRack/InteractiveClothingRack.tsx` | The reusable component (state, input handling, markup) |
| `src/components/InteractiveClothingRack/InteractiveClothingRack.css` | Rail, hangers, tags, transitions, responsive rules |
| `src/components/InteractiveClothingRack/Hanger.tsx` | SVG wire hook + wooden neck |
| `src/components/InteractiveClothingRack/types.ts` | `RackProduct`, `ProductImage`, `ProductBadge`, props |
| `src/data/products.ts` | Product data, kept separate from rendering |
| `src/App.tsx`, `src/index.css`, `src/hooks/useStorefrontProducts.ts` | Storefront page; loads published products from the API (demo-data fallback) |
| `src/admin/*` | Admin panel (login, product list, product form with image upload, live rack preview) |
| `src/api/client.ts` | Same-origin fetch wrapper |
| `backend/` | Go + Gin API (config, PostgreSQL store, MinIO storage, JWT auth, handlers, tests) |
| `docker-compose.yml`, `Dockerfile`, `deploy/` | Local stack: nginx + app, backend, PostgreSQL, MinIO (built from source) |
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
  ring); Tab / Shift+Tab move through the rack; **← → Home End** move along the rail and scroll the focused piece into
  view; Enter follows the link.
- **Touch:** there is no hover, so the first tap on a piece activates it (and scrolls it to the centre); a second
  tap follows its link. Previous/next buttons (44 px) appear on touch devices and narrow screens.
- **Many products — drag / swipe.** Pieces keep their size (up to seven are sized to fit; set `--fit-count` on
  `.rack__scroller` to change that) and the rail scrolls sideways inside itself, never the page:
  - **Mouse / pen:** click-and-drag the rail (grab / grabbing cursor). It follows the pointer 1:1 and **glides** on
    release, stopping exactly at the ends (no overscroll). Pressing on a gliding rail catches it. A press only becomes
    a drag after 5 px, so clicks and links work normally, and the click that ends a drag never follows a link.
  - **Touch:** swiping uses the browser's native scrolling, which already has the right momentum on real devices.
  - **Trackpad / horizontal wheel** work natively; a plain vertical wheel still scrolls the page.
  - While the rail is moving every piece rests in its hanging pose; once it stops, the piece under the pointer
    turns round (as in the reference).
  - A short **position line** under the rail (dark thumb sliding on a light track) shows where you are. It and the grab
    cursor appear only when the rail actually overflows; with few products nothing changes.
  - No native scrollbar is shown (the drag, swipe, keys and wheel replace it).
- **Responsive:** the rack is sized from its container (pieces never drop below a minimum size). On phones the pieces
  are larger and the first and last can still be centred.
- **Reduced motion:** with `prefers-reduced-motion: reduce` the slide/scale transitions are removed, the
  cross-fade is shortened to 150 ms, the drag glide is turned off (the rail stops where you let go) and programmatic
  scrolling is no longer smooth.

## Relationship to the reference video

Matched from the supplied screen recording: side-on resting pose → wide front view on hover, thin steel rail running
edge to edge, wire hook + wooden neck, hang-tags, the rest of the rack making room, an idle description that swaps to the
product name on hover, the pill call-to-action, light studio backdrop, small tracked uppercase labels.

A second recording showed the rail being dragged: the row follows the pointer with a grab cursor, pieces rest while
it moves and the one under the pointer turns round when it stops, and a short line under the rack tracks the position.
That is implemented as described above.

**Not** reproduced: the reference's real garment photography (placeholders are used), the product quick-view it opens on
click (Front / Back toggle, sizes, add to cart) and the cart drawer, its exact typeface, and exact timings — durations
are estimated from frames sampled at 2–8 fps, so treat them as approximate. The ghosting of pieces mid-drag in that
recording looks like screen-capture blur, so no motion trail was added. This is not a pixel-accurate copy.

## Known limitations

- Artwork is placeholder vector drawings until real transparent product images are supplied.
- Images must share the 4:5 canvas convention above; the layout does not adapt to arbitrary ratios.
- Container-query units (`cqw`) and `svh` are used for sizing — current evergreen browsers only.
- Product links in the demo data are hash links (`#/products/<id>`) that go nowhere; point `href` at real routes.
- The demo page's header and CTA are minimal stand-ins, not a full site.
