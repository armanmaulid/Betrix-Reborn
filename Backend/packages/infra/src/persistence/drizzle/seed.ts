import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPgPool, createDrizzleClient } from './client.js';
import { symbols, aiAgents, streamSymbols, ohlcSymbols } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });
dotenv.config();

export const DEFAULT_SYMBOLS = [
  // Forex Majors
  { symbol: 'EURUSD', description: 'Euro / US Dollar', path: 'Forex/Majors/EURUSD', category: 'forex', finnhubSymbol: 'OANDA:EUR_USD', dukascopySymbol: 'eurusd', isActive: true },
  { symbol: 'GBPUSD', description: 'British Pound / US Dollar', path: 'Forex/Majors/GBPUSD', category: 'forex', finnhubSymbol: 'OANDA:GBP_USD', dukascopySymbol: 'gbpusd', isActive: true },
  { symbol: 'USDJPY', description: 'US Dollar / Japanese Yen', path: 'Forex/Majors/USDJPY', category: 'forex', finnhubSymbol: 'OANDA:USD_JPY', dukascopySymbol: 'usdjpy', isActive: true },
  { symbol: 'USDCAD', description: 'US Dollar / Canadian Dollar', path: 'Forex/Majors/USDCAD', category: 'forex', finnhubSymbol: 'OANDA:USD_CAD', dukascopySymbol: 'usdcad', isActive: true },
  { symbol: 'AUDUSD', description: 'Australian Dollar / US Dollar', path: 'Forex/Majors/AUDUSD', category: 'forex', finnhubSymbol: 'OANDA:AUD_USD', dukascopySymbol: 'audusd', isActive: true },
  { symbol: 'NZDUSD', description: 'New Zealand Dollar / US Dollar', path: 'Forex/Majors/NZDUSD', category: 'forex', finnhubSymbol: 'OANDA:NZD_USD', dukascopySymbol: 'nzdusd', isActive: true },
  { symbol: 'USDCHF', description: 'US Dollar / Swiss Franc', path: 'Forex/Majors/USDCHF', category: 'forex', finnhubSymbol: 'OANDA:USD_CHF', dukascopySymbol: 'usdchf', isActive: true },

  // Forex Crosses
  { symbol: 'GBPJPY', description: 'British Pound / Japanese Yen', path: 'Forex/Crosses/GBPJPY', category: 'forex', finnhubSymbol: 'OANDA:GBP_JPY', dukascopySymbol: 'gbpjpy', isActive: true },
  { symbol: 'EURJPY', description: 'Euro / Japanese Yen', path: 'Forex/Crosses/EURJPY', category: 'forex', finnhubSymbol: 'OANDA:EUR_JPY', dukascopySymbol: 'eurjpy', isActive: true },
  { symbol: 'EURGBP', description: 'Euro / British Pound', path: 'Forex/Crosses/EURGBP', category: 'forex', finnhubSymbol: 'OANDA:EUR_GBP', dukascopySymbol: 'eurgbp', isActive: true },

  // Metals
  { symbol: 'XAUUSD', description: 'Gold / US Dollar', path: 'Metals/XAUUSD', category: 'metal', finnhubSymbol: 'OANDA:XAU_USD', dukascopySymbol: 'xauusd', isActive: true },
  { symbol: 'XAGUSD', description: 'Silver / US Dollar', path: 'Metals/XAGUSD', category: 'metal', finnhubSymbol: 'OANDA:XAG_USD', dukascopySymbol: 'xagusd', isActive: true },

  // Energy
  { symbol: 'XTIUSD', description: 'WTI Crude Oil / US Dollar', path: 'Energy/XTIUSD', category: 'energy', finnhubSymbol: 'OANDA:WTICO_USD', dukascopySymbol: 'lightcmdusd', isActive: true },
  { symbol: 'XBRUSD', description: 'Brent Crude Oil / US Dollar', path: 'Energy/XBRUSD', category: 'energy', finnhubSymbol: 'OANDA:BCO_USD', dukascopySymbol: 'brentcmdusd', isActive: true },

  // Crypto
  { symbol: 'BTCUSD', description: 'Bitcoin / US Dollar', path: 'Crypto/BTCUSD', category: 'crypto', finnhubSymbol: 'BINANCE:BTCUSDT', dukascopySymbol: 'btcusd', isActive: true },
  { symbol: 'ETHUSD', description: 'Ethereum / US Dollar', path: 'Crypto/ETHUSD', category: 'crypto', finnhubSymbol: 'BINANCE:ETHUSDT', dukascopySymbol: 'ethusd', isActive: true },

  // Indices
  { symbol: 'US500', description: 'S&P 500 Index', path: 'Indices/US500', category: 'indices', finnhubSymbol: 'OANDA:SPX500_USD', dukascopySymbol: 'usa500idxusd', isActive: true },
  { symbol: 'US30', description: 'Dow Jones Industrial Average', path: 'Indices/US30', category: 'indices', finnhubSymbol: 'OANDA:US30_USD', dukascopySymbol: 'usa30idxusd', isActive: true },
  { symbol: 'NAS100', description: 'Nasdaq 100 Index', path: 'Indices/NAS100', category: 'indices', finnhubSymbol: 'OANDA:NAS100_USD', dukascopySymbol: 'usatechidxusd', isActive: true }
];

