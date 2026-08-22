import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditLogMapper } from './mappers/AuditLogMapper';
import { HttpOperationsRepository } from './repositories/HttpOperationsRepository';
import { HttpClient } from '@shared/infrastructure/http/api-client';

describe('Operations Infrastructure: AuditLogMapper & HttpOperationsRepository', () => {
  let mockHttpClient: HttpClient;
  let opsRepo: HttpOperationsRepository;

  beforeEach(() => {
    mockHttpClient = new HttpClient();
    opsRepo = new HttpOperationsRepository(mockHttpClient);
  });

  it('should map audit log DTO to domain model', () => {
    const rawDto = {
      id: 'log-1',
      userId: 'usr-admin',
      action: 'user_ban',
      resource: 'USER',
      resourceId: 'usr-bad',
      details: { reason: 'abuse' },
      createdAt: '2026-02-10T12:00:00Z'
    };

    const audit = AuditLogMapper.toDomain(rawDto);

    expect(audit.id).toBe('log-1');
    expect(audit.action).toBe('USER_BAN');
    expect(audit.resource).toBe('USER');
    expect(audit.details).toEqual({ reason: 'abuse' });
  });

  it('should broadcast message via HttpOperationsRepository', async () => {
    vi.spyOn(mockHttpClient, 'post').mockResolvedValue({
      data: { messageId: 'msg-123', deliveredCount: 50 }
    });

    const res = await opsRepo.broadcastMessage({
      title: 'Scheduled Maintenance',
      body: 'Maintenance starting in 1 hour.',
      severity: 'warning'
    });

    expect(res.messageId).toBe('msg-123');
    expect(res.deliveredCount).toBe(50);
  });
});
