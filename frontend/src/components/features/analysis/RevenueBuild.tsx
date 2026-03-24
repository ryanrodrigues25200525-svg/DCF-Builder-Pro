"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { RevenueDriver, RevenueBuild as RevenueBuildType } from '@/core/types';
import { Plus, Trash2, TrendingUp } from 'lucide-react';
import { cn } from '@/core/utils/cn';

type BuildYear = number;
type SegmentValues = Record<BuildYear, number>;

interface RevenueSegment {
    id: string;
    name: string;
    values: SegmentValues;
}

interface RevenuePoint {
    year: number;
    revenue: number;
}

interface RevenueBuildProps {
    currentRevenue: number;
    historicalRevenuePoints?: RevenuePoint[];
    initialGrowthRate?: number;
    onDataChange?: (data: RevenueBuildType) => void;
    isDarkMode?: boolean;
}

function formatMoneyMm(valueMm: number): string {
    if (Math.abs(valueMm) >= 1000) return `$${(valueMm / 1000).toFixed(2)}B`;
    return `$${valueMm.toFixed(1)}M`;
}

function formatInput(valueMm: number): string {
    if (!Number.isFinite(valueMm)) return '0.0';
    return valueMm.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });
}

function formatPct(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

function toEditableInput(valueMm: number): string {
    if (!Number.isFinite(valueMm)) return '';
    return valueMm.toFixed(1);
}

function parseInputNumber(input: string): number | null {
    const normalized = input.replace(/,/g, '').trim();
    if (normalized === '' || normalized === '.' || normalized === '-' || normalized === '-.') return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function sumForYear(segments: RevenueSegment[], year: BuildYear): number {
    return segments.reduce((acc, segment) => acc + (segment.values[year] || 0), 0);
}

function buildYearRanges(historicalRevenuePoints?: RevenuePoint[]) {
    const availableYears = (historicalRevenuePoints || [])
        .map((point) => point.year)
        .filter((year) => Number.isFinite(year))
        .sort((a, b) => a - b);

    const historicalYears = availableYears.length > 0 ? availableYears.slice(-3) : [2022, 2023, 2024];
    const anchorYear = historicalYears[historicalYears.length - 1] ?? 2024;
    const projectedYears = Array.from({ length: 5 }, (_, idx) => anchorYear + idx + 1);

    return {
        historicalYears,
        projectedYears,
        allYears: [...historicalYears, ...projectedYears],
    };
}

function createInitialSegments(
    currentRevenueMm: number,
    historicalRevenuePoints: RevenuePoint[] | undefined,
    historicalYears: readonly number[],
    projectedYears: readonly number[],
    baseGrowthRate: number,
): RevenueSegment[] {
    const byYear = new Map<number, number>();
    historicalRevenuePoints?.forEach((point) => {
        byYear.set(point.year, point.revenue / 1_000_000);
    });

    const latestHistoricalYear = historicalYears[historicalYears.length - 1] ?? 2024;
    const latestHistoricalRevenue = byYear.get(latestHistoricalYear) ?? (currentRevenueMm > 0 ? currentRevenueMm : 1000);

    const totals = {} as SegmentValues;
    historicalYears.forEach((year) => {
        const fallbackRevenue = latestHistoricalRevenue / Math.pow(1.08, latestHistoricalYear - year);
        totals[year] = byYear.get(year) ?? fallbackRevenue;
    });

    projectedYears.forEach((year, idx) => {
        const previousYear = idx === 0 ? latestHistoricalYear : projectedYears[idx - 1];
        const previousRevenue = totals[previousYear] || latestHistoricalRevenue;
        totals[year] = previousRevenue * (1 + baseGrowthRate);
    });

    const segmentMeta = [
        { id: 'seg-core', name: 'Core Product', share: 0.55 },
        { id: 'seg-enterprise', name: 'Enterprise', share: 0.3 },
        { id: 'seg-services', name: 'Services', share: 0.15 },
    ];

    return segmentMeta.map((segment) => {
        const values = {} as SegmentValues;

        historicalYears.forEach((year) => {
            values[year] = (totals[year] || 0) * segment.share;
        });

        projectedYears.forEach((year, idx) => {
            const previousYear = idx === 0 ? latestHistoricalYear : projectedYears[idx - 1];
            const previousValue = values[previousYear] || 0;
            values[year] = previousValue * (1 + baseGrowthRate);
        });

        return {
            id: segment.id,
            name: segment.name,
            values,
        };
    });
}

function createEmptySegment(index: number, years: readonly number[]): RevenueSegment {
    const values = {} as SegmentValues;
    years.forEach((year) => {
        values[year] = 0;
    });

    return {
        id: `seg-new-${Date.now()}-${index}`,
        name: `New Segment ${index}`,
        values,
    };
}

export function RevenueBuild({
    currentRevenue,
    historicalRevenuePoints,
    initialGrowthRate = 0.08,
    onDataChange,
    isDarkMode = true,
}: RevenueBuildProps) {
    const { historicalYears, projectedYears, allYears } = useMemo(
        () => buildYearRanges(historicalRevenuePoints),
        [historicalRevenuePoints]
    );

    const baseHistoricalYear = historicalYears[historicalYears.length - 1] ?? 2024;
    const lastProjectedYear = projectedYears[projectedYears.length - 1] ?? (baseHistoricalYear + 5);

    const initialSegments = useMemo(
        () => createInitialSegments(
            currentRevenue / 1_000_000,
            historicalRevenuePoints,
            historicalYears,
            projectedYears,
            Math.max(-0.2, Math.min(initialGrowthRate, 0.5)),
        ),
        [currentRevenue, historicalRevenuePoints, historicalYears, projectedYears, initialGrowthRate]
    );

    const [segments, setSegments] = useState<RevenueSegment[]>(() => initialSegments);
    const [activeEditCell, setActiveEditCell] = useState<string | null>(null);
    const [cellDrafts, setCellDrafts] = useState<Record<string, string>>({});
    const hasUserEditedRef = useRef(false);

    const totals = useMemo(() => {
        const nextTotals = {} as SegmentValues;
        allYears.forEach((year) => {
            nextTotals[year] = sumForYear(segments, year);
        });
        return nextTotals;
    }, [allYears, segments]);

    const yoyGrowth = useMemo(() => {
        const growth = {} as Record<BuildYear, number | null>;
        allYears.forEach((year, idx) => {
            if (idx === 0) {
                growth[year] = null;
                return;
            }
            const previousYear = allYears[idx - 1];
            const previousTotal = totals[previousYear];
            growth[year] = previousTotal > 0 ? (totals[year] - previousTotal) / previousTotal : null;
        });
        return growth;
    }, [allYears, totals]);

    const currentRevenueMm = totals[baseHistoricalYear] || 0;
    const projectedRevenueMm = totals[lastProjectedYear] || 0;
    const cagr = currentRevenueMm > 0
        ? Math.pow(projectedRevenueMm / currentRevenueMm, 1 / projectedYears.length) - 1
        : 0;

    const formulaCards = [
        {
            label: 'Total Revenue',
            expression: '= sum of all segment rows',
            detail: 'Aggregation',
            accent: isDarkMode ? 'from-sky-400/40 to-sky-500/0' : 'from-sky-500/40 to-sky-500/0',
            chip: isDarkMode ? 'bg-sky-400/15 text-sky-200 border-sky-300/30' : 'bg-sky-100 text-sky-700 border-sky-300',
            glow: isDarkMode ? 'shadow-[0_12px_28px_rgba(56,189,248,0.12)]' : 'shadow-[0_12px_28px_rgba(2,132,199,0.12)]'
        },
        {
            label: 'YoY Growth',
            expression: '= (Current / Previous) - 1',
            detail: 'Period-over-period',
            accent: isDarkMode ? 'from-indigo-400/40 to-indigo-500/0' : 'from-indigo-500/40 to-indigo-500/0',
            chip: isDarkMode ? 'bg-indigo-400/15 text-indigo-200 border-indigo-300/30' : 'bg-indigo-100 text-indigo-700 border-indigo-300',
            glow: isDarkMode ? 'shadow-[0_12px_28px_rgba(129,140,248,0.12)]' : 'shadow-[0_12px_28px_rgba(99,102,241,0.12)]'
        },
        {
            label: 'CAGR',
            expression: `= (${lastProjectedYear} / ${baseHistoricalYear})^(1/${projectedYears.length}) - 1`,
            detail: 'Annualized growth',
            accent: isDarkMode ? 'from-emerald-400/40 to-emerald-500/0' : 'from-emerald-500/40 to-emerald-500/0',
            chip: isDarkMode ? 'bg-emerald-400/15 text-emerald-200 border-emerald-300/30' : 'bg-emerald-100 text-emerald-700 border-emerald-300',
            glow: isDarkMode ? 'shadow-[0_12px_28px_rgba(52,211,153,0.12)]' : 'shadow-[0_12px_28px_rgba(16,185,129,0.12)]'
        }
    ] as const;

    useEffect(() => {
        if (!onDataChange) return;
        if (!hasUserEditedRef.current) return;

        const drivers: RevenueDriver[] = segments.map((segment) => {
            const startValue = segment.values[baseHistoricalYear] || 0;
            const endValue = segment.values[lastProjectedYear] || 0;
            const impliedGrowth = startValue > 0 ? Math.pow(endValue / startValue, 1 / projectedYears.length) - 1 : 0;

            return {
                id: segment.id,
                name: segment.name,
                type: 'bottom_up',
                baseUnits: startValue,
                unitGrowthRate: impliedGrowth,
            };
        });

        const projectedRevenue = projectedYears.map((year) => totals[year]);
        const projectedGrowth = projectedYears.map((year, idx) => {
            if (idx === 0) {
                const base = totals[baseHistoricalYear];
                return base > 0 ? (totals[year] - base) / base : 0;
            }
            const previous = projectedYears[idx - 1];
            const base = totals[previous];
            return base > 0 ? (totals[year] - base) / base : 0;
        });

        onDataChange({
            approach: 'hybrid',
            drivers,
            projectedRevenue,
            projectedGrowth,
        });
    }, [baseHistoricalYear, lastProjectedYear, onDataChange, projectedYears, projectedYears.length, segments, totals]);

    const updateSegmentName = (id: string, name: string) => {
        hasUserEditedRef.current = true;
        setSegments((prev) => prev.map((segment) => (segment.id === id ? { ...segment, name } : segment)));
    };

    const updateSegmentValue = (id: string, year: BuildYear, value: number) => {
        hasUserEditedRef.current = true;
        setSegments((prev) => prev.map((segment) => {
            if (segment.id !== id) return segment;
            return {
                ...segment,
                values: {
                    ...segment.values,
                    [year]: value,
                },
            };
        }));
    };

    const addSegment = () => {
        hasUserEditedRef.current = true;
        setSegments((prev) => [...prev, createEmptySegment(prev.length + 1, allYears)]);
    };

    const deleteSegment = (id: string) => {
        hasUserEditedRef.current = true;
        setSegments((prev) => {
            const filtered = prev.filter((segment) => segment.id !== id);
            if (filtered.length > 0) return filtered;
            return [createEmptySegment(1, allYears)];
        });
    };

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
                        <h2 className={cn('text-[40px] font-black tracking-[-0.02em]', isDarkMode ? 'text-white' : 'text-slate-900')}>Revenue Build</h2>
                        <p className={cn('mt-2 text-sm font-semibold uppercase tracking-[0.16em]', isDarkMode ? 'text-white/60' : 'text-slate-600')}>
                            Historical {historicalYears[0]}-{historicalYears[historicalYears.length - 1]} + Projected {projectedYears[0]}-{projectedYears[projectedYears.length - 1]}
                        </p>
                        <p className={cn('mt-3 text-[13px] font-semibold', isDarkMode ? 'text-sky-200/85' : 'text-sky-800')}>
                            Changes here write directly into the live DCF revenue forecast.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            'rounded-full border px-5 py-2 text-[13px] font-black uppercase tracking-[0.16em]',
                            isDarkMode ? 'border-sky-300/40 bg-sky-400/15 text-sky-100' : 'border-sky-300 bg-sky-100 text-sky-800'
                        )}>
                            {segments.length} Segments
                        </div>
                        <button
                            onClick={addSegment}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-full border px-5 py-2 text-[13px] font-black uppercase tracking-[0.16em] transition-colors',
                                isDarkMode
                                    ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/25'
                                    : 'border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            )}
                            type="button"
                        >
                            <Plus className="h-4 w-4" />
                            Add Segment
                        </button>
                    </div>
                </div>
            </div>

            <div className="relative px-8 py-6">
                <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className={cn(
                        'group relative rounded-[1.6rem] border p-6 transform-gpu will-change-transform transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none',
                        isDarkMode
                            ? 'border-sky-300/25 bg-gradient-to-br from-sky-500/25 via-blue-600/15 to-blue-900/20'
                            : 'border-cyan-300 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-[0_24px_65px_rgba(37,99,235,0.55)]'
                    )}>
                        <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white">Current Revenue</p>
                        <p className="mt-3 text-[42px] leading-none font-black tabular-nums text-white">{formatMoneyMm(currentRevenueMm)}</p>
                    </div>

                    <div className={cn(
                        'group relative rounded-[1.6rem] border p-6 transform-gpu will-change-transform transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none',
                        isDarkMode
                            ? 'border-indigo-300/25 bg-gradient-to-br from-indigo-500/25 via-violet-600/15 to-indigo-900/20'
                            : 'border-violet-300 bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-700 shadow-[0_24px_65px_rgba(139,92,246,0.55)]'
                    )}>
                        <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white">Projected Revenue</p>
                        <p className="mt-3 text-[42px] leading-none font-black tabular-nums text-white">{formatMoneyMm(projectedRevenueMm)}</p>
                    </div>

                    <div className={cn(
                        'group relative rounded-[1.6rem] border p-6 transform-gpu will-change-transform transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none',
                        isDarkMode
                            ? 'border-emerald-300/20 bg-gradient-to-br from-emerald-500/20 via-teal-700/15 to-emerald-900/20'
                            : 'border-emerald-300 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 shadow-[0_24px_65px_rgba(16,185,129,0.52)]'
                    )}>
                        <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white">CAGR ({baseHistoricalYear}-{lastProjectedYear})</p>
                        <p className="mt-3 text-[42px] leading-none font-black tabular-nums text-white">{formatPct(cagr)}</p>
                    </div>

                    <div className={cn(
                        'group relative rounded-[1.6rem] border p-6 transform-gpu will-change-transform transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none',
                        isDarkMode
                            ? 'border-amber-300/20 bg-gradient-to-br from-amber-500/18 via-orange-600/14 to-amber-900/20'
                            : 'border-amber-300 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 shadow-[0_24px_65px_rgba(249,115,22,0.52)]'
                    )}>
                        <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white"># of Segments</p>
                        <p className="mt-3 text-[42px] leading-none font-black tabular-nums text-white">{segments.length}</p>
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
                    <div className={cn(
                        'border-b px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]',
                        isDarkMode ? 'border-white/10 text-white/60' : 'border-slate-200 text-slate-600'
                    )}>
                        Units: USD millions (M)
                    </div>
                    <div className="overflow-x-auto overflow-y-visible px-2 py-2">
                        <table className="w-full min-w-[1260px] border-separate border-spacing-0">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-[var(--bg-glass)] dark:bg-white/[0.04]">
                                    <th className="w-[240px] min-w-[240px] border-b border-[var(--border-default)] px-5 py-5 text-left text-[13px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)] dark:border-white/10 dark:text-white/70">Segment</th>
                                    {allYears.map((year) => (
                                        <th key={year} className="w-[128px] min-w-[128px] border-b border-[var(--border-default)] px-4 py-5 text-right text-[13px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)] dark:border-white/10 dark:text-white/70">
                                            {year}
                                        </th>
                                    ))}
                                    <th className="w-16 border-b border-[var(--border-default)] px-4 py-5 text-right text-[13px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)] dark:border-white/10 dark:text-white/70">Del</th>
                                </tr>
                            </thead>

                            <tbody className="text-sm">
                                {segments.map((segment, idx) => (
                                    <tr
                                        key={segment.id}
                                        className={cn(
                                            'transition-colors duration-200 hover:bg-[var(--bg-glass-hover)] dark:hover:bg-white/[0.04]',
                                            idx % 2 === 0 ? 'bg-transparent' : 'bg-[var(--bg-glass)]/40'
                                        )}
                                    >
                                        <td className="w-[240px] min-w-[240px] border-b border-[var(--border-subtle)] px-5 py-4 dark:border-white/[0.07]">
                                            <input
                                                value={segment.name}
                                                onChange={(e) => updateSegmentName(segment.id, e.target.value)}
                                                className={cn(
                                                    'h-11 w-full rounded-xl px-3.5 py-2 text-[15px] font-semibold tracking-normal focus:outline-none focus:ring-1',
                                                    isDarkMode
                                                        ? 'border border-white/15 bg-white/[0.06] text-white focus:border-sky-300/70 focus:ring-sky-300/35'
                                                        : 'border border-slate-300 bg-white text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:border-slate-500 focus:ring-slate-300'
                                                )}
                                            />
                                        </td>

                                        {allYears.map((year) => (
                                            <td key={`${segment.id}-${year}`} className="w-[128px] min-w-[128px] border-b border-[var(--border-subtle)] px-3 py-4 text-right dark:border-white/[0.07]">
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={
                                                        activeEditCell === `${segment.id}-${year}`
                                                            ? (cellDrafts[`${segment.id}-${year}`] ?? toEditableInput(segment.values[year]))
                                                            : formatInput(segment.values[year])
                                                    }
                                                    onFocus={(e) => {
                                                        const cellKey = `${segment.id}-${year}`;
                                                        setActiveEditCell(cellKey);
                                                        setCellDrafts((prev) => ({ ...prev, [cellKey]: toEditableInput(segment.values[year]) }));
                                                        e.currentTarget.select();
                                                    }}
                                                    onChange={(e) => {
                                                        const cellKey = `${segment.id}-${year}`;
                                                        const nextDraft = e.target.value;
                                                        setCellDrafts((prev) => ({ ...prev, [cellKey]: nextDraft }));
                                                        const parsed = parseInputNumber(nextDraft);
                                                        if (parsed !== null) {
                                                            updateSegmentValue(segment.id, year, parsed);
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        const cellKey = `${segment.id}-${year}`;
                                                        const draft = cellDrafts[cellKey] ?? toEditableInput(segment.values[year]);
                                                        const parsed = parseInputNumber(draft);
                                                        if (parsed !== null) {
                                                            updateSegmentValue(segment.id, year, parsed);
                                                        }
                                                        setCellDrafts((prev) => {
                                                            const next = { ...prev };
                                                            delete next[cellKey];
                                                            return next;
                                                        });
                                                        setActiveEditCell((prev) => (prev === cellKey ? null : prev));
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') e.currentTarget.blur();
                                                        if (e.key === 'Escape') {
                                                            const cellKey = `${segment.id}-${year}`;
                                                            setCellDrafts((prev) => {
                                                                const next = { ...prev };
                                                                delete next[cellKey];
                                                                return next;
                                                            });
                                                            setActiveEditCell((prev) => (prev === cellKey ? null : prev));
                                                            e.currentTarget.blur();
                                                        }
                                                    }}
                                                    className={cn(
                                                        'h-11 w-full rounded-xl px-2.5 py-2 text-right text-[15px] font-semibold tabular-nums tracking-normal focus:outline-none focus:ring-1',
                                                        isDarkMode
                                                            ? 'border border-white/15 bg-white/[0.06] text-white focus:border-sky-300/70 focus:ring-sky-300/35'
                                                            : 'border border-slate-300 bg-white text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:border-slate-500 focus:ring-slate-300'
                                                    )}
                                                />
                                            </td>
                                        ))}

                                        <td className="border-b border-[var(--border-subtle)] px-4 py-4 text-right dark:border-white/[0.07]">
                                            <button
                                                onClick={() => deleteSegment(segment.id)}
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-600 bg-red-600 text-white transition-colors hover:bg-red-700 hover:border-red-700 dark:border-red-500 dark:bg-red-500 dark:hover:bg-red-600 dark:hover:border-red-600"
                                                type="button"
                                                aria-label={`Delete ${segment.name}`}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                <tr className={cn(isDarkMode ? 'bg-sky-500/[0.06]' : 'bg-sky-50')}>
                                    <td className="border-t border-[var(--border-default)] px-5 py-5 text-[14px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] dark:border-white/15" colSpan={1}>
                                        Total Revenue
                                    </td>
                                    {allYears.map((year) => (
                                        <td key={`total-${year}`} className="border-t border-[var(--border-default)] px-4 py-5 text-right text-[20px] font-black tabular-nums tracking-normal text-sky-500 dark:border-white/15 dark:text-sky-300">
                                            {formatMoneyMm(totals[year])}
                                        </td>
                                    ))}
                                    <td className="border-t border-[var(--border-default)] px-4 py-5 dark:border-white/15" />
                                </tr>

                                <tr className={cn(isDarkMode ? 'bg-[#050b18]/80' : 'bg-slate-50')}>
                                    <td className="border-t border-[var(--border-default)] px-5 py-5 text-[14px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] dark:border-white/10" colSpan={1}>
                                        YoY Growth
                                    </td>
                                    {allYears.map((year) => (
                                        <td
                                            key={`yoy-${year}`}
                                            className={cn(
                                                'border-t border-[var(--border-default)] px-4 py-5 text-right text-[18px] font-semibold tabular-nums tracking-normal dark:border-white/10',
                                                yoyGrowth[year] == null
                                                    ? 'text-[var(--text-tertiary)]'
                                                    : (yoyGrowth[year] || 0) >= 0
                                                        ? 'text-emerald-500 dark:text-emerald-300'
                                                        : 'text-rose-500 dark:text-rose-300'
                                            )}
                                        >
                                            {yoyGrowth[year] == null ? '-' : formatPct(yoyGrowth[year] || 0)}
                                        </td>
                                    ))}
                                    <td className="border-t border-[var(--border-default)] px-4 py-5 dark:border-white/10" />
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[var(--border-default)] pt-4 md:grid-cols-3 dark:border-white/10">
                    {formulaCards.map((formula, idx) => (
                        <div key={formula.label} className={cn(
                            'group relative overflow-hidden rounded-2xl border px-4 py-3.5 transition-all duration-300 hover:-translate-y-0.5',
                            formula.glow,
                            isDarkMode ? 'border-white/10 bg-white/[0.035] hover:bg-white/[0.05]' : 'border-slate-200 bg-white hover:bg-slate-50'
                        )}>
                            <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r', formula.accent)} />
                            <div className="flex items-center justify-between gap-2">
                                <div className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em]', formula.chip)}>
                                    Formula {idx + 1}
                                </div>
                                <div className={cn(
                                    'text-[10px] font-semibold uppercase tracking-[0.14em]',
                                    isDarkMode ? 'text-white/50' : 'text-slate-500'
                                )}>{formula.detail}</div>
                            </div>
                            <div className={cn(
                                'mt-2 text-[17px] font-semibold leading-tight',
                                isDarkMode ? 'text-white/90' : 'text-slate-800'
                            )}>{formula.label}</div>
                            <div className={cn(
                                'mt-2 rounded-lg border px-3 py-2 text-[15px] font-mono tracking-[0.01em]',
                                isDarkMode ? 'border-white/10 bg-black/25 text-white/80' : 'border-slate-200 bg-slate-50 text-slate-700'
                            )}>{formula.expression}</div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 rounded-[1.3rem] border border-[var(--border-default)] bg-[var(--bg-glass)] px-6 py-5 dark:border-white/10">
                    <div className={cn('flex items-center gap-2', isDarkMode ? 'text-emerald-300' : 'text-emerald-700')}>
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-[12px] font-black uppercase tracking-[0.18em]">5-Year Projection Summary</span>
                    </div>
                    <div className="mt-3 text-[13px] font-mono text-[var(--text-secondary)]">
                        Revenue moves from {formatMoneyMm(currentRevenueMm)} ({baseHistoricalYear}) to {formatMoneyMm(projectedRevenueMm)} ({lastProjectedYear}).
                    </div>
                    <div className="mt-1 text-[13px] font-mono text-[var(--text-secondary)]">
                        Implied CAGR over projection horizon: {formatPct(cagr)}
                    </div>
                    <div className={cn('mt-3 text-[36px] font-black tabular-nums', isDarkMode ? 'text-emerald-300' : 'text-emerald-700')}>{formatMoneyMm(projectedRevenueMm)}</div>
                </div>
            </div>
        </div>
    );
}
