import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { FunnelState } from '../state';

const EXTRACTION_PROMPT = `You are a friendly clinic assistant collecting patient information for a weight loss program.
You speak in Brazilian Portuguese.

Current funnel step: {funnelStep}
Previously collected data:
- name: {currentName}
- birthDate: {currentBirthDate}
- weightLossReason: {currentReason}

Conversation so far:
{conversationHistory}

Based on the latest user message, extract the requested information for the current step.
Also check if the user is correcting any previously collected data (e.g. "my name is actually X", "I meant Y").

Rules:
- If step is "collect_name": extract the person's name from their message. If they just greeted (oi, olá, etc), return null for extracted.
- If step is "collect_birth_date": extract a date of birth. Accept formats like DD/MM/YYYY, "15 de março de 1990", etc. Return in ISO format YYYY-MM-DD or null if not a valid date.
- If step is "collect_weight_loss_reason": extract their reason for wanting to lose weight. Return the reason as-is or null if they didn't provide one.

Respond ONLY with valid JSON (no markdown):
{{
  "extracted": <string or null>,
  "shouldAdvance": <boolean>,
  "corrections": {{
    "name": <corrected name string or null if no correction>,
    "birthDate": <corrected date in YYYY-MM-DD or null if no correction>,
    "weightLossReason": <corrected reason or null if no correction>
  }}
}}`;

interface ExtractionResult {
  extracted: string | null;
  shouldAdvance: boolean;
  corrections?: {
    name?: string | null;
    birthDate?: string | null;
    weightLossReason?: string | null;
  };
}

export function createProcessMessageNode(llm: BaseChatModel) {
  return async (state: FunnelState): Promise<Partial<FunnelState>> => {
    const conversationHistory = state.messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const prompt = EXTRACTION_PROMPT.replace('{funnelStep}', state.funnelStep)
      .replace('{conversationHistory}', conversationHistory)
      .replace('{currentName}', state.name ?? 'not collected')
      .replace('{currentBirthDate}', state.birthDate ?? 'not collected')
      .replace('{currentReason}', state.weightLossReason ?? 'not collected');

    const response = await llm.invoke(prompt);
    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    let parsed: ExtractionResult;
    try {
      parsed = JSON.parse(content);
    } catch {
      return {};
    }

    const updates: Partial<FunnelState> = {};

    // Apply corrections to previously collected data
    if (parsed.corrections) {
      if (parsed.corrections.name) updates.name = parsed.corrections.name;
      if (parsed.corrections.birthDate)
        updates.birthDate = parsed.corrections.birthDate;
      if (parsed.corrections.weightLossReason)
        updates.weightLossReason = parsed.corrections.weightLossReason;
    }

    // Apply current step extraction
    if (parsed.shouldAdvance && parsed.extracted) {
      switch (state.funnelStep) {
        case 'collect_name':
          updates.name = parsed.extracted;
          updates.funnelStep = 'collect_birth_date';
          break;
        case 'collect_birth_date':
          updates.birthDate = parsed.extracted;
          updates.funnelStep = 'collect_weight_loss_reason';
          break;
        case 'collect_weight_loss_reason':
          updates.weightLossReason = parsed.extracted;
          break;
      }
    }

    return updates;
  };
}
