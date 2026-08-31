// Configuration Interface
export * from './config/index.js';

// T-4 — shared logger primitive (T-6: transport gated on NODE_ENV).
export { logger } from './logger.js';

// Schemas & DTOs
export * from './schemas/index.js';

// Application Services
export * from './services/index.js';

// Use Cases - Identity
export * from './use-cases/identity/index.js';

// Use Cases - Intelligence
export * from './use-cases/intelligence/index.js';

// Use Cases - Market
export * from './use-cases/market/index.js';

// Use Cases - News
export * from './use-cases/news/index.js';

// Use Cases - Messaging
export * from './use-cases/messaging/index.js';

// Use Cases - Calendar
export * from './use-cases/calendar/index.js';

// Use Cases - Admin
export * from './use-cases/admin/index.js';

// Background Workers Registry
export * from './workers/index.js';

// Shared Event Handlers
export * from './handlers/index.js';
