import { describe, expect, it } from 'vitest';
import type { HistoricalData, Assumptions } from '@/core/types';
import { buildBaseAssumptions, normalizeAssumptions } from '@/services/dcf/assumption-policy';

const historicals: HistoricalData = {
  symbol: 'AAPL',
  years: [2023, 2024, 2025],
  revenue: [383285000000, 391035000000, 416161000000],
  costOfRevenue: [214137000000, 210352000000, 220960000000],
  grossProfit: [169148000000, 180683000000, 195201000000],
  ebitda: [129000000000, 138000000000, 147000000000],
  ebit: [114301000000, 123216000000, 133100000000],
  interestExpense: [3933000000, 0, 0],
  incomeTaxExpense: [16741000000, 29749000000, 22751000000],
  netIncome: [96995000000, 93736000000, 112010000000],
  depreciation: [11519000000, 11445000000, 11698000000],
  capex: [10959000000, 9447000000, 8530000000],
  nwcChange: [0, 0, 0],
  taxRate: [0.146, 0.241, 0.171],
  accountsReceivable: [29508000000, 33410000000, 36212000000],
  inventory: [6331000000, 7286000000, 6911000000],
  accountsPayable: [62611000000, 68960000000, 64115000000],
  cash: [29965000000, 29943000000, 35929000000],
  totalCurrentAssets: [143566000000, 152987000000, 154684000000],
  otherCurrentAssets: [0, 0, 0],
  totalAssets: [352583000000, 364980000000, 331495000000],
  totalDebt: [111088000000, 106629000000, 103028000000],
  currentDebt: [0, 0, 0],
  shareholdersEquity: [62146000000, 56950000000, 73711000000],
  ppeNet: [43715000000, 45680000000, 47420000000],
  otherAssets: [0, 0, 0],
  otherLiabilities: [0, 0, 0],
  totalLiabilities: [290437000000, 308030000000, 257784000000],
  totalCurrentLiabilities: [145308000000, 176392000000, 176392000000],
  otherCurrentLiabilities: [0, 0, 0],
  deferredRevenue: [0, 0, 0],
  retainedEarnings: [-214000000, -19154000000, -1766000000],
  sharesOutstanding: 14681140000,
  price: 249.17,
  beta: 1.116,
  currency: 'USD',
  sector: 'Technology',
  industry: 'Consumer Electronics',
};

describe('assumption-policy coherence', () => {
  it('recomputes derived discount rates after template application', () => {
    const assumptions = buildBaseAssumptions(
      historicals,
      { rf: 0.04283, mrp: 0.09 },
      12,
      { ticker: 'AAPL', sector: 'Technology', industry: 'Consumer Electronics' },
    );

    const expectedCostOfEquity = (assumptions.riskFreeRate ?? 0) + (assumptions.beta ?? 0) * (assumptions.equityRiskPremium ?? 0);

    expect(assumptions.discountRateMode).toBe('derived');
    expect(assumptions.wacc).toBeCloseTo(0.1015, 3);
    expect(assumptions.costOfEquity).toBeCloseTo(expectedCostOfEquity, 6);
    expect(assumptions.wacc).toBeLessThan(assumptions.costOfEquity ?? 1);
  });

  it('preserves a manual WACC override until a capital-market driver changes', () => {
    const base = buildBaseAssumptions(
      historicals,
      { rf: 0.04283, mrp: 0.09 },
      12,
      { ticker: 'AAPL', sector: 'Technology', industry: 'Consumer Electronics' },
    );

    const manual = normalizeAssumptions(
      { ...base, wacc: 0.12, discountRateMode: 'manual' } as Assumptions,
      historicals.sharesOutstanding,
      historicals,
    );
    expect(manual.wacc).toBeCloseTo(0.12, 6);
    expect(manual.discountRateMode).toBe('manual');

    const derivedAgain = normalizeAssumptions(
      { ...manual, beta: 1.3, discountRateMode: 'derived' } as Assumptions,
      historicals.sharesOutstanding,
      historicals,
    );
    expect(derivedAgain.discountRateMode).toBe('derived');
    expect(derivedAgain.wacc).not.toBeCloseTo(0.12, 6);
    expect(derivedAgain.costOfEquity).toBeCloseTo(
      (derivedAgain.riskFreeRate ?? 0) + (derivedAgain.beta ?? 0) * (derivedAgain.equityRiskPremium ?? 0),
      6,
    );
  });

  it('lets an explicit leverage target override historical debt when deriving WACC weights', () => {
    const base = buildBaseAssumptions(
      historicals,
      { rf: 0.04283, mrp: 0.09 },
      12,
      { ticker: 'AAPL', sector: 'Technology', industry: 'Consumer Electronics' },
    );

    const relevered = normalizeAssumptions(
      { ...base, leverageTarget: 0.6, discountRateMode: 'derived' } as Assumptions,
      historicals.sharesOutstanding,
      historicals,
    );

    expect(relevered.leverageTarget).toBeCloseTo(0.6, 3);
    expect(relevered.weightDebt).toBeCloseTo(0.6, 3);
    expect(relevered.weightEquity).toBeCloseTo(0.4, 3);
  });

  it('preserves explicit current debt in levered mode', () => {
    const base = buildBaseAssumptions(
      historicals,
      { rf: 0.04283, mrp: 0.09 },
      12,
      { ticker: 'AAPL', sector: 'Technology', industry: 'Consumer Electronics' },
    );

    const relevered = normalizeAssumptions(
      { ...base, modelType: 'levered', currentDebt: 250_000_000_000, discountRateMode: 'derived' } as Assumptions,
      historicals.sharesOutstanding,
      historicals,
    );

    expect(relevered.currentDebt).toBeCloseTo(250_000_000_000, 3);
  });
});
