package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/andikadwikid/diplay-clothes/backend/internal/api"
	"github.com/andikadwikid/diplay-clothes/backend/internal/auth"
	"github.com/andikadwikid/diplay-clothes/backend/internal/config"
	"github.com/andikadwikid/diplay-clothes/backend/internal/storage"
	"github.com/andikadwikid/diplay-clothes/backend/internal/store"
)

const (
	adminUser = "admin"
	adminPass = "correct-horse-battery"
	maxUpload = 200 << 10 // small, so the "too large" case stays cheap
)

type env struct {
	t       *testing.T
	handler http.Handler
	mem     *storage.Memory
	db      *store.Store
}

// newEnv needs a real PostgreSQL: set TEST_DATABASE_URL, e.g.
// postgres://user:pass@127.0.0.1:5432/diplay_test?sslmode=disable
func newEnv(t *testing.T, loginLimit int) *env {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	gin.SetMode(gin.TestMode)
	gin.DefaultWriter = io.Discard

	ctx := context.Background()
	db, err := store.Open(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(db.Close)
	if err := db.Migrate(ctx); err != nil {
		t.Fatal(err)
	}
	// Start every test from an empty products table (test-only, never in the server).
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	if _, err := pool.Exec(ctx, `TRUNCATE products`); err != nil {
		t.Fatal(err)
	}
	hash, _ := auth.HashPassword(adminPass)
	if err := db.UpsertAdmin(ctx, adminUser, hash); err != nil {
		t.Fatal(err)
	}

	mem := storage.NewMemory()
	h, err := api.New(api.Deps{
		Cfg: config.Config{
			MediaBase: "/media", MaxUploadBytes: maxUpload, JWTTTL: time.Hour,
		},
		Store: db, Storage: mem,
		Issuer:  auth.NewIssuer("0123456789abcdef0123456789abcdef", time.Hour),
		Limiter: auth.NewLimiter(loginLimit, time.Minute),
	})
	if err != nil {
		t.Fatal(err)
	}
	return &env{t: t, handler: h, mem: mem, db: db}
}

type reqOpt func(*http.Request)

func withHeader(k, v string) reqOpt { return func(r *http.Request) { r.Header.Set(k, v) } }
func withCookie(c *http.Cookie) reqOpt {
	return func(r *http.Request) { r.AddCookie(c) }
}
func withBearer(tok string) reqOpt { return withHeader("Authorization", "Bearer "+tok) }

func (e *env) do(method, path string, body io.Reader, opts ...reqOpt) *httptest.ResponseRecorder {
	e.t.Helper()
	req := httptest.NewRequest(method, path, body)
	req.RemoteAddr = "192.0.2.1:1234"
	for _, o := range opts {
		o(req)
	}
	rec := httptest.NewRecorder()
	e.handler.ServeHTTP(rec, req)
	return rec
}

func (e *env) json(method, path string, v any, opts ...reqOpt) *httptest.ResponseRecorder {
	e.t.Helper()
	b, _ := json.Marshal(v)
	return e.do(method, path, bytes.NewReader(b), append(opts, withHeader("Content-Type", "application/json"))...)
}

func decode[T any](t *testing.T, rec *httptest.ResponseRecorder) T {
	t.Helper()
	var v T
	if err := json.Unmarshal(rec.Body.Bytes(), &v); err != nil {
		t.Fatalf("decode %q: %v", rec.Body.String(), err)
	}
	return v
}

type errBody struct {
	Error struct {
		Code   string            `json:"code"`
		Fields map[string]string `json:"fields"`
	} `json:"error"`
}

func (e *env) expect(rec *httptest.ResponseRecorder, status int, code string) {
	e.t.Helper()
	if rec.Code != status {
		e.t.Fatalf("status = %d, want %d; body: %s", rec.Code, status, rec.Body.String())
	}
	if code != "" {
		if got := decode[errBody](e.t, rec).Error.Code; got != code {
			e.t.Fatalf("error code = %q, want %q", got, code)
		}
	}
}

func (e *env) login() (token string, cookie *http.Cookie) {
	e.t.Helper()
	rec := e.json("POST", "/api/auth/login", map[string]string{"username": adminUser, "password": adminPass})
	e.expect(rec, 200, "")
	token = decode[struct{ Token string }](e.t, rec).Token
	for _, c := range rec.Result().Cookies() {
		if c.Name == "admin_token" {
			cookie = c
		}
	}
	if token == "" || cookie == nil {
		e.t.Fatal("login returned no token/cookie")
	}
	return token, cookie
}

type product struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Published  bool   `json:"published"`
	Position   int    `json:"position"`
	BadgeLabel string `json:"badgeLabel"`
	BadgeTone  string `json:"badgeTone"`
	Images     struct {
		Hanging *image_ `json:"hanging"`
		Front   *image_ `json:"front"`
	} `json:"images"`
}

