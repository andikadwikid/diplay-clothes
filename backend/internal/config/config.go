// Package config reads the server configuration from environment variables.
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// DevJWTSecret is the placeholder secret shipped in .env.example. The server
// accepts it (so `docker compose up` works out of the box) but logs a warning.
const DevJWTSecret = "dev-only-secret-change-me-before-deploying-0123456789"

// DevAdminPassword is the default admin password in .env.example.
const DevAdminPassword = "admin12345"

type MinIO struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
	UseSSL    bool
}

type Config struct {
	Port           string
	DatabaseURL    string
	JWTSecret      string
	JWTTTL         time.Duration
	AdminUsername  string
	AdminPassword  string
	CookieSecure   bool
	TrustedProxies []string
	MaxUploadBytes int64
	// MediaBase is the URL prefix under which uploaded images are served.
	MediaBase string
	MinIO     MinIO
}

// Load reads and validates the configuration. All problems are reported at once.
func Load() (Config, error) {
	cfg := Config{
		Port:          env("PORT", "8080"),
		DatabaseURL:   os.Getenv("DATABASE_URL"),
		JWTSecret:     os.Getenv("JWT_SECRET"),
		AdminUsername: env("ADMIN_USERNAME", "admin"),
		AdminPassword: os.Getenv("ADMIN_PASSWORD"),
		MediaBase:     strings.TrimRight(env("MEDIA_BASE_URL", "/media"), "/"),
		MinIO: MinIO{
			Endpoint:  os.Getenv("MINIO_ENDPOINT"),
			AccessKey: os.Getenv("MINIO_ACCESS_KEY"),
			SecretKey: os.Getenv("MINIO_SECRET_KEY"),
			Bucket:    env("MINIO_BUCKET", "diplay-media"),
		},
	}

	var errs []error
	bad := func(format string, args ...any) { errs = append(errs, fmt.Errorf(format, args...)) }

	ttl, err := time.ParseDuration(env("JWT_TTL", "12h"))
	if err != nil || ttl <= 0 {
		bad("JWT_TTL must be a positive duration such as 12h")
	}
	cfg.JWTTTL = ttl

	if cfg.CookieSecure, err = envBool("COOKIE_SECURE", false); err != nil {
		bad("COOKIE_SECURE: %v", err)
	}
	if cfg.MinIO.UseSSL, err = envBool("MINIO_USE_SSL", false); err != nil {
		bad("MINIO_USE_SSL: %v", err)
	}

	maxMB, err := strconv.ParseInt(env("MAX_UPLOAD_MB", "5"), 10, 64)
	if err != nil || maxMB < 1 || maxMB > 50 {
		bad("MAX_UPLOAD_MB must be a number between 1 and 50")
	}
	cfg.MaxUploadBytes = maxMB << 20

	for _, p := range strings.Split(os.Getenv("TRUSTED_PROXIES"), ",") {
		if p = strings.TrimSpace(p); p != "" {
			cfg.TrustedProxies = append(cfg.TrustedProxies, p)
		}
	}

	if cfg.DatabaseURL == "" {
		bad("DATABASE_URL is required")
	}
	if len(cfg.JWTSecret) < 32 {
		bad("JWT_SECRET is required and must be at least 32 characters")
	}
	if cfg.AdminUsername == "" {
		bad("ADMIN_USERNAME must not be empty")
	}
	if len(cfg.AdminPassword) < 8 {
		bad("ADMIN_PASSWORD is required and must be at least 8 characters")
	}
	if cfg.MinIO.Endpoint == "" || cfg.MinIO.AccessKey == "" || cfg.MinIO.SecretKey == "" {
		bad("MINIO_ENDPOINT, MINIO_ACCESS_KEY and MINIO_SECRET_KEY are required")
	}
	if !strings.HasPrefix(cfg.MediaBase, "/") {
		bad("MEDIA_BASE_URL must start with /")
	}

	return cfg, errors.Join(errs...)
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envBool(key string, fallback bool) (bool, error) {
	v := os.Getenv(key)
	if v == "" {
		return fallback, nil
	}
	return strconv.ParseBool(v)
}
