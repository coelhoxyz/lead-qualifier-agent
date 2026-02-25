import { Annotation } from '@langchain/langgraph';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const FunnelStateAnnotation = Annotation.Root({
  phoneNumber: Annotation<string>,
  messages: Annotation<ChatMessage[]>,
  name: Annotation<string | undefined>,
  birthDate: Annotation<string | undefined>,
  weightLossReason: Annotation<string | undefined>,
  qualified: Annotation<boolean | undefined>,
  funnelStep: Annotation<string>,
  responseMessage: Annotation<string>,
});

export type FunnelState = typeof FunnelStateAnnotation.State;
