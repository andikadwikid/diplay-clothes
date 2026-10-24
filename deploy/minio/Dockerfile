# syntax=docker/dockerfile:1
#
# MinIO no longer publishes prebuilt community images (minio/minio on Docker Hub,
# quay.io and ghcr.io are all gone), so this builds the server from source at a
# pinned version. The first build compiles MinIO (about 2-3 minutes on a modern
# machine; give Docker plenty of memory); Docker caches the result afterwards.

FROM golang:1.26-alpine AS build
# Pseudo-version of a known-good upstream commit (7aac2a2c5b7c, 2026-02-12).
ARG MINIO_VERSION=v0.0.0-20260212201848-7aac2a2c5b7c
RUN CGO_ENABLED=0 GOBIN=/out go install -trimpath -ldflags="-s -w" github.com/minio/minio@${MINIO_VERSION}

FROM alpine:3.21
RUN adduser -D -u 10001 minio \
 && mkdir /data \
 && chown minio /data
COPY --from=build /out/minio /usr/local/bin/minio
USER minio
VOLUME /data
EXPOSE 9000 9001
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=20 \
  CMD wget -q -O /dev/null http://127.0.0.1:9000/minio/health/live || exit 1
ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]
