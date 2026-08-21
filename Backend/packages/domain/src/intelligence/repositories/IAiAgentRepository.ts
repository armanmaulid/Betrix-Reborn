import { Nullable } from '@betrix/core';
import { AiAgent } from '../entities/AiAgent.js';

export interface AgentFilter {
  activeOnly?: boolean;
  visibility?: 'public' | 'private';
}

export interface IAiAgentRepository {
  findAll(filter?: AgentFilter | boolean): Promise<AiAgent[]>;
  findById(id: string): Promise<Nullable<AiAgent>>;
  findDefault(): Promise<Nullable<AiAgent>>;
  save(agent: AiAgent): Promise<AiAgent>;
  setDefault(id: string): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}

