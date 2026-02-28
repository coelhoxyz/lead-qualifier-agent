import { routeAfterProcessing } from './graph';
import { makeState } from '../../test/make-state';

describe('routeAfterProcessing', () => {
  it('routes to qualifyLead when step is collect_weight_loss_reason and reason exists', () => {
    const state = makeState({
      funnelStep: 'collect_weight_loss_reason',
      weightLossReason: 'Saúde',
    });

    expect(routeAfterProcessing(state)).toBe('qualifyLead');
  });

  it('routes to generateResponse when step is collect_weight_loss_reason but reason is undefined', () => {
    const state = makeState({
      funnelStep: 'collect_weight_loss_reason',
      weightLossReason: undefined,
    });

    expect(routeAfterProcessing(state)).toBe('generateResponse');
  });

  it('routes to generateResponse when step is collect_name', () => {
    const state = makeState({ funnelStep: 'collect_name' });

    expect(routeAfterProcessing(state)).toBe('generateResponse');
  });

  it('routes to generateResponse when step is collect_birth_date', () => {
    const state = makeState({ funnelStep: 'collect_birth_date' });

    expect(routeAfterProcessing(state)).toBe('generateResponse');
  });

  it('routes to generateResponse when reason is empty string (falsy)', () => {
    const state = makeState({
      funnelStep: 'collect_weight_loss_reason',
      weightLossReason: '',
    });

    expect(routeAfterProcessing(state)).toBe('generateResponse');
  });
});
