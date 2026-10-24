package storage

import (
	"bytes"
	"context"
	"io"
	"sync"
	"time"
)

// Memory is an in-process Storage used by tests.
type Memory struct {
	mu      sync.Mutex
	objects map[string]memObject
}

type memObject struct {
	data        []byte
	contentType string
	modTime     time.Time
}

func NewMemory() *Memory { return &Memory{objects: map[string]memObject{}} }

func (m *Memory) Put(_ context.Context, key string, r io.Reader, _ int64, contentType string) error {
	data, err := io.ReadAll(r)
	if err != nil {
		return err
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.objects[key] = memObject{data: data, contentType: contentType, modTime: time.Now()}
	return nil
}

func (m *Memory) Open(_ context.Context, key string) (Object, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	o, ok := m.objects[key]
	if !ok {
		return nil, ErrNotFound
	}
	return &memReader{Reader: bytes.NewReader(o.data), info: ObjectInfo{
		ContentType: o.contentType, Size: int64(len(o.data)), ModTime: o.modTime, ETag: `"mem"`,
	}}, nil
}

func (m *Memory) Delete(_ context.Context, key string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.objects, key)
	return nil
}

func (m *Memory) Ping(context.Context) error { return nil }

// Keys lists the stored object keys (test helper).
func (m *Memory) Keys() []string {
	m.mu.Lock()
	defer m.mu.Unlock()
	keys := make([]string, 0, len(m.objects))
	for k := range m.objects {
		keys = append(keys, k)
	}
	return keys
}

type memReader struct {
	*bytes.Reader
	info ObjectInfo
}

func (r *memReader) Close() error     { return nil }
func (r *memReader) Info() ObjectInfo { return r.info }
