
"use client";

import { memo } from 'react';
import { cn } from '@/core/utils/cn';
import { StatementRow as StatementRowConfig } from '@/core/config/financial-statements';

interface StatementRowProps {
    row: StatementRowConfig;
    years: number[];
    foreYears: number[];
    getValueForDisplay: (year: number, row: StatementRowConfig) => { text: string, val: number | string, isPercent: boolean, isNA: boolean };
    bold?: boolean;
    headerColor?: string;
    forecastValueClassName?: string;
}

export const StatementRow = memo(function StatementRow({
    row,
    years,
    foreYears,
    getValueForDisplay,
    headerColor,
    forecastValueClassName = "text-[var(--color-blue)]",
}: StatementRowProps) {
    const { id, label, bold, indent } = row;

    return (
        <tr key={id} className="group transition-colors hover:bg-white/[0.04]">
            <td className={cn(
                "py-4 px-6 sticky left-0 z-20 border-r border-[var(--border-subtle)] bg-[var(--bg-app)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] whitespace-nowrap text-[13px] tracking-tight transition-colors group-hover:bg-[var(--bg-glass)] text-[var(--text-primary)]",
                bold ? "font-bold" : "font-medium"
            )}>
                <div
                    className={cn(
                        "flex items-center gap-2",
                        indent && "pl-6 relative text-[var(--text-secondary)]",
                        !indent && !bold && "text-[var(--text-primary)]"
                    )}
                    style={bold && headerColor ? { color: headerColor } : undefined}
                >
                    {indent && (
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-[1px] bg-[var(--border-subtle)]" />
                    )}
                    {label}
                </div>
            </td>
            {years.map(y => {
                const { text, val } = getValueForDisplay(y, row);
                const isForecast = foreYears.includes(y);
                const isNegative = typeof val === 'number' && val < 0;

                return (
                    <td key={y} className={cn(
                        "px-6 py-4 text-right tabular-nums text-[13px] font-medium tracking-tight border-b border-[var(--border-subtle)] transition-all min-w-[100px] lg:min-w-[130px]",
                        isForecast ? forecastValueClassName : "text-[var(--text-primary)]",
                        bold && "font-bold",
                        isNegative && !isForecast && "text-[var(--color-red)]"
                    )}>
                        {text}
                    </td>
                );
            })}
        </tr>
    );
});
