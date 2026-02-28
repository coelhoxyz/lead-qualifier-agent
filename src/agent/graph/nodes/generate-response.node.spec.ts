import { createGenerateResponseNode } from './generate-response.node';
import { makeState } from '../../../test/make-state';

const mockLlm = { invoke: jest.fn() } as any;

const node = createGenerateResponseNode(mockLlm);

beforeEach(() => jest.clearAllMocks());

describe('generateResponse node', () => {
  it('returns trimmed response message', async () => {
    mockLlm.invoke.mockResolvedValue({
      content: '  Olá! Como posso ajudá-lo?  ',
    });
    const state = makeState({ funnelStep: 'collect_name' });

    const result = await node(state);

    expect(result.responseMessage).toBe('Olá! Como posso ajudá-lo?');
  });

  it('handles non-string LLM content (array → JSON.stringify)', async () => {
    mockLlm.invoke.mockResolvedValue({
      content: [{ type: 'text', text: 'Olá' }],
    });
    const state = makeState({ funnelStep: 'collect_name' });

    const result = await node(state);

    expect(result.responseMessage).toBe(
      JSON.stringify([{ type: 'text', text: 'Olá' }]),
    );
  });

  it("renders undefined state fields as 'não informado' / 'não definido'", async () => {
    mockLlm.invoke.mockResolvedValue({ content: 'Resposta' });
    const state = makeState({
      funnelStep: 'collect_name',
      name: undefined,
      birthDate: undefined,
      weightLossReason: undefined,
      qualified: undefined,
    });

    await node(state);

    const prompt = mockLlm.invoke.mock.calls[0][0] as string;
    expect(prompt).toContain('Name: não informado');
    expect(prompt).toContain('Birth date: não informado');
    expect(prompt).toContain('Weight loss reason: não informado');
    expect(prompt).toContain('Qualified: não definido');
  });
});
