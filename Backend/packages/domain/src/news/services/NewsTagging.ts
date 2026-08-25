export class NewsTagging {
  private static readonly KEYWORD_MAP: Record<string, string[]> = {
    usd: [
      'dollar',
      'fed',
      'federal reserve',
      'powell',
      'cpi',
      'inflation',
      'treasury',
      'yield',
      'fomc'
    ],
    eur: ['euro', 'ecb', 'lagarde', 'germany', 'bundesbank', 'eurozone'],
    gbp: ['pound', 'sterling', 'boe', 'bank of england', 'bailey', 'uk inflation', 'britain'],
    jpy: ['yen', 'boj', 'bank of japan', 'ueda', 'tokyo inflation', 'japan yield'],
    metal: ['gold', 'xau', 'silver', 'xag', 'precious metal', 'bullion'],
    oil: ['crude', 'oil', 'brent', 'wti', 'opec', 'petroleum', 'energy output'],
    btc: ['bitcoin', 'btc', 'halving', 'satoshi', 'etf flow', 'crypto rally'],
    eth: ['ethereum', 'eth', 'vitalik', 'erc20', 'staking yield'],
    indices: ['s&p 500', 'spx', 'nasdaq', 'dow jones', 'wall street', 'equities', 'stock rally']
  };

  public static tagArticle(headline: string, summary: string): string[] {
    const text = `${headline} ${summary}`.toLowerCase();
    const tags = new Set<string>();

    for (const [tag, keywords] of Object.entries(NewsTagging.KEYWORD_MAP)) {
      for (const kw of keywords) {
        if (text.includes(kw)) {
          tags.add(tag);
          break;
        }
      }
    }

    if (tags.size === 0) {
      tags.add('global');
    }

    return Array.from(tags);
  }

  public static extractTags(text: string): string[] {
    return NewsTagging.tagArticle(text, '');
  }
}
