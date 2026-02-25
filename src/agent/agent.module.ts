import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentService } from './agent.service';
import { VectorStoreService } from './vector/vector-store.service';
import { CHAT_MODEL, EMBEDDINGS } from './llm/llm.tokens';
import { createChatModel, createEmbeddings } from './llm/llm.factory';

@Module({
  providers: [
    {
      provide: CHAT_MODEL,
      useFactory: (config: ConfigService) => createChatModel(config),
      inject: [ConfigService],
    },
    {
      provide: EMBEDDINGS,
      useFactory: (config: ConfigService) => createEmbeddings(config),
      inject: [ConfigService],
    },
    AgentService,
    VectorStoreService,
  ],
  exports: [AgentService, VectorStoreService],
})
export class AgentModule {}
