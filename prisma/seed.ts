import 'dotenv/config';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { Embeddings } from '@langchain/core/embeddings';
import { OpenAIEmbeddings } from '@langchain/openai';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

const STRONG_REASONS = [
  'Preciso fazer cirurgia e o médico exigiu perder peso',
  'Minha saúde está em risco, pressão alta e diabetes',
  'Quero engravidar mas o médico disse que preciso emagrecer',
  'Tenho dor nas articulações por causa do peso',
  'Meu colesterol está altíssimo e estou com medo de infarto',
];

function buildEmbeddings(): Embeddings {
  const provider = process.env.LLM_PROVIDER ?? 'openai';

  switch (provider) {
    case 'google':
      return new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY,
        modelName: process.env.EMBEDDING_MODEL ?? 'gemini-embedding-001',
      });

    case 'openrouter':
      return new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENROUTER_API_KEY,
        modelName:
          process.env.EMBEDDING_MODEL ?? 'openai/text-embedding-3-small',
        configuration: { baseURL: 'https://openrouter.ai/api/v1' },
      });

    case 'openai':
    default:
      return new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small',
      });
  }
}

async function main() {
  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/lead_qualifier';

  const embeddings = buildEmbeddings();

  const vectorStore = await PGVectorStore.initialize(embeddings, {
    postgresConnectionOptions: { connectionString },
    tableName: 'strong_reasons',
    columns: {
      idColumnName: 'id',
      vectorColumnName: 'embedding',
      contentColumnName: 'content',
      metadataColumnName: 'metadata',
    },
  });

  console.log('Seeding strong reasons into vector store...');

  await vectorStore.addDocuments(
    STRONG_REASONS.map((text) => ({ pageContent: text, metadata: {} })),
  );

  console.log(`Seeded ${STRONG_REASONS.length} strong reasons.`);

  await vectorStore.end();
}

main().catch(console.error);
