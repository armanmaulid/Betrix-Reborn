import { describe, it, expect } from 'vitest';
import { detectSmartCategory, detectSentiment } from './news-worker.js';
import { NewsTagging } from '@betrix/domain';

describe('Phase 6: Standalone Worker Application Test Suite', () => {
  describe('News Intelligent Categorization & Sentiment Analysis', () => {
    it('should correctly classify Crypto news from extracted tags', () => {
      const tags = NewsTagging.tagArticle(
        'Bitcoin surges past $100k as institutional ETF inflow spikes',
        'Crypto market rally'
      );
      expect(tags).toContain('btc');
      const category = detectSmartCategory(tags);
      expect(category).toBe('crypto');
    });

    it('should correctly classify Metal & Gold news from extracted tags', () => {
      const tags = NewsTagging.tagArticle(
        'Gold hits new all-time high amid safe-haven demand',
        'Precious metals update'
      );
      expect(tags).toContain('metal');
      const category = detectSmartCategory(tags);
      expect(category).toBe('metal');
    });

    it('should correctly classify Energy & Oil news from extracted tags', () => {
      const tags = NewsTagging.tagArticle(
        'OPEC cuts crude output boosting Brent and WTI barrel prices',
        'Energy news'
      );
      expect(tags).toContain('oil');
      const category = detectSmartCategory(tags);
      expect(category).toBe('energy');
    });

    it('should correctly classify Forex news from extracted tags', () => {
      const tags = NewsTagging.tagArticle(
        'Federal Reserve Powell signals interest rate pause as dollar strengthens',
        'USD FX outlook'
      );
      expect(tags).toContain('usd');
      const category = detectSmartCategory(tags);
      expect(category).toBe('forex');
    });

    it('should correctly calculate Positive sentiment for bullish market headlines', () => {
      const sentiment = detectSentiment(
        'Wall Street rallies to record high as tech stocks surge on strong profit jump',
        'Market gains across all major indices'
      );
      expect(sentiment).toBe('positive');
    });

    it('should correctly calculate Negative sentiment for bearish market headlines', () => {
      const sentiment = detectSentiment(
        'Crude oil prices plunge 5% amid supply glut fears and demand slump',
        'Energy sector experiences severe crash'
      );
      expect(sentiment).toBe('negative');
    });

    it('should default to Neutral sentiment for informative economic announcements', () => {
      const sentiment = detectSentiment(
        'Treasury releases quarterly refunding schedule for upcoming bond auctions',
        'Standard issuance details announced by the department'
      );
      expect(sentiment).toBe('neutral');
    });
  });
});
