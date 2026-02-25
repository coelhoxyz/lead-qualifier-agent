import { ConfigService } from '@nestjs/config';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Embeddings } from '@langchain/core/embeddings';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from '@langchain/google-genai';

export type LlmProvider = 'openai' | 'google' | 'openrouter';

export function createChatModel(config: ConfigService): BaseChatModel {
  const provider = (config.get('LLM_PROVIDER') ?? 'openai') as LlmProvider;

  switch (provider) {
    case 'google':
      return new ChatGoogleGenerativeAI({
        apiKey: config.getOrThrow('GOOGLE_API_KEY'),
        model: config.get('LLM_MODEL') ?? 'gemini-2.5-flash',
        temperature: 0.3,
      });

    case 'openrouter':
      return new ChatOpenAI({
        openAIApiKey: config.getOrThrow('OPENROUTER_API_KEY'),
        modelName: config.get('LLM_MODEL') ?? 'openrouter/free',
        temperature: 0.3,
        configuration: {
          baseURL: 'https://openrouter.ai/api/v1',
        },
      });

    case 'openai':
    default:
      return new ChatOpenAI({
        openAIApiKey: config.getOrThrow('OPENAI_API_KEY'),
        modelName: config.get('LLM_MODEL') ?? 'gpt-4o-mini',
        temperature: 0.3,
      });
  }
}

export function createEmbeddings(config: ConfigService): Embeddings {
  const provider = (config.get('LLM_PROVIDER') ?? 'openai') as LlmProvider;

  switch (provider) {
    case 'google':
      return new GoogleGenerativeAIEmbeddings({
        apiKey: config.getOrThrow('GOOGLE_API_KEY'),
        modelName: config.get('EMBEDDING_MODEL') ?? 'gemini-embedding-001',
      });

    case 'openrouter':
      return new OpenAIEmbeddings({
        openAIApiKey: config.getOrThrow('OPENROUTER_API_KEY'),
        modelName:
          config.get('EMBEDDING_MODEL') ?? 'openai/text-embedding-3-small',
        configuration: {
          baseURL: 'https://openrouter.ai/api/v1',
        },
      });

    case 'openai':
    default:
      return new OpenAIEmbeddings({
        openAIApiKey: config.getOrThrow('OPENAI_API_KEY'),
        modelName: config.get('EMBEDDING_MODEL') ?? 'text-embedding-3-small',
      });
  }
}
