"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
    LayoutGrid,
    FileText,
    Activity,
    Folder,
    Book,
    TrendingUp,
    Calculator,
    PanelLeft,
    ArrowRightLeft,
} from "lucide-react";
import { cn } from "@/core/utils/cn";
import { DCFResults } from "@/core/types";

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
    color?: string;
    isCollapsed?: boolean;
}

function NavItem({ icon, label, isActive, onClick, color, isCollapsed }: NavItemProps) {
    const colorMap: Record<string, string> = {
        blue: "text-[var(--system-blue)]",
        green: "text-[var(--system-green)]",
        indigo: "text-[var(--system-indigo)]",
        orange: "text-[var(--system-orange)]",
        pink: "text-[var(--system-pink)]",
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center rounded-lg transition-[width,padding,gap,background-color,color,box-shadow,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "cursor-pointer active:scale-[0.98]",
                "hover:bg-[var(--material-hover)]",
                isActive
                    ? "bg-[var(--system-blue)] text-white font-semibold shadow-lg"
                    : "text-[var(--text-primary-vibrant)] font-medium",
                isCollapsed
                    ? "w-[44px] h-[44px] justify-center px-0 gap-0 mx-auto"
                    : "w-full min-h-[52px] gap-4 px-[16px]"
            )}
            title={isCollapsed ? label : undefined}
        >
            <span className={cn(
                "flex items-center justify-center w-6 h-6 flex-shrink-0 transition-colors duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                isActive ? "text-white" : colorMap[color || "blue"]
            )}>
                {icon}
            </span>
            <span className={cn(
                "whitespace-nowrap overflow-hidden transition-[max-width,opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                isCollapsed ? "max-w-0 opacity-0 -translate-x-2" : "max-w-[180px] opacity-100 translate-x-0"
            )}>
                <span className="block pl-0">
                    {label}
                </span>
            </span>
        </button>
    );
}

interface SideNavProps {
    activeSection?: string;
    onNavigate?: (section: string) => void;
    companyName?: string;
    ticker?: string;
    onGoHome?: () => void;
    results?: DCFResults | null;
    isDarkMode?: boolean;
}

