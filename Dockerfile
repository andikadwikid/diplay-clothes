# syntax=docker/dockerfile:1
# Storefront + admin panel: build the Vite app, serve it with nginx, and proxy
# /api and /media to the Go backend so everything is one origin.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/proxy_params.inc deploy/security_headers.inc /etc/nginx/conf.d/
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
