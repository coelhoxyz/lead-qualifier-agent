import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { FunnelState } from '../state';

const RESPONSE_PROMPT = `You are a friendly clinic assistant for a weight loss program.
You speak in Brazilian Portuguese. Be warm, professional and concise.

Current state:
- Funnel step: {funnelStep}
- Name: {name}
- Birth date: {birthDate}
- Weight loss reason: {weightLossReason}
- Qualified: {qualified}

Conversation:
{conversationHistory}

Generate the next assistant message based on the funnel step:
- "collect_name": Ask for their name in a welcoming way.
- "collect_birth_date": Thank them by name and ask for their birth date.
- "collect_weight_loss_reason": Acknowledge and ask what's the main reason they want to lose weight.
- "qualified": Congratulate them, acknowledge their health concern, and invite them to schedule a free evaluation.
- "rejected": Politely thank them and explain you can't help with their specific need right now.

Respond with ONLY the message text, no quotes or prefixes.`;

export function createGenerateResponseNode(llm: BaseChatModel) {
  return async (state: FunnelState): Promise<Partial<FunnelState>> => {
    const conversationHistory = state.messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const prompt = RESPONSE_PROMPT.replace('{funnelStep}', state.funnelStep)
      .replace('{name}', state.name ?? 'não informado')
      .replace('{birthDate}', state.birthDate ?? 'não informado')
      .replace('{weightLossReason}', state.weightLossReason ?? 'não informado')
      .replace('{qualified}', String(state.qualified ?? 'não definido'))
      .replace('{conversationHistory}', conversationHistory);

    const response = await llm.invoke(prompt);
    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    return { responseMessage: content.trim() };
  };
}
