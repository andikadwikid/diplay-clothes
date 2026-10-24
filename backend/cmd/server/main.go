package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/andikadwikid/diplay-clothes/backend/internal/api"
	"github.com/andikadwikid/diplay-clothes/backend/internal/auth"
	"github.com/andikadwikid/diplay-clothes/backend/internal/config"
	"github.com/andikadwikid/diplay-clothes/backend/internal/storage"
	"github.com/andikadwikid/diplay-clothes/backend/internal/store"
)

func main() {
	// `server healthcheck` lets Docker probe the container; the distroless image has no curl.
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		os.Exit(healthcheck())
	}

	log := slog.New(slog.NewTextHandler(os.Stdout, nil))
	if err := run(log); err != nil {
		log.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	if cfg.JWTSecret == config.DevJWTSecret {
		log.Warn("JWT_SECRET is the public development placeholder; set your own before deploying")
	}
	if cfg.AdminPassword == config.DevAdminPassword {
		log.Warn("ADMIN_PASSWORD is the public development default; change it before deploying")
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	log.Info("connecting to postgres")
	db, err := store.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer db.Close()
	if err := db.Migrate(ctx); err != nil {
		return err
	}
	if err := seedAdmin(ctx, db, cfg); err != nil {
		return err
	}

	log.Info("connecting to object storage", "endpoint", cfg.MinIO.Endpoint, "bucket", cfg.MinIO.Bucket)
	objects, err := storage.NewMinIO(ctx, cfg.MinIO)
	if err != nil {
		return err
	}

	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}
	handler, err := api.New(api.Deps{
		Cfg:     cfg,
		Store:   db,
		Storage: objects,
		Issuer:  auth.NewIssuer(cfg.JWTSecret, cfg.JWTTTL),
		Limiter: auth.NewLimiter(10, time.Minute),
	})
	if err != nil {
		return err
	}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	errc := make(chan error, 1)
	go func() {
		log.Info("listening", "addr", srv.Addr)
		errc <- srv.ListenAndServe()
	}()

	select {
	case err := <-errc:
		return err
	case <-ctx.Done():
		log.Info("shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := srv.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	}
}

func healthcheck() int {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	client := &http.Client{Timeout: 3 * time.Second}
	res, err := client.Get("http://127.0.0.1:" + port + "/readyz")
	if err != nil {
		return 1
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return 1
	}
	return 0
}

// seedAdmin makes the database match ADMIN_USERNAME / ADMIN_PASSWORD, so the
// environment stays the source of truth for the (single) admin account.
func seedAdmin(ctx context.Context, db *store.Store, cfg config.Config) error {
	existing, err := db.GetAdmin(ctx, cfg.AdminUsername)
	if err == nil && auth.CheckPassword(existing.PasswordHash, cfg.AdminPassword) {
		return nil
	}
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		return err
	}
	hash, err := auth.HashPassword(cfg.AdminPassword)
	if err != nil {
		return err
	}
	return db.UpsertAdmin(ctx, cfg.AdminUsername, hash)
}
