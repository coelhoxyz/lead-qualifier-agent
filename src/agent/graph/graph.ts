import { StateGraph, START, END } from '@langchain/langgraph';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { FunnelStateAnnotation, FunnelState } from './state';
import { createProcessMessageNode } from './nodes/process-message.node';
import { createQualifyLeadNode } from './nodes/qualify-lead.node';
import { createGenerateResponseNode } from './nodes/generate-response.node';
import { VectorStoreService } from '../vector/vector-store.service';

export function routeAfterProcessing(state: FunnelState): string {
  if (
    state.funnelStep === 'collect_weight_loss_reason' &&
    state.weightLossReason
  ) {
    return 'qualifyLead';
  }
  return 'generateResponse';
}

export function buildFunnelGraph(
  llm: BaseChatModel,
  vectorStore: VectorStoreService,
) {
  const workflow = new StateGraph(FunnelStateAnnotation)
    .addNode('processMessage', createProcessMessageNode(llm))
    .addNode('qualifyLead', createQualifyLeadNode(vectorStore))
    .addNode('generateResponse', createGenerateResponseNode(llm))
    .addEdge(START, 'processMessage')
    .addConditionalEdges('processMessage', routeAfterProcessing, {
      qualifyLead: 'qualifyLead',
      generateResponse: 'generateResponse',
    })
    .addEdge('qualifyLead', 'generateResponse')
    .addEdge('generateResponse', END);

  return workflow.compile();
}
