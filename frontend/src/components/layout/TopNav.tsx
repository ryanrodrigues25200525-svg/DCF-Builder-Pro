"use client";

import React from "react";
import { SearchBar } from "@/components/ui/SearchBar";
import { cn } from "@/core/utils/cn";
import { Sun, Moon } from "lucide-react";

interface Suggestion {
  ticker: string;
  name: string;
  cik: string;
}

interface Props {
  onSearch: (ticker: string) => void;
  isLoading: boolean;
  isRefreshingCompany?: boolean;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  hasCompany?: boolean;
  // New Health Props
  healthScore?: number;
  onOpenHealth?: () => void;
}

export function TopNav({
  onSearch,
  isLoading,
  isRefreshingCompany = false,
  isDarkMode,
  onToggleDarkMode,
  hasCompany,
  healthScore = 98,
  onOpenHealth
}: Props) {
  const [searchValue, setSearchValue] = React.useState("");

  const handleSuggestionSelect = (suggestion: Suggestion) => {
    setSearchValue(suggestion.ticker);
    onSearch(suggestion.ticker);
  };

  return (
    <nav className={cn(
      "app-topnav h-[64px] flex items-center justify-between px-6 shrink-0 z-40 transition-colors duration-[var(--transition-apple)]",
      "bg-[var(--sidebar-bg)] border-b border-[var(--separator-vibrant)] text-[var(--text-primary-vibrant)]"
    )}>
      {/* Left Spacer - aligned with Sidebar width usually, but flexible here */}
      <div className="hidden md:block min-w-[40px]">
      </div>

      {/* Center: Search */}
      <div className="flex-1 w-full max-w-[800px] mx-auto px-2 sm:px-4 transition-all duration-300">
        <SearchBar
          onSelect={handleSuggestionSelect}
          isLoading={isLoading}
          value={searchValue}
          onChange={setSearchValue}
          onSearch={onSearch}
        />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 justify-end">
        {isRefreshingCompany && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-full bg-[var(--material-thin)] border border-[var(--separator-vibrant)] text-[12px] text-[var(--text-secondary-vibrant)]">
            <span className="w-3 h-3 border border-[var(--system-blue)]/40 border-t-[var(--system-blue)] rounded-full animate-spin" />
            <span>Refreshing data...</span>
          </div>
        )}
        {hasCompany && (
          <button
            onClick={onOpenHealth}
            className={cn(
              "app-topnav-health hidden xl:flex items-center gap-3 pl-3 pr-5 py-2 rounded-full cursor-pointer transition-all duration-[var(--transition-apple)]",
              "bg-[var(--material-thin)] hover:bg-[var(--material-hover)] border border-[var(--separator-vibrant)]"
            )}
          >
            <div className="relative flex items-center justify-center w-7 h-7">
              <div className="w-3 h-3 bg-[#22c55e] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            </div>
            <span className="text-[18px] font-bold text-[#22c55e] tabular-nums">Health: {healthScore}%</span>
          </button>
        )}

        <button
          onClick={onToggleDarkMode}
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-[var(--transition-apple)]",
            "text-[var(--text-secondary-vibrant)] hover:text-[var(--text-primary-vibrant)] hover:bg-[var(--material-hover)]"
          )}
          aria-label="Toggle theme"
        >
          {isDarkMode ? <Sun size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
        </button>
      </div>
    </nav>
  );
}