// Stream (Finnhub WS) symbols — verified streamable tickers only
export const DEFAULT_STREAM_SYMBOLS = [
  // Forex
  { symbol: 'EURUSD', finnhubSymbol: 'OANDA:EUR_USD', description: 'Euro / US Dollar', category: 'forex' },
  { symbol: 'GBPUSD', finnhubSymbol: 'OANDA:GBP_USD', description: 'British Pound / US Dollar', category: 'forex' },
  { symbol: 'USDJPY', finnhubSymbol: 'OANDA:USD_JPY', description: 'US Dollar / Japanese Yen', category: 'forex' },
  { symbol: 'USDCAD', finnhubSymbol: 'OANDA:USD_CAD', description: 'US Dollar / Canadian Dollar', category: 'forex' },
  { symbol: 'AUDUSD', finnhubSymbol: 'OANDA:AUD_USD', description: 'Australian Dollar / US Dollar', category: 'forex' },
  { symbol: 'NZDUSD', finnhubSymbol: 'OANDA:NZD_USD', description: 'New Zealand Dollar / US Dollar', category: 'forex' },
  { symbol: 'USDCHF', finnhubSymbol: 'OANDA:USD_CHF', description: 'US Dollar / Swiss Franc', category: 'forex' },
  { symbol: 'GBPJPY', finnhubSymbol: 'OANDA:GBP_JPY', description: 'British Pound / Japanese Yen', category: 'forex' },
  { symbol: 'EURJPY', finnhubSymbol: 'OANDA:EUR_JPY', description: 'Euro / Japanese Yen', category: 'forex' },
  { symbol: 'EURGBP', finnhubSymbol: 'OANDA:EUR_GBP', description: 'Euro / British Pound', category: 'forex' },
  // Metals
  { symbol: 'XAUUSD', finnhubSymbol: 'OANDA:XAU_USD', description: 'Gold / US Dollar', category: 'metal' },
  { symbol: 'XAGUSD', finnhubSymbol: 'OANDA:XAG_USD', description: 'Silver / US Dollar', category: 'metal' },
  // Energy
  { symbol: 'XTIUSD', finnhubSymbol: 'OANDA:WTICO_USD', description: 'WTI Crude Oil', category: 'energy' },
  { symbol: 'XBRUSD', finnhubSymbol: 'OANDA:BCO_USD', description: 'Brent Crude Oil', category: 'energy' },
  // Indices
  { symbol: 'US500', finnhubSymbol: 'OANDA:SPX500_USD', description: 'S&P 500 Index', category: 'indices' },
  { symbol: 'US30', finnhubSymbol: 'OANDA:US30_USD', description: 'Dow Jones Industrial Average', category: 'indices' },
  { symbol: 'NAS100', finnhubSymbol: 'OANDA:NAS100_USD', description: 'Nasdaq 100 Index', category: 'indices' },
  // Crypto (verified streamable)
  { symbol: 'BTCUSD', finnhubSymbol: 'BINANCE:BTCUSDT', description: 'Bitcoin / US Dollar', category: 'crypto' },
  { symbol: 'ETHUSD', finnhubSymbol: 'BINANCE:ETHUSDT', description: 'Ethereum / US Dollar', category: 'crypto' },
  { symbol: 'BNBUSD', finnhubSymbol: 'BINANCE:BNBUSDT', description: 'BNB / US Dollar', category: 'crypto' },
  { symbol: 'ADAUSD', finnhubSymbol: 'BINANCE:ADAUSDT', description: 'Cardano / US Dollar', category: 'crypto' },
  { symbol: 'DOGEUSD', finnhubSymbol: 'BINANCE:DOGEUSDT', description: 'Dogecoin / US Dollar', category: 'crypto' },
  { symbol: 'LTCUSD', finnhubSymbol: 'BINANCE:LTCUSDT', description: 'Litecoin / US Dollar', category: 'crypto' },
  { symbol: 'BCHUSD', finnhubSymbol: 'BINANCE:BCHUSDT', description: 'Bitcoin Cash / US Dollar', category: 'crypto' },
  { symbol: 'AVAXUSD', finnhubSymbol: 'BINANCE:AVAXUSDT', description: 'Avalanche / US Dollar', category: 'crypto' },
  { symbol: 'LINKUSD', finnhubSymbol: 'BINANCE:LINKUSDT', description: 'Chainlink / US Dollar', category: 'crypto' },
  { symbol: 'SOLUSD', finnhubSymbol: 'COINBASE:SOL-USD', description: 'Solana / US Dollar', category: 'crypto' },
  { symbol: 'XRPUSD', finnhubSymbol: 'COINBASE:XRP-USD', description: 'XRP / US Dollar', category: 'crypto' },
  { symbol: 'DOTUSD', finnhubSymbol: 'COINBASE:DOT-USD', description: 'Polkadot / US Dollar', category: 'crypto' },
  { symbol: 'NEARUSD', finnhubSymbol: 'COINBASE:NEAR-USD', description: 'NEAR Protocol / US Dollar', category: 'crypto' }
];

