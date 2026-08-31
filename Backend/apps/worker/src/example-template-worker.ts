import { logger as baseLogger } from '@betrix/application';

const logger = baseLogger.child({ worker: 'template' });

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * 🌟 TEMPLATE DUMMY WORKER RUNTIME DAEMON (CONTOH RUNTIME WORKER BARU)
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Panduan Penggunaan:
 * 1. Duplikasi file ini untuk membuat background daemon baru di `Backend/apps/worker/src/`.
 * 2. Implementasikan logika proses utama pada method `executeTask()`.
 * 3. Daftarkan instance class worker Anda di `Backend/apps/worker/src/main.ts`
 *    agar berjalan bersamaan saat `npm run dev` atau production boot.
 */
export class ExampleTemplateWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isShuttingDown = false;
  private processedCount = 0;
  private readonly intervalMs: number;

  constructor(intervalMs: number = 30_000) {
    this.intervalMs = intervalMs;
  }

  /**
   * Memulai background worker loop / cron.
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isShuttingDown = false;

    logger.info(`[ExampleTemplateWorker] Starting worker (cadence: ${this.intervalMs / 1000}s)...`);

    // Eksekusi pertama saat startup
    await this.executeTask();

    // Loop berkala
    this.timer = setInterval(async () => {
      if (this.isShuttingDown || !this.isRunning) return;
      await this.executeTask();
    }, this.intervalMs);

    logger.info('[ExampleTemplateWorker] Worker loop initialized successfully.');
  }

  /**
   * Logika utama background task (misal: panggil use case, query API external, dsb).
   */
  public async executeTask(): Promise<void> {
    try {
      this.processedCount++;
      logger.info(`[ExampleTemplateWorker] Executing background cycle #${this.processedCount}...`);

      // ─── IMPLEMENTASIKAN LOGIKA TASK ANDA DI SINI ───
      // Contoh: await someUseCase.execute();

      logger.info(`[ExampleTemplateWorker] Cycle #${this.processedCount} completed successfully.`);
    } catch (err: any) {
      logger.error({ err: err.message }, '[ExampleTemplateWorker] Error during cycle execution');
    }
  }

  /**
   * Menghentikan sementara worker (pause).
   */
  public pause(): void {
    this.isRunning = false;
    logger.info('[ExampleTemplateWorker] Worker paused.');
  }

  /**
   * Melanjutkan worker dari kondisi pause.
   */
  public resume(): void {
    this.isRunning = true;
    logger.info('[ExampleTemplateWorker] Worker resumed.');
  }

  /**
   * Menghentikan worker secara bersih (graceful shutdown).
   */
  public async stop(): Promise<void> {
    this.isShuttingDown = true;
    this.isRunning = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    logger.info('[ExampleTemplateWorker] Worker stopped cleanly.');
  }
}

// ─── Direct CLI Execution Capability ───
// Memungkinkan worker ini dijalankan langsung via CLI: `npx tsx src/example-template-worker.ts`
const isDirectExecution =
  process.argv[1]?.endsWith('example-template-worker.ts') ||
  process.argv[1]?.endsWith('example-template-worker.js');

if (isDirectExecution) {
  const worker = new ExampleTemplateWorker(10_000); // 10s interval for standalone test

  const shutdown = async () => {
    logger.info('Received termination signal. Stopping worker...');
    await worker.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  worker.start().catch((err) => {
    logger.error(err, 'Fatal error starting ExampleTemplateWorker');
    process.exit(1);
  });
}
