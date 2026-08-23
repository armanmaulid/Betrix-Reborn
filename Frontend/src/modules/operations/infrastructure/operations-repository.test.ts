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

  it('should map audit log DTO to domain model with enrichment fields', () => {
    const rawDto = {
      id: 'log-1',
      adminId: 'usr-admin',
      adminEmail: 'admin@betrix.io',
      adminName: 'Root Admin',
      action: 'user_ban',
      targetType: 'user',
      targetId: 'usr-bad',
      targetEmail: 'bad-actor@example.com',
      targetName: 'Bad Actor',
      details: { reason: 'abuse' },
      ip: '203.0.113.7',
      createdAt: '2026-02-10T12:00:00Z'
    };

    const audit = AuditLogMapper.toDomain(rawDto);

    expect(audit.id).toBe('log-1');
    expect(audit.userId).toBe('usr-admin');
    expect(audit.userEmail).toBe('admin@betrix.io');
    expect(audit.userName).toBe('Root Admin');
    expect(audit.action).toBe('USER_BAN');
    expect(audit.resource).toBe('user');
    expect(audit.resourceId).toBe('usr-bad');
    expect(audit.targetEmail).toBe('bad-actor@example.com');
    expect(audit.targetName).toBe('Bad Actor');
    expect(audit.ipAddress).toBe('203.0.113.7');
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
