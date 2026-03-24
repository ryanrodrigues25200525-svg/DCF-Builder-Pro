"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Landmark, Percent, Scale, Sigma } from 'lucide-react';
import { cn } from '@/core/utils/cn';

interface WACCBuildProps {
    marketCap: number;
    totalDebt: number;
    rawBeta: number;
    riskFreeRate?: number;
    equityRiskPremium?: number;
    taxRate?: number;
    preTaxCostOfDebt?: number;
    leverageTarget?: number;
    onInputsChange?: (patch: {
        riskFreeRate: number;
        equityRiskPremium: number;
        beta: number;
        costOfDebt: number;
        taxRate: number;
        leverageTarget: number;
        currentDebt: number;
    }) => void;
    isDarkMode?: boolean;
}

function formatPct(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
}

function formatMoneyB(value: number): string {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}B`;
}

function formatNumber(value: number, decimals = 2): string {
    return value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function toPercentDraft(value: number): string {
    return (value * 100).toFixed(2);
}

function toNumberDraft(value: number): string {
    return value.toFixed(2);
}

function parseInputNumber(value: string): number | null {
    const normalized = value.replace(/,/g, '').trim();
    if (normalized === '' || normalized === '-' || normalized === '.' || normalized === '-.') return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

export function WACCBuild({
    marketCap,
    totalDebt,
    rawBeta,
    riskFreeRate = 0.046,
    equityRiskPremium = 0.052,
    taxRate = 0.21,
    preTaxCostOfDebt = 0.058,
    leverageTarget,
    onInputsChange,
    isDarkMode = true,
}: WACCBuildProps) {
    const [rf, setRf] = useState(riskFreeRate);
    const [erp, setErp] = useState(equityRiskPremium);
    const [beta, setBeta] = useState(rawBeta > 0 ? rawBeta : 1);
    const [kdPreTax, setKdPreTax] = useState(preTaxCostOfDebt);
    const [effectiveTaxRate, setEffectiveTaxRate] = useState(taxRate);
    const [equityValueB, setEquityValueB] = useState(Math.max(marketCap / 1_000_000_000, 0));
    const [debtValueB, setDebtValueB] = useState(
        leverageTarget !== undefined && leverageTarget > 0 && marketCap > 0
            ? Math.max((leverageTarget / Math.max(1 - leverageTarget, 0.0001)) * (marketCap / 1_000_000_000), 0)
            : Math.max(totalDebt / 1_000_000_000, 0)
    );
    const [activeField, setActiveField] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const onInputsChangeRef = useRef(onInputsChange);
    const lastSentPatchRef = useRef<string | null>(null);
    const hasUserEditedRef = useRef(false);

    const setUserEditedValue = (setter: (value: number) => void, value: number) => {
        hasUserEditedRef.current = true;
        setter(value);
    };

    const startEdit = (field: string, initial: string) => {
        setActiveField(field);
        setDrafts((prev) => ({ ...prev, [field]: initial }));
    };

    const updateDraft = (field: string, value: string) => {
        setDrafts((prev) => ({ ...prev, [field]: value }));
    };

    const endEdit = (field: string) => {
        setActiveField((prev) => (prev === field ? null : prev));
        setDrafts((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const metrics = useMemo(() => {
        const totalCapital = Math.max(equityValueB + debtValueB, 0.0001);
        const weightEquity = equityValueB / totalCapital;
        const weightDebt = debtValueB / totalCapital;

        const costOfEquity = rf + (beta * erp);
        const afterTaxCostOfDebt = kdPreTax * (1 - effectiveTaxRate);
        const wacc = (weightEquity * costOfEquity) + (weightDebt * afterTaxCostOfDebt);

        return {
            totalCapital,
            weightEquity,
            weightDebt,
            costOfEquity,
            afterTaxCostOfDebt,
            wacc,
        };
    }, [rf, erp, beta, kdPreTax, effectiveTaxRate, equityValueB, debtValueB]);

    useEffect(() => {
        onInputsChangeRef.current = onInputsChange;
    }, [onInputsChange]);

    useEffect(() => {
        const callback = onInputsChangeRef.current;
        if (!callback) return;
        if (!hasUserEditedRef.current) return;

        const patch = {
            riskFreeRate: Math.max(0, rf),
            equityRiskPremium: Math.max(0, erp),
            beta: Math.max(0, beta),
            costOfDebt: Math.max(0, kdPreTax),
            taxRate: Math.min(Math.max(0, effectiveTaxRate), 0.9),
            leverageTarget: Math.max(0, Math.min(metrics.weightDebt, 0.95)),
            currentDebt: Math.max(0, debtValueB * 1_000_000_000),
        };
        const signature = JSON.stringify(patch);
        if (lastSentPatchRef.current === signature) return;

        lastSentPatchRef.current = signature;
        callback(patch);
    }, [rf, erp, beta, kdPreTax, effectiveTaxRate, debtValueB, metrics.weightDebt]);

    return (
        <div
            data-local-theme={isDarkMode ? 'dark' : 'light'}
            className={cn(
                'comparables-theme-scope relative overflow-hidden rounded-[2rem] border shadow-[0_24px_64px_rgba(0,0,0,0.18)]',
                isDarkMode ? 'border-white/10 bg-[#030913] shadow-[0_28px_90px_rgba(0,0,0,0.6)]' : 'border-[var(--border-default)] bg-white'
            )}
        >
            <div className="comparables-aurora pointer-events-none absolute inset-0">
                <div className="absolute -left-20 -top-28 h-[420px] w-[520px] rounded-full bg-sky-400/15 blur-[90px]" />
                <div className="absolute left-1/2 -top-24 h-[360px] w-[500px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[90px]" />
                <div className="absolute -right-20 top-0 h-[420px] w-[520px] rounded-full bg-emerald-400/12 blur-[90px]" />
            </div>

            <div className="relative border-b border-[var(--border-default)] px-8 py-8 dark:border-white/10">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className={cn('text-[40px] font-black tracking-[-0.02em]', isDarkMode ? 'text-white' : 'text-slate-900')}>WACC Build</h2>
                        <p className={cn('mt-2 text-[12px] font-semibold uppercase tracking-[0.14em]', isDarkMode ? 'text-white/60' : 'text-slate-600')}>
                            CAPM + Cost of Debt + Capital Structure
                        </p>
                        <p className={cn('mt-3 text-[13px] font-semibold', isDarkMode ? 'text-indigo-200/85' : 'text-indigo-800')}>
                            Editing these inputs updates the shared model assumptions and reruns valuation.
                        </p>
                    </div>
                    <div />
                </div>
            </div>

            <div className="relative px-8 py-6">
                <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className={cn(
                        'group relative rounded-[1.6rem] border p-6 transform-gpu will-change-transform transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none',
                        isDarkMode
                            ? 'border-sky-300/25 bg-gradient-to-br from-sky-500/25 via-blue-600/15 to-blue-900/20'
                            : 'border-cyan-300 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-[0_24px_65px_rgba(37,99,235,0.55)]'
                    )}>
                        <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white">Cost of Equity</p>
                        <p className="mt-3 text-[42px] leading-none font-black tabular-nums text-white">{formatPct(metrics.costOfEquity)}</p>
                    </div>

                    <div className={cn(
                        'group relative rounded-[1.6rem] border p-6 transform-gpu will-change-transform transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none',
                        isDarkMode
                            ? 'border-indigo-300/25 bg-gradient-to-br from-indigo-500/25 via-violet-600/15 to-indigo-900/20'
                            : 'border-violet-300 bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-700 shadow-[0_24px_65px_rgba(139,92,246,0.55)]'
                    )}>
                        <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white">After-Tax COD</p>
                        <p className="mt-3 text-[42px] leading-none font-black tabular-nums text-white">{formatPct(metrics.afterTaxCostOfDebt)}</p>
                    </div>

                    <div className={cn(
                        'group relative rounded-[1.6rem] border p-6 transform-gpu will-change-transform transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none',
                        isDarkMode
                            ? 'border-emerald-300/20 bg-gradient-to-br from-emerald-500/20 via-teal-700/15 to-emerald-900/20'
                            : 'border-emerald-300 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 shadow-[0_24px_65px_rgba(16,185,129,0.52)]'
                    )}>
                        <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white">Equity Weight</p>
                        <p className="mt-3 text-[42px] leading-none font-black tabular-nums text-white">{formatPct(metrics.weightEquity)}</p>
                    </div>

                </div>

                <div
                    className={cn(
                        "comparables-table-shell overflow-hidden rounded-[1.6rem] border backdrop-blur-xl",
                        isDarkMode
                            ? "border-white/10 bg-[rgba(8,14,28,0.65)]"
                            : "border-[var(--border-default)] bg-white"
                    )}
                >
                    <div className="grid grid-cols-1 gap-8 p-6 lg:grid-cols-2">
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-sky-500 dark:text-sky-300">
                                <Sigma className="h-4 w-4" />
                                <h3 className="text-[20px] font-black uppercase tracking-[0.12em]">CAPM Inputs</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <label className="text-[14px] font-black uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                                    Risk-Free Rate
                                    <div className="mt-2 flex items-center gap-2">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={activeField === 'rf' ? (drafts.rf ?? toPercentDraft(rf)) : formatNumber(rf * 100, 2)}
                                        onFocus={(e) => {
                                            startEdit('rf', toPercentDraft(rf));
                                            e.currentTarget.select();
                                        }}
                                        onChange={(e) => {
                                            updateDraft('rf', e.target.value);
                                            const parsed = parseInputNumber(e.target.value);
                                            if (parsed !== null) setUserEditedValue(setRf, Math.max(0, parsed / 100));
                                        }}
                                        onBlur={() => {
                                            const parsed = parseInputNumber(drafts.rf ?? toPercentDraft(rf));
                                            if (parsed !== null) setUserEditedValue(setRf, Math.max(0, parsed / 100));
                                            endEdit('rf');
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') e.currentTarget.blur();
                                            if (e.key === 'Escape') {
                                                endEdit('rf');
                                                e.currentTarget.blur();
                                            }
                                        }}
                                        className="h-14 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-glass)] px-3 py-2 text-right text-[24px] leading-none font-black tabular-nums text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                                    />
                                        <span className="text-[13px] font-semibold text-[var(--text-tertiary)]">%</span>
                                    </div>
                                </label>

                                <label className="text-[14px] font-black uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                                    Beta
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={activeField === 'beta' ? (drafts.beta ?? toNumberDraft(beta)) : formatNumber(beta, 2)}
                                        onFocus={(e) => {
                                            startEdit('beta', toNumberDraft(beta));
                                            e.currentTarget.select();
                                        }}
                                        onChange={(e) => {
                                            updateDraft('beta', e.target.value);
                                            const parsed = parseInputNumber(e.target.value);
                                            if (parsed !== null) setUserEditedValue(setBeta, Math.max(0, parsed));
                                        }}
                                        onBlur={() => {
                                            const parsed = parseInputNumber(drafts.beta ?? toNumberDraft(beta));
                                            if (parsed !== null) setUserEditedValue(setBeta, Math.max(0, parsed));
                                            endEdit('beta');
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') e.currentTarget.blur();
                                            if (e.key === 'Escape') {
                                                endEdit('beta');
                                                e.currentTarget.blur();
                                            }
                                        }}
                                        className="mt-2 h-14 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-glass)] px-3 py-2 text-right text-[24px] leading-none font-black tabular-nums text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                                    />
                                </label>

                                <label className="text-[14px] font-black uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                                    Equity Risk Premium
                                    <div className="mt-2 flex items-center gap-2">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={activeField === 'erp' ? (drafts.erp ?? toPercentDraft(erp)) : formatNumber(erp * 100, 2)}
                                        onFocus={(e) => {
                                            startEdit('erp', toPercentDraft(erp));
                                            e.currentTarget.select();
                                        }}
                                        onChange={(e) => {
                                            updateDraft('erp', e.target.value);
                                            const parsed = parseInputNumber(e.target.value);
                                            if (parsed !== null) setUserEditedValue(setErp, Math.max(0, parsed / 100));
                                        }}
                                        onBlur={() => {
                                            const parsed = parseInputNumber(drafts.erp ?? toPercentDraft(erp));
                                            if (parsed !== null) setUserEditedValue(setErp, Math.max(0, parsed / 100));
                                            endEdit('erp');
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') e.currentTarget.blur();
                                            if (e.key === 'Escape') {
                                                endEdit('erp');
                                                e.currentTarget.blur();
                                            }
                                        }}
                                        className="h-14 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-glass)] px-3 py-2 text-right text-[24px] leading-none font-black tabular-nums text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                                    />
                                        <span className="text-[13px] font-semibold text-[var(--text-tertiary)]">%</span>
                                    </div>
                                </label>
                            </div>

                            <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-[15px] font-mono text-sky-500 dark:text-sky-200">
                                Ke = Rf + (beta x ERP) = {formatPct(rf)} + ({beta.toFixed(2)} x {formatPct(erp)}) = {formatPct(metrics.costOfEquity)}
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-300">
                                <Percent className="h-4 w-4" />
                                <h3 className="text-[20px] font-black uppercase tracking-[0.12em]">Cost of Debt</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <label className="text-[14px] font-black uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                                    Pre-Tax Cost of Debt
                                    <div className="mt-2 flex items-center gap-2">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={activeField === 'kd' ? (drafts.kd ?? toPercentDraft(kdPreTax)) : formatNumber(kdPreTax * 100, 2)}
                                        onFocus={(e) => {
                                            startEdit('kd', toPercentDraft(kdPreTax));
                                            e.currentTarget.select();
                                        }}
                                        onChange={(e) => {
                                            updateDraft('kd', e.target.value);
                                            const parsed = parseInputNumber(e.target.value);
                                            if (parsed !== null) setUserEditedValue(setKdPreTax, Math.max(0, parsed / 100));
                                        }}
                                        onBlur={() => {
                                            const parsed = parseInputNumber(drafts.kd ?? toPercentDraft(kdPreTax));
                                            if (parsed !== null) setUserEditedValue(setKdPreTax, Math.max(0, parsed / 100));
                                            endEdit('kd');
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') e.currentTarget.blur();
                                            if (e.key === 'Escape') {
                                                endEdit('kd');
                                                e.currentTarget.blur();
                                            }
                                        }}
                                        className="h-14 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-glass)] px-3 py-2 text-right text-[24px] leading-none font-black tabular-nums text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                    />
                                        <span className="text-[13px] font-semibold text-[var(--text-tertiary)]">%</span>
                                    </div>
                                </label>

                                <label className="text-[14px] font-black uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                                    Effective Tax Rate
                                    <div className="mt-2 flex items-center gap-2">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={activeField === 'tax' ? (drafts.tax ?? toPercentDraft(effectiveTaxRate)) : formatNumber(effectiveTaxRate * 100, 2)}
                                        onFocus={(e) => {
                                            startEdit('tax', toPercentDraft(effectiveTaxRate));
                                            e.currentTarget.select();
                                        }}
                                        onChange={(e) => {
                                            updateDraft('tax', e.target.value);
                                            const parsed = parseInputNumber(e.target.value);
                                            if (parsed !== null) setUserEditedValue(setEffectiveTaxRate, Math.min(Math.max(0, parsed / 100), 0.9));
                                        }}
                                        onBlur={() => {
                                            const parsed = parseInputNumber(drafts.tax ?? toPercentDraft(effectiveTaxRate));
                                            if (parsed !== null) setUserEditedValue(setEffectiveTaxRate, Math.min(Math.max(0, parsed / 100), 0.9));
                                            endEdit('tax');
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') e.currentTarget.blur();
                                            if (e.key === 'Escape') {
                                                endEdit('tax');
                                                e.currentTarget.blur();
                                            }
                                        }}
                                        className="h-14 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-glass)] px-3 py-2 text-right text-[24px] leading-none font-black tabular-nums text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                    />
                                        <span className="text-[13px] font-semibold text-[var(--text-tertiary)]">%</span>
                                    </div>
                                </label>
                            </div>

                            <div className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-3 text-[15px] font-mono text-indigo-500 dark:text-indigo-200">
                                Kd (after tax) = Kd x (1 - T) = {formatPct(kdPreTax)} x (1 - {formatPct(effectiveTaxRate)}) = {formatPct(metrics.afterTaxCostOfDebt)}
                            </div>
                        </section>
                    </div>

                    <div className="border-t border-[var(--border-default)] px-6 py-6 dark:border-white/10">
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-300">
                                <Scale className="h-4 w-4" />
                                <h3 className="text-[20px] font-black uppercase tracking-[0.12em]">Capital Structure</h3>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <label className="text-[16px] font-black uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                                    Equity Value ($B)
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={activeField === 'equity' ? (drafts.equity ?? toNumberDraft(equityValueB)) : formatNumber(equityValueB, 2)}
                                        onFocus={(e) => {
                                            startEdit('equity', toNumberDraft(equityValueB));
                                            e.currentTarget.select();
                                        }}
                                        onChange={(e) => {
                                            updateDraft('equity', e.target.value);
                                            const parsed = parseInputNumber(e.target.value);
                                            if (parsed !== null) setUserEditedValue(setEquityValueB, Math.max(0, parsed));
                                        }}
                                        onBlur={() => {
                                            const parsed = parseInputNumber(drafts.equity ?? toNumberDraft(equityValueB));
                                            if (parsed !== null) setUserEditedValue(setEquityValueB, Math.max(0, parsed));
                                            endEdit('equity');
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') e.currentTarget.blur();
                                            if (e.key === 'Escape') {
                                                endEdit('equity');
                                                e.currentTarget.blur();
                                            }
                                        }}
                                        className="mt-2 h-12 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-glass)] px-4 py-2 text-right text-[20px] leading-none font-black tabular-nums tracking-tight text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                    />
                                </label>

                                <label className="text-[16px] font-black uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                                    Debt Value ($B)
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={activeField === 'debt' ? (drafts.debt ?? toNumberDraft(debtValueB)) : formatNumber(debtValueB, 2)}
                                        onFocus={(e) => {
                                            startEdit('debt', toNumberDraft(debtValueB));
                                            e.currentTarget.select();
                                        }}
                                        onChange={(e) => {
                                            updateDraft('debt', e.target.value);
                                            const parsed = parseInputNumber(e.target.value);
                                            if (parsed !== null) setUserEditedValue(setDebtValueB, Math.max(0, parsed));
                                        }}
                                        onBlur={() => {
                                            const parsed = parseInputNumber(drafts.debt ?? toNumberDraft(debtValueB));
                                            if (parsed !== null) setUserEditedValue(setDebtValueB, Math.max(0, parsed));
                                            endEdit('debt');
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') e.currentTarget.blur();
                                            if (e.key === 'Escape') {
                                                endEdit('debt');
                                                e.currentTarget.blur();
                                            }
                                        }}
                                        className="mt-2 h-12 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-glass)] px-4 py-2 text-right text-[20px] leading-none font-black tabular-nums tracking-tight text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                    />
                                </label>

                                <div>
                                    <div className="text-[16px] font-black uppercase tracking-[0.08em] text-[var(--text-secondary)]">Total Capital</div>
                                    <div className="mt-2 h-12 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-glass)] px-4 py-2 text-right text-[20px] leading-none font-black tabular-nums tracking-tight text-[var(--text-primary)] flex items-center justify-end">
                                        {formatMoneyB(metrics.totalCapital)}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className={cn(
                                        'text-[16px] font-black uppercase tracking-[0.08em]',
                                        isDarkMode ? 'text-emerald-300' : 'text-emerald-700'
                                    )}>E/V {formatPct(metrics.weightEquity)}</div>
                                    <div className={cn(
                                        'text-[16px] font-black uppercase tracking-[0.08em]',
                                        isDarkMode ? 'text-rose-300' : 'text-rose-700'
                                    )}>D/V {formatPct(metrics.weightDebt)}</div>
                                </div>
                                <div className="h-6 overflow-hidden rounded-full border border-[var(--border-default)] bg-[var(--bg-glass)]">
                                    <div className="flex h-full w-full">
                                        <div
                                            className="h-full bg-emerald-500 transition-all duration-300"
                                            style={{ width: `${Math.max(0, Math.min(metrics.weightEquity * 100, 100))}%` }}
                                        />
                                        <div
                                            className="h-full bg-rose-500 transition-all duration-300"
                                            style={{ width: `${Math.max(0, Math.min(metrics.weightDebt * 100, 100))}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <div className="mt-4 rounded-[1.3rem] border border-[var(--border-default)] bg-[var(--bg-glass)] px-6 py-5 dark:border-white/10">
                    <div className={cn('flex items-center gap-2', isDarkMode ? 'text-amber-300' : 'text-indigo-700')}>
                        <Landmark className="h-4 w-4" />
                        <span className="text-[18px] font-black uppercase tracking-[0.12em]">WACC</span>
                    </div>
                    <div className={cn('mt-3 text-[16px] font-mono', isDarkMode ? 'text-[var(--text-secondary)]' : 'text-slate-900')}>
                        WACC = (E/V x Ke) + (D/V x Kd after-tax)
                    </div>
                    <div className={cn('mt-1 text-[16px] font-mono', isDarkMode ? 'text-[var(--text-secondary)]' : 'text-slate-900')}>
                        = ({formatPct(metrics.weightEquity)} x {formatPct(metrics.costOfEquity)}) + ({formatPct(metrics.weightDebt)} x {formatPct(metrics.afterTaxCostOfDebt)})
                    </div>
                    <div className={cn('mt-3 text-[40px] font-black tabular-nums', isDarkMode ? 'text-amber-300' : 'text-indigo-700')}>{formatPct(metrics.wacc)}</div>
                </div>
            </div>
        </div>
    );
}
