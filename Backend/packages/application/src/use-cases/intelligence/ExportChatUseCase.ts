import { NotFoundError } from '@betrix/core';
import { IChatRepository } from '@betrix/domain';

export class ExportChatUseCase {
  constructor(private readonly chatRepo: IChatRepository) {}

  public async execute(
    sessionId: string,
    userId: string,
    format: 'markdown' | 'json' = 'markdown'
  ): Promise<{ format: string; content: string; filename: string }> {
    const messages = await this.chatRepo.findBySessionId(sessionId, userId);
    if (messages.length === 0) {
      throw new NotFoundError('Chat session not found or contains no messages.');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `betrix_chat_${sessionId}_${timestamp}.${format === 'json' ? 'json' : 'md'}`;

    if (format === 'json') {
      return {
        format: 'json',
        content: JSON.stringify(
          messages.map((m) => m.toJSON()),
          null,
          2
        ),
        filename
      };
    }

    let md = `# Betrix AI Analysis Transcript\n`;
    md += `**Session ID**: \`${sessionId}\`  \n`;
    md += `**Export Date**: ${new Date().toUTCString()}  \n`;
    md += `**Total Messages**: ${messages.length}\n\n---\n\n`;

    for (const msg of messages) {
      md += `### 👤 User (${msg.createdAt.toLocaleTimeString()})\n\n${msg.message}\n\n`;
      md += `### 🤖 Betrix AI (${msg.modelUsed} • ${msg.latencyMs}ms)\n\n${msg.reply}\n\n---\n\n`;
    }

    return {
      format: 'markdown',
      content: md,
      filename
    };
  }
}
