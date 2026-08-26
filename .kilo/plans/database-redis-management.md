# 🗄️ DATABASE & REDIS MANAGEMENT PLAN — v3 (DEEP-DIVE EDITION)
**Repo:** Betrix-Reborn · **Tanggal:** 2026-08-26 · **Status:** BLUEPRINT v3 (menunggu approval)
**Provenance:** v2 + hasil deep-dive 5 agen investigasi independen (skema PG, pola query/repo, peta Redis+state in-memory, audit worker/scheduler, alur uang & config).

---

## §A. PERUBAHAN v2 → v3 (apa yang ditambah/dikoreksi)

| # | Temuan deep-dive | Dampak ke plan |
|---|---|---|
| K1 | 🚨 `credit_transactions`: **NOL index sekunder** + FK `ON DELETE CASCADE` dari users → hapus akun = riwayat finansial musnah | Task baru T4.0a/b (index darurat dipindah ke Fase 1; FK→SET NULL + larang hard-delete di Fase Money) |
| K2 | 🚨 `admin_actions.admin_id` / `activity_logs.user_id` juga CASCADE → jejak audit ikut terhapus | Masuk Fase 4 (FK SET NULL + kebijakan ban-only) |
| K3 | 🚨 `UpdateAdminUserUseCase` menulis SEMUA kolom User termasuk `credits` dari bacaan basuhan → lost-update saldo (HIGH money) | Task baru T5.0a |
| K4 | 🚨 `reserved_credits` tanpa expiry/sweeper → crash = hold bocor permanen | Task baru T5.0b (`reserved_until` + reaper) |
| K5 | 🚨 Adjust kredit ≠ audit dalam 1 tx; sentinel `-1` lolos ke respons `success:true,credits:-1` | Task baru T5.0c (`adjustCreditsWithAudit` + typed error) |
| K6 | `ai_agents.api_key` **plaintext** di DB | Task baru Fase 5 (encrypt/vault + mask response) |
| K7 | ❌ **Tidak ada leader-lock**: 2 proses worker = konsumsi Finnhub dobel, command dieksekusi 2×, worker_states thrash | Task baru T6.1 (lease Redis SET NX / advisory lock) |
| K8 | Bug state-machine: pause ws-worker tertelan reconnect (ping branch sebelum cek paused) | T6.2 |
| K9 | Seeder fetch FXMacroData SEBELUM cek apa pun → crash-loop = 288 call/hari | T6.3 (marker last_seed_at) |
| K10 | Budget guard hanya melindungi refresh; daily-join & SSE handler lewat | T6.4 |
| K11 | Dispatch command tidak diserialisasi → double timer; report lama menimpa status baru | T6.5 |
| K12 | Billing pakai ESTIMASI chars÷4; `usage` provider tidak dibaca | T1.5 (akurasi revenue) |
| K13 | Idempotency: `chat/stream`, `chat`, create-voucher, login-session = **nol proteksi** | Diperluas ke T5.2 + middleware global |
| K14 | Worker `createRedisClient()` tanpa arg → prod fallback localhost dev (split-brain) | T7.2 |
| K15 | `createPgPool` tanpa statement/idle timeout | T7.1 |
| K16 | Worker logger pino-pretty selalu ON di prod; `EventDispatcher`/`ChatLoggingHandler` pakai `console.error` | T7.3 |
| K17 | Index tambahan besar (google_id unique, sessions(user_id,expires_at), devices(user_id), verification_tokens(user_id,type)+(expires_at), credit_transactions(user_id,created_at), vouchers filter, admin_actions(target_id), failed_login(created_at), news GIN(tags)+trgm) | T1.1 diperluas |
| K18 | Retensi bolong: `activity_logs` (dikecualikan cleanup!), `admin_actions`, `news_articles`, `calendar_events <Y-1`, `devices` (tanpa purge sama sekali), voucher expired | T4.5 (extend SystemCleanupUseCase) |
| K19 | `market:prices:all` hash **tanpa TTL/evict** → simbol mati mengendap selamanya; ws mati = harga basah selamanya | T2.4 |
| K20 | 🔥 **Krisis kuota Upstash**: ticker HGETALL 1s = 86.400 ops/hari ≈ **8,7×** free-tier sendirian; tick HSET 60–600/min lagi | T2.5 (interval adaptif + per-symbol keys + budget guard ala FXMacro) |
| K21 | Rate-limit in-memory × replica = brute-force dilipatgandakan N | T2.2 dikonfirmasi (custom store INCR+PEXPIRE) |
| K22 | `broadcastToUser` hanya tembus replica sama; ticker/poll dilipatgandakan per replica | T7.4 (fan-out pub/sub topic; defer sampai multi-replica nyata) |
| K23 | Dead code repo terkonfirmasi: `updateCredits`, `updateStatus`, `getHistory`, `findRecentByUserId`, `SessionRepository.findById`, `DeviceRepository.deleteByUserId`, `RedisOAuthCodeStore` (unwired), `subscribeReports` (tanpa caller) | T0.5 cleanup list |
| K24 | Verdict T0.9: **ChatRepository ≠ MessageRepository** (tabel/port/konsumen beda total) → TIDAK digabung; cukup dokumentasi istilah | §C.3 closed |
| K25 | OHLC bars **tidak ada di PG sama sekali** (hanya config symbol; bars live di Redis dengan TTL rollover ✓) | Registry dikoreksi |
| K26 | Rantai migrasi rusak: snapshot 0008/0009 hilang; drizzle.config db=`betrix` vs migrate.ts `betrix_reborn`; kredensial dev ter-embed; tanpa down-migration & CI drift check | T0.4 |
| K27 | `users` hard-delete memusnahkan seluruh graf (termasuk ledger A) → kebijakan soft-delete/ban-only | Fase 5 |
| K28 | `dbPoolActive/Idle` hard-coded `1/0` → dashboard bohong | T1.6 |
| K29 | N+1: broadcast ≤10k insert loop, batch-revoke loop, change-password loop, D1 sync loop, calendar upsert loop | T4.6 (sweep) |
| K30 | Auth double-hit tiap request (findByToken+findById) — pasangan query TERTINGGI QPS | T3.4 (cache digest→user 60s, optional) |

