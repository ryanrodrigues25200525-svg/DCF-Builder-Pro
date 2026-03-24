import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Assumptions, CompanyProfile, HistoricalData, Overrides } from '@/core/types';
import { applyScenarioAssumptions, buildBaseAssumptions, normalizeAssumptions } from '@/services/dcf/assumption-policy';

interface MarketDataLike {
    rf?: number;
    mrp?: number;
}

interface UseScenarioControlsArgs {
    historicals: HistoricalData | null;
    company: CompanyProfile | null;
    assumptions: Assumptions | null;
    marketData: MarketDataLike | null;
    setAssumptions: Dispatch<SetStateAction<Assumptions | null>>;
    setOverrides: Dispatch<SetStateAction<Overrides>>;
}

export function useScenarioControls({
    historicals,
    company,
    assumptions,
    marketData,
    setAssumptions,
    setOverrides,
}: UseScenarioControlsArgs) {
    const [activeScenario, setActiveScenario] = useState<'base' | 'conservative' | 'aggressive'>('base');

    const applyScenario = useCallback((type: 'base' | 'conservative' | 'aggressive') => {
        if (!historicals) return;
        setActiveScenario(type);

        const base = buildBaseAssumptions(
            historicals,
            { rf: marketData?.rf, mrp: marketData?.mrp },
            assumptions?.terminalExitMultiple || 12.0,
            company,
        );

        setAssumptions((prev) => applyScenarioAssumptions(
            type,
            base,
            prev?.modelType || 'unlevered',
            prev?.forecastYears ?? base.forecastYears,
            historicals.sharesOutstanding || 0,
            historicals,
        ));
    }, [historicals, marketData?.rf, marketData?.mrp, assumptions?.terminalExitMultiple, company, setAssumptions]);

    const resetToDefaults = useCallback(() => {
        if (!historicals) return;
        const base = buildBaseAssumptions(
            historicals,
            { rf: marketData?.rf, mrp: marketData?.mrp },
            assumptions?.terminalExitMultiple || 12.0,
            company,
        );
        setAssumptions(normalizeAssumptions(base, historicals.sharesOutstanding || 0, historicals));
        setOverrides({});
        setActiveScenario('base');
    }, [historicals, marketData?.rf, marketData?.mrp, assumptions?.terminalExitMultiple, company, setAssumptions, setOverrides]);

    const resetScenarioState = useCallback(() => {
        setActiveScenario('base');
    }, []);

    return {
        activeScenario,
        setActiveScenario,
        applyScenario,
        resetToDefaults,
        resetScenarioState,
    };
}
