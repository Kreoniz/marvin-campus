package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"net/netip"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
	_ "time/tzdata"

	"marvin-campus/internal/cache"
	"marvin-campus/internal/httpapi"
	"marvin-campus/internal/share"
	"marvin-campus/internal/upstream"
	"marvin-campus/internal/vuc"
)

func main() {
	location, err := time.LoadLocation("Asia/Omsk")
	if err != nil {
		slog.Error("timezone", "error", err)
		os.Exit(1)
	}
	db, err := cache.Open(env("CACHE_PATH", "./data/campus.sqlite"))
	if err != nil {
		slog.Error("cache", "error", err)
		os.Exit(1)
	}
	defer db.Close()
	shares, err := share.Open(env("CACHE_PATH", "./data/campus.sqlite"))
	if err != nil {
		slog.Error("shared comparisons", "error", err)
		os.Exit(1)
	}
	defer shares.Close()
	var proxies []netip.Prefix
	for _, value := range strings.FieldsFunc(os.Getenv("TRUSTED_PROXY_CIDRS"), func(r rune) bool { return r == ',' || r == ' ' }) {
		prefix, err := netip.ParsePrefix(value)
		if err != nil {
			slog.Error("invalid TRUSTED_PROXY_CIDRS")
			os.Exit(1)
		}
		proxies = append(proxies, prefix)
	}
	vucData, err := vuc.Load(os.Getenv("VUC_DATA_PATH"))
	if err != nil {
		slog.Error("invalid VUC dataset", "error", err)
		os.Exit(1)
	}
	if err := vucData.LoadOriginals(os.Getenv("VUC_ORIGINALS_DIR")); err != nil {
		slog.Error("invalid VUC originals", "error", err)
		os.Exit(1)
	}
	app := &httpapi.Server{Cache: db, Shares: shares, Source: upstream.New(env("UPSTREAM_URL", "https://rasp.omgtu.ru")), Location: location, StaticDir: env("STATIC_DIR", "./dist"), UmamiID: os.Getenv("UMAMI_WEBSITE_ID"), TrustedProxies: proxies, VUC: vucData}
	server := &http.Server{Addr: env("LISTEN_ADDR", ":8080"), Handler: app.Handler(), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 55 * time.Second, IdleTimeout: 60 * time.Second}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdown)
	}()
	slog.Info("Campus started", "address", server.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		slog.Error("server", "error", err)
		os.Exit(1)
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
