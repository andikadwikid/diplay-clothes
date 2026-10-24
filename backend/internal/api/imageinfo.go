package api

import (
	"bytes"
	"encoding/xml"
	"errors"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"golang.org/x/image/webp"
)

const (
	minImageDim = 100
	maxImageDim = 8000
)

var (
	errUnsupportedImage = errors.New("unsupported image type")
	errCorruptImage     = errors.New("image could not be read")
	errImageDimensions  = errors.New("image dimensions out of range")
	errUnsafeSVG        = errors.New("svg contains active content")
)

type imageInfo struct {
	ContentType string
	Ext         string
	Width       int
	Height      int
}

// inspectImage identifies an upload from its bytes (never from the client's
// filename or Content-Type) and reads its dimensions without decoding pixels.
func inspectImage(data []byte) (imageInfo, error) {
	head := data
	if len(head) > 512 {
		head = head[:512]
	}

	var (
		cfg  image.Config
		err  error
		info imageInfo
		r    = bytes.NewReader(data)
	)
	switch http.DetectContentType(head) {
	case "image/png":
		info = imageInfo{ContentType: "image/png", Ext: ".png"}
		cfg, err = png.DecodeConfig(r)
	case "image/jpeg":
		info = imageInfo{ContentType: "image/jpeg", Ext: ".jpg"}
		cfg, err = jpeg.DecodeConfig(r)
	case "image/webp":
		info = imageInfo{ContentType: "image/webp", Ext: ".webp"}
		cfg, err = webp.DecodeConfig(r)
	default:
		return inspectSVG(data)
	}
	if err != nil {
		return imageInfo{}, errCorruptImage
	}
	if cfg.Width < minImageDim || cfg.Height < minImageDim || cfg.Width > maxImageDim || cfg.Height > maxImageDim {
		return imageInfo{}, errImageDimensions
	}
	info.Width, info.Height = cfg.Width, cfg.Height
	return info, nil
}

// SVGs are accepted so the bundled placeholder artwork can be uploaded, but
// anything that could execute is rejected. They are also served with a
// sandboxing CSP (see the media handler), so this is defence in depth.
var svgActive = regexp.MustCompile(`(?i)<\s*script|javascript:|<\s*foreignObject|<\s*iframe|<\s*embed|<\s*object|\bon[a-z]+\s*=|data:text/html|<!ENTITY`)

func inspectSVG(data []byte) (imageInfo, error) {
	dec := xml.NewDecoder(bytes.NewReader(data))
	dec.Strict = true

	var root *xml.StartElement
	for {
		tok, err := dec.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return imageInfo{}, errUnsupportedImage
		}
		if se, ok := tok.(xml.StartElement); ok && root == nil {
			if se.Name.Local != "svg" {
				return imageInfo{}, errUnsupportedImage
			}
			c := se.Copy()
			root = &c
		}
	}
	if root == nil {
		return imageInfo{}, errUnsupportedImage
	}
	if svgActive.Match(data) {
		return imageInfo{}, errUnsafeSVG
	}

	w, h := svgSize(*root)
	return imageInfo{ContentType: "image/svg+xml", Ext: ".svg", Width: w, Height: h}, nil
}

// svgSize prefers the viewBox and falls back to width/height; 0 means unknown.
func svgSize(root xml.StartElement) (int, int) {
	attr := map[string]string{}
	for _, a := range root.Attr {
		attr[a.Name.Local] = a.Value
	}
	if vb := strings.FieldsFunc(attr["viewBox"], func(r rune) bool { return r == ' ' || r == ',' }); len(vb) == 4 {
		w, errW := strconv.ParseFloat(vb[2], 64)
		h, errH := strconv.ParseFloat(vb[3], 64)
		if errW == nil && errH == nil && w > 0 && h > 0 {
			return int(w + 0.5), int(h + 0.5)
		}
	}
	num := func(s string) float64 {
		v, _ := strconv.ParseFloat(strings.TrimSuffix(strings.TrimSpace(s), "px"), 64)
		return v
	}
	if w, h := num(attr["width"]), num(attr["height"]); w > 0 && h > 0 {
		return int(w + 0.5), int(h + 0.5)
	}
	return 0, 0
}
