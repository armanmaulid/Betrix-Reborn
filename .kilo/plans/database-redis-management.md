# 🗄️ DATABASE & REDIS MANAGEMENT PLAN — v2 (COMPLETE & GRADUAL-SAFE)
**Repo:** Betrix-Reborn · **Tanggal:** 2026-08-26 · **Status:** BLUEPRINT v2 (menunggu approval)
**Cara pakai:** Eksekusi task-card **berurutan sesuai graf dependensi (§E)**. Satu task = satu commit. Jangan pernah melompat DependOn.

---

## §A. CAKUPAN — JAWABAN ATAS "APA SUDAH MENCAKUP KESELURUHAN?"

### ✅ Sudah tercakup di v1 (keputusan arsitektur)
Audit berbasis kode · klasifikasi 6 kelas data · namespace & tier Redis · TTL matrix · offload PG→Redis · index/agregat `usage_daily` · schema separation + grants · physical split money · ledger double-entry + idempotency · backup/DR matrix · roadmap 5 fase.

### ➕ Ditambahkan di v2 (lapisan eksekusi aman)
| # | Lapisan baru | Mencegah |
|---|---|---|
| L1 | **Baseline & Golden Snapshot** (§D-T1..T3) | perubahan angka "kaget" saat pivot sumber data |
| L2 | **Parity Test / Dual-Run** wajib untuk setiap pergantian sumber baca | bug hasil beda antara jalur lama-baru |
| L3 | **Dual-Read → Switch Write → Cleanup** sebagai pola migrasi standar | big-bang & data orphan |
| L4 | **Redis Key Registry** (`redis-keys.ts`) + ESLint ban import langsung | redundan key/nama acak baru |
| L5 | **Single-Writer Rule** per data + tabel klasifikasi wajib di komentar skema | dua penulis tabrakan / tabel tak terklasifikasi |
| L6 | **Monitoring & Alerting** (PG, Redis, kuota Upstash) | ketahuan bug belakangan |
| L7 | **Rollback eksplisit** di setiap task card | stuck di tengah migrasi |
| L8 | **Feature flags** `OPS_SOURCE`, `USE_USAGE_DAILY`, `RATELIMIT_BACKEND` | switch tidak bisa dibalik cepat |
| L9 | Audit dedup/redundansi repo (`ChatRepository` vs `MessageRepository`, dsb.) | redundansi lama ikut terbawa |
| L10 | Env-var table & secret handling | config drift |

---

## §B. TUJUH HUKUM ANTI-BUG / ANTI-REDUNDAN (berlaku sepanjang eksekusi)

1. **Baseline dulu, ubah kemudian.** Tidak boleh ada task Fase≥1 sebelum T1–T3 hijau.
2. **Parity sebelum switch.** Sumber baca baru harus dual-run ≥24 jam dengan hasil identik (diff JSON ==) sebelum flag dibalik.
3. **Single Source of Truth + Single Writer.** Satu data = satu modul penulis. Lainnya hanya baca/cache.
4. **Semua key Redis lewat `redis-keys.ts`.** Dilarang string key literal di call-site (dipaksakan ESLint `no-restricted-syntax`).
5. **`SET` tanpa TTL = error review.** Pengecualian hanya `*:ops:*history` dan `*:idem:*`.
6. **Tabel baru wajib punya header klasifikasi** `{@class A|B|C|D|E|F}` di komentar definisi + masuk matriks §C.
7. **Satu task = satu commit = satu gate** (typecheck·lint·prettier·test + smoke route terkait). Gagal gate = tidak lanjut task berikut.

---

## §C. REGISTRY LENGKAP (hasil audit kode — tidak ada yang terlewat)

