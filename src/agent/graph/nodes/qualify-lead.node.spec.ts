import { createQualifyLeadNode } from './qualify-lead.node';
import { makeState } from '../../../test/make-state';

const mockVectorStore = { similaritySearchWithScore: jest.fn() } as any;

const node = createQualifyLeadNode(mockVectorStore);

beforeEach(() => jest.clearAllMocks());

describe('qualifyLead node', () => {
  it('qualifies lead when score is below threshold', async () => {
    mockVectorStore.similaritySearchWithScore.mockResolvedValue([
      { content: 'health', score: 0.1 },
    ]);
    const state = makeState({
      funnelStep: 'collect_weight_loss_reason',
      weightLossReason: 'Quero melhorar minha saúde',
    });

    const result = await node(state);

    expect(result.qualified).toBe(true);
    expect(result.funnelStep).toBe('qualified');
  });

  it('rejects lead when score is above threshold', async () => {
    mockVectorStore.similaritySearchWithScore.mockResolvedValue([
      { content: 'unrelated', score: 0.5 },
    ]);
    const state = makeState({
      funnelStep: 'collect_weight_loss_reason',
      weightLossReason: 'Quero ficar bonito',
    });

    const result = await node(state);

    expect(result.qualified).toBe(false);
    expect(result.funnelStep).toBe('rejected');
  });

  it('qualifies lead at exact boundary (0.20)', async () => {
    mockVectorStore.similaritySearchWithScore.mockResolvedValue([
      { content: 'boundary', score: 0.2 },
    ]);
    const state = makeState({
      funnelStep: 'collect_weight_loss_reason',
      weightLossReason: 'Saúde',
    });

    const result = await node(state);

    expect(result.qualified).toBe(true);
    expect(result.funnelStep).toBe('qualified');
  });

  it('returns empty object when weightLossReason is missing', async () => {
    const state = makeState({
      funnelStep: 'collect_weight_loss_reason',
      weightLossReason: undefined,
    });

    const result = await node(state);

    expect(result).toEqual({});
    expect(mockVectorStore.similaritySearchWithScore).not.toHaveBeenCalled();
  });

  it('defaults to score 1 (rejected) when vector store returns empty', async () => {
    mockVectorStore.similaritySearchWithScore.mockResolvedValue([]);
    const state = makeState({
      funnelStep: 'collect_weight_loss_reason',
      weightLossReason: 'Algo aleatório',
    });

    const result = await node(state);

    expect(result.qualified).toBe(false);
    expect(result.funnelStep).toBe('rejected');
  });
});
