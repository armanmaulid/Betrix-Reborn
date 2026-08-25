// Domain-specific schema re-exports
// Each domain owns its tables; this barrel re-exports everything
// for backward compatibility with `import * as schema from './schema.js'`

export * from './identity.schema.js';
export * from './billing.schema.js';
export * from './market.schema.js';
export * from './intelligence.schema.js';
export * from './news.schema.js';
export * from './operations.schema.js';
export * from './calendar.schema.js';
