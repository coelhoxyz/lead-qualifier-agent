import { VectorStoreService } from '../../vector/vector-store.service';
import { FunnelState } from '../state';

// PGVectorStore returns cosine distance (lower = more similar)
// Threshold: distance below this value means strong match
const DISTANCE_THRESHOLD = 0.20;

export function createQualifyLeadNode(vectorStore: VectorStoreService) {
  return async (state: FunnelState): Promise<Partial<FunnelState>> => {
    if (!state.weightLossReason) {
      return {};
    }

    const results = await vectorStore.similaritySearchWithScore(
      state.weightLossReason,
      1,
    );

    const topDistance = results[0]?.score ?? 1;
    const isQualified = topDistance <= DISTANCE_THRESHOLD;

    return {
      qualified: isQualified,
      funnelStep: isQualified ? 'qualified' : 'rejected',
    };
  };
}