export function SideNav({
    activeSection = "Overview",
    onNavigate,
    companyName = "Tesla, Inc.",
    ticker = "TSLA",
    onGoHome,
    results,
    isDarkMode = true
}: SideNavProps) {
    const [activeItem, setActiveItem] = useState(activeSection);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const isUndervalued = results ? results.upside > 0 : null;
    const bubbleBg = isUndervalued === true
        ? (isDarkMode ? "bg-[#30D158]/20 border-[#30D158]/30" : "bg-[#16A34A]/15 border-[#16A34A]/35")
        : isUndervalued === false
            ? (isDarkMode ? "bg-[#FF453A]/20 border-[#FF453A]/30" : "bg-[#DC2626]/15 border-[#DC2626]/35")
            : (isDarkMode ? "bg-[#1c3a5e] border-[#2a4d7d]/50" : "bg-[#2563EB]/12 border-[#2563EB]/35");
    const bubbleText = isUndervalued === true
        ? (isDarkMode ? "text-[#30D158]" : "text-[#166534]")
        : isUndervalued === false
            ? (isDarkMode ? "text-[#FF453A]" : "text-[#991B1B]")
            : (isDarkMode ? "text-[#4a9eff]" : "text-[#1D4ED8]");

    // Sync activeItem with activeSection prop
    useEffect(() => {
        setActiveItem(activeSection);
    }, [activeSection]);

    const navItems = [
        { label: "Overview", color: "blue", icon: <LayoutGrid size={22} strokeWidth={1.8} /> },
        { label: "Financials", color: "green", icon: <FileText size={22} strokeWidth={1.8} /> },
        { label: "Revenue Build", color: "green", icon: <TrendingUp size={22} strokeWidth={1.8} /> },
        { label: "WACC Build", color: "indigo", icon: <Calculator size={22} strokeWidth={1.8} /> },
        { label: "Reverse DCF", color: "indigo", icon: <ArrowRightLeft size={22} strokeWidth={1.8} /> },
        { label: "Sensitivity", color: "indigo", icon: <Activity size={22} strokeWidth={1.8} /> },
        { label: "Comparables", color: "orange", icon: <Folder size={22} strokeWidth={1.8} /> },
        { label: "Transactions", color: "pink", icon: <Book size={22} strokeWidth={1.8} /> },
    ];

    return (
        <aside className={cn(
            "app-viewport shrink-0 z-50 transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width]",
            "bg-[var(--sidebar-bg)] border-r border-[var(--separator-vibrant)]",
            "flex flex-col py-4 select-none",
            isCollapsed ? "w-[80px]" : "app-sidebar-width"
        )}>
            {/* App Header */}
            <div className="mb-8 flex items-center justify-between gap-3 px-4">
                <Link
                    href="/"
                    onClick={(e) => {
                        if (onGoHome) {
                            e.preventDefault();
                            onGoHome();
                        }
                    }}
                    className={cn("flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer")}
                >
                    <div className={cn(
                        "rounded-[10px]",
                        "bg-[var(--system-blue)]",
                        "flex items-center justify-center text-white font-bold text-[18px]",
                        "flex-shrink-0 transition-all duration-300",
                        "w-9 h-9"
                    )}>
                        D
                    </div>
                    <div className={cn(
                        "flex flex-col gap-[2px] overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        isCollapsed ? "max-w-0 opacity-0 -translate-x-2" : "max-w-[120px] opacity-100 translate-x-0"
                    )}>
                        <span className="text-[var(--text-primary-vibrant)] font-bold text-[16px] leading-[1.2] tracking-[-0.24px]">
                            DCF Builder
                        </span>
                        <span className="text-[var(--text-secondary-vibrant)] text-[12px] font-medium leading-[1.2]">
                            Pro workspace
                        </span>
                    </div>
                </Link>

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl border transition-[background-color,border-color,color,box-shadow] duration-220 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        "text-[var(--text-tertiary-vibrant)] hover:text-[var(--text-primary-vibrant)]",
                        "border-[var(--separator-vibrant)] bg-[var(--material-card)] shadow-sm hover:bg-[var(--material-hover)]"
                    )}
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <span
                        className={cn(
                            "flex h-5 w-5 items-center justify-center transition-transform duration-220 ease-[cubic-bezier(0.22,1,0.36,1)]",
                            isCollapsed ? "rotate-180" : "rotate-0"
                        )}
                    >
                        <PanelLeft size={18} strokeWidth={2} />
                    </span>
                </button>
            </div>

            {/* Active Model Section */}
            <div className={cn("mt-6 mb-6 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]", isCollapsed ? "px-2" : "px-5")}>
                <div className="relative">
                    {/* Collapsed State View */}
                    <div className={cn(
                        "overflow-hidden transition-[max-height,opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        isCollapsed ? "max-h-[40px] opacity-100 translate-y-0 delay-100" : "max-h-0 opacity-0 -translate-y-1"
                    )}>
                        <div className="flex justify-center flex-col items-center gap-2 py-1">
                            <div className={cn("px-[5px] py-[2px] rounded-[4px] border w-full text-center transition-colors", bubbleBg)} title={companyName}>
                                <span className={cn("text-[10px] font-bold tracking-wider transition-colors", bubbleText)}>
                                    {ticker}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Expanded State View */}
                    <div className={cn(
                        "flex flex-col gap-3 overflow-hidden transition-[max-height,opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        isCollapsed ? "max-h-0 opacity-0 -translate-y-1" : "max-h-[100px] opacity-100 translate-y-0"
                    )}>
                        <div className="text-[11px] font-bold text-[var(--text-tertiary-vibrant)] uppercase tracking-[0.08em] whitespace-nowrap overflow-hidden">
                            Active Model
                        </div>
                        <div className="flex flex-col gap-2 whitespace-nowrap overflow-hidden">
                            <div className="text-[20px] font-bold text-[var(--text-primary-vibrant)] tracking-[-0.02em] leading-tight truncate">
                                {companyName}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={cn("px-[7px] py-[2px] rounded-[6px] border transition-colors", bubbleBg)}>
                                    <span className={cn("text-[11px] font-bold tracking-wider transition-colors", bubbleText)}>
                                        {ticker}
                                    </span>
                                </div>
                                <span className="text-[14px] font-medium text-[var(--text-secondary-vibrant)]">
                                    Public Equity
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-[0.5px] bg-[var(--separator-vibrant)] mx-5 mb-8" />

            {/* Navigation Section */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                <div className={cn(
                    "transition-[max-height,opacity,padding] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden whitespace-nowrap",
                    isCollapsed ? "max-h-0 opacity-0 mb-4" : "max-h-[64px] opacity-100 px-4 py-4"
                )}>
                    <div className="text-[14px] font-bold text-[var(--text-secondary-vibrant)] leading-[1.3] tracking-[-0.08px]">
                        Analysis
                    </div>
                </div>
                {isCollapsed && <div className="h-4" />}

                <nav className="px-3 flex flex-col gap-3">
                    {navItems.map((item) => (
                        <NavItem
                            key={item.label}
                            icon={item.icon}
                            label={item.label}
                            color={item.color}
                            isActive={activeItem === item.label}
                            isCollapsed={isCollapsed}
                            onClick={() => {
                                setActiveItem(item.label);
                                onNavigate?.(item.label);
                            }}
                        />
                    ))}
                </nav>
            </div>

        </aside>
    );
}