### C.1 PostgreSQL — inventaris tabel → target
| Tabel | Kelas | Schema target | Writer resmi (Single Writer) |
|---|---|---|---|
| users | B | identity | AuthRepository/UserRepository |
| sessions | B | identity | SessionRepository |
| devices | B | identity | DeviceRepository |
| verification_tokens | B(+E mirror) | identity | VerificationRepository |
| notification_preferences | B | identity | (repo prefs) |
| login_attempts ⚠️(baru terdeteksi) | C/E | ops | LoginAttemptRepository (retensi 90d) |
| credit_transactions | **A** | money | CreditRepository (via dbMoney) |
| credit_vouchers | **A** | money | VoucherRepository (via dbMoney) |
| ai_agents | B | trading | AgentRepository |
| symbols / stream_symbols / ohlc_symbols | F | trading | Symbol/OhlcSymbol/StreamSymbolRepository |
| news_articles | F | content | NewsRepository |
| calendar_events | F | content | CalendarRepository (+Seeder/Sync writer via repo) |
| chat_sessions, chat_messages | F+C | content | ChatRepository / MessageRepository ⚠️audit-dedup T0.9 |
| admin_actions, activity_logs | C | ops | AdminActionRepo / ActivityLogRepo |
| worker_states | C/D | ops | WorkerStateRepository (API relay baca Redis) |
| usage_daily (BARU) | D/A-derived | ops | AnalyticsAggregator saja |
| money.ledger_entries (BARU, Fase 5) | **A** | money | LedgerRepository saja |

### C.2 Redis — key existing → target namespace/tier/TTL
| Existing | Tier | Namespace baru | TTL | Task |
|---|---|---|---|---|
| auth:captcha:{id} | R1 | b:{env}:auth:captcha:{id} | 300s | T9 |
| auth:oauth_code:{code} | R1 | b:{env}:auth:oauth:{code} | 300s | T9 |
| auth:stream_ticket:{t} | R1 | b:{env}:auth:ticket:{t} | 60s | T9 |
| market cache (RedisMarketCacheStore) | R0 | b:{env}:market:price:{SYM} | 5–60s | T7 |
| analytics counters | R0/R2 | b:{env}:ops:gauges / :analytics | overwrite/60s | T10 |
| rate-limit (in-memory) | R1 | b:{env}:rl:{scope}:{id} | window | T8 |
| worker cmd bus channel | R2 | b:{env}:wcmd:{workerId} | n/a pub/sub | T7 (rename saat sentuh) |
| news seen-window (in-memory relay) | R2 | b:{env}:news:seen | 48h | T14 |
| idempotency (baru Fase 5) | R1 | b:{env}:idem:{scope}:{key} | 24h | T19 |
| gauges/history (baru) | R0 | b:{env}:ops:gauges / :gauges:hist | –/7d | T10 |

### C.3 Duplikasi/redundansi yang WAJIB diaudit di T0.9 (jangan dibawa ke masa depan)
- `ChatRepository` vs `MessageRepository` — apakah dua pintu untuk tabel sama?
- `GetInbox/GetSentMessages/GetThread` messaging use-cases vs chat repos — overlap query?
- `verification_tokens` PG vs mirror Redis — pastikan satu writer.
- Barrel `use-cases/index` — export ganda nama sama?

---

## §D. TASK CARDS (format: Goal · DependsOn · Files · Apply · Verify · Rollback)

### FASE 0 — BASELINE (tanpa risiko, wajib pertama)
**T0.1 pg_stat_statements ON**
Files: `apps/api/src/plugins/container.plugin.ts`(init SQL), ops doc.
Apply: `CREATE EXTENSION IF NOT EXISTS pg_stat_statements;` + preload lib di instance; buat view top-10.
Verify: query view mengembalikan baris. Rollback: DROP EXTENSION.

**T0.2 Size report**
Apply: skrip `docs/ops/table-sizes.sql` (pg_total_relation_size semua tabel).
Verify: output tersimpan `docs/ops/baseline-sizes.txt`. Rollback: –.

**T0.3 Golden snapshots**
Files: `docs/ops/golden/*.json`.
Apply: simpan hasil JSON `getSystemMetrics()`, `getUserAnalytics()`, news page-1, calendar month saat ini (label tanggal). Buat test parity util `compareGolden()` (deep-equal numeric tolerance 0).
Verify: test parity hijau vs dirinya sendiri. Rollback: hapus folder.

