package storage

import (
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	"github.com/andikadwikid/diplay-clothes/backend/internal/config"
)

// MinIO stores objects in a private bucket. Files are never exposed directly;
// the API streams them (see the /media route), which keeps headers consistent.
type MinIO struct {
	client *minio.Client
	bucket string
}

// NewMinIO connects and makes sure the bucket exists, waiting for MinIO to
// come up if necessary.
func NewMinIO(ctx context.Context, cfg config.MinIO) (*MinIO, error) {
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("create minio client: %w", err)
	}
	m := &MinIO{client: client, bucket: cfg.Bucket}

	deadline := time.Now().Add(45 * time.Second)
	for {
		err = m.ensureBucket(ctx)
		if err == nil {
			return m, nil
		}
		if time.Now().After(deadline) || ctx.Err() != nil {
			return nil, fmt.Errorf("object storage not reachable: %w", err)
		}
		time.Sleep(time.Second)
	}
}

func (m *MinIO) ensureBucket(ctx context.Context) error {
	callCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	exists, err := m.client.BucketExists(callCtx, m.bucket)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}
	err = m.client.MakeBucket(callCtx, m.bucket, minio.MakeBucketOptions{})
	if err != nil {
		// Another instance may have created it between the two calls.
		if code := minio.ToErrorResponse(err).Code; code == "BucketAlreadyOwnedByYou" || code == "BucketAlreadyExists" {
			return nil
		}
	}
	return err
}

func (m *MinIO) Put(ctx context.Context, key string, r io.Reader, size int64, contentType string) error {
	_, err := m.client.PutObject(ctx, m.bucket, key, r, size, minio.PutObjectOptions{ContentType: contentType})
	return err
}

func (m *MinIO) Open(ctx context.Context, key string) (Object, error) {
	obj, err := m.client.GetObject(ctx, m.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, err
	}
	// GetObject is lazy; Stat is what actually reports a missing key.
	st, err := obj.Stat()
	if err != nil {
		_ = obj.Close()
		if minio.ToErrorResponse(err).Code == "NoSuchKey" {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &minioObject{Object: obj, info: ObjectInfo{
		ContentType: st.ContentType, Size: st.Size, ModTime: st.LastModified, ETag: quoteETag(st.ETag),
	}}, nil
}

func (m *MinIO) Delete(ctx context.Context, key string) error {
	return m.client.RemoveObject(ctx, m.bucket, key, minio.RemoveObjectOptions{})
}

func (m *MinIO) Ping(ctx context.Context) error {
	_, err := m.client.BucketExists(ctx, m.bucket)
	return err
}

type minioObject struct {
	*minio.Object
	info ObjectInfo
}

func (o *minioObject) Info() ObjectInfo { return o.info }

// quoteETag wraps an ETag in quotes. MinIO returns it bare, but HTTP requires
// the quoted form and http.ServeContent only matches If-None-Match against it.
func quoteETag(etag string) string {
	etag = strings.Trim(etag, `"`)
	if etag == "" {
		return ""
	}
	return `"` + etag + `"`
}
