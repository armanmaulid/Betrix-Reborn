import { pgSchema } from 'drizzle-orm/pg-core';

/**
 * T4.1 — Schema separation (DB/Redis Plan §6 Fase A).
 * Tables are grouped by data classification so backup, grants, and future
 * physical splits can target each domain independently:
 *
 *   identity — accounts, sessions, devices, tokens        (Kelas B)
 *   money    — ledger, transactions, vouchers             (Kelas A 🚨)
 *   trading  — symbols catalog + AI agents               (Kelas B/F)
 *   content  — news, calendar, chat/messages             (Kelas F)
 *   ops      — audit trail, worker state, rollups         (Kelas C/D)
 */
export const identity = pgSchema('identity');
export const money = pgSchema('money');
export const trading = pgSchema('trading');
export const content = pgSchema('content');
export const ops = pgSchema('ops');
