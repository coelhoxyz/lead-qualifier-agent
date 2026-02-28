import { createProcessMessageNode } from './process-message.node';
import { makeState } from '../../../test/make-state';

const mockLlm = { invoke: jest.fn() } as any;

const node = createProcessMessageNode(mockLlm);

function llmReturns(json: object) {
  mockLlm.invoke.mockResolvedValue({ content: JSON.stringify(json) });
}

beforeEach(() => jest.clearAllMocks());

describe('processMessage node', () => {
  it('extracts name and advances to collect_birth_date', async () => {
    llmReturns({ extracted: 'João', shouldAdvance: true, corrections: {} });
    const state = makeState({ funnelStep: 'collect_name' });

    const result = await node(state);

    expect(result.name).toBe('João');
    expect(result.funnelStep).toBe('collect_birth_date');
  });

  it('extracts birth date and advances to collect_weight_loss_reason', async () => {
    llmReturns({
      extracted: '1990-03-15',
      shouldAdvance: true,
      corrections: {},
    });
    const state = makeState({ funnelStep: 'collect_birth_date', name: 'João' });

    const result = await node(state);

    expect(result.birthDate).toBe('1990-03-15');
    expect(result.funnelStep).toBe('collect_weight_loss_reason');
  });

  it('extracts weight loss reason without advancing step', async () => {
    llmReturns({
      extracted: 'Quero melhorar minha saúde',
      shouldAdvance: true,
      corrections: {},
    });
    const state = makeState({
      funnelStep: 'collect_weight_loss_reason',
      name: 'João',
      birthDate: '1990-03-15',
    });

    const result = await node(state);

    expect(result.weightLossReason).toBe('Quero melhorar minha saúde');
    expect(result.funnelStep).toBeUndefined();
  });

  it('returns empty object when shouldAdvance is false', async () => {
    llmReturns({ extracted: 'João', shouldAdvance: false, corrections: {} });
    const state = makeState({ funnelStep: 'collect_name' });

    const result = await node(state);

    expect(result).toEqual({});
  });

  it('returns empty object when extracted is null', async () => {
    llmReturns({ extracted: null, shouldAdvance: true, corrections: {} });
    const state = makeState({ funnelStep: 'collect_name' });

    const result = await node(state);

    expect(result).toEqual({});
  });

  it('applies correction to previously collected name', async () => {
    llmReturns({
      extracted: null,
      shouldAdvance: false,
      corrections: { name: 'Maria' },
    });
    const state = makeState({
      funnelStep: 'collect_birth_date',
      name: 'João',
    });

    const result = await node(state);

    expect(result.name).toBe('Maria');
  });

  it('applies correction and extraction simultaneously', async () => {
    llmReturns({
      extracted: '1995-06-20',
      shouldAdvance: true,
      corrections: { name: 'Maria' },
    });
    const state = makeState({
      funnelStep: 'collect_birth_date',
      name: 'João',
    });

    const result = await node(state);

    expect(result.name).toBe('Maria');
    expect(result.birthDate).toBe('1995-06-20');
    expect(result.funnelStep).toBe('collect_weight_loss_reason');
  });

  it('returns empty object on invalid JSON from LLM', async () => {
    mockLlm.invoke.mockResolvedValue({ content: 'not valid json' });
    const state = makeState({ funnelStep: 'collect_name' });

    const result = await node(state);

    expect(result).toEqual({});
  });

  it('includes current state values in prompt sent to LLM', async () => {
    llmReturns({ extracted: null, shouldAdvance: false, corrections: {} });
    const state = makeState({
      funnelStep: 'collect_birth_date',
      name: 'João',
      messages: [{ role: 'user', content: 'Olá, me chamo João' }],
    });

    await node(state);

    const prompt = mockLlm.invoke.mock.calls[0][0] as string;
    expect(prompt).toContain('collect_birth_date');
    expect(prompt).toContain('João');
    expect(prompt).toContain('Olá, me chamo João');
  });
});
