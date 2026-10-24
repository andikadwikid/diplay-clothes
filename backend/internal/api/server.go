// Package api wires the HTTP routes, middleware and handlers.
package api

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/andikadwikid/diplay-clothes/backend/internal/auth"
	"github.com/andikadwikid/diplay-clothes/backend/internal/config"
	"github.com/andikadwikid/diplay-clothes/backend/internal/storage"
	"github.com/andikadwikid/diplay-clothes/backend/internal/store"
)

const (
	cookieName   = "admin_token"
	ctxUser      = "user"
	ctxViaCookie = "viaCookie"
	jsonBodyMax  = 1 << 20
)

type Deps struct {
	Cfg     config.Config
	Store   *store.Store
	Storage storage.Storage
	Issuer  *auth.Issuer
	Limiter *auth.Limiter
}

type Server struct {
	cfg     config.Config
	store   *store.Store
	storage storage.Storage
	issuer  *auth.Issuer
	limiter *auth.Limiter
}

// New builds the router. Pass gin.Recovery/Logger yourself via the returned
// engine if you need different middleware.
func New(d Deps) (*gin.Engine, error) {
	s := &Server{cfg: d.Cfg, store: d.Store, storage: d.Storage, issuer: d.Issuer, limiter: d.Limiter}

	r := gin.New()
	r.Use(gin.Recovery(), gin.Logger(), securityHeaders)
	// With no trusted proxies configured, ClientIP is the socket peer, so a
	// client cannot dodge the login limiter by forging X-Forwarded-For.
	if err := r.SetTrustedProxies(d.Cfg.TrustedProxies); err != nil {
		return nil, err
	}

	r.GET("/healthz", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	r.GET("/readyz", s.ready)

	api := r.Group("/api", limitJSONBody)
	api.GET("/products", s.listPublicProducts)
	api.POST("/auth/login", s.login)
	api.POST("/auth/logout", s.logout)
	api.GET("/auth/me", s.requireAuth, s.me)

	admin := api.Group("/admin", s.requireAuth, blockCrossSite)
	admin.GET("/products", s.listProducts)
	admin.POST("/products", s.createProduct)
	admin.POST("/products/reorder", s.reorderProducts)
	admin.GET("/products/:id", s.getProduct)
	admin.PUT("/products/:id", s.updateProduct)
	admin.DELETE("/products/:id", s.deleteProduct)
	admin.PUT("/products/:id/images/:view", s.putImage)
	admin.DELETE("/products/:id/images/:view", s.deleteImage)

	r.GET(d.Cfg.MediaBase+"/*key", s.media)
	r.HEAD(d.Cfg.MediaBase+"/*key", s.media)

	r.NoRoute(func(c *gin.Context) { abort(c, http.StatusNotFound, "not_found", "no such route") })
	return r, nil
}

func (s *Server) ready(c *gin.Context) {
	ctx, cancel := contextWithTimeout(c, 3*time.Second)
	defer cancel()
	if err := s.store.Ping(ctx); err != nil {
		abort(c, http.StatusServiceUnavailable, "database_unavailable", "database is not reachable")
		return
	}
	if err := s.storage.Ping(ctx); err != nil {
		abort(c, http.StatusServiceUnavailable, "storage_unavailable", "object storage is not reachable")
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ready"})
}

// --- middleware ---------------------------------------------------------------

func securityHeaders(c *gin.Context) {
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Referrer-Policy", "same-origin")
	c.Next()
}

// limitJSONBody caps request bodies at 1 MiB. Multipart uploads are exempt;
// putImage applies the (larger) configured upload limit itself.
func limitJSONBody(c *gin.Context) {
	if !strings.HasPrefix(c.GetHeader("Content-Type"), "multipart/") {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, jsonBodyMax)
	}
	c.Next()
}

// requireAuth accepts the JWT from an `Authorization: Bearer` header (API
// clients) or from the HttpOnly cookie set at login (the admin UI).
func (s *Server) requireAuth(c *gin.Context) {
	raw, viaCookie := "", false
	if h := c.GetHeader("Authorization"); len(h) > 7 && strings.EqualFold(h[:7], "bearer ") {
		raw = strings.TrimSpace(h[7:])
	} else if ck, err := c.Cookie(cookieName); err == nil {
		raw, viaCookie = ck, true
	}
	if raw == "" {
		abort(c, http.StatusUnauthorized, "unauthorized", "authentication required")
		return
	}
	user, err := s.issuer.Verify(raw)
	if err != nil {
		abort(c, http.StatusUnauthorized, "unauthorized", "invalid or expired token")
		return
	}
	c.Set(ctxUser, user)
	c.Set(ctxViaCookie, viaCookie)
	c.Next()
}

// blockCrossSite is a second line of defence (next to SameSite=Lax) against
// CSRF for cookie-authenticated, state-changing requests.
func blockCrossSite(c *gin.Context) {
	switch c.Request.Method {
	case http.MethodGet, http.MethodHead, http.MethodOptions:
	default:
		if via, _ := c.Get(ctxViaCookie); via == true && c.GetHeader("Sec-Fetch-Site") == "cross-site" {
			abort(c, http.StatusForbidden, "cross_site", "cross-site requests are not allowed")
			return
		}
	}
	c.Next()
}

// --- responses ----------------------------------------------------------------

type apiError struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Fields  fieldErrors `json:"fields,omitempty"`
}

func abort(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{"error": apiError{Code: code, Message: message}})
}

func abortFields(c *gin.Context, fields fieldErrors) {
	c.AbortWithStatusJSON(http.StatusUnprocessableEntity, gin.H{"error": apiError{
		Code: "validation", Message: "some fields are invalid", Fields: fields,
	}})
}

func contextWithTimeout(c *gin.Context, d time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(c.Request.Context(), d)
}