---

## §B. TUJUH HUKUM ANTI-BUG / ANTI-REDUNDAN (tetap)
1. Baseline dulu (T0.*), ubah kemudian. 2. Parity ≥24 jam sebelum switch sumber baca. 3. Single Source of Truth + Single Writer. 4. Semua key via `redis-keys.ts`. 5. `SET` tanpa TTL = error review (kecuali ops-history & idem). 6. Tabel baru wajib header klasifikasi `{@class}`. 7. Satu task = satu commit = satu gate.
**🆕 Hukum 8 (dari deep-dive):** *Uang tidak boleh melewati jalur fire-and-forget* — setiap mutasi saldo/ledger synchronous, atomic, dengan audit dalam batas transaksi yang sama.

---

## §C. REGISTRY (dikoreksi v3)

### C.1 PostgreSQL — 18 tabel (+2 baru)
| Tabel | Kelas | Schema target | Catatan v3 |
|---|---|---|---|
| users | B | identity | ⚠️ tanpa updated_at/soft-delete; google_id butuh UNIQUE; hard-delete = K27 |
| sessions | B | identity | token SHA-256 ✓; idx user_id+expires_at (K17) |
| devices | B | identity | idx user_id (K17); purge >180d (K18) |
| verification_tokens | B/E-mirror | identity | idx (user_id,type),(expires_at) (K17) |
| notification_preferences | B | identity | ok |
| failed_login_attempts *(bukan "login_attempts")* | C | ops | idx (email,created_at) sudah ✓; tambah created_at polos utk range-delete |
| **credit_transactions** | **A** | money | 🚨 nol index + CASCADE (K1) → idx (user_id,created_at) di Fase 1 |
| **credit_vouchers** | **A** | money | idx filter/sort (is_redeemed,created_at,amount,redeemed_at); purge expired>90d (K18) |
| ai_agents | B | trading | 🚨 api_key plaintext (K6) |
| symbols / stream_symbols / ohlc_symbols | F | trading | ⚠️ kolom mapping vendor terduplikasi antar tabel → putuskan SSOT (task kecil T4.6b) |
| news_articles | F | content | GIN(tags)+trgm headline/summary (K17); purge >18bln (K18); kolom `datetime` bigint — rename saat partisi |
| calendar_events | F | content | ⚠️ datetime_utc/local varchar(40) → timestamptz saat Fase 4; nilai indikator double = OK (bukan uang); purge < Y−1 (K18) |
| chat_sessions ❌tidak ada / chat_messages | F+C | content | session_id string longgar tanpa parent table (dokumentasikan sebagai opaque grouping atau buat tabel — keputusan T4.6c); partisi bulanan; K17 index INCLUDE tokens |
| messages | C | ops→content | ✅ soft-delete contoh baik; reply_to tanpa self-FK; thread_id tanpa threads table (dokumentasi) |
| admin_actions / activity_logs | C | ops | 🚨 CASCADE (K2); target_id idx; purge/archive (K18) |
| worker_states | C/D | ops | bounded ✓; status free-text cast (enum task T4.6d) |
| usage_daily 🆕 | D/A-derived | ops | writer tunggal aggregator |
| money.ledger_entries 🆕 (Fase 5) | **A** | money | append-only grant-locked |

