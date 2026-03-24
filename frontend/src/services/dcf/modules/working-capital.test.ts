import { describe, expect, it } from 'vitest';
import type { Assumptions } from '@/core/types';
import { projectWorkingCapital } from './working-capital';

describe('projectWorkingCapital', () => {
  it('applies nwc intensity as an overlay to the day-based schedule', () => {
    const assumptions = {
      accountsReceivableDays: 30,
      inventoryDays: 20,
      accountsPayableDays: 15,
      nwcChangeRatio: 0.05,
    } as Assumptions;

    const result = projectWorkingCapital(1000, 400, assumptions, 100);

    const expectedDaysBasedNwc = ((1000 / 365) * 30) + ((400 / 365) * 20) - ((400 / 365) * 15);
    expect(result.nwc).toBeCloseTo(expectedDaysBasedNwc + 50, 6);
    expect(result.nwcChange).toBeCloseTo(result.nwc - 100, 6);
  });
});
