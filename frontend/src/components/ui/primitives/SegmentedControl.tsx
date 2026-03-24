"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/core/utils/cn";

interface Option {
    label: string;
    value: string;
    activeColor?: string;
}

interface SegmentedControlProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    isDarkMode?: boolean;
    className?: string;
}

function hexToRgba(hex: string, alpha: number) {
    const normalized = hex.replace("#", "");
    const safeHex = normalized.length === 3
        ? normalized.split("").map((char) => `${char}${char}`).join("")
        : normalized;

    if (!/^[0-9a-fA-F]{6}$/.test(safeHex)) {
        return `rgba(255,255,255,${alpha})`;
    }

    const int = Number.parseInt(safeHex, 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `rgba(${r},${g},${b},${alpha})`;
}

export function SegmentedControl({ options, value, onChange, isDarkMode = true, className }: SegmentedControlProps) {
    const activeOption = options.find(o => o.value === value);
    const activeColor = activeOption?.activeColor || '#ffffff';

    return (
        <div className={cn(
            "p-1 rounded-full border flex items-center relative select-none",
            isDarkMode
                ? "bg-[rgba(18,14,16,0.82)] border-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                : "bg-white border-[rgba(15,23,42,0.12)] shadow-[0_12px_30px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.85)]",
            className
        )}>
            {options.map((option) => {
                const isActive = value === option.value;
                return (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        data-active={isActive ? "true" : "false"}
                        className={cn(
                            "financials-segmented-option flex-1 relative z-10 rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-200 outline-none focus:outline-none",
                            isActive
                                ? "text-white"
                                : isDarkMode
                                    ? "text-white/60 hover:text-white"
                                    : "text-[rgba(15,23,42,0.62)] hover:text-[var(--segment-color)]"
                        )}
                        style={{
                            ["--segment-color" as string]: option.activeColor || "#ffffff",
                            ["--segment-color-muted" as string]: hexToRgba(option.activeColor || "#ffffff", 0.72),
                            ["--segment-color-soft" as string]: hexToRgba(option.activeColor || "#ffffff", 0.12),
                        }}
                    >
                        {option.label}
                    </button>
                );
            })}

            {/* Active Indicator Slider */}
            <AnimatePresence>
                <motion.div
                    layoutId="active-segment"
                    className={cn(
                        "financials-segmented-indicator absolute inset-y-1 rounded-full z-0",
                        isDarkMode
                            ? "border border-white/8 shadow-[0_8px_18px_rgba(0,0,0,0.3)]"
                            : "border border-[rgba(15,23,42,0.08)] shadow-[0_12px_26px_rgba(15,23,42,0.16)]"
                    )}
                    initial={false}
                    animate={{
                        backgroundColor: activeColor,
                        boxShadow: isDarkMode
                            ? `0 0 0 1px rgba(255,255,255,0.05), 0 10px 28px ${hexToRgba(activeColor, 0.32)}, inset 0 1px 0 rgba(255,255,255,0.18)`
                            : `0 10px 28px ${hexToRgba(activeColor, 0.2)}, inset 0 1px 0 rgba(255,255,255,0.22)`,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    style={{
                        width: `${100 / options.length}%`,
                        left: `${(options.findIndex(o => o.value === value) * 100) / options.length}%`
                    }}
                />
            </AnimatePresence>
        </div>
    );
}