**T0.9 Dedup audit**
Apply: baca kedua repo chat/message + barrels; tulis temuan di dokumen ini §C.3 (ya/tidak merge). **Tidak ada perubahan kode di task ini.**

### FASE 1 — INDEX & AGREGAT (mengurangi beban, belum pindah sumber)
**T1.1 Index agregat (CONCURRENTLY)**
Apply: 3 statement `CREATE INDEX CONCURRENTLY` (chat_messages(created_at) INCLUDE tokens; users(created_at); sessions partial aktif).
Verify: `\di` + EXPLAIN agregat metrics memakai index. Rollback: DROP INDEX CONCURRENTLY.

**T1.2 `usage_daily` + backfill**
Apply: tabel + unique(date, agent_id) + script backfill idempotent `ON CONFLICT DO UPDATE`; jadwalkan refresh harian di cleanup-worker.
Verify: `SELECT SUM(in+out) FROM usage_daily` == SUM dari chat_messages (parity SQL). Rollback: DROP TABLE (belum dipakai baca).

**T1.3 Dual-run analytics**
Apply: `getUserAnalytics` tambahan cabang flag `USE_USAGE_DAILY` membaca usage_daily; log diff hasil lama/baru (info) selama ≥3 hari.
Verify: log diff kosong 3 hari berturut. Rollback: flag tetap lama.

**T1.4 Switch + cleanup**
Apply: default flag → baru; hapus query agregat token lama dari hot path (pindah ke fungsi audit-only).
Verify: golden T0.3 masih cocok; latency p95 turun. Rollback: balik flag.

### FASE 2 — REDIS HYGIENE (registry dulu, baru isi)
**T2.1 `redis-keys.ts`**
Files: `packages/infra/src/persistence/redis/redis-keys.ts` + ESLint restriction.
Apply: builder semua key §C.2; refactor 3 store auth + market cache memakai builder (perilaku identik).
Verify: FE/BE test + grep tidak ada literal key lama di call-site. Rollback: revert commit.

**T2.2 Rate limiter → Redis (R1)**
Apply: plugin limit baca backend flag `RATELIMIT_BACKEND=memory|redis`; redis = INCR+EXPIRE via builder `rl:`. Fail-open terdokumentasi (Redis down → memory fallback + warn).
Verify: dua instance proses berbagi counter (test integrasi lokal). Rollback: flag memory.

**T2.3 Rename auth keys (dual-read)**
Apply: baca key lama dulu, jika null baca baru; tulis selalu baru; setelah 1 rilis hapus baca-lama.
Verify: smoke captcha/ticket/oauth. Rollback: balik urutan baca.

### FASE 3 — OPS PIPELINE (dashboard tanpa hajar PG)
**T3.1 Ops Aggregator**
Apply: interval 60s + leader-lock `b:{env}:ops:lock` (SET NX EX 55) → hitung metrics+analytics sekali → tulis hash `ops:gauges` + ZSET history 7d; SSE ticker & GET endpoints baca Redis (flag `OPS_SOURCE=pg|redis`, default pg sampai parity 24h).
Verify: parity vs golden ±tolerance; flush R0 → dashboard tetap hidup (fallback baca PG sekali + warn).
Rollback: flag pg.

**T3.2 Cache offloads**
Apply: news page-1 (30s), calendar month (1h), symbol catalog (5m) — invalidasi otomatis oleh seeder/sync (panggil `cache.bump()` builder).
Verify: second-load < 5ms tanpa query PG (log). Rollback: TTL 1s (efek nonaktif).

**T3.3 Worker heartbeat Redis + maintenance read Redis**
Apply: SET EX 90s per worker; halaman maintenance baca Redis, fallback PG.
Verify: stop worker → status stale hilang ≤90s. Rollback: baca PG lagi.

