# nginx HTTPS (local, mkcert)

Reverse proxy untuk testing HTTPS lokal. Terminate TLS di nginx, forward ke
Fastify (`:3000`) dan Next.js (`:3001`) yang tetap jalan via `pnpm dev`.

## Arsitektur routing

```
https://betrix.local
  ├─ /api/v1/*  ──┐
  ├─ /health     ──┼─▶ Fastify backend  (host:3000)
  ├─ /docs       ──┘
  └─ /*         ─────▶ Next.js admin    (host:3001)
```

Realtime = **SSE** (bukan WebSocket), jadi semua lokasi pakai
`proxy_buffering off` supaya frame tidak tertahan.

## Prasyarat

1. **mkcert** (generate cert lokal yang dipercaya browser):

   ```bash
   # install mkcert via choco (sudah ada choco 2.7.3)
   choco install mkcert -y

   # buat root CA lokal + install ke trust store sistem
   mkcert -install

   # generate cert untuk betrix.local
   cd Backend/nginx
   mkcert betrix.local
   ```

   Ini menghasilkan `betrix.local.pem` + `betrix.local-key.pem`. Simpan keduanya
   di `Backend/nginx/certs/`.

2. **Hosts entry** (supaya `betrix.local` resolve ke lokal):

   ```
   # C:\Windows\System32\drivers\etc\hosts
   127.0.0.1  betrix.local
   ```

## Jalankan

```bash
# 1. Backend & frontend (di terminal terpisah, tetap HTTP di host)
pnpm --filter @betrix/api dev        # :3000
pnpm --filter @betrix/admin dev      # :3001

# 2. nginx (dari Backend/)
docker compose -f docker-compose.nginx.yml up -d

# 3. buka
#    https://betrix.local        → admin UI
#    https://betrix.local/docs   → Swagger
#    https://betrix.local/health → health check
```

## Catatan penting

- **Linux**: override `DOCKER_GATEWAY_HOST` (default `host.docker.internal`
  cuma valid di Windows/macOS). Contoh:
  ```bash
  DOCKER_GATEWAY_HOST=172.17.0.1 docker compose -f docker-compose.nginx.yml up -d
  ```

- **TRUST_PROXY & cookie Secure**: frontend sudah membaca `x-forwarded-proto`
  untuk menandai cookie `Secure`. Di backend, set `TRUST_PROXY=true` di
  `Backend/.env` kalau mau `request.ip` ikut `X-Forwarded-For` (rate-limit
  per IP & device fingerprint). Tanpa itu, nginx tetap meneruskan traffic
  HTTPS dengan benar — hanya IP-nya yang terlihat sebagai gateway.

- **CORS**: `CORS_ORIGIN=*` di dev. Kalau browser akses via `https://betrix.local`
  dan frontend fetch ke `https://betrix.local/api/v1`, origin sudah match —
  tidak perlu ubah apa pun.

## Debug cepat

```bash
# lihat log nginx
docker logs -f betrix_reborn_nginx

# cek config valid
docker compose -f docker-compose.nginx.yml exec nginx nginx -t

# test SSE tetap jalan (stream tidak putus)
curl -N https://betrix.local/api/v1/stream/news
```
