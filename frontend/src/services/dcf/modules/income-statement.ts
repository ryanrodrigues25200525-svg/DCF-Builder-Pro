
import { Assumptions } from '@/core/types';

export interface IncomeStatementResult {
    revenue: number;
    growthRate: number;
    grossProfit: number;
    grossMargin: number;
    costOfRevenue: number;
    ebit: number;
    ebitMargin: number;
    rdExpense: number;
    sgaExpense: number;
}

/**
 * Projects the income statement based on assumptions and historical trends.
 */
export function projectIncomeStatement(
    index: number,
    previousRevenue: number,
    previousEbitMargin: number,
    previousGrossMargin: number,
    assumptions: Assumptions,
    ov: {
        revenueGrowth?: number;
        revenue?: number;
        grossMargin?: number;
        ebitMargin?: number;
    }
): IncomeStatementResult {
    // 1. Revenue Growth with Stage Logic
    let growthRate = assumptions.revenueGrowth;
    if (assumptions.advancedMode) {
        if (index <= 3) {
            growthRate = assumptions.revenueGrowthStage1;
        } else if (index <= 7) {
            const fadeProgress = (index - 3) / 4;
            growthRate = assumptions.revenueGrowthStage1 -
                (assumptions.revenueGrowthStage1 - assumptions.revenueGrowthStage2) * fadeProgress;
        } else {
            const fadeProgress = Math.min(1, (index - 7) / 3);
            growthRate = assumptions.revenueGrowthStage2 -
                (assumptions.revenueGrowthStage2 - assumptions.revenueGrowthStage3) * fadeProgress;
        }
    }
    if (ov.revenueGrowth !== undefined) growthRate = ov.revenueGrowth;

    const revenue = ov.revenue || (previousRevenue * (1 + growthRate));

    // 2. Gross Profit & Margins
    let grossMargin = ov.grossMargin || assumptions.grossMargin;
    if (assumptions.advancedMode && index > 3) {
        const convergenceProgress = Math.min(1, (index - 3) / 5);
        grossMargin = previousGrossMargin + (assumptions.grossMargin - previousGrossMargin) * convergenceProgress;
    }
    const grossProfit = revenue * grossMargin;
    const costOfRevenue = revenue - grossProfit;

    // 3. OpEx
    const rdExpense = revenue * (assumptions.rdMargin || 0);
    const sgaExpense = revenue * (assumptions.sgaMargin || 0.15);

    // 4. EBIT
    let ebitMargin = ov.ebitMargin || assumptions.ebitMargin;
    if (assumptions.advancedMode && index <= (assumptions.ebitMarginConvergenceYears || 5)) {
        const convergenceProgress = index / (assumptions.ebitMarginConvergenceYears || 5);
        ebitMargin = previousEbitMargin +
            (assumptions.ebitMarginSteadyState - previousEbitMargin) * convergenceProgress;
    }

    const ebit = revenue * ebitMargin;

    return {
        revenue,
        growthRate,
        grossProfit,
        grossMargin,
        costOfRevenue,
        ebit,
        ebitMargin,
        rdExpense,
        sgaExpense
    };
}
