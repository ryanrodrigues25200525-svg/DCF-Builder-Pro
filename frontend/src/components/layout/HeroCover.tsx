import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Building2, Loader2, Sun, Moon } from "lucide-react";
import { cn } from "@/core/utils/cn";
import { searchTickers } from "@/core/utils/ticker-search-client";

interface Suggestion {
    ticker: string;
    name: string;
    cik: string;
}

interface HeroCoverProps {
    onSearch: (ticker: string) => void;
    isLoading: boolean;
    isDarkMode: boolean;
    onToggleDarkMode: () => void;
}

export function HeroCover({ onSearch, isLoading, isDarkMode, onToggleDarkMode }: HeroCoverProps) {
    const [focus, setFocus] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const normalized = searchValue.trim().toUpperCase();
        if (!normalized || normalized.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(async () => {
            setIsSearching(true);
            try {
                const data = await searchTickers(normalized, { signal: controller.signal, limit: 8 });
                setSuggestions(data);
                setShowSuggestions(data.length > 0);
                setSelectedIndex(-1);
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') return;
                console.error("Search error:", error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [searchValue]);

    const handleSearch = (tickerOverride?: string) => {
        const finalTicker = (tickerOverride || searchValue).trim().toUpperCase();
        if (finalTicker) {
            onSearch(finalTicker);
            setShowSuggestions(false);
        }
    };

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (showSuggestions) {
                setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (showSuggestions) {
                setSelectedIndex(prev => (prev > -1 ? prev - 1 : -1));
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (showSuggestions && suggestions.length > 0) {
                const s = selectedIndex >= 0 ? suggestions[selectedIndex] : suggestions[0];
                setSearchValue(s.ticker);
                handleSearch(s.ticker);
            } else {
                const normalized = searchValue.trim().toUpperCase();
                if (!normalized) return;

                setIsSearching(true);
                try {
                    const resolved = await searchTickers(normalized, { limit: 1 });
                    if (resolved.length > 0) {
                        const ticker = resolved[0].ticker.trim().toUpperCase();
                        setSearchValue(ticker);
                        handleSearch(ticker);
                        return;
                    }
                    handleSearch();
                } finally {
                    setIsSearching(false);
                }
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center relative w-full overflow-hidden bg-[var(--bg-base)]">
            <div className="absolute top-6 right-6 z-20">
                <button
                    onClick={onToggleDarkMode}
                    className={cn(
                        "w-10 h-10 flex items-center justify-center rounded-lg border transition-all duration-[var(--transition-apple)]",
                        "border-[var(--border-default)] bg-[var(--bg-glass)] text-[var(--text-secondary-vibrant)] hover:text-[var(--text-primary-vibrant)] hover:bg-[var(--material-hover)]"
                    )}
                    aria-label="Toggle theme"
                    title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                >
                    {isDarkMode ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
                </button>
            </div>

            {/* Subtle Background Gradient for Depth */}
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-base)] to-[var(--bg-app)] pointer-events-none" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)] pointer-events-none" />

            <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center text-center px-6">

                {/* Simple Hero */}
                <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-[48px] md:text-[56px] font-bold font-display tracking-tight text-[var(--label-primary)] mb-4"
                >
                    Financial Modeling <span className="text-[var(--label-tertiary)]">Automated.</span>
                </motion.h1>

                {/* Minimal Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-[17px] text-[var(--label-secondary)] mb-12 font-medium"
                >
                    The fastest way to build institutional-grade valuation models.
                </motion.p>

                {/* Clean Search Bar */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className={cn(
                        "w-full relative group transition-all duration-300",
                        focus ? "scale-[1.02]" : ""
                    )}
                    ref={containerRef}
                >
                    <div className={cn(
                        "absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[var(--color-blue-glow)] to-transparent opacity-0 transition-opacity duration-500 blur-sm",
                        focus ? "opacity-100" : ""
                    )} />

                    <div className="relative flex items-center bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl h-14 px-5 shadow-2xl transition-all duration-200">
                        {isSearching ? (
                            <Loader2 className="animate-spin text-[var(--label-tertiary)] w-5 h-5 mr-4" />
                        ) : (
                            <Search className="text-[var(--label-tertiary)] w-5 h-5 mr-4" />
                        )}
                        <input
                            type="text"
                            value={searchValue}
                            onChange={(e) => {
                                setSearchValue(e.target.value);
                                if (!showSuggestions && e.target.value.length >= 2) setShowSuggestions(true);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Search ticker, company, or CIK..."
                            className="flex-1 bg-transparent border-none outline-none text-[16px] text-[var(--label-primary)] placeholder:text-[var(--label-tertiary)]/70 font-medium"
                            onFocus={() => {
                                setFocus(true);
                                if (suggestions.length > 0) setShowSuggestions(true);
                            }}
                            onBlur={() => setFocus(false)}
                            autoFocus
                            disabled={isLoading}
                        />
                        <div className="flex items-center gap-3">
                            <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-[var(--border-default)] bg-[var(--bg-glass)] px-1.5 font-mono text-[10px] font-medium text-[var(--label-tertiary)]">
                                ⌘K
                            </kbd>
                        </div>
                    </div>

                    {/* Suggestions Dropdown */}
                    <AnimatePresence>
                        {showSuggestions && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 8, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                                transition={{ duration: 0.2 }}
                                className="absolute top-full left-0 right-0 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col"
                            >
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                                    {suggestions.length > 0 ? suggestions.map((s, idx) => (
                                        <button
                                            key={`${s.ticker}-${s.cik}`}
                                            onClick={() => {
                                                const normalizedTicker = s.ticker.trim().toUpperCase();
                                                setSearchValue(normalizedTicker);
                                                handleSearch(normalizedTicker);
                                            }}
                                            onMouseEnter={() => setSelectedIndex(idx)}
                                            className={cn(
                                                "w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors",
                                                selectedIndex === idx ? "bg-[var(--bg-glass-hover)]" : "hover:bg-[var(--bg-glass)]"
                                            )}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-[var(--bg-glass)] flex items-center justify-center flex-shrink-0 text-[var(--text-tertiary)]">
                                                <Building2 size={16} />
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-[14px] font-semibold text-[var(--text-primary)] truncate text-ellipsis">{s.name}</span>
                                                <div className="flex items-center gap-2 text-[12px] text-[var(--text-tertiary)] font-mono">
                                                    <span>{s.ticker}</span>
                                                    <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
                                                    <span>CIK: {s.cik}</span>
                                                </div>
                                            </div>
                                        </button>
                                    )) : (
                                        <div className="p-4 text-center text-[var(--text-tertiary)] text-sm">
                                            No companies found
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Minimal Footer / Recent */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="mt-16 flex items-center gap-6"
                >
                    <span className="text-[12px] font-bold text-[var(--label-tertiary)] uppercase tracking-wider">Trending</span>
                    <div className="flex items-center gap-4">
                        {['NVDA', 'TSLA', 'AAPL', 'MSFT'].map(ticker => (
                            <button
                                key={ticker}
                                onClick={() => onSearch(ticker)}
                                className="text-[13px] font-mono font-medium text-[var(--label-secondary)] hover:text-[var(--system-blue)] transition-colors"
                            >
                                {ticker}
                            </button>
                        ))}
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