// OHLC (Dukascopy) symbols — active D1 baseline instruments
// 12 main pairs (7 majors + 5 crosses) + 2 metals + 2 crypto
export const DEFAULT_OHLC_SYMBOLS = [
  { symbol: 'EURUSD', dukascopySymbol: 'eurusd', description: 'Euro / US Dollar', category: 'forex' },
  { symbol: 'GBPUSD', dukascopySymbol: 'gbpusd', description: 'British Pound / US Dollar', category: 'forex' },
  { symbol: 'USDJPY', dukascopySymbol: 'usdjpy', description: 'US Dollar / Japanese Yen', category: 'forex' },
  { symbol: 'USDCHF', dukascopySymbol: 'usdchf', description: 'US Dollar / Swiss Franc', category: 'forex' },
  { symbol: 'USDCAD', dukascopySymbol: 'usdcad', description: 'US Dollar / Canadian Dollar', category: 'forex' },
  { symbol: 'AUDUSD', dukascopySymbol: 'audusd', description: 'Australian Dollar / US Dollar', category: 'forex' },
  { symbol: 'NZDUSD', dukascopySymbol: 'nzdusd', description: 'New Zealand Dollar / US Dollar', category: 'forex' },
  { symbol: 'EURGBP', dukascopySymbol: 'eurgbp', description: 'Euro / British Pound', category: 'forex' },
  { symbol: 'EURJPY', dukascopySymbol: 'eurjpy', description: 'Euro / Japanese Yen', category: 'forex' },
  { symbol: 'GBPJPY', dukascopySymbol: 'gbpjpy', description: 'British Pound / Japanese Yen', category: 'forex' },
  { symbol: 'EURCHF', dukascopySymbol: 'eurchf', description: 'Euro / Swiss Franc', category: 'forex' },
  { symbol: 'AUDJPY', dukascopySymbol: 'audjpy', description: 'Australian Dollar / Japanese Yen', category: 'forex' },
  { symbol: 'XAUUSD', dukascopySymbol: 'xauusd', description: 'Gold / US Dollar', category: 'metal' },
  { symbol: 'XAGUSD', dukascopySymbol: 'xagusd', description: 'Silver / US Dollar', category: 'metal' },
  { symbol: 'BTCUSD', dukascopySymbol: 'btcusd', description: 'Bitcoin / US Dollar', category: 'crypto' },
  { symbol: 'ETHUSD', dukascopySymbol: 'ethusd', description: 'Ethereum / US Dollar', category: 'crypto' }
];

