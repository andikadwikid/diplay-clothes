package api

import (
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/andikadwikid/diplay-clothes/backend/internal/store"
)

// Machine-readable codes for field errors; the admin UI translates them.
const (
	codeRequired       = "required"
	codeTooLong        = "too_long"
	codeInvalidURL     = "invalid_url"
	codeInvalidTone    = "invalid_tone"
	codeImagesRequired = "images_required"
)

type fieldErrors map[string]string

func (f fieldErrors) Error() string { return "validation failed" }

type productInput struct {
	Name       string `json:"name"`
	Meta       string `json:"meta"`
	Href       string `json:"href"`
	BadgeLabel string `json:"badgeLabel"`
	BadgeTone  string `json:"badgeTone"`
	Published  bool   `json:"published"`
}

var hrefPattern = regexp.MustCompile(`^(https?://\S+|/\S*|#\S*)$`)

// validate trims the input in place and returns every problem found.
// `images` are the product's current images; publishing requires both.
func (in *productInput) validate(images store.Images) fieldErrors {
	in.Name = strings.TrimSpace(in.Name)
	in.Meta = strings.TrimSpace(in.Meta)
	in.Href = strings.TrimSpace(in.Href)
	in.BadgeLabel = strings.TrimSpace(in.BadgeLabel)
	if in.BadgeTone == "" {
		in.BadgeTone = "dark"
	}

	errs := fieldErrors{}
	switch n := utf8.RuneCountInString(in.Name); {
	case n == 0:
		errs["name"] = codeRequired
	case n > 120:
		errs["name"] = codeTooLong
	}
	if utf8.RuneCountInString(in.Meta) > 200 {
		errs["meta"] = codeTooLong
	}
	if in.Href != "" {
		switch {
		case utf8.RuneCountInString(in.Href) > 500:
			errs["href"] = codeTooLong
		case !hrefPattern.MatchString(in.Href) || strings.HasPrefix(in.Href, "//") || hasControl(in.Href):
			errs["href"] = codeInvalidURL
		}
	}
	if utf8.RuneCountInString(in.BadgeLabel) > 24 {
		errs["badgeLabel"] = codeTooLong
	}
	if in.BadgeTone != "dark" && in.BadgeTone != "light" {
		errs["badgeTone"] = codeInvalidTone
	}
	if in.Published && !images.Complete() {
		errs["published"] = codeImagesRequired
	}
	if len(errs) == 0 {
		return nil
	}
	return errs
}

func hasControl(s string) bool {
	return strings.IndexFunc(s, unicode.IsControl) >= 0
}

func (in productInput) applyTo(p *store.Product) {
	p.Name, p.Meta, p.Href = in.Name, in.Meta, in.Href
	p.BadgeLabel, p.BadgeTone, p.Published = in.BadgeLabel, in.BadgeTone, in.Published
}
