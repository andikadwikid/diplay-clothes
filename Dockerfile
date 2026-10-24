# syntax=docker/dockerfile:1
# Storefront + admin panel: build the Vite app, serve it with nginx, and proxy
# /api and /media to the Go backend so everything is one origin.
#
# Stateless: the image only contains the built files. It runs as a non-root user
# on port 8080, writes only to /tmp, and is safe to run read-only and in many copies.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/proxy_params.inc deploy/security_headers.inc /etc/nginx/conf.d/
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