export const DEFAULT_AGENTS = [
  {
    id: 'deepseek-v4-pro',
    name: 'Betrix DeepSeek V4 Pro (Deep Reasoning)',
    modelName: process.env.DEFAULT_MODEL || 'dahono/deepseek-v4-pro-0813',
    baseUrl: process.env.AI_BASE_URL || null,
    apiKey: process.env.AI_API_KEY || null,
    taskType: 'trade_reasoning',
    systemPrompt: 'You are Betrix Institutional Market Analyst Pro. Analyze financial markets with deep precision, technical confluence, risk-reward ratios, and structural market context.',
    tier: 'deep',
    creditsPer1kTokens: 1,
    maxTokens: 8192,
    temperature: 70,
    supportsThinking: true,
    isDefault: true,
    isActive: true,
    description: 'Flagship deep reasoning market intelligence agent with chain-of-thought analysis.'
  },
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash (High Speed)',
    modelName: 'dahono/deepseek-v4-flash-0731',
    baseUrl: process.env.AI_BASE_URL || null,
    apiKey: process.env.AI_API_KEY || null,
    taskType: 'market_analysis',
    systemPrompt: 'You are a high-speed market intelligence assistant providing instant price action insights, key technical levels, and crisp market summaries.',
    tier: 'cheap',
    creditsPer1kTokens: 1,
    maxTokens: 4096,
    temperature: 60,
    supportsThinking: false,
    isDefault: false,
    isActive: true,
    description: 'Ultra-fast, low-latency market analysis engine for quick trade scans and price action checks.'
  },
  {
    id: 'glm-5-3',
    name: 'GLM 5.3 Technical Strategist',
    modelName: 'dahono/glm-5.3',
    baseUrl: process.env.AI_BASE_URL || null,
    apiKey: process.env.AI_API_KEY || null,
    taskType: 'trade_reasoning',
    systemPrompt: 'You are an expert technical strategist specializing in indicator synthesis (RSI, ATR, EMAs, Support/Resistance fractals) and breakout setups.',
    tier: 'balanced',
    creditsPer1kTokens: 1,
    maxTokens: 8192,
    temperature: 70,
    supportsThinking: true,
    isDefault: false,
    isActive: true,
    description: 'Balanced quantitative strategist with strong multi-indicator mathematical synthesis.'
  },
  {
    id: 'kimi-k3',
    name: 'Kimi K3 Macro & Sentiment Analyst',
    modelName: 'dahono/kimi-k3',
    baseUrl: process.env.AI_BASE_URL || null,
    apiKey: process.env.AI_API_KEY || null,
    taskType: 'sentiment_analysis',
    systemPrompt: 'You are an institutional macro analyst synthesizing global news catalysts, market sentiment, and macroeconomic themes with technical market structures.',
    tier: 'deep',
    creditsPer1kTokens: 1,
    maxTokens: 8192,
    temperature: 70,
    supportsThinking: true,
    isDefault: false,
    isActive: true,
    description: 'Deep context macroeconomic and news sentiment analyzer for broad market themes.'
  }
];

