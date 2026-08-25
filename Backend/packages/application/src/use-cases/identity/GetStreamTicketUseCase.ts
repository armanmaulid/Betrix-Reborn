import { generateSecureToken } from '@betrix/core';
import { IStreamTicketStore } from '@betrix/domain';

export class GetStreamTicketUseCase {
  constructor(private readonly ticketStore: IStreamTicketStore) {}

  public async execute(
    userId: string,
    ttlSeconds: number = 60
  ): Promise<{ ticket: string; expiresInSeconds: number }> {
    const ticket = generateSecureToken(32);
    await this.ticketStore.save(ticket, userId, ttlSeconds);
    return {
      ticket,
      expiresInSeconds: ttlSeconds
    };
  }
}