type image_ struct {
	URL         string   `json:"url"`
	ContentType string   `json:"contentType"`
	Width       int      `json:"width"`
	Height      int      `json:"height"`
	Warnings    []string `json:"warnings"`
}

func (e *env) createProduct(name string, auth reqOpt) product {
	e.t.Helper()
	rec := e.json("POST", "/api/admin/products", map[string]any{"name": name}, auth)
	e.expect(rec, 201, "")
	return decode[product](e.t, rec)
}

func png_(t testing.TB, w, h int) []byte {
	t.Helper()
	var buf bytes.Buffer
	if err := png.Encode(&buf, image.NewNRGBA(image.Rect(0, 0, w, h))); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func upload(e *env, id, view, filename, contentType string, data []byte, auth reqOpt) *httptest.ResponseRecorder {
	e.t.Helper()
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	hdr := textproto.MIMEHeader{}
	hdr.Set("Content-Disposition", `form-data; name="file"; filename="`+filename+`"`)
	hdr.Set("Content-Type", contentType) // deliberately untrusted by the server
	part, _ := mw.CreatePart(hdr)
	part.Write(data)
	mw.Close()
	return e.do("PUT", "/api/admin/products/"+id+"/images/"+view, &body,
		withHeader("Content-Type", mw.FormDataContentType()), auth)
}

// --- tests --------------------------------------------------------------------

func TestAuthFlow(t *testing.T) {
	e := newEnv(t, 100)

	e.expect(e.do("GET", "/api/admin/products", nil), 401, "unauthorized")
	e.expect(e.do("GET", "/api/auth/me", nil), 401, "unauthorized")

	e.expect(e.json("POST", "/api/auth/login", map[string]string{"username": adminUser, "password": "nope"}), 401, "invalid_credentials")
	e.expect(e.json("POST", "/api/auth/login", map[string]string{"username": "ghost", "password": adminPass}), 401, "invalid_credentials")
	e.expect(e.do("POST", "/api/auth/login", strings.NewReader("not json"), withHeader("Content-Type", "application/json")), 400, "bad_request")

	token, cookie := e.login()
	if !cookie.HttpOnly || cookie.SameSite != http.SameSiteLaxMode || cookie.Path != "/" || cookie.MaxAge <= 0 {
		t.Fatalf("cookie hardening missing: %+v", cookie)
	}
	if cookie.Value != token {
		t.Fatal("cookie should carry the same JWT as the body")
	}

	for name, opt := range map[string]reqOpt{"cookie": withCookie(cookie), "bearer": withBearer(token)} {
		rec := e.do("GET", "/api/auth/me", nil, opt)
		e.expect(rec, 200, "")
		if got := decode[struct{ Username string }](t, rec).Username; got != adminUser {
			t.Fatalf("%s: me = %q", name, got)
		}
	}

	e.expect(e.do("GET", "/api/admin/products", nil, withBearer(token+"x")), 401, "unauthorized")
	e.expect(e.do("GET", "/api/admin/products", nil, withHeader("Authorization", "Basic abc")), 401, "unauthorized")

	out := e.do("POST", "/api/auth/logout", nil)
	e.expect(out, 204, "")
	var cleared bool
	for _, c := range out.Result().Cookies() {
		cleared = cleared || (c.Name == "admin_token" && c.MaxAge < 0)
	}
	if !cleared {
		t.Fatal("logout must clear the cookie")
	}
}

func TestLoginRateLimit(t *testing.T) {
	e := newEnv(t, 3)
	bad := map[string]string{"username": adminUser, "password": "wrong"}
	for i := 0; i < 3; i++ {
		e.expect(e.json("POST", "/api/auth/login", bad), 401, "invalid_credentials")
	}
	rec := e.json("POST", "/api/auth/login", map[string]string{"username": adminUser, "password": adminPass})
	e.expect(rec, 429, "rate_limited")
	if rec.Header().Get("Retry-After") == "" {
		t.Fatal("missing Retry-After")
	}
}

func TestProductLifecycle(t *testing.T) {
	e := newEnv(t, 100)
	_, cookie := e.login()
	auth := withCookie(cookie)

	p := e.createProduct("Forest Green Hoodie", auth)
	if p.Published || p.Images.Hanging != nil {
		t.Fatalf("new product should be an empty draft: %+v", p)
	}

	// Cannot publish without both images.
	rec := e.json("PUT", "/api/admin/products/"+p.ID, map[string]any{"name": p.Name, "published": true}, auth)
	e.expect(rec, 422, "validation")
	if got := decode[errBody](t, rec).Error.Fields["published"]; got != "images_required" {
		t.Fatalf("fields = %v", got)
	}

	// Upload both poses. The client-supplied Content-Type is a lie; the server must ignore it.
	rec = upload(e, p.ID, "hanging", "side.png", "text/html", png_(t, 800, 1000), auth)
	e.expect(rec, 200, "")
	hanging := decode[product](t, rec).Images.Hanging
	if hanging == nil || hanging.ContentType != "image/png" || hanging.Width != 800 || hanging.Height != 1000 ||
		!strings.HasPrefix(hanging.URL, "/media/products/"+p.ID+"/hanging-") || !strings.HasSuffix(hanging.URL, ".png") {
		t.Fatalf("bad hanging image: %+v", hanging)
	}
	if len(hanging.Warnings) != 0 {
		t.Fatalf("an 800x1000 PNG should have no warnings: %v", hanging.Warnings)
	}
	e.expect(upload(e, p.ID, "front", "front.png", "image/png", png_(t, 800, 1000), auth), 200, "")
	if n := len(e.mem.Keys()); n != 2 {
		t.Fatalf("expected 2 stored objects, got %d", n)
	}

	// Publish with the extra fields.
	rec = e.json("PUT", "/api/admin/products/"+p.ID, map[string]any{
		"name": "  Forest Green Hoodie ", "meta": "Oversized fit", "href": "/products/forest-green",
		"badgeLabel": "Only 3 left", "badgeTone": "light", "published": true,
	}, auth)
	e.expect(rec, 200, "")
	got := decode[product](t, rec)
	if !got.Published || got.Name != "Forest Green Hoodie" || got.BadgeTone != "light" {
		t.Fatalf("update not applied/trimmed: %+v", got)
	}

	// Storefront payload matches the rack's RackProduct shape, with no auth.
	rec = e.do("GET", "/api/products", nil)
	e.expect(rec, 200, "")
	pub := decode[struct {
		Products []struct {
			ID           string `json:"id"`
			Name         string `json:"name"`
			Meta         string `json:"meta"`
			Href         string `json:"href"`
			Badge        *struct{ Label, Tone string }
			HangingImage struct{ Src string } `json:"hangingImage"`
			FrontImage   struct{ Src string } `json:"frontImage"`
		}
	}](t, rec)
	if len(pub.Products) != 1 {
		t.Fatalf("public list = %d products", len(pub.Products))
	}
	pp := pub.Products[0]
	if pp.ID != p.ID || pp.Href != "/products/forest-green" || pp.Badge == nil || pp.Badge.Label != "Only 3 left" ||
		pp.Badge.Tone != "light" || pp.HangingImage.Src != hanging.URL || !strings.HasPrefix(pp.FrontImage.Src, "/media/products/") {
		t.Fatalf("public product wrong: %+v", pp)
	}

	// Media is streamed with hardening headers and honours conditional requests.
	media := e.do("GET", hanging.URL, nil)
	e.expect(media, 200, "")
	h := media.Header()
	if h.Get("Content-Type") != "image/png" || h.Get("X-Content-Type-Options") != "nosniff" ||
		!strings.Contains(h.Get("Content-Security-Policy"), "sandbox") ||
		!strings.Contains(h.Get("Cache-Control"), "immutable") || media.Body.Len() == 0 {
		t.Fatalf("media response wrong: %v", h)
	}
	e.expect(e.do("GET", hanging.URL, nil, withHeader("If-None-Match", h.Get("ETag"))), 304, "")
	e.expect(e.do("GET", "/media/products/"+p.ID+"/missing.png", nil), 404, "not_found")

	// Replacing a pose swaps the object and deletes the old one.
	before := e.mem.Keys()
	rec = upload(e, p.ID, "hanging", "side2.png", "image/png", png_(t, 800, 1000), auth)
	e.expect(rec, 200, "")
	newHanging := decode[product](t, rec).Images.Hanging
	if newHanging.URL == hanging.URL || len(e.mem.Keys()) != len(before) {
		t.Fatalf("replace should swap objects: before=%v after=%v", before, e.mem.Keys())
	}
	e.expect(e.do("GET", hanging.URL, nil), 404, "not_found")

	// Removing a pose unpublishes the product.
	rec = e.do("DELETE", "/api/admin/products/"+p.ID+"/images/front", nil, auth)
	e.expect(rec, 200, "")
	if got := decode[product](t, rec); got.Published || got.Images.Front != nil {
		t.Fatalf("removing an image must unpublish: %+v", got)
	}
	if n := len(decode[struct{ Products []any }](t, e.do("GET", "/api/products", nil)).Products); n != 0 {
		t.Fatalf("storefront should be empty, has %d", n)
	}

	// Deleting the product cleans up its files.
	e.expect(e.do("DELETE", "/api/admin/products/"+p.ID, nil, auth), 204, "")
	if keys := e.mem.Keys(); len(keys) != 0 {
		t.Fatalf("objects left behind: %v", keys)
	}
	e.expect(e.do("GET", "/api/admin/products/"+p.ID, nil, auth), 404, "not_found")
}

func TestPublicListOnlyShowsPublished(t *testing.T) {
	e := newEnv(t, 100)
	_, cookie := e.login()
	auth := withCookie(cookie)

	draft := e.createProduct("Draft", auth)
	_ = draft
	live := e.createProduct("Live", auth)
	e.expect(upload(e, live.ID, "hanging", "a.png", "image/png", png_(t, 800, 1000), auth), 200, "")
	e.expect(upload(e, live.ID, "front", "b.png", "image/png", png_(t, 800, 1000), auth), 200, "")
	e.expect(e.json("PUT", "/api/admin/products/"+live.ID, map[string]any{"name": "Live", "published": true}, auth), 200, "")

	pub := decode[struct{ Products []struct{ Name string } }](t, e.do("GET", "/api/products", nil))
	if len(pub.Products) != 1 || pub.Products[0].Name != "Live" {
		t.Fatalf("public list = %+v", pub.Products)
	}
	all := decode[struct{ Products []product }](t, e.do("GET", "/api/admin/products", nil, auth))
	if len(all.Products) != 2 {
		t.Fatalf("admin list = %d", len(all.Products))
	}
}

func TestValidation(t *testing.T) {
	e := newEnv(t, 100)
	_, cookie := e.login()
	auth := withCookie(cookie)

	cases := []struct {
		name  string
		input map[string]any
		field string
		code  string
	}{
		{"missing name", map[string]any{"name": "  "}, "name", "required"},
		{"name too long", map[string]any{"name": strings.Repeat("a", 121)}, "name", "too_long"},
		{"meta too long", map[string]any{"name": "x", "meta": strings.Repeat("a", 201)}, "meta", "too_long"},
		{"javascript href", map[string]any{"name": "x", "href": "javascript:alert(1)"}, "href", "invalid_url"},
		{"data href", map[string]any{"name": "x", "href": "data:text/html,hi"}, "href", "invalid_url"},
		{"protocol-relative href", map[string]any{"name": "x", "href": "//evil.example/x"}, "href", "invalid_url"},
		{"href with space", map[string]any{"name": "x", "href": "/a b"}, "href", "invalid_url"},
		{"badge too long", map[string]any{"name": "x", "badgeLabel": strings.Repeat("a", 25)}, "badgeLabel", "too_long"},
		{"bad tone", map[string]any{"name": "x", "badgeTone": "neon"}, "badgeTone", "invalid_tone"},
		{"publish a draft", map[string]any{"name": "x", "published": true}, "published", "images_required"},
	}
	for _, tc := range cases {
		rec := e.json("POST", "/api/admin/products", tc.input, auth)
		e.expect(rec, 422, "validation")
		if got := decode[errBody](t, rec).Error.Fields[tc.field]; got != tc.code {
			t.Errorf("%s: field %s = %q, want %q", tc.name, tc.field, got, tc.code)
		}
	}
	for _, href := range []string{"", "https://example.com/p?q=1", "http://example.com", "/products/x", "#/products/x"} {
		e.expect(e.json("POST", "/api/admin/products", map[string]any{"name": "ok", "href": href}, auth), 201, "")
	}
}

func TestUploadRejections(t *testing.T) {
	e := newEnv(t, 100)
	_, cookie := e.login()
	auth := withCookie(cookie)
	p := e.createProduct("P", auth)

	var jpegBuf bytes.Buffer
	jpeg.Encode(&jpegBuf, image.NewRGBA(image.Rect(0, 0, 400, 500)), nil)

	cases := []struct {
		name   string
		view   string
		data   []byte
		status int
		code   string
	}{
		{"text file", "front", []byte("just some text"), 415, "unsupported_type"},
		{"html named png", "front", []byte("<html><script>alert(1)</script></html>"), 415, "unsupported_type"},
		{"svg with script", "front", []byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`), 422, "unsafe_svg"},
		{"tiny image", "front", png_(t, 50, 50), 422, "bad_dimensions"},
		{"truncated image", "front", png_(t, 800, 1000)[:20], 422, "corrupt_image"},
		{"too large", "front", bytes.Repeat([]byte{0x89}, maxUpload+10), 413, "file_too_large"},
		{"bad view", "side", png_(t, 800, 1000), 404, "not_found"},
	}
	for _, tc := range cases {
		e.expect(upload(e, p.ID, tc.view, "x.png", "image/png", tc.data, auth), tc.status, tc.code)
	}
	if n := len(e.mem.Keys()); n != 0 {
		t.Fatalf("rejected uploads must not be stored, found %v", e.mem.Keys())
	}

	e.expect(upload(e, "nope", "front", "x.png", "image/png", png_(t, 800, 1000), auth), 404, "not_found")
	if n := len(e.mem.Keys()); n != 0 {
		t.Fatalf("upload to a missing product left an orphan: %v", e.mem.Keys())
	}

	// No file field, and no credentials.
	e.expect(e.json("PUT", "/api/admin/products/"+p.ID+"/images/front", map[string]string{}, auth), 400, "bad_request")
	e.expect(upload(e, p.ID, "front", "x.png", "image/png", png_(t, 800, 1000), func(*http.Request) {}), 401, "unauthorized")

	// Accepted but flagged: wrong ratio, JPEG (no transparency), small.
	rec := upload(e, p.ID, "front", "square.png", "image/png", png_(t, 500, 500), auth)
	e.expect(rec, 200, "")
	if w := decode[product](t, rec).Images.Front.Warnings; strings.Join(w, ",") != "ratio,small" {
		t.Fatalf("warnings = %v", w)
	}
	rec = upload(e, p.ID, "hanging", "photo.jpg", "image/jpeg", jpegBuf.Bytes(), auth)
	e.expect(rec, 200, "")
	if img := decode[product](t, rec).Images.Hanging; img.ContentType != "image/jpeg" || strings.Join(img.Warnings, ",") != "small,opaque" {
		t.Fatalf("jpeg image = %+v", img)
	}

	// SVG placeholders (the bundled artwork) are accepted and served safely.
	svg := []byte(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><rect width="800" height="1000"/></svg>`)
	rec = upload(e, p.ID, "front", "x.svg", "image/svg+xml", svg, auth)
	e.expect(rec, 200, "")
	img := decode[product](t, rec).Images.Front
	if img.ContentType != "image/svg+xml" || len(img.Warnings) != 0 {
		t.Fatalf("svg image = %+v", img)
	}
	media := e.do("GET", img.URL, nil)
	if media.Header().Get("Content-Type") != "image/svg+xml" || !strings.Contains(media.Header().Get("Content-Security-Policy"), "sandbox") {
		t.Fatalf("svg must be served sandboxed: %v", media.Header())
	}
}

func TestReorder(t *testing.T) {
	e := newEnv(t, 100)
	_, cookie := e.login()
	auth := withCookie(cookie)

	a, b, c := e.createProduct("A", auth), e.createProduct("B", auth), e.createProduct("C", auth)
	names := func() string {
		list := decode[struct{ Products []product }](t, e.do("GET", "/api/admin/products", nil, auth)).Products
		var out []string
		for _, p := range list {
			out = append(out, p.Name)
		}
		return strings.Join(out, "")
	}
	if names() != "ABC" {
		t.Fatalf("new products should append: %s", names())
	}

	rec := e.json("POST", "/api/admin/products/reorder", map[string]any{"ids": []string{c.ID, a.ID, b.ID}}, auth)
	e.expect(rec, 200, "")
	if names() != "CAB" {
		t.Fatalf("order = %s", names())
	}

	for name, ids := range map[string][]string{
		"missing id": {a.ID, b.ID},
		"unknown id": {a.ID, b.ID, "nope"},
		"duplicate":  {a.ID, a.ID, b.ID},
		"empty":      {},
	} {
		if rec := e.json("POST", "/api/admin/products/reorder", map[string]any{"ids": ids}, auth); rec.Code != 422 {
			t.Errorf("%s: status %d, want 422", name, rec.Code)
		}
	}
	if names() != "CAB" {
		t.Fatalf("failed reorders must not change the order: %s", names())
	}
}

func TestCrossSiteWritesAreBlocked(t *testing.T) {
	e := newEnv(t, 100)
	token, cookie := e.login()
	body := map[string]any{"name": "x"}

	// Cookie auth + a cross-site request: refused.
	e.expect(e.json("POST", "/api/admin/products", body, withCookie(cookie), withHeader("Sec-Fetch-Site", "cross-site")), 403, "cross_site")
	// Same-origin / non-browser clients are fine, and Bearer tokens are not CSRF-able.
	e.expect(e.json("POST", "/api/admin/products", body, withCookie(cookie), withHeader("Sec-Fetch-Site", "same-origin")), 201, "")
	e.expect(e.json("POST", "/api/admin/products", body, withBearer(token), withHeader("Sec-Fetch-Site", "cross-site")), 201, "")
	// Reads are never blocked.
	e.expect(e.do("GET", "/api/admin/products", nil, withCookie(cookie), withHeader("Sec-Fetch-Site", "cross-site")), 200, "")
}

func TestHealth(t *testing.T) {
	e := newEnv(t, 100)
	e.expect(e.do("GET", "/healthz", nil), 200, "")
	e.expect(e.do("GET", "/readyz", nil), 200, "")
	e.expect(e.do("GET", "/nope", nil), 404, "not_found")
}

func TestJSONBodyLimit(t *testing.T) {
	e := newEnv(t, 100)
	_, cookie := e.login()
	big := `{"name":"` + strings.Repeat("a", 2<<20) + `"}`
	rec := e.do("POST", "/api/admin/products", strings.NewReader(big), withHeader("Content-Type", "application/json"), withCookie(cookie))
	e.expect(rec, 400, "bad_request")
}
