package api

import (
	"bytes"
	"errors"
	"io"
	"log"
	"net/http"
	"path"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/andikadwikid/diplay-clothes/backend/internal/storage"
)

func bytesReader(b []byte) io.Reader { return bytes.NewReader(b) }

// media streams a stored image. The bucket stays private; this route is the
// only way files leave it, so every response gets the same hardening headers.
func (s *Server) media(c *gin.Context) {
	key := strings.TrimPrefix(c.Param("key"), "/")
	if !validMediaKey(key) {
		abort(c, http.StatusNotFound, "not_found", "no such file")
		return
	}

	obj, err := s.storage.Open(c.Request.Context(), key)
	if errors.Is(err, storage.ErrNotFound) {
		abort(c, http.StatusNotFound, "not_found", "no such file")
		return
	}
	if err != nil {
		log.Printf("storage open %s: %v", key, err)
		abort(c, http.StatusBadGateway, "storage_error", "could not read from object storage")
		return
	}
	defer obj.Close()

	info := obj.Info()
	h := c.Writer.Header()
	h.Set("Content-Type", safeContentType(info.ContentType))
	h.Set("X-Content-Type-Options", "nosniff")
	// If a file is ever opened directly (not via <img>), it cannot run script.
	h.Set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox")
	// Keys are unique per upload, so a file at a given URL never changes.
	h.Set("Cache-Control", "public, max-age=31536000, immutable")
	if info.ETag != "" {
		h.Set("ETag", info.ETag)
	}
	http.ServeContent(c.Writer, c.Request, "", info.ModTime, obj)
}

func validMediaKey(key string) bool {
	return len(key) > 0 && len(key) < 256 &&
		strings.HasPrefix(key, "products/") &&
		!strings.ContainsAny(key, `\`) &&
		path.Clean(key) == key
}

func safeContentType(ct string) string {
	switch ct {
	case "image/png", "image/jpeg", "image/webp", "image/svg+xml":
		return ct
	}
	return "application/octet-stream"
}
