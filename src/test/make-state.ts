import { FunnelState } from '../agent/graph/state';

export function makeState(overrides: Partial<FunnelState> = {}): FunnelState {
  return {
    phoneNumber: '+5511999999999',
    messages: [{ role: 'user', content: 'Olá' }],
    name: undefined,
    birthDate: undefined,
    weightLossReason: undefined,
    qualified: undefined,
    funnelStep: 'collect_name',
    responseMessage: '',
    ...overrides,
  };
}
