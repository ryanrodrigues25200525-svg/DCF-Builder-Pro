"use client";

import { Maximize2, Minimize2 } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/primitives/SegmentedControl';

interface Props {
    tabs: Array<{ label: string; value: string; activeColor: string }>;
    activeTab: string;
    onChange: (value: string) => void;
    isDarkMode: boolean;
    isFullscreen: boolean;
    onToggleFullscreen: (next: boolean) => void;
}

export function FinancialStatementsToolbar({
    tabs,
    activeTab,
    onChange,
    isDarkMode,
    isFullscreen,
    onToggleFullscreen,
}: Props) {
    return (
        <div className="sticky top-0 z-50 shrink-0 bg-transparent">
            <div className="flex items-end gap-3 px-4 pb-2 pt-2 lg:px-8">
                <div className="min-w-0 flex-1">
                    <SegmentedControl
                        options={tabs}
                        value={activeTab}
                        onChange={onChange}
                        isDarkMode={isDarkMode}
                        className="financials-segmented-control w-full rounded-[22px] p-1.5"
                    />
                </div>

                <div className="flex min-w-0 items-center justify-end gap-3">
                    <button
                        onClick={() => onToggleFullscreen(!isFullscreen)}
                        className={isDarkMode
                            ? "financials-fullscreen-button rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-white/65 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                            : "financials-fullscreen-button rounded-2xl border border-[rgba(15,23,42,0.12)] bg-white p-3 text-[rgba(15,23,42,0.72)] transition-all duration-200 shadow-[0_10px_26px_rgba(15,23,42,0.08)] hover:border-[rgba(15,23,42,0.18)] hover:bg-white hover:text-[var(--text-primary)]"}
                        title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                    >
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
