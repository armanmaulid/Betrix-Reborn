# 🎨 STYLING DAY — Execution Plan

**Repo:** Betrix-Reborn · **Branch kerja:** `session/agent_244484b0-78ac-4a56-9c70-92c472dc4529`
**Prasyarat yang SUDAH ada di `main` (`dbd4c26`):** primitif `Badge`, `PageHeader`, `FilterBar`, `TableShell` di `Frontend/src/shared/presentation/ui/` + `CalendarContainer` sebagai implementasi referensi. Test 131/131 hijau.

## Keputusan Fase 0 (sudah disetujui user)
| # | Keputusan | Nilai final |
|---|---|---|
| D1 | Root rhythm | **`space-y-3 font-mono`** (lebih rapat dari y-4 sesuai permintaan; boleh turun `y-2` saat eyeball) |
| D2 | Tombol | chip/filter = `text-[10px]` · action button = `text-xs` |
| D3 | Status badge | pindah ke UI → hapus semua `getStatusBadgeClass` / `getUserStatusBadgeClass` |

---

## FASE 1 — StatusBadge + bersih-bersih domain (commit 1)

### 1a. File BARU `src/shared/presentation/ui/status-badge.tsx`
```tsx
import React from 'react';
import { Badge, type BadgeTone } from './badge';

/**
 * UI-layer home for status→colour semantics (decision D3): domain entities
 * expose plain status strings; presentation decides colour. Unknown statuses
 * degrade gracefully to the neutral tone.
 */
const STATUS_TONES: Record<string, BadgeTone> = {
  available: 'positive', active: 'positive', running: 'positive', verified: 'positive',
  suspended: 'accent-soft', paused: 'accent-soft', pending: 'warning',
  expired: 'negative', revoked: 'negative', stopped: 'negative', error: 'negative',
  redeemed: 'neutral'
};

export interface StatusBadgeProps { status: string; className?: string }

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge tone={STATUS_TONES[status.toLowerCase()] ?? 'neutral'} className={className}>
      {status}
    </Badge>
  );
}
```

### 1b. HAPUS method (dead-code setelah migrasi)
1. `modules/billing/domain/entities/CreditVoucher.ts` — buang `getStatusBadgeClass()` (baris ±69). **`getStatus()` dipertahankan** (dipakai UI).
2. `modules/operations/domain/entities/BackgroundWorker.ts` — buang method (±93) **dan** deklarasi opsionalnya di interface (±37).
3. `shared/utils/formatters.ts` — buang `getUserStatusBadgeClass()` (72–84).
4. `operations/domain/entities/background-worker.entity.test.ts` — ganti 2 asersi badge:
   - L21 → `expect(worker.getStatus()).toBe('running');`
   - L37 → `expect(pausedWorker.getStatus()).toBe('paused');`

### 1c. Migrasi 4 konsumen (snippet persis sudah diverifikasi)
- `voucher-table.tsx` L121–127 → `<StatusBadge status={v.getStatus()} />` (+import)
- `worker-daemon-card.tsx` L20–24 → `<StatusBadge status={worker.status} />` (+import)
- `user-table.tsx` L117–122 → `<StatusBadge status={user.status} />` (+import; buang import `getUserStatusBadgeClass`)
- `user-detail-container.tsx` L186–190 → `<StatusBadge status={user.status} />` (+import; idem)
- Test baru kecil di `primitives.test.tsx`: render `<StatusBadge status="ACTIVE">` mengandung `text-positive`.

**Gate:** tsc · lint · prettier · test → commit 1.

---

## FASE 2 — Migrasi 11 halaman ke primitif (commit 2–5)

Pola per halaman (copy dari CalendarContainer):
1. Header card → `<PageHeader title icon subtitle actions>`
2. Strip filter → `<FilterBar>` (kalau multi-baris: `className="space-y-3"`)
3. Tabel → `<TableShell columns isLoading isError isEmpty …>` (state rows otomatis); tabel terpisah (*-table.tsx) menerima `columns` dari pemanggil atau definisikan sendiri
4. Root container → `space-y-3 font-mono`
5. Badge literal → `Badge`/`StatusBadge`; tombol sesuai D2

### Batch A — market trio (paling mirip calendar, tanpa grouping)
`market-catalog-container.tsx` + `-table.tsx` · `ohlc-symbols-container/-table` · `stream-symbols-container/-table`

### Batch B — billing & identity
`vouchers-container` · `voucher-table`(sudah StatusBadge di F1) · `users-container` · `user-table`(idem)

### Batch C — news & audit
`news-container`(pakai TerminalModal — biarkan) · `audit-logs-container` · `audit-table` (badge accent-soft → `Badge tone="accent-soft"`)

### Batch D — operasional form/card
`broadcast-container` · `maintenance-container` · `worker-daemon-card`(sudah di F1)

### Batch E — agents ×6
`agents-container`/`fleet-grid` · **`new-agent-container` fix h1 `text-xs`→`text-sm`** (outlier audit P3) · `agent-detail` · `agent-form` · `agent-test-console` (badge `tracking-wider` dilepas → Badge standar; tier tetap custom tone map lokal bila perlu)

### Batch F — spesial
`user-detail-container`: h1 detail resmi = `text-base font-bold text-foreground` (diformalkan di konvensi) + PageHeader TIDAK dipakai di sini (layout hero detail) · `dashboard-container`: beri root `div.space-y-3.font-mono`, header card → PageHeader, chart cards biarkan

**Gate tiap commit:** typecheck+lint+prettier+test.

---

## FASE 3 — Sweep (commit 6)
- [ ] Tombol campur (8 file dari census): pastikan chip=10px / action=xs
- [ ] e2e selectors: `th` labels kini uppercase-CSS — specs pakai `has-text("Actual")` masih cocok (case-insensitive) ✓; cek specs users/vouchers/news bila menyinggung tombol
- [ ] Eyeball 12 route; kalau `space-y-3` masih longgar → `space-y-2` global satu-ganti-semua

## FASE 4 — Gate akhir & rilis
- [ ] FE: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` — target **≥131 lulus**, warning ≤22 (tidak bertambah)
- [ ] Backend tidak tersentuh → skip gate BE
- [ ] Commit per fase; push session branch (retry bila 429); **ff-merge `main` sekali di akhir**

## Risiko & mitigasi
- Entity test pecah saat method dihapus → sudah terpetakan (1b.4)
- `TableShell` ref typing React19 → pola calendar sudah membuktikan lolos tsc
- Push 429 → retry loop dengan exit-code check (jangan `| tail` telan status)