### C.2 Redis — katalog final (7 famili, semua di 1 logical DB ⚠️)
| Key/channel | TTL | Tier baru | Catatan v3 |
|---|---|---|---|
| market:prices:all (hash) | ❌ NONE | R0 | K19/K20: pecah per-symbol EX120 ATAU timestamp-filter + UNLINK stale; ticker 1s→adaptif |
| market:ohlc:{SYM}:{tf} | ✓ rollover | R0 | hanya 'd1' yang pernah ditulis |
| auth:captcha:{id} | 300s | R1 | rename ns baru |
| auth:oauth_code:{code} | 300s | R1 | **DEAD** (store tak pernah dikonstruksi) → wire ke Google flow asli atau hapus (T0.5) |
| auth:stream_ticket:{t} | 60s | R1 | ok |
| worker:command:{id} / worker:report:{id} | pub/sub | R2 | report channel **tanpa subscriber** (dead surface, T0.5) |
| 🆕 rl:{scope}:{id} | window | R1 | T2.2 |
| 🆕 ops:gauges / :analytics / :gauges:hist | –/60s/7d | R0 | T3.1 |
| 🆕 cache:news:page1, cache:calendar:* , cache:symbols | 30s/1h/5m | R0 | T3.2 |
| 🆕 auth:sessdigest:{hash} → userId (opsional) | 60s | R1 | T3.4 |
| 🆕 news:seen | 48h | R2 | ganti Set in-memory (juga fix K-unbounded) |
| 🆕 idem:{scope}:{key} | 24h | R1 | T5.2 |

### C.3 Dedup verdict (CLOSED)
`chat_messages` (AI logs, driver analytics) vs `messages` (inbox user-to-user, punya soft-delete) — beda port/konsumen/tabel. **Jangan digabung.** Dokumentasikan istilah: "chat"=AI, "message"=internal mail.

---

## §D. TASK CARDS (urut eksekusi; format Goal·Depends·Files·Apply·Verify·Rollback)

### FASE 0 — BASELINE ✅ SELESAI 2026-08-26
Status eksekusi (detail task di bawah):
- [x] T0.1 ✔ `Backend/scripts/ops/001_enable_pg_stat_statements.sql` siap — eksekusi butuh PG live (sandbox tanpa infra); termasuk langkah preload `shared_preload_libraries`.
- [x] T0.2 ✔ `scripts/ops/002_table_baseline.sql` siap (sizes + index inventory).
- [x] T0.3 ✔ Harness golden: `scripts/ops/capture-golden.sh` + `diff-json.mjs` (toleransi numerik) — snapshot asli diambil saat pertama deploy dengan DB hidup.
- [x] T0.4 ✔ `drizzle-kit check` = Everything's fine ✓ · kredensial embed dibuang dari drizzle.config.ts & migrate.ts (DATABASE_URL dari env) · script db:check/db:generate di @betrix/infra · snapshot meta 0008/0009 absen tapi check lolos & future generate aman.
- [x] T0.5 ✔ Dead cleanup tereksekusi penuh + test disesuaikan + logger injection (EventDispatcher onError & ChatLoggingHandler logger menggantikan console.error).
- [x] GATE: BE tsc 7/7 · eslint · prettier · unit 6+44+2+28 ✓
> Rollback: revert commit fase-0. Lingkungan: node_modules/dist Backend sempat ter-bersihkan GC sandbox — dipulihkan via pnpm install bersih + rebuild 5 lib.

