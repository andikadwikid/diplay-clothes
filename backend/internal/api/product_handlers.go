package api

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/andikadwikid/diplay-clothes/backend/internal/store"
)

// --- DTOs -----------------------------------------------------------------------

// publicProduct mirrors the storefront's RackProduct type exactly.
type publicProduct struct {
	ID           string       `json:"id"`
	Name         string       `json:"name"`
	Meta         string       `json:"meta,omitempty"`
	Href         string       `json:"href,omitempty"`
	Badge        *publicBadge `json:"badge,omitempty"`
	HangingImage publicImage  `json:"hangingImage"`
	FrontImage   publicImage  `json:"frontImage"`
}

type publicBadge struct {
	Label string `json:"label"`
	Tone  string `json:"tone"`
}

type publicImage struct {
	Src string `json:"src"`
}

type adminImage struct {
	URL         string   `json:"url"`
	ContentType string   `json:"contentType"`
	Width       int      `json:"width"`
	Height      int      `json:"height"`
	Warnings    []string `json:"warnings"`
}

type adminProduct struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Meta       string `json:"meta"`
	Href       string `json:"href"`
	BadgeLabel string `json:"badgeLabel"`
	BadgeTone  string `json:"badgeTone"`
	Published  bool   `json:"published"`
	Position   int    `json:"position"`
	Images     struct {
		Hanging *adminImage `json:"hanging"`
		Front   *adminImage `json:"front"`
	} `json:"images"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (s *Server) mediaURL(key string) string { return s.cfg.MediaBase + "/" + key }

func (s *Server) toAdmin(p store.Product) adminProduct {
	out := adminProduct{
		ID: p.ID, Name: p.Name, Meta: p.Meta, Href: p.Href,
		BadgeLabel: p.BadgeLabel, BadgeTone: p.BadgeTone,
		Published: p.Published, Position: p.Position,
		CreatedAt: p.CreatedAt, UpdatedAt: p.UpdatedAt,
	}
	out.Images.Hanging = s.toAdminImage(p.Images.Hanging)
	out.Images.Front = s.toAdminImage(p.Images.Front)
	return out
}

func (s *Server) toAdminImage(img *store.Image) *adminImage {
	if img == nil {
		return nil
	}
	return &adminImage{
		URL: s.mediaURL(img.Key), ContentType: img.ContentType,
		Width: img.Width, Height: img.Height, Warnings: imageWarnings(img),
	}
}

// imageWarnings flags uploads that will work but look off on the rack.
func imageWarnings(img *store.Image) []string {
	warnings := []string{}
	if img.Width > 0 && img.Height > 0 {
		if ratio := float64(img.Width) / float64(img.Height); math.Abs(ratio-0.8) > 0.03 {
			warnings = append(warnings, "ratio") // the rack expects 4:5
		}
		if img.ContentType != "image/svg+xml" && img.Width < 600 {
			warnings = append(warnings, "small")
		}
	}
	if img.ContentType == "image/jpeg" {
		warnings = append(warnings, "opaque") // no transparency: shows as a box
	}
	return warnings
}

// --- public ---------------------------------------------------------------------

func (s *Server) listPublicProducts(c *gin.Context) {
	products, err := s.store.ListProducts(c.Request.Context(), true)
	if err != nil {
		abort(c, http.StatusInternalServerError, "internal", "could not load products")
		return
	}
	out := make([]publicProduct, 0, len(products))
	for _, p := range products {
		if !p.Images.Complete() {
			continue
		}
		pp := publicProduct{
			ID: p.ID, Name: p.Name, Meta: p.Meta, Href: p.Href,
			HangingImage: publicImage{Src: s.mediaURL(p.Images.Hanging.Key)},
			FrontImage:   publicImage{Src: s.mediaURL(p.Images.Front.Key)},
		}
		if p.BadgeLabel != "" {
			pp.Badge = &publicBadge{Label: p.BadgeLabel, Tone: p.BadgeTone}
		}
		out = append(out, pp)
	}
	c.Header("Cache-Control", "no-cache")
	c.JSON(http.StatusOK, gin.H{"products": out})
}

// --- admin: products -----------------------------------------------------------

func (s *Server) listProducts(c *gin.Context) {
	products, err := s.store.ListProducts(c.Request.Context(), false)
	if err != nil {
		abort(c, http.StatusInternalServerError, "internal", "could not load products")
		return
	}
	out := make([]adminProduct, len(products))
	for i, p := range products {
		out[i] = s.toAdmin(p)
	}
	c.JSON(http.StatusOK, gin.H{"products": out})
}

func (s *Server) getProduct(c *gin.Context) {
	p, err := s.store.GetProduct(c.Request.Context(), c.Param("id"))
	if err != nil {
		s.storeError(c, err)
		return
	}
	c.JSON(http.StatusOK, s.toAdmin(p))
}

func (s *Server) createProduct(c *gin.Context) {
	var in productInput
	if err := c.ShouldBindJSON(&in); err != nil {
		abort(c, http.StatusBadRequest, "bad_request", "expected a JSON body")
		return
	}
	if errs := in.validate(store.Images{}); errs != nil {
		abortFields(c, errs)
		return
	}
	id, err := newID()
	if err != nil {
		abort(c, http.StatusInternalServerError, "internal", "could not create product")
		return
	}
	p := store.Product{ID: id}
	in.applyTo(&p)

	created, err := s.store.CreateProduct(c.Request.Context(), p)
	if err != nil {
		s.storeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, s.toAdmin(created))
}

func (s *Server) updateProduct(c *gin.Context) {
	var in productInput
	if err := c.ShouldBindJSON(&in); err != nil {
		abort(c, http.StatusBadRequest, "bad_request", "expected a JSON body")
		return
	}
	updated, err := s.store.Mutate(c.Request.Context(), c.Param("id"), func(p *store.Product) error {
		if errs := in.validate(p.Images); errs != nil {
			return errs
		}
		in.applyTo(p)
		return nil
	})
	if err != nil {
		s.storeError(c, err)
		return
	}
	c.JSON(http.StatusOK, s.toAdmin(updated))
}

func (s *Server) deleteProduct(c *gin.Context) {
	p, err := s.store.DeleteProduct(c.Request.Context(), c.Param("id"))
	if err != nil {
		s.storeError(c, err)
		return
	}
	s.removeObjects(c, p.Images.Hanging, p.Images.Front)
	c.Status(http.StatusNoContent)
}

func (s *Server) reorderProducts(c *gin.Context) {
	var body struct {
		IDs []string `json:"ids"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		abort(c, http.StatusBadRequest, "bad_request", "expected {\"ids\": [...]}")
		return
	}
	if err := s.store.Reorder(c.Request.Context(), body.IDs); err != nil {
		s.storeError(c, err)
		return
	}
	s.listProducts(c)
}

