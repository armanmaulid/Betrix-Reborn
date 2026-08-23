import React from 'react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { LiveGauges } from './live-gauges';
import { AnalyticsSummary } from './analytics-summary';
import { formatFinancialNumber, formatUptime } from '@/shared/utils';
import type { SystemMetrics } from '@/modules/analytics/domain/entities/SystemMetrics';
import type { UserAnalytics } from '@/modules/analytics/domain/entities/SystemMetrics';

describe('Phase 3 Dashboard & Analytics Component Tests', () => {
  describe('Numeric Formatting Utilities (Test Gate 3.3)', () => {
    it('formatFinancialNumber should format numbers with commas and precision', () => {
      expect(formatFinancialNumber(1250000)).toBe('1,250,000');
      expect(formatFinancialNumber(45.678, 2)).toBe('45.68');
      expect(formatFinancialNumber(0)).toBe('0');
      expect(formatFinancialNumber(null as any)).toBe('0');
    });

    it('formatUptime should format seconds into Xd Yh Zm', () => {
      expect(formatUptime(0)).toBe('0m');
      expect(formatUptime(120)).toBe('2m');
      expect(formatUptime(3660)).toBe('1h 1m');
      expect(formatUptime(90060)).toBe('1d 1h 1m');
    });
  });

  describe('LiveGauges Component (Test Gate 3.2)', () => {
    it('should render live metrics and delta indicators cleanly', () => {
      const mockMetrics: SystemMetrics = {
        totalUsers: 1420,
        activeSessions: 38,
        totalChats: 8900,
        totalTokensUsed: 4500000,
        dbPoolActive: 4,
        dbPoolIdle: 16,
        uptimeSeconds: 86400,
        redisStatus: 'online',
        redisLatencyMs: 1,
        dbPoolTotal: 20,
        dbPoolActiveRatio: 0.2,
        isDbPoolStressed: false
      };

      const mockDeltas = {
        totalUsers: 5,
        activeSessions: -2,
        totalChats: 12,
        totalTokensUsed: 15000
      };

      render(<LiveGauges metrics={mockMetrics} deltas={mockDeltas} />);

      expect(screen.getByText('1,420')).toBeInTheDocument();
      expect(screen.getByText('38')).toBeInTheDocument();
      expect(screen.getByText('8,900')).toBeInTheDocument();
      expect(screen.getByText('4,500,000')).toBeInTheDocument();
      expect(screen.getByText('1d')).toBeInTheDocument();
      expect(screen.getByText('20%')).toBeInTheDocument(); // 4 / (4+16) = 20%
    });

    it('should handle zero-data / empty state gracefully without throwing', () => {
      render(<LiveGauges metrics={undefined} deltas={undefined} />);
      expect(screen.getByText('TOTAL USERS')).toBeInTheDocument();
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });
  });

  describe('AnalyticsSummary Component', () => {
    it('should render acquisition summary cards and interval breakdowns', () => {
      const mockAnalytics: UserAnalytics = {
        newUsersToday: 42,
        newUsersThisWeek: 280,
        newUsersThisMonth: 1250,
        activeUsers24h: 315,
        activeUsersWeekly: 820,
        activeUsersMonthly: 1840,
        topModels: [{ model: 'gpt-4o', count: 1200 }],
        dailyTokenUsage: [{ date: '2026-08-21', tokens: 500000 }]
      };

      render(<AnalyticsSummary analytics={mockAnalytics} />);

      expect(screen.getAllByText('+42').length).toBeGreaterThan(0);
      expect(screen.getAllByText('+280').length).toBeGreaterThan(0);
      expect(screen.getAllByText('+1,250').length).toBeGreaterThan(0);
      expect(screen.getAllByText('315').length).toBeGreaterThan(0);
      expect(screen.getAllByText('820').length).toBeGreaterThan(0);
      expect(screen.getAllByText('1,840').length).toBeGreaterThan(0);
    });
  });
});