export async function seedSymbols(connectionString?: string) {
  const conn = connectionString || process.env.DATABASE_URL || 'postgresql://betrix:betrixpass@localhost:5432/betrix_reborn';
  const pool = createPgPool(conn, 1);
  const db = createDrizzleClient(pool);

  console.log('Seeding default symbols with Finnhub & Dukascopy mappings...');
  for (const sym of DEFAULT_SYMBOLS) {
    await db.insert(symbols).values(sym).onConflictDoUpdate({
      target: symbols.symbol,
      set: {
        description: sym.description,
        path: sym.path,
        category: sym.category,
        finnhubSymbol: sym.finnhubSymbol,
        dukascopySymbol: sym.dukascopySymbol,
        isActive: sym.isActive,
        updatedAt: new Date()
      }
    });
  }
  console.log(`Seeded ${DEFAULT_SYMBOLS.length} symbols successfully.`);
  await pool.end();
}

export async function seedAgents(connectionString?: string) {
  const conn = connectionString || process.env.DATABASE_URL || 'postgresql://betrix:betrixpass@localhost:5432/betrix_reborn';
  const pool = createPgPool(conn, 1);
  const db = createDrizzleClient(pool);

  console.log('Seeding default AI agents in PostgreSQL...');
  for (const agent of DEFAULT_AGENTS) {
    await db.insert(aiAgents).values(agent).onConflictDoUpdate({
      target: aiAgents.id,
      set: {
        name: agent.name,
        modelName: agent.modelName,
        baseUrl: agent.baseUrl,
        apiKey: agent.apiKey,
        taskType: agent.taskType,
        systemPrompt: agent.systemPrompt,
        tier: agent.tier,
        creditsPer1kTokens: agent.creditsPer1kTokens,
        maxTokens: agent.maxTokens,
        temperature: agent.temperature,
        supportsThinking: agent.supportsThinking,
        isDefault: agent.isDefault,
        isActive: agent.isActive,
        description: agent.description,
        updatedAt: new Date()
      }
    });
  }
  console.log(`Seeded ${DEFAULT_AGENTS.length} AI agents successfully.`);
  await pool.end();
}

export async function seedStreamSymbols(connectionString?: string) {
  const conn = connectionString || process.env.DATABASE_URL || 'postgresql://betrix:betrixpass@localhost:5432/betrix_reborn';
  const pool = createPgPool(conn, 1);
  const db = createDrizzleClient(pool);

  console.log('Seeding stream (Finnhub) symbols...');
  for (const sym of DEFAULT_STREAM_SYMBOLS) {
    await db.insert(streamSymbols).values({ ...sym, isActive: true }).onConflictDoUpdate({
      target: streamSymbols.symbol,
      set: { finnhubSymbol: sym.finnhubSymbol, description: sym.description, category: sym.category, updatedAt: new Date() }
    });
  }
  console.log(`Seeded ${DEFAULT_STREAM_SYMBOLS.length} stream symbols successfully.`);
  await pool.end();
}

export async function seedOhlcSymbols(connectionString?: string) {
  const conn = connectionString || process.env.DATABASE_URL || 'postgresql://betrix:betrixpass@localhost:5432/betrix_reborn';
  const pool = createPgPool(conn, 1);
  const db = createDrizzleClient(pool);

  console.log('Seeding OHLC (Dukascopy) symbols...');
  for (const sym of DEFAULT_OHLC_SYMBOLS) {
    await db.insert(ohlcSymbols).values({ ...sym, isActive: true }).onConflictDoUpdate({
      target: ohlcSymbols.symbol,
      set: { dukascopySymbol: sym.dukascopySymbol, description: sym.description, category: sym.category, updatedAt: new Date() }
    });
  }
  console.log(`Seeded ${DEFAULT_OHLC_SYMBOLS.length} OHLC symbols successfully.`);
  await pool.end();
}

export async function seedAll(connectionString?: string) {
  await seedSymbols(connectionString);
  await seedStreamSymbols(connectionString);
  await seedOhlcSymbols(connectionString);
  await seedAgents(connectionString);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedAll().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}
