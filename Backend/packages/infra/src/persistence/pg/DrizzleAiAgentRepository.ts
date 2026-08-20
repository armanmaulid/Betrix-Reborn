import { eq, desc } from 'drizzle-orm';
import { IAiAgentRepository, AiAgent, Nullable } from '@betrix/domain';
import { DrizzleDb } from '../drizzle/client.js';
import { aiAgents } from '../drizzle/schema.js';

export class DrizzleAiAgentRepository implements IAiAgentRepository {
  constructor(private readonly db: DrizzleDb) {}

  private mapToDomain(row: typeof aiAgents.$inferSelect): AiAgent {
    return new AiAgent({
      id: row.id,
      name: row.name,
      modelName: row.modelName,
      baseUrl: row.baseUrl,
      apiKey: row.apiKey,
      taskType: row.taskType,
      systemPrompt: row.systemPrompt,
      tier: row.tier as 'cheap' | 'balanced' | 'deep',
      creditsPer1kTokens: row.creditsPer1kTokens,
      maxTokens: row.maxTokens,
      temperature: row.temperature,
      supportsThinking: row.supportsThinking,
      isDefault: row.isDefault,
      isActive: row.isActive,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    });
  }

  async findAll(activeOnly: boolean = false): Promise<AiAgent[]> {
    const query = activeOnly
      ? this.db.select().from(aiAgents).where(eq(aiAgents.isActive, true))
      : this.db.select().from(aiAgents);

    const rows = await query.orderBy(desc(aiAgents.isDefault), aiAgents.name);
    return rows.map((r) => this.mapToDomain(r));
  }

  async findById(id: string): Promise<Nullable<AiAgent>> {
    const rows = await this.db
      .select()
      .from(aiAgents)
      .where(eq(aiAgents.id, id.toLowerCase().trim()))
      .limit(1);

    return rows[0] ? this.mapToDomain(rows[0]) : null;
  }

  async findDefault(): Promise<Nullable<AiAgent>> {
    const rows = await this.db
      .select()
      .from(aiAgents)
      .where(eq(aiAgents.isDefault, true))
      .limit(1);

    if (rows[0]) return this.mapToDomain(rows[0]);

    const activeRows = await this.db
      .select()
      .from(aiAgents)
      .where(eq(aiAgents.isActive, true))
      .limit(1);

    return activeRows[0] ? this.mapToDomain(activeRows[0]) : null;
  }

  async save(agent: AiAgent): Promise<AiAgent> {
    if (agent.isDefault) {
      await this.db
        .update(aiAgents)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(aiAgents.isDefault, true));
    }

    const inserted = await this.db
      .insert(aiAgents)
      .values({
        id: agent.id,
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
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt
      })
      .onConflictDoUpdate({
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
      })
      .returning();

    return this.mapToDomain(inserted[0]!);
  }

  async setDefault(id: string): Promise<boolean> {
    await this.db.update(aiAgents).set({ isDefault: false, updatedAt: new Date() });
    const updated = await this.db
      .update(aiAgents)
      .set({ isDefault: true, isActive: true, updatedAt: new Date() })
      .where(eq(aiAgents.id, id.toLowerCase().trim()))
      .returning();

    return updated.length > 0;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(aiAgents)
      .where(eq(aiAgents.id, id.toLowerCase().trim()))
      .returning();

    return deleted.length > 0;
  }
}