// --- admin: images -------------------------------------------------------------

func (s *Server) putImage(c *gin.Context) {
	view, ok := viewParam(c)
	if !ok {
		return
	}

	// Allow some slack over the file limit for the multipart envelope.
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, s.cfg.MaxUploadBytes+(1<<20))
	fh, err := c.FormFile("file")
	if err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			s.tooLarge(c)
			return
		}
		abort(c, http.StatusBadRequest, "bad_request", `expected a multipart form with a "file" field`)
		return
	}
	f, err := fh.Open()
	if err != nil {
		abort(c, http.StatusBadRequest, "bad_request", "could not read the uploaded file")
		return
	}
	defer f.Close()

	data, err := io.ReadAll(io.LimitReader(f, s.cfg.MaxUploadBytes+1))
	if err != nil {
		abort(c, http.StatusBadRequest, "bad_request", "could not read the uploaded file")
		return
	}
	if int64(len(data)) > s.cfg.MaxUploadBytes {
		s.tooLarge(c)
		return
	}

	info, err := inspectImage(data)
	switch {
	case errors.Is(err, errUnsupportedImage):
		abort(c, http.StatusUnsupportedMediaType, "unsupported_type", "only PNG, WebP, JPEG and SVG images are accepted")
		return
	case errors.Is(err, errUnsafeSVG):
		abort(c, http.StatusUnprocessableEntity, "unsafe_svg", "SVG files containing scripts or embedded content are not accepted")
		return
	case errors.Is(err, errImageDimensions):
		abort(c, http.StatusUnprocessableEntity, "bad_dimensions", fmt.Sprintf("image must be between %d and %d px on each side", minImageDim, maxImageDim))
		return
	case err != nil:
		abort(c, http.StatusUnprocessableEntity, "corrupt_image", "the image could not be read")
		return
	}

	suffix, err := randomHex(8)
	if err != nil {
		abort(c, http.StatusInternalServerError, "internal", "could not store the image")
		return
	}
	id := c.Param("id")
	img := &store.Image{
		Key:         fmt.Sprintf("products/%s/%s-%s%s", id, view, suffix, info.Ext),
		ContentType: info.ContentType, Width: info.Width, Height: info.Height,
	}

	ctx := c.Request.Context()
	if err := s.storage.Put(ctx, img.Key, bytesReader(data), int64(len(data)), img.ContentType); err != nil {
		log.Printf("storage put %s: %v", img.Key, err)
		abort(c, http.StatusBadGateway, "storage_error", "could not save the image to object storage")
		return
	}

	var previous *store.Image
	updated, err := s.store.Mutate(ctx, id, func(p *store.Product) error {
		previous = setView(&p.Images, view, img)
		return nil
	})
	if err != nil {
		_ = s.storage.Delete(ctx, img.Key) // don't leave an orphan behind
		s.storeError(c, err)
		return
	}
	s.removeObjects(c, previous) // the replaced file, if any
	c.JSON(http.StatusOK, s.toAdmin(updated))
}

