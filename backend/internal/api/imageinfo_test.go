package api

import (
	"bytes"
	"encoding/base64"
	"errors"
	"image"
	"image/jpeg"
	"image/png"
	"testing"
)

func encodePNG(t testing.TB, w, h int) []byte {
	t.Helper()
	var buf bytes.Buffer
	if err := png.Encode(&buf, image.NewNRGBA(image.Rect(0, 0, w, h))); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func encodeJPEG(t testing.TB, w, h int) []byte {
	t.Helper()
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, image.NewRGBA(image.Rect(0, 0, w, h)), nil); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestInspectImage(t *testing.T) {
	// A real 1x1 lossy WebP: proves the format is recognised and parsed.
	webp1x1, _ := base64.StdEncoding.DecodeString("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA")

	cases := []struct {
		name    string
		data    []byte
		wantCT  string
		wantW   int
		wantH   int
		wantErr error
	}{
		{"png", encodePNG(t, 800, 1000), "image/png", 800, 1000, nil},
		{"jpeg", encodeJPEG(t, 400, 500), "image/jpeg", 400, 500, nil},
		{"webp recognised (but too small)", webp1x1, "", 0, 0, errImageDimensions},
		{"png too small", encodePNG(t, 50, 50), "", 0, 0, errImageDimensions},
		{"png too large", encodePNG(t, 9000, 100), "", 0, 0, errImageDimensions},
		{"svg with viewBox", []byte(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><rect width="1" height="1"/></svg>`), "image/svg+xml", 800, 1000, nil},
		{"svg with width/height", []byte(`<svg xmlns="http://www.w3.org/2000/svg" width="400px" height="500px"></svg>`), "image/svg+xml", 400, 500, nil},
		{"svg without size", []byte(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`), "image/svg+xml", 0, 0, nil},
		{"svg with script", []byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`), "", 0, 0, errUnsafeSVG},
		{"svg with handler", []byte(`<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>`), "", 0, 0, errUnsafeSVG},
		{"svg with foreignObject", []byte(`<svg xmlns="http://www.w3.org/2000/svg"><foreignObject/></svg>`), "", 0, 0, errUnsafeSVG},
		{"xml that is not svg", []byte(`<html><body/></html>`), "", 0, 0, errUnsupportedImage},
		{"plain text", []byte("hello world"), "", 0, 0, errUnsupportedImage},
		{"html pretending", []byte("<!DOCTYPE html><html><script>alert(1)</script></html>"), "", 0, 0, errUnsupportedImage},
		{"empty", nil, "", 0, 0, errUnsupportedImage},
		{"truncated png header", encodePNG(t, 800, 1000)[:20], "", 0, 0, errCorruptImage},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			info, err := inspectImage(tc.data)
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("err = %v, want %v", err, tc.wantErr)
			}
			if err == nil && (info.ContentType != tc.wantCT || info.Width != tc.wantW || info.Height != tc.wantH) {
				t.Fatalf("got %+v", info)
			}
		})
	}
}

func TestValidMediaKey(t *testing.T) {
	good := []string{"products/abc/front-1234.png"}
	bad := []string{"", "other/x.png", "products/../secret", "products/a/../../b", `products\x`, "/products/x", "products//x", "products/./x"}
	for _, k := range good {
		if !validMediaKey(k) {
			t.Errorf("%q should be valid", k)
		}
	}
	for _, k := range bad {
		if validMediaKey(k) {
			t.Errorf("%q should be rejected", k)
		}
	}
}
