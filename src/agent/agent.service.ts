import { Inject, Injectable, Logger } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { buildFunnelGraph } from './graph/graph';
import { VectorStoreService } from './vector/vector-store.service';
import { ChatMessage, FunnelState } from './graph/state';
import { CHAT_MODEL } from './llm/llm.tokens';

export interface AgentResult {
  responseMessage: string;
  name?: string;
  birthDate?: string;
  weightLossReason?: string;
  qualified?: boolean;
  funnelStep: string;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @Inject(CHAT_MODEL) private readonly llm: BaseChatModel,
    private readonly vectorStore: VectorStoreService,
  ) {}

  async processMessage(
    phoneNumber: string,
    messages: ChatMessage[],
    currentState: {
      name?: string;
      birthDate?: string;
      weightLossReason?: string;
      qualified?: boolean;
      funnelStep: string;
    },
  ): Promise<AgentResult> {
    const graph = buildFunnelGraph(this.llm, this.vectorStore);

    const input: FunnelState = {
      phoneNumber,
      messages,
      name: currentState.name ?? undefined,
      birthDate: currentState.birthDate ?? undefined,
      weightLossReason: currentState.weightLossReason ?? undefined,
      qualified: currentState.qualified ?? undefined,
      funnelStep: currentState.funnelStep,
      responseMessage: '',
    };

    this.logger.debug(`Processing message for ${phoneNumber}`);

    const result = await graph.invoke(input);

    return {
      responseMessage: result.responseMessage,
      name: result.name,
      birthDate: result.birthDate,
      weightLossReason: result.weightLossReason,
      qualified: result.qualified,
      funnelStep: result.funnelStep,
    };
  }
}