func (s *Server) deleteImage(c *gin.Context) {
	view, ok := viewParam(c)
	if !ok {
		return
	}
	var removed *store.Image
	updated, err := s.store.Mutate(c.Request.Context(), c.Param("id"), func(p *store.Product) error {
		removed = setView(&p.Images, view, nil)
		if !p.Images.Complete() {
			p.Published = false // a product without both poses cannot be on the rack
		}
		return nil
	})
	if err != nil {
		s.storeError(c, err)
		return
	}
	s.removeObjects(c, removed)
	c.JSON(http.StatusOK, s.toAdmin(updated))
}

// --- helpers ------------------------------------------------------------------

func viewParam(c *gin.Context) (string, bool) {
	view := c.Param("view")
	if view != "hanging" && view != "front" {
		abort(c, http.StatusNotFound, "not_found", `view must be "hanging" or "front"`)
		return "", false
	}
	return view, true
}

// setView replaces one pose and returns what was there before.
func setView(images *store.Images, view string, img *store.Image) *store.Image {
	slot := &images.Hanging
	if view == "front" {
		slot = &images.Front
	}
	previous := *slot
	*slot = img
	return previous
}

func (s *Server) removeObjects(c *gin.Context, imgs ...*store.Image) {
	for _, img := range imgs {
		if img == nil {
			continue
		}
		if err := s.storage.Delete(c.Request.Context(), img.Key); err != nil {
			log.Printf("storage delete %s: %v", img.Key, err)
		}
	}
}

func (s *Server) tooLarge(c *gin.Context) {
	abort(c, http.StatusRequestEntityTooLarge, "file_too_large",
		fmt.Sprintf("file is larger than %d MB", s.cfg.MaxUploadBytes>>20))
}

// storeError maps persistence errors to HTTP responses.
func (s *Server) storeError(c *gin.Context, err error) {
	var fields fieldErrors
	switch {
	case errors.Is(err, store.ErrNotFound):
		abort(c, http.StatusNotFound, "not_found", "product not found")
	case errors.Is(err, store.ErrOrderMismatch):
		abort(c, http.StatusUnprocessableEntity, "bad_order", err.Error())
	case errors.As(err, &fields):
		abortFields(c, fields)
	default:
		log.Printf("store error: %v", err)
		abort(c, http.StatusInternalServerError, "internal", "something went wrong")
	}
}

func newID() (string, error) { return randomHex(16) }

func randomHex(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
