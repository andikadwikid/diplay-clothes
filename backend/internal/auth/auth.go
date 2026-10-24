// Package auth handles admin credentials: JWT issuing/verification, password
// hashing and login throttling.
package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

const tokenIssuer = "diplay-clothes"

var ErrInvalidToken = errors.New("invalid token")

// Issuer signs and verifies HS256 JWTs.
type Issuer struct {
	secret []byte
	ttl    time.Duration
	now    func() time.Time
}

func NewIssuer(secret string, ttl time.Duration) *Issuer {
	return &Issuer{secret: []byte(secret), ttl: ttl, now: time.Now}
}

// Sign returns a token for username and the moment it expires.
func (i *Issuer) Sign(username string) (string, time.Time, error) {
	now := i.now()
	exp := now.Add(i.ttl)

	id := make([]byte, 8)
	if _, err := rand.Read(id); err != nil {
		return "", time.Time{}, err
	}
	claims := jwt.RegisteredClaims{
		Issuer:    tokenIssuer,
		Subject:   username,
		ID:        hex.EncodeToString(id),
		IssuedAt:  jwt.NewNumericDate(now),
		NotBefore: jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(exp),
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(i.secret)
	return signed, exp, err
}

// Verify checks signature, algorithm, issuer and expiry and returns the username.
func (i *Issuer) Verify(raw string) (string, error) {
	var claims jwt.RegisteredClaims
	_, err := jwt.ParseWithClaims(raw, &claims,
		func(*jwt.Token) (any, error) { return i.secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), // rejects "none" and other algs
		jwt.WithIssuer(tokenIssuer),
		jwt.WithExpirationRequired(),
		jwt.WithTimeFunc(i.now),
	)
	if err != nil || claims.Subject == "" {
		return "", fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}
	return claims.Subject, nil
}

func HashPassword(password string) (string, error) {
	h, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(h), err
}

func CheckPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// DummyHash is compared against when a username does not exist, so a failed
// login takes about as long whether or not the account is real.
var DummyHash, _ = HashPassword("not-a-real-password")

// Limiter allows at most `limit` events per key within `window`.
type Limiter struct {
	mu     sync.Mutex
	limit  int
	window time.Duration
	hits   map[string][]time.Time
	now    func() time.Time
}

func NewLimiter(limit int, window time.Duration) *Limiter {
	return &Limiter{limit: limit, window: window, hits: map[string][]time.Time{}, now: time.Now}
}

// Allow records an attempt for key and reports whether it is within the limit.
func (l *Limiter) Allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	cutoff := now.Add(-l.window)
	recent := l.hits[key][:0]
	for _, t := range l.hits[key] {
		if t.After(cutoff) {
			recent = append(recent, t)
		}
	}
	if len(recent) >= l.limit {
		l.hits[key] = recent
		return false
	}
	l.hits[key] = append(recent, now)

	// Opportunistic cleanup so the map cannot grow without bound.
	if len(l.hits) > 4096 {
		for k, v := range l.hits {
			if len(v) == 0 || !v[len(v)-1].After(cutoff) {
				delete(l.hits, k)
			}
		}
	}
	return true
}
