import { IWorkerDefinition } from './types.js';

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * 🌟 TEMPLATE DUMMY WORKER DEFINITION (CONTOH WORKER BARU)
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Panduan Membuat Worker Baru:
 * 1. Duplikasi file template ini dan beri nama sesuai fungsi worker Anda.
 *    Contoh: `AiSentimentWorkerDefinition.ts` atau `OrderExecutionWorkerDefinition.ts`.
 * 2. Sesuaikan konfigurasi metadata: `id`, `name`, `category`, `description`, `interval`.
 * 3. Export definisi worker baru Anda di `Backend/packages/application/src/workers/index.ts`.
 *    -> Worker akan OTOMATIS muncul di Dashboard Maintenance tanpa sentuh kode frontend!
 * 4. (Opsional) Jika worker memiliki proses background aktif, buat daemon-nya di `Backend/apps/worker/src/`.
 */
export const ExampleTemplateWorkerDefinition: IWorkerDefinition = {
  /** ID unik worker (lowercase, hyphen-separated, e.g. 'example-template-worker') */
  id: 'example-template-worker',

  /** Nama tampilan yang akan muncul di tabel/kartu UI Maintenance */
  name: 'Example Template / Dummy Worker',

  /** Kategori subsistem ('market' | 'news' | 'maintenance' | 'intelligence') */
  category: 'intelligence',

  /** Deskripsi lengkap yang menjelaskan tugas dan fungsi worker untuk admin audit */
  description:
    'Worker percontohan (template) untuk referensi pembuatan background worker baru. Menjalankan simulasi background task, observabilitas metrik, dan lifecycle management.',

  /** Informasi interval waktu eksekusi (e.g. '30s', '5m', 'Hourly (0 * * * *)', 'Real-time (<50ms)') */
  interval: '30s',

  /** Status default saat aplikasi pertama kali boot ('running' | 'idle' | 'paused' | 'stopped') */
  defaultStatus: 'idle',

  /** Baseline jumlah proses awal untuk observabilitas */
  initialProcessedCount: 0,

  /** Baseline jumlah error awal */
  initialErrorCount: 0,

  /** Offset milidetik untuk jadwal eksekusi berikutnya (e.g. 30000 = 30 detik dari sekarang) */
  nextRunOffsetMs: 30000,

  /**
   * Optional Lifecycle Hooks:
   * Terpanggil otomatis ketika admin menekan tombol aksi pada Dashboard Maintenance.
   */
  onStart: async () => {
    // Logika ketika worker di-start / resume
  },

  onPause: async () => {
    // Logika ketika worker di-pause
  },

  onStop: async () => {
    // Logika ketika worker di-stop
  },

  onRestart: async () => {
    // Logika ketika worker di-restart
  }
};
