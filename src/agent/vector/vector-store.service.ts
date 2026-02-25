import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Embeddings } from '@langchain/core/embeddings';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { EMBEDDINGS } from '../llm/llm.tokens';

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private vectorStore: PGVectorStore;
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(
    @Inject(EMBEDDINGS) private readonly embeddings: Embeddings,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.vectorStore = await PGVectorStore.initialize(this.embeddings, {
      postgresConnectionOptions: {
        connectionString: this.config.getOrThrow('DATABASE_URL'),
      },
      tableName: 'strong_reasons',
      columns: {
        idColumnName: 'id',
        vectorColumnName: 'embedding',
        contentColumnName: 'content',
        metadataColumnName: 'metadata',
      },
    });

    this.logger.log('Vector store initialized');
  }

  async similaritySearchWithScore(
    query: string,
    k = 3,
  ): Promise<{ content: string; score: number }[]> {
    const results = await this.vectorStore.similaritySearchWithScore(query, k);
    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      score,
    }));
  }

  async addDocuments(texts: string[]): Promise<void> {
    await this.vectorStore.addDocuments(
      texts.map((text) => ({ pageContent: text, metadata: {} })),
    );
  }

  getStore(): PGVectorStore {
    return this.vectorStore;
  }
}
