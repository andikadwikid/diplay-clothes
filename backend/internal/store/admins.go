package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

type Admin struct {
	ID           int64
	Username     string
	PasswordHash string
}

func (s *Store) GetAdmin(ctx context.Context, username string) (Admin, error) {
	var a Admin
	err := s.pool.QueryRow(ctx,
		`SELECT id, username, password_hash FROM admin_users WHERE username = $1`, username,
	).Scan(&a.ID, &a.Username, &a.PasswordHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return a, ErrNotFound
	}
	return a, err
}

// UpsertAdmin creates the admin or replaces its password hash.
func (s *Store) UpsertAdmin(ctx context.Context, username, passwordHash string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)
		ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
		username, passwordHash)
	return err
}