### FASE 4 — STRUKTUR PG
**T4.1 SET SCHEMA massal** — per tabel: `LOCK TIMEOUT 5s; ALTER TABLE … SET SCHEMA …;` + update pgTable qualified names + regenerate drizzle SQL migration (review manual!). Urutan: content→trading→identity→ops→money(kosong dulu).
Verify: tsc + drizzle migrate di staging copy + smoke semua route. Rollback: ALTER balik (skrip down disimpan per tabel).
**T4.2 Roles & grants** — buat 4 role, grant minimum, revoke PUBLIC; kredensial per service via env.
Verify: svc_worker gagal SELECT money.*. Rollback: grant sementara luas + catat.
**T4.3 Partisi bulanan** chat_messages/activity_logs/admin_actions: buat parent partitioned + attach tabel lama sebagai partisi pertama (pola standard, downtime per tabel ≈ detik-jmenit).
Verify: insert lintas batas bulat OK. Rollback: detach + unpartition.
**T4.4 pgbouncer** transaction mode; pool app→bouncer; ukuran total ≤ max_connections−headroom.
Verify: 40 simulasi koneksi stabil. Rollback: URL langsung.

### FASE 5 — MONEY READINESS
**T5.1 `DATABASE_URL_MONEY` + dual-pool** (Credit/Voucher repo → pool money). Verify: voucher redeem flow e2e lokal. Rollback: env kosong = fallback app-pool (kode tetap support).
**T5.2 Ledger + idempotency**: tabel ledger append-only + middleware Idempotency-Key; backfill ledger dari credit_transactions (sum parity wajib == saldo users). Verify: parity + replay request 2× efek 1×. Rollback: fitur uang baru dimatikan flag; data lama utuh.
**T5.3 Backup MONEY hourly-WAL + script drill restore** (`docs/ops/drill-money.md`). Verify: restore ke server lokal, checksum saldo == produksi snapshot.

---

## §E. GRAF DEPENDENSI (urutan aman)
```
T0.1→T0.2→T0.3→T0.9
        └──────────────▶ T1.1→T1.2→T1.3→T1.4
T2.1→T2.2→T2.3 ──────────▶ T3.1→T3.2→T3.3
T1.4 & T3.x selesai ──────▶ T4.1→T4.2→T4.3→T4.4 ─▶ T5.1→T5.2→T5.3
```
Paralel aman: jalur T2.* dapat berjalan bersama T1.* (beda domain), asal satu commit per task.

## §F. MONITORING & ALERTING (ditambahkan saat T0/T3)
- PG: koneksi terpakai >80% max; p95 query metrics >100ms; seq_scan naik >20%/hari pada tabel inti; disk >75%.
- Redis: memory >75%, evicted_keys >0/min (R0), error rate REST >1%, kuota harian Upstash >70% budget (pola sama seperti FXMACRO budget).
- App: `stage=DB_INGEST` muncul ≥3×/jam (news), SSE client drop spike.

## §G. SECURITY
- TLS ke PG (sslmode require-minimum); Upstash token per-tier (rotasi kuartalan); ACL user Redis per aplikasi bila self-host; secret hanya env server; audit setiap perubahan grant (simpan SQL di `docs/ops/grants/`).

## §H. ENV VAR BARU (ringkas)
`USE_USAGE_DAILY`, `OPS_SOURCE`, `RATELIMIT_BACKEND`, `DATABASE_URL_MONEY`, `REDIS_TIER_URLS(optional)`, `FINNHUB_TIMEOUT_MS`(sudah), `NEWS_RELAY_INTERVAL_MS`.

## §I. YANG SENGAJA TIDAK DIUBAH (cegah scope-creep)
Arsitektur hexagonal, pembagian worker, pola SSE yang sudah benar, kalender/market flow. Plan ini HANYA menyentuh persistence & cache layer.

## §J. DoD GLOBAL
1. Semua task card ✔ dengan gate hijau per commit.
2. Dashboard 30 menit idle-safe = 0 full-scan agregat (bukti pg_stat_statements).
3. FLUSH R0 tidak mengubah perilaku (fallback teruji).
4. Parity log bersih 3 hari sebelum tiap switch.
5. Restore drill MONEY sukses terdokumentasi.
