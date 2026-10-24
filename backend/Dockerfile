# syntax=docker/dockerfile:1

FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# (The alpine base already ships a CA bundle, which is all HTTPS to an external
# S3 endpoint would need.)
FROM alpine:3.21
RUN adduser -D -H -u 10001 app
COPY --from=build /out/server /usr/local/bin/server
ENV GIN_MODE=release PORT=8080
USER app
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=4s --start-period=20s --retries=5 \
  CMD ["server", "healthcheck"]
ENTRYPOINT ["server"]
