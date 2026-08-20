import { INewsRepository, NewsArticle } from '@betrix/domain';

export class StoreNewsUseCase {
  constructor(private readonly newsRepo: INewsRepository) {}

  public async execute(articles: NewsArticle[]): Promise<{ storedCount: number }> {
    const storedCount = await this.newsRepo.saveMany(articles);
    return {
      storedCount
    };
  }
}
