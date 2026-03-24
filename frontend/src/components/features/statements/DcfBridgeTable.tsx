"use client";

import { cn } from '@/core/utils/cn';
import { formatDisplayMillions, formatDisplayNumber, formatDisplayShareValue, formatDisplayPercent } from '@/core/utils/financial-format';
import type { Assumptions, DCFResults, HistoricalData } from '@/core/types';
import { DCF_BRIDGE_ROWS, FCFE_BRIDGE_ROWS, StatementRow as StatementRowConfig } from '@/core/config/financial-statements';
import { calculateFinancialValue } from '@/core/logic/financial-processor';
import { StatementRow } from './StatementRow';

interface Props {
    displayedYears: number[];
    foreYears: number[];
    historicals: HistoricalData;
    results: DCFResults;
    assumptions: Assumptions | null;
}

export function DcfBridgeTable({ displayedYears, foreYears, historicals, results, assumptions }: Props) {
    const getValueForDisplay = (year: number, row: StatementRowConfig) => {
        const isForecast = foreYears.includes(year);
        const notAvailableInForecast = [
            'source_debt', 'source_equity', 'source_cash_draw',
            'use_cfo_loss', 'use_debt_repay', 'use_buybacks',
        ];

        if (isForecast && notAvailableInForecast.includes(row.id)) {
            return { text: '—', val: 0, isPercent: false, isNA: true };
        }
        if (!isForecast && (row.id === 'df' || row.id === 'pv' || row.id === 'pvFcff')) {
            return { text: '—', val: 0, isPercent: false, isNA: true };
        }

        const rawVal = calculateFinancialValue(row.id, year, historicals, results);
        if (row.format === 'percent') {
            return { text: formatDisplayPercent(rawVal), val: rawVal, isPercent: true, isNA: false };
        }
        if (row.format === 'number') {
            return { text: rawVal.toFixed(2), val: rawVal, isPercent: false, isNA: false };
        }
        return { text: formatDisplayMillions(rawVal), val: rawVal / 1_000_000, isPercent: false, isNA: false };
    };

    const renderConfigRows = (rows: StatementRowConfig[], headerTitle: string, headerColor: string) => (
        <>
            <tr className="financials-section-block bg-[var(--financials-section-bg)]">
                <td className="financials-sticky-cell sticky left-0 z-30 border-b border-r border-[var(--financials-border)] bg-[var(--financials-section-bg)] px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: headerColor }}>
                    {headerTitle}
                </td>
                <td colSpan={displayedYears.length} className="financials-section-fill border-b border-[var(--financials-border)] bg-[var(--financials-section-bg)]" />
            </tr>
            {rows.map((row) => (
                <StatementRow
                    key={row.id}
                    row={row}
                    years={displayedYears}
                    foreYears={foreYears}
                    getValueForDisplay={getValueForDisplay}
                    headerColor={headerColor}
                    forecastValueClassName="text-[var(--financials-forecast-value-text)]"
                />
            ))}
        </>
    );

    const modelType = assumptions?.modelType || 'unlevered';
    const isDdm = modelType === 'ddm';
    const isLevered = modelType === 'levered';
    const sumPv = isDdm || isLevered
        ? results.forecasts.reduce((sum, f) => sum + (f.pvFcff || 0), 0)
        : (results.enterpriseValue - results.pvTerminalValue);
    const terminalValueRaw = results.terminalValue;
    const terminalValue = results.pvTerminalValue;
    const enterpriseOrEquityValue = isDdm || isLevered ? results.equityValue : results.enterpriseValue;
    const lastHistIdx = historicals.years.length - 1;
    const cashAndEq = (historicals.cash[lastHistIdx] || 0) + ((historicals.marketableSecurities?.[lastHistIdx]) || 0);
    const totalDebt = historicals.totalDebt[lastHistIdx] || 0;
    const netDebt = totalDebt - cashAndEq;
    const equityValue = results.equityValue;
    const shares = historicals.sharesOutstanding || 1;
    const sharePrice = results.impliedSharePrice;

    const renderBridgeRow = (label: string, value: number, type: 'currency' | 'share' | 'percent' | 'number' = 'currency', bold = false, operator = '') => {
        let displayVal = '';
        if (type === 'currency') displayVal = formatDisplayMillions(value);
        else if (type === 'share') displayVal = formatDisplayShareValue(value);
        else if (type === 'number') displayVal = formatDisplayNumber(value);
        else displayVal = formatDisplayPercent(value);

        return (
            <tr key={label} className="group transition-colors hover:bg-[var(--financials-row-hover-bg)]">
                <td className="financials-sticky-cell py-4 px-6 sticky left-0 z-30 border-r border-b border-[var(--financials-border)] bg-[var(--financials-sticky-bg)] backdrop-blur-md whitespace-nowrap">
                    <div className="flex justify-between items-center text-[var(--text-secondary)]">
                        <div className="flex items-center gap-3">
                            {operator && <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--bg-glass)] text-[10px] font-black text-[var(--text-secondary)]">{operator}</span>}
                            <span className={cn('text-[13px]', bold ? 'font-bold text-[var(--text-primary)]' : 'font-medium')}>{label}</span>
                        </div>
                    </div>
                </td>
                <td colSpan={displayedYears.length} className="financials-value-cell bg-[var(--financials-row-bg)] px-6 py-4 border-b border-[var(--financials-border)] text-right tabular-nums text-[13px] text-[var(--financials-value-text)] font-mono font-bold">
                    {displayVal}
                </td>
            </tr>
        );
    };

    return (
        <>
            {isDdm || isLevered
                ? renderConfigRows(FCFE_BRIDGE_ROWS, isDdm ? 'DDM Attribution' : 'FCFE Attribution', '#FF9F0A')
                : renderConfigRows(DCF_BRIDGE_ROWS, 'FCFF Attribution', '#FF9F0A')}
            <tr className="h-8">
                <td className="financials-sticky-cell sticky left-0 bg-[var(--financials-sticky-bg)] border-r border-[var(--financials-border)]" />
                <td colSpan={displayedYears.length} className="bg-[var(--financials-row-bg)]" />
            </tr>
            {renderBridgeRow(`Sum of PV of ${isDdm ? 'Dividends' : isLevered ? 'FCFE' : 'FCFF'}`, sumPv, 'currency', true)}
            {renderBridgeRow('Terminal Value', terminalValueRaw)}
            {renderBridgeRow('PV of Terminal Value', terminalValue, 'currency', false, '+')}
            {renderBridgeRow(`${isDdm || isLevered ? 'Equity Value' : 'Enterprise Value'}`, enterpriseOrEquityValue, 'currency', true, '=')}
            {!isDdm && !isLevered && renderBridgeRow('Cash + Marketable Securities', cashAndEq, 'currency', false, '+')}
            {!isDdm && !isLevered && renderBridgeRow('Total Debt', totalDebt, 'currency', false, '-')}
            {!isDdm && !isLevered && renderBridgeRow('Net Debt', netDebt, 'currency')}
            {!isDdm && !isLevered && renderBridgeRow('Equity Value', equityValue, 'currency', true, '=')}
            {renderBridgeRow('Shares Outstanding', shares, 'number')}
            {renderBridgeRow('Implied Share Price', sharePrice, 'share', true, '=')}
        </>
    );
}
