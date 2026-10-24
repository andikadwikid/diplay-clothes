// Package storage abstracts the S3-compatible object store (MinIO).
package storage

import (
	"context"
	"errors"
	"io"
	"time"
)

var ErrNotFound = errors.New("object not found")

type ObjectInfo struct {
	ContentType string
	Size        int64
	ModTime     time.Time
	ETag        string
}

// Object is an open stored file. It is seekable so http.ServeContent can
// answer range and conditional requests.
type Object interface {
	io.ReadSeekCloser
	Info() ObjectInfo
}

type Storage interface {
	Put(ctx context.Context, key string, r io.Reader, size int64, contentType string) error
	Open(ctx context.Context, key string) (Object, error)
	Delete(ctx context.Context, key string) error
	Ping(ctx context.Context) error
}