---
Detail task card (arsitektur):
- **T0.1** pg_stat_statements ON + view top-10. Verify: view berisi baris. RB: DROP EXTENSION.
- **T0.2** table-sizes.sql → baseline-sizes.txt.
- **T0.3** Golden snapshots JSON (metrics, analytics, news page1, calendar month) + util compareGolden.
- **T0.4** 🆕 Repair migration chain: regenerate baseline agar snapshot meta lengkap (squash untuk deploy baru), samakan db-name drizzle.config vs migrate.ts, keluarkan kredensial embed → env, tambah CI `drizzle-kit generate --dry-run` anti-drift. Verify: dry-run kosong diff. RB: revert commit.
- **T0.5** 🆕 Dead-method/file cleanup: `updateCredits`,`updateStatus`,`getHistory`,`findRecentByUserId`,`SessionRepo.findById`,`DeviceRepo.deleteByUserId`; putuskan `RedisOAuthCodeStore` (wire Google asli vs hapus) & `subscribeReports` (wire panel vs hapus); `EventDispatcher/ChatLoggingHandler` console.error→pino. Verify: grep residual kosong + test hijau. RB: revert.
- **T0.9** Dedup audit → CLOSED (verdict §C.3). Sisa: putuskan chat_sessions/messages-threads & symbols-SSOT di T4.6b/c.

