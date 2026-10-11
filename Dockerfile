FROM node:24-alpine AS frontend
WORKDIR /build
RUN npm install --global pnpm@12.5.1
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY index.html vite.config.ts pwa-build.ts svelte.config.js tsconfig.json ./
COPY src ./src
COPY public ./public
RUN pnpm check && pnpm test && pnpm build

FROM golang:1.27.2-alpine AS backend
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /campus ./cmd/campus

FROM alpine:3.24
RUN apk add --no-cache ca-certificates && addgroup -g 10001 campus && adduser -D -u 10001 -G campus campus && mkdir /data && chown campus:campus /data
WORKDIR /app
COPY --from=backend /campus /app/campus
COPY --from=frontend /build/dist /app/dist
USER campus
ENV LISTEN_ADDR=:8080 CACHE_PATH=/data/campus.sqlite STATIC_DIR=/app/dist
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/api/health || exit 1
CMD ["/app/campus"]
