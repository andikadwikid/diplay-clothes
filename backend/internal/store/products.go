package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

// Image is one stored artwork file. Key is the object key in the bucket.
type Image struct {
	Key         string `json:"key"`
	ContentType string `json:"contentType"`
	Width       int    `json:"width"`
	Height      int    `json:"height"`
}

// Images holds the two poses every product needs.
type Images struct {
	Hanging *Image `json:"hanging,omitempty"`
	Front   *Image `json:"front,omitempty"`
}

// Complete reports whether both poses are present.
func (i Images) Complete() bool { return i.Hanging != nil && i.Front != nil }

type Product struct {
	ID         string
	Name       string
	Meta       string
	Href       string
	BadgeLabel string
	BadgeTone  string
	Published  bool
	Position   int
	Images     Images
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

const productCols = `id, name, meta, href, badge_label, badge_tone, published, position, images, created_at, updated_at`

func scanProduct(row pgx.Row) (Product, error) {
	var p Product
	err := row.Scan(&p.ID, &p.Name, &p.Meta, &p.Href, &p.BadgeLabel, &p.BadgeTone,
		&p.Published, &p.Position, &p.Images, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return p, ErrNotFound
	}
	return p, err
}

// ListProducts returns products in display order.
func (s *Store) ListProducts(ctx context.Context, publishedOnly bool) ([]Product, error) {
	q := `SELECT ` + productCols + ` FROM products`
	if publishedOnly {
		q += ` WHERE published`
	}
	rows, err := s.pool.Query(ctx, q+` ORDER BY position, created_at, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Product{}
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Store) GetProduct(ctx context.Context, id string) (Product, error) {
	return scanProduct(s.pool.QueryRow(ctx, `SELECT `+productCols+` FROM products WHERE id = $1`, id))
}

// CreateProduct inserts p at the end of the display order.
func (s *Store) CreateProduct(ctx context.Context, p Product) (Product, error) {
	return scanProduct(s.pool.QueryRow(ctx, `
		INSERT INTO products (id, name, meta, href, badge_label, badge_tone, published, position, images)
		VALUES ($1, $2, $3, $4, $5, $6, $7, (SELECT COALESCE(MAX(position) + 1, 0) FROM products), $8)
		RETURNING `+productCols,
		p.ID, p.Name, p.Meta, p.Href, p.BadgeLabel, p.BadgeTone, p.Published, p.Images))
}

// Mutate loads a product under a row lock, lets fn change it (or veto the
// change by returning an error) and saves the result atomically.
func (s *Store) Mutate(ctx context.Context, id string, fn func(*Product) error) (Product, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Product{}, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	p, err := scanProduct(tx.QueryRow(ctx, `SELECT `+productCols+` FROM products WHERE id = $1 FOR UPDATE`, id))
	if err != nil {
		return Product{}, err
	}
	if err := fn(&p); err != nil {
		return Product{}, err
	}
	updated, err := scanProduct(tx.QueryRow(ctx, `
		UPDATE products
		   SET name = $2, meta = $3, href = $4, badge_label = $5, badge_tone = $6,
		       published = $7, images = $8, updated_at = now()
		 WHERE id = $1
		RETURNING `+productCols,
		p.ID, p.Name, p.Meta, p.Href, p.BadgeLabel, p.BadgeTone, p.Published, p.Images))
	if err != nil {
		return Product{}, err
	}
	return updated, tx.Commit(ctx)
}

// DeleteProduct removes a product and returns it so callers can clean up files.
func (s *Store) DeleteProduct(ctx context.Context, id string) (Product, error) {
	return scanProduct(s.pool.QueryRow(ctx, `DELETE FROM products WHERE id = $1 RETURNING `+productCols, id))
}

// Reorder sets the display order. ids must list every product exactly once.
func (s *Store) Reorder(ctx context.Context, ids []string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	rows, err := tx.Query(ctx, `SELECT id FROM products FOR UPDATE`)
	if err != nil {
		return err
	}
	existing := map[string]bool{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		existing[id] = true
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}

	seen := map[string]bool{}
	for _, id := range ids {
		if !existing[id] || seen[id] {
			return ErrOrderMismatch
		}
		seen[id] = true
	}
	if len(seen) != len(existing) {
		return ErrOrderMismatch
	}

	if _, err := tx.Exec(ctx, `
		UPDATE products p SET position = (v.ord - 1)::int
		  FROM unnest($1::text[]) WITH ORDINALITY AS v(id, ord)
		 WHERE p.id = v.id`, ids); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