### FASE 1 — INDEX, AGREGAT, AKURASI ✅ SELESAI 2026-08-26
Status eksekusi:
- [x] T1.1 ✔ Index pass lengkap: ditambahkan ke schema Drizzle (19 index, termasuk `users_google_id_unique` & GIN tags) → migrasi `0011_mushy_iron_monger.sql` tergenerasi; **untuk DB eksisting** jalankan `scripts/ops/003_phase1_indexes.sql` (CONCURRENTLY, idempotent). Trgm ilike = opsional di script yang sama.
- [x] T1.2 ✔ `usage_daily` (PK composite date+agent_id) + `upsertRecentUsageDaily(3)` dipanggil tiap tick cleanup-worker; backfill full-history: `scripts/ops/004_backfill_usage_daily.sql` (termasuk query parity).
- [x] T1.3 ✔ Dual-run: flag `USE_USAGE_DAILY=true` membaca usage_daily sambil tetap menghitung jalur lama untuk parity (golden harness siap; jalankan capture 2 label saat deploy).
- [x] T1.4 ✔ Switch tersedia via flag (default masih legacy sampai parity live 3 hari — sesuai hukum #2).
- [x] T1.5 ✔ Billing akurasi: gateway menangkap `usage` provider (chunk akhir OpenAI-compatible); prioritas real→estimate; flag BILLING_SOURCE=provider|estimate.
- [x] T1.6 ✔ dbPoolActive/dbPoolIdle kini REAL dari pg pool sampler (container menyuntikkan pool) — hard-coded 1/0 dihapus.
- GATE: BE tsc 7/7 · eslint · prettier · unit 6+44+2+28 ✓
> Rollback: per-task revert; switch balik via env flag tanpa deploy kode baru.
Detail task card:
- **T1.1 INDEX PASS (CONCURRENTLY)** — daftar lengkap K17: sessions(user_id),(expires_at); devices(user_id); users(google_id UNIQUE),(tier),(created_at),(last_active); verification_tokens(user_id,type),(expires_at); credit_transactions(user_id,created_at)🚨prioritas; credit_vouchers(is_redeemed),(created_at),(amount),(redeemed_at); admin_actions(target_id); failed_login(created_at); news GIN(tags)+pg_trgm(headline,summary). Verify: EXPLAIN agregat & getHistory memakai index. RB: DROP CONCURRENTLY.

### FASE 2 — REDIS HYGIENE + KUOTA
- **T2.1** `redis-keys.ts` typed builders (semua §C.2, prefix `b:{env}:`) + ESLint no-restricted-imports/syntax; refactor 3 modul store.
- **T2.2** Rate limiter → custom store @fastify/rate-limit (INCR+PEXPIRE, R1); fail-open→memory+warn; flag RATELIMIT_BACKEND.
- **T2.3** Rename auth keys dual-read window.
- **T2.4** 🆕 Market price staleness: getAllPrices/getPrice filter `timestamp` (data sudah punya); cleanup-worker UNLINK field symbol yang hilang dari stream_symbols; (opsional penuh) pecah hash→per-symbol key EX120.
- **T2.5** 🔥 Kuota guard Redis: ticker market 1s→**5s + adaptive idle-backoff**, pipeline multi-get per tick; pasang counter harian ala `consumeDailyBudget` (REDIS_DAILY_BUDGET) + alert §F; opsional arahkan UPSTASH ke self-host SRH (dev compose sudah ada).
Verify: hitung ops/hari dari log budget < 70% tier. Rollback: interval lama.

### FASE 2.5 — WORKER HARDENING (semua K7–K11)
- **T6.1 Leader lease** di ManagedWorkerBase: `SET b:{env}:wlock:{id} {instanceId} NX PX 90000` + renew 30s + release Lua-compare on stop; follower standby (tetap subscribe, skip timer). Alternatif PG advisory lock.
- **T6.2** ws-worker: pindahkan cek isPaused SETELAH branch ping/pong; scheduleReconnect hormati paused; doPause set flag reconnect-aware.
- **T6.3** Seeder: marker `last_seed_ok_at` (worker_states.lastReportAt atau KV) — skip fetchSchedule bila < N jam.
- **T6.4** Budget guard mencakup joinWithAnnouncementsAndPredictions & handleStreamEvent (alokasi 40 refresh / 60 join-SSE).
- **T6.5** Dispatch chain serialization (`dispatchChain.then(...)`) + guard `if(this.timer)return` di tiap doStart + recordReport tolak timpa status bila last_command_at lebih baru.
- **T6.6** Jitter cron rollover (offset 0/3/7 mnt) + isRunning guards: refreshRecentValues, syncIfMonthMissing, seedCurrentMonthIfMissing, seedStartupYears, runCleanup, syncD1Baselines.
- **T6.7** Shutdown grace: expose activeTick promise; main.ts race(allTicks, 10s) sebelum exit.
Verify per task: unit + dual-process smoke (jalankan 2 worker lokal, pastikan hanya 1 leader). RB: per-commit revert.

### FASE 3 — OPS PIPELINE & CACHE (tetap, plus)
- **T3.1** Ops Aggregator 60s → gauges (flag OPS_SOURCE, parity vs golden 24h) + **fix K: analytics subselect OR index-hostile → rewrite IN-list/join saat pivot**.
- **T3.2** Cache offloads (news/calendar/symbols) + invalidasi bump().
- **T3.3** Heartbeat worker Redis + maintenance read Redis.
- **T3.4** (optional) Auth hot-pair cache 60s keyed session-digest — invalidate pada revoke/reset/change-password/logoutAll.

### FASE 4 — STRUKTUR PG
- **T4.0** 🆕 Integrity money/audit dini (boleh masuk Fase 4 awal): FK ledger/audit CASCADE→SET NULL; users hard-delete→soft-delete/ban-only (hapus route delete fisik admin); trigger/blocker UPDATE-DELETE pada credit_transactions (append-only enforcement).
- **T4.1** SET SCHEMA massal (identity/money/trading/content/ops) + qualified pgTable + regenerate migration review manual.
- **T4.2** Roles/grants least-privilege (money_svc tunggal penulis money).
- **T4.3** Partisi bulanan chat_messages/activity_logs/admin_actions (+news saat retensi aktif).
- **T4.4** pgbouncer transaction pooling.
- **T4.5** 🆕 Retensi lengkap via SystemCleanupUseCase: devices>180d, activity_logs>90d(archive dulu), news>18bln, calendar<startOf(Y−1), vouchers expired>90d, chat_messages per-user configurable.
- **T4.6** 🆕 Sweep N+1 & konsistensi: broadcast→multi-row INSERT tx; batch-revoke→DELETE ANY(:ids); change-password→deleteByUserId; agent set-default→partial unique index (single statement); calendar upsertOne terima patch hasil compute; putuskan chat_sessions/threads & symbols vendor-column SSOT; enum/CHECK untuk status/tier/importance/action; updated_at trigger utk users/sessions/devices/messages/vouchers; calendar varchar→timestamptz; messages.reply_to self-FK.

### FASE 5 — MONEY SPLIT & LEDGER
- **T5.0a** 🚨 Fix clobber: exclude credits/reservedCredits dari generic `update()` (whitelist kolom DTO).
- **T5.0b** 🚨 `reserved_until` + sweeper release expired holds (interval cleanup) + release-on-shutdown hook.
- **T5.0c** 🚨 `adjustCreditsWithAudit(adminId,userId,delta,ctx)` satu tx (balance+audit); `-1`→typed InsufficientBalanceError (402/409), buang sentinel.
- **T5.1** DATABASE_URL_MONEY + dual-pool (Credit/Voucher→money pool).
- **T5.2** Ledger double-entry + backfill parity (sum ledger == Σ users.credits) + **Idempotency-Key middleware** (scope: redeem, chat/stream, chat, create-voucher, login session-create dedupe).
- **T5.3** Backup hourly-WAL money + drill restore script.
- **T5.4** 🆕 api_key encryption at rest (AES-GCM, key dari env) + mask di admin response + rotasi key lama.

---

## §E. GRAF DEPENDENSI
```
T0.1→T0.2→T0.3→T0.4→T0.5→T0.9(closed)
                     ├─▶ T1.1→T1.2→T1.3→T1.4→T1.5→T1.6
T2.1→T2.2→T2.3→T2.4→T2.5 ────────────────┐
                                          ├─▶ T4.0→T4.1→T4.2→T4.3→T4.4→T4.5→T4.6
T6.1..T6.7 (parallel dgn T1/T2) ──────────┘        └─▶ T5.0abc→T5.1→T5.2→T5.3→T5.4
```

## §F. MONITORING & ALERTING
PG: conn>80% max · metrics p95>100ms · seq_scan naik>20%/hari · disk>75%. Redis: mem>75% · evicted>0/min · REST err>1% · **budget harian >70%** (R0/R1 terpisah). App: stage=DB_INGEST≥3/jam · leader-lock flapping · SSE drop spike · reserved_credits total >X tanpa settle 1 jam.

## §G. SECURITY TAMBAHAN (v3)
TLS PG sslmode minimum · token Upstash per-tier + rotasi kuartalan · ACL user Redis per app (self-host) · TRUST_PROXY CIDR eksplisit + startup warning · secret payment hanya server-side · semua grant changes tersimpan `docs/ops/grants/`.

## §H. ENV VAR BARU
USE_USAGE_DAILY · OPS_SOURCE · BILLING_SOURCE · RATELIMIT_BACKEND · DATABASE_URL_MONEY · FINNHUB_TIMEOUT_MS(sudah) · NEWS_RELAY_INTERVAL_MS · REDIS_DAILY_BUDGET · WORKER_LEASE_TTL_MS · MARKET_TICKER_INTERVAL_MS · CALENDAR_SEED_MIN_GAP_HOURS.

## §I. YANG SENGAJA TIDAK DIUBAH
Hexagonal architecture · pembagian 6 worker · pola SSE & relay DB · reserve/settle/release primitives (sudah benar — hanya butuh sweeper & akurasi) · redeemAtomically (best-in-class) · pembagian chat vs messages.

## §J. DoD GLOBAL (v3)
1. Semua task ✔ gate hijau per commit. 2. Dashboard 30m idle = **0** full-scan agregat (bukti pg_stat_statements). 3. FLUSH R0 aman (fallback teruji). 4. Dual-process worker smoke: hanya 1 leader, command 1× eksekusi. 5. Redis ops/hari < budget (dashboard angka). 6. Parity bersih 3 hari tiap switch. 7. **Nol plaintext secret di DB** (cek information_schema + sample rows). 8. Restore drill money sukses; sum(ledger)==saldo. 9. Kill -9 mid-stream → reserved_credits dipulihkan oleh sweeper ≤ intervalnya.
