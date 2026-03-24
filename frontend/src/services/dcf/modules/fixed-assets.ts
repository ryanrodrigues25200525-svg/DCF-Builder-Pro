
import { Assumptions } from '@/core/types';

interface OverrideValues {
  dea?: number;
  capex?: number;
}

export interface FixedAssetsResult {
    capex: number;
    depreciation: number;
    endingPpeNet: number;
}

/**
 * Projects Capex and PP&E roll-forward.
 */
export function projectFixedAssets(
    revenue: number,
    previousRevenue: number,
    ppeNet: number,
    assumptions: Assumptions,
    ov: OverrideValues // Overrides for the current year
): FixedAssetsResult {
    let depreciation: number;
    let capex: number;

    if (assumptions.advancedMode) {
        // Advanced mode: PP&E based depreciation
        if (ppeNet > 0) {
            const avgAssetLife = 10;
            depreciation = ppeNet / avgAssetLife;
        } else {
            depreciation = ov.dea || (revenue * assumptions.deaRatio);
        }

        // Sales to Capital based reinvestment
        const salesToCapital = assumptions.salesToCapitalRatio || 1.5;
        const revenueGrowth = revenue - previousRevenue;
        const reinvestmentNeed = Math.max(0, revenueGrowth / salesToCapital);
        capex = reinvestmentNeed + depreciation;
    } else {
        // Basic mode: Revenue ratio based
        depreciation = ov.dea || (revenue * assumptions.deaRatio);
        capex = ov.capex || (revenue * assumptions.capexRatio);
    }

    const endingPpeNet = Math.max(0, ppeNet + capex - depreciation);

    return {
        capex,
        depreciation,
        endingPpeNet
    };
}
