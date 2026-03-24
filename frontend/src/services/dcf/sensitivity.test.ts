import { describe, expect, it } from "vitest";
import { calculateDCF } from "./engine";
import { calculateSensitivityAnalysis } from "./sensitivity";
import { Assumptions, HistoricalData, Overrides } from "@/core/types";

const mockHistoricals: HistoricalData = {
  symbol: "TEST",
  years: [2023, 2024, 2025],
  revenue: [100, 110, 120],
  costOfRevenue: [60, 65, 70],
  grossProfit: [40, 45, 50],
  ebitda: [15, 20, 25],
  ebit: [10, 15, 20],
  interestExpense: [1, 1, 0.8],
  incomeTaxExpense: [2, 3, 4],
  netIncome: [7, 11, 15.2],
  depreciation: [5, 5, 5],
  capex: [4, 5, 6],
  nwcChange: [1, 2, 2],
  taxRate: [0.2, 0.2, 0.2],
  stockBasedComp: [1, 1, 1],
  cash: [10, 15, 20],
  accountsReceivable: [10, 11, 12],
  inventory: [15, 16, 18],
  otherCurrentAssets: [2, 2, 2],
  totalCurrentAssets: [27, 33, 40],
  accountsPayable: [8, 9, 10],
  deferredRevenue: [1, 1, 1],
  currentDebt: [5, 4, 3],
  otherCurrentLiabilities: [1, 1, 1],
  totalCurrentLiabilities: [15, 15, 15],
  ppeNet: [40, 42, 45],
  totalAssets: [100, 115, 130],
  totalDebt: [20, 18, 15],
  totalLiabilities: [30, 35, 40],
  shareholdersEquity: [50, 60, 71],
  otherAssets: [5, 5, 5],
  otherLiabilities: [2, 2, 2],
  retainedEarnings: [20, 30, 41],
  sharesOutstanding: 10,
  price: 15.0,
  beta: 1.0,
  currency: "USD",
};

const mockAssumptions: Assumptions = {
  forecastYears: 5,
  revenueGrowth: 0.05,
  ebitMargin: 0.2,
  taxRate: 0.25,
  grossMargin: 0.4,
  rdMargin: 0,
  sgaMargin: 0.2,
  deaRatio: 0.041,
  capexRatio: 0.05,
  nwcChangeRatio: 0.01,
  accountsReceivableDays: 36.5,
  inventoryDays: 60,
  accountsPayableDays: 30,
  wacc: 0.1,
  terminalGrowthRate: 0.02,
  terminalExitMultiple: 10.0,
  valuationMethod: "growth",
  advancedMode: false,
  startingInvestedCapital: 100,
  revenueGrowthStage1: 0.05,
  revenueGrowthStage2: 0.03,
  revenueGrowthStage3: 0.02,
  ebitMarginSteadyState: 0.2,
  ebitMarginConvergenceYears: 5,
  salesToCapitalRatio: 1.5,
  leverageTarget: 0.2,
  riskFreeRate: 0.04,
  equityRiskPremium: 0.06,
  beta: 1.0,
  costOfDebt: 0.05,
  costOfEquity: 0.1,
  weightDebt: 0.2,
  weightEquity: 0.8,
};

const overrides: Overrides = {};

describe("Sensitivity analysis", () => {
  it("builds a sorted matrix with expected shape", () => {
    const waccRange = [-0.01, -0.005, 0, 0.005, 0.01];
    const growthRange = [-0.01, -0.005, 0, 0.005, 0.01];
    const sensitivity = calculateSensitivityAnalysis(
      mockHistoricals,
      mockAssumptions,
      overrides,
      waccRange,
      growthRange
    );

    expect(sensitivity.rows).toHaveLength(growthRange.length);
    expect(sensitivity.cols).toHaveLength(waccRange.length);
    expect(sensitivity.data).toHaveLength(growthRange.length);
    sensitivity.data.forEach((row) => expect(row).toHaveLength(waccRange.length));

    for (let i = 1; i < sensitivity.rows.length; i++) {
      expect(sensitivity.rows[i]).toBeGreaterThanOrEqual(sensitivity.rows[i - 1]);
    }
    for (let i = 1; i < sensitivity.cols.length; i++) {
      expect(sensitivity.cols[i]).toBeGreaterThanOrEqual(sensitivity.cols[i - 1]);
    }
  });

  it("matches base implied share price at the center point", () => {
    const sensitivity = calculateSensitivityAnalysis(mockHistoricals, mockAssumptions, overrides);
    const base = calculateDCF(mockHistoricals, mockAssumptions, overrides);
    const center = sensitivity.data[2][2].impliedSharePrice;

    expect(Math.abs(center - base.impliedSharePrice)).toBeLessThan(0.01);
  });

  it("returns finite values for all cells", () => {
    const sensitivity = calculateSensitivityAnalysis(mockHistoricals, mockAssumptions, overrides);

    for (const row of sensitivity.data) {
      for (const cell of row) {
        expect(Number.isFinite(cell.impliedSharePrice)).toBe(true);
        expect(Number.isFinite(cell.percentageChange)).toBe(true);
        expect(cell.impliedSharePrice).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
