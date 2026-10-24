package api

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/andikadwikid/diplay-clothes/backend/internal/auth"
	"github.com/andikadwikid/diplay-clothes/backend/internal/store"
)

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// login verifies the credentials and returns a JWT, both in the body (for API
// clients) and as an HttpOnly cookie (so the browser UI never touches it).
func (s *Server) login(c *gin.Context) {
	if !s.limiter.Allow(c.ClientIP()) {
		c.Header("Retry-After", "60")
		abort(c, http.StatusTooManyRequests, "rate_limited", "too many login attempts, try again in a minute")
		return
	}

	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		abort(c, http.StatusBadRequest, "bad_request", "expected a JSON body with username and password")
		return
	}

	admin, err := s.store.GetAdmin(c.Request.Context(), req.Username)
	known := err == nil
	hash := admin.PasswordHash
	switch {
	case errors.Is(err, store.ErrNotFound):
		hash = auth.DummyHash // keep timing similar for unknown users
	case err != nil:
		abort(c, http.StatusInternalServerError, "internal", "could not check credentials")
		return
	}
	// Always run the bcrypt comparison, then decide.
	passwordOK := auth.CheckPassword(hash, req.Password)
	if !known || !passwordOK {
		abort(c, http.StatusUnauthorized, "invalid_credentials", "wrong username or password")
		return
	}

	token, expires, err := s.issuer.Sign(admin.Username)
	if err != nil {
		abort(c, http.StatusInternalServerError, "internal", "could not issue token")
		return
	}
	s.setCookie(c, token, int(time.Until(expires).Seconds()))
	c.JSON(http.StatusOK, gin.H{"token": token, "expiresAt": expires, "username": admin.Username})
}

func (s *Server) logout(c *gin.Context) {
	s.setCookie(c, "", -1)
	c.Status(http.StatusNoContent)
}

func (s *Server) me(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"username": c.GetString(ctxUser)})
}

func (s *Server) setCookie(c *gin.Context, value string, maxAge int) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(cookieName, value, maxAge, "/", "", s.cfg.CookieSecure, true)
}
