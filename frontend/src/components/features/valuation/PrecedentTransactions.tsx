"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { PrecedentTransaction } from '@/core/types';
import { calculateTransactionStats } from '@/core/data/precedent-transactions';
import { Briefcase, DollarSign, Building2, Check, X, Plus, Trash2, Calendar, Activity, ChevronDown, ChevronLeft, ChevronRight, Calculator, Percent } from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { AnimatePresence, motion } from 'framer-motion';

interface PrecedentTransactionsProps {
    isDarkMode?: boolean;
    targetTicker: string;
    targetSector?: string;
    targetRevenue: number;
    targetEbitda: number;
    transactions?: PrecedentTransaction[];
    onDataChange?: (data: PrecedentTransaction[]) => void;
}

export function PrecedentTransactions({
    isDarkMode = true,
    targetTicker: _targetTicker,
    targetSector = 'Technology',
    targetRevenue,
    targetEbitda,
    transactions: externalTransactions,
    onDataChange
}: PrecedentTransactionsProps) {
    void _targetTicker;

    const baseTransactions = useMemo(() => {
        return externalTransactions || [];
    }, [externalTransactions]);

    const [isAdding, setIsAdding] = useState(false);
    const [openMenu, setOpenMenu] = useState<null | 'dealType' | 'paymentType'>(null);
    const [isDateOpen, setIsDateOpen] = useState(false);
    const [calendarPickerOpen, setCalendarPickerOpen] = useState<null | 'month' | 'year'>(null);
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const formPopoverRef = useRef<HTMLDivElement | null>(null);
    const [newTxn, setNewTxn] = useState<Partial<PrecedentTransaction>>({
        targetName: '',
        acquirerName: '',
        announcementDate: new Date().toISOString().split('T')[0],
        transactionValue: 0,
        evRevenue: 0,
        evEbitda: 0,
        premiumPaid: 0,
        dealType: 'Strategic',
        paymentType: 'Cash',
        isSelected: true
    });

    const dropdownMotion = {
        initial: { opacity: 0, y: -8, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: 'easeOut' as const } },
        exit: { opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.14, ease: 'easeIn' as const } },
    };

    const normalizedSector = useMemo(() => {
        const raw = (targetSector || '').trim();
        if (!raw || raw.toLowerCase() === 'unknown' || raw.toLowerCase() === 'n/a') {
            return 'Technology';
        }
        return raw;
    }, [targetSector]);

    const isTxnInputValid = useMemo(() => {
        const target = (newTxn.targetName || '').trim();
        const acquirer = (newTxn.acquirerName || '').trim();
        const dateOk = Boolean(newTxn.announcementDate);
        const value = Number(newTxn.transactionValue || 0);
        const evRev = Number(newTxn.evRevenue || 0);
        const evEbitda = Number(newTxn.evEbitda || 0);
        const premium = Number(newTxn.premiumPaid || 0);
        const premiumOk = premium >= 0 && premium <= 1;
        const multiplesOk = evRev > 0 || evEbitda > 0;
        return target.length > 0 && acquirer.length > 0 && dateOk && value > 0 && premiumOk && multiplesOk;
    }, [newTxn]);

    const toggleTransaction = (id: string) => {
        const updated = baseTransactions.map(t =>
            t.id === id ? { ...t, isSelected: !t.isSelected } : t
        );
        onDataChange?.(updated);
    };

    const handleAddTransaction = () => {
        if (!isTxnInputValid) return;

        const transaction: PrecedentTransaction = {
            id: `txn-user-${Date.now()}`,
            targetName: (newTxn.targetName || 'New Target').trim(),
            acquirerName: (newTxn.acquirerName || 'New Acquirer').trim(),
            announcementDate: newTxn.announcementDate || new Date().toISOString().split('T')[0],
            closingDate: '',
            transactionValue: Math.max(0, Number(newTxn.transactionValue) || 0),
            equityValue: Math.max(0, Number(newTxn.equityValue) || Number(newTxn.transactionValue) || 0),
            targetRevenue: Number(newTxn.targetRevenue) || 0,
            targetEbitda: Number(newTxn.targetEbitda) || 0,
            evRevenue: Math.max(0, Number(newTxn.evRevenue) || 0),
            evEbitda: Math.max(0, Number(newTxn.evEbitda) || 0),
            premiumPaid: Math.max(0, Math.min(1, Number(newTxn.premiumPaid) || 0)),
            dealType: (newTxn.dealType as PrecedentTransaction['dealType']) || 'Strategic',
            paymentType: (newTxn.paymentType as PrecedentTransaction['paymentType']) || 'Cash',
            isSelected: true,
            sector: normalizedSector
        };

        onDataChange?.([...baseTransactions, transaction]);
        setIsAdding(false);
        setNewTxn({
            targetName: '',
            acquirerName: '',
            announcementDate: new Date().toISOString().split('T')[0],
            transactionValue: 0,
            equityValue: 0,
            targetRevenue: 0,
            targetEbitda: 0,
            evRevenue: 0,
            evEbitda: 0,
            premiumPaid: 0,
            dealType: 'Strategic',
            paymentType: 'Cash',
            isSelected: true
        });
    };

    const deleteTransaction = (id: string) => {
        onDataChange?.(baseTransactions.filter(t => t.id !== id));
    };

    const stats = useMemo(() => {
        const selected = baseTransactions.filter(t => t.isSelected);
        return calculateTransactionStats(selected);
    }, [baseTransactions]);

    const impliedEvRevenue = targetRevenue * stats.medianEvRevenue;
    const impliedEvEbitda = targetEbitda * stats.medianEvEbitda;

    const formatMoney = (val: number) => {
        if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
        if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
        if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
        return `$${val.toFixed(0)}`;
    };

    const formatMult = (val: number) => val > 0 ? `${val.toFixed(1)}x` : 'N/A';
    const formatPct = (val: number) => val > 0 ? `${(val * 100).toFixed(0)}%` : 'N/A';
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    };

    const toIsoDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const parseIsoDate = (value?: string) => {
        if (!value) return null;
        const [y, m, d] = value.split('-').map(Number);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
    };

    const selectedDate = useMemo(() => parseIsoDate(newTxn.announcementDate), [newTxn.announcementDate]);
    const today = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }, []);

    const weekdayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    const calendarDays = useMemo(() => {
        const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
        const startOffset = (monthStart.getDay() + 6) % 7; // Monday first
        const gridStart = new Date(monthStart);
        gridStart.setDate(monthStart.getDate() - startOffset);

        return Array.from({ length: 42 }, (_, idx) => {
            const date = new Date(gridStart);
            date.setDate(gridStart.getDate() + idx);
            return {
                key: toIsoDate(date),
                date,
                inMonth: date.getMonth() === calendarMonth.getMonth(),
            };
        });
    }, [calendarMonth]);

    useEffect(() => {
        const handleOutside = (event: MouseEvent) => {
            if (!formPopoverRef.current) return;
            if (!formPopoverRef.current.contains(event.target as Node)) {
                setOpenMenu(null);
                setIsDateOpen(false);
                setCalendarPickerOpen(null);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    const formControlClass = cn(
        "w-full rounded-lg border py-2.5 pl-10 pr-3 text-[13px] font-semibold outline-none transition-all focus:border-blue-400/50 focus:ring-1 focus:ring-blue-500/30",
        isDarkMode
            ? "border-white/10 bg-[#131313] text-white"
            : "border-slate-300 bg-white text-slate-900"
    );

    const formatInputNumberWithCommas = (value: unknown) => {
        if (value === null || value === undefined || value === '') return '';
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric === 0) return '';
        return numeric.toLocaleString('en-US');
    };

    return (
        <section
            data-local-theme={isDarkMode ? 'dark' : 'light'}
            className={cn(
                "precedent-theme-scope relative overflow-hidden rounded-2xl border shadow-[0_20px_70px_rgba(0,0,0,0.16)]",
                isDarkMode ? "border-white/10 bg-[#050505] shadow-[0_20px_70px_rgba(0,0,0,0.6)]" : "border-[var(--border-default)] bg-white"
            )}
        >
            <div className="pointer-events-none absolute -left-24 -top-32 h-[480px] w-[520px] rounded-full bg-blue-700/10 blur-[110px]" />
            <div className="pointer-events-none absolute -bottom-24 -right-12 h-[400px] w-[460px] rounded-full bg-violet-700/10 blur-[110px]" />

            <div className="relative px-8 py-8">
                <div className="mb-8 flex flex-col gap-4 border-b border-[var(--border-default)] pb-6 md:flex-row md:items-end md:justify-between dark:border-white/10">
                    <div>
                        <h3 className={cn("precedent-title text-[38px] font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>Precedent Transactions</h3>
                        <p className={cn("mt-2 max-w-[760px] text-[13px] leading-6", isDarkMode ? "text-white/55" : "text-slate-600")}>
                            Manual workflow for building a transaction comp set. Add deals one by one, keep only the relevant transactions selected, and use the median outputs as a valuation cross-check.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="precedent-count-pill rounded-lg border border-[var(--border-default)] bg-[var(--bg-glass)] px-4 py-2 text-[12px] font-bold text-[var(--text-primary)] dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
                            {baseTransactions.filter((t) => t.isSelected).length} Selected
                        </button>
                        <button className="precedent-total-pill rounded-lg border border-[var(--border-default)] px-4 py-2 text-[12px] font-bold text-[var(--text-tertiary)] dark:border-white/10 dark:text-white/60">
                            {baseTransactions.length} Total
                        </button>
                    </div>
                </div>

                <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className={cn(
                        "rounded-xl border p-5",
                        isDarkMode
                            ? "border-blue-400/20 bg-gradient-to-br from-blue-600/20 to-blue-900/20"
                            : "border-cyan-300 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-[0_24px_65px_rgba(37,99,235,0.55)]"
                    )}>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/65">Median EV/Revenue</p>
                        <p className="mt-3 text-[40px] font-black tabular-nums text-white">{formatMult(stats.medianEvRevenue)}</p>
                    </div>
                    <div className={cn(
                        "rounded-xl border p-5",
                        isDarkMode
                            ? "border-violet-400/20 bg-gradient-to-br from-violet-600/20 to-violet-900/20"
                            : "border-violet-300 bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-700 shadow-[0_24px_65px_rgba(139,92,246,0.55)]"
                    )}>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/65">Median EV/EBITDA</p>
                        <p className="mt-3 text-[40px] font-black tabular-nums text-white">{formatMult(stats.medianEvEbitda)}</p>
                    </div>
                    <div className={cn(
                        "rounded-xl border p-5",
                        isDarkMode
                            ? "border-emerald-400/20 bg-gradient-to-br from-emerald-600/20 to-emerald-900/20"
                            : "border-emerald-300 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 shadow-[0_24px_65px_rgba(16,185,129,0.52)]"
                    )}>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/65">Median Premium</p>
                        <p className="mt-3 text-[40px] font-black tabular-nums text-white">{formatPct(stats.medianPremium)}</p>
                    </div>
                    <div className={cn(
                        "rounded-xl border p-5",
                        isDarkMode
                            ? "border-amber-400/20 bg-gradient-to-br from-amber-600/20 to-amber-900/20"
                            : "border-amber-300 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 shadow-[0_24px_65px_rgba(249,115,22,0.52)]"
                    )}>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/65">Avg Deal Size</p>
                        <p className="mt-3 text-[40px] font-black tabular-nums text-white">
                            {stats.count > 0 ? formatMoney(baseTransactions.reduce((sum, t) => sum + t.transactionValue, 0) / stats.count) : 'N/A'}
                        </p>
                    </div>
                </div>

                <div className={cn(
                    "precedent-table-shell rounded-xl border",
                    isDarkMode
                        ? "border-white/10 bg-[#0a0a0a]"
                        : "border-[var(--border-default)] bg-white",
                    isAdding ? "overflow-visible" : "overflow-hidden"
                )}>
                    <div className="precedent-toolbar flex flex-col gap-3 border-b border-[var(--border-default)] bg-[var(--bg-glass)] px-6 py-4 md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-[#0f0f0f]/80">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsAdding(!isAdding)}
                                className={cn(
                                    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-bold uppercase tracking-wide transition-all",
                                    isAdding
                                        ? "border border-red-500/60 bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.35)] hover:brightness-110"
                                        : "border border-blue-400/40 bg-gradient-to-r from-blue-700 to-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:brightness-110"
                                )}
                            >
                                {isAdding ? <X size={14} /> : <Plus size={14} />}
                                {isAdding ? 'Close Form' : 'Add Transaction'}
                            </button>
                            <button className={cn(
                                "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-[12px] font-medium",
                                isDarkMode
                                    ? "border-white/10 text-white/60 hover:bg-white/[0.04]"
                                    : "border-slate-300 text-slate-700 hover:bg-slate-100"
                            )}>
                                <Activity size={14} />
                                Filter View
                            </button>
                        </div>
                        <div className={cn("text-[12px]", isDarkMode ? "text-white/50" : "text-slate-600")}>Sort by: Date (Desc)</div>
                    </div>

                    {isAdding && (
                        <div className="precedent-add-form border-b border-[var(--border-default)] bg-[var(--bg-glass)] px-6 py-6 dark:border-white/10 dark:bg-[#0d0d0d]">
                            <div ref={formPopoverRef} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {[
                                    { label: 'Target Company', icon: Building2, value: newTxn.targetName, key: 'targetName', placeholder: 'Activision Blizzard' },
                                    { label: 'Acquirer', icon: Briefcase, value: newTxn.acquirerName, key: 'acquirerName', placeholder: 'Microsoft' },
                                    { label: 'Value ($)', icon: DollarSign, value: newTxn.transactionValue, key: 'transactionValue', type: 'number', placeholder: '68700000000' },
                                    { label: 'EV / Revenue', icon: Activity, value: newTxn.evRevenue, key: 'evRevenue', type: 'number', step: '0.1' },
                                    { label: 'EV / EBITDA', icon: Calculator, value: newTxn.evEbitda, key: 'evEbitda', type: 'number', step: '0.1' },
                                    { label: 'Premium (0-1)', icon: Percent, value: newTxn.premiumPaid, key: 'premiumPaid', type: 'number', step: '0.01' }
                                ].map((field) => (
                                    <div key={field.key} className="space-y-1.5">
                                        <label className={cn(
                                            "ml-1 text-[10px] font-bold uppercase tracking-wider",
                                            isDarkMode ? "text-white/55" : "text-slate-700"
                                        )}>
                                            {field.label}
                                        </label>
                                        <div className="relative">
                                            <field.icon className={cn("absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2", isDarkMode ? "text-white/35" : "text-slate-500")} />
                                            <input
                                                type={field.key === 'transactionValue' ? 'text' : (field.type || 'text')}
                                                step={field.step}
                                                value={field.key === 'transactionValue' ? formatInputNumberWithCommas(field.value) : (field.value || '')}
                                                onChange={(e) => {
                                                    if (field.key === 'transactionValue') {
                                                        const sanitized = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
                                                        const parsed = sanitized === '' ? 0 : Number(sanitized);
                                                        setNewTxn({ ...newTxn, [field.key]: Number.isFinite(parsed) ? parsed : 0 });
                                                        return;
                                                    }
                                                    setNewTxn({ ...newTxn, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value });
                                                }}
                                                min={field.type === 'number' ? 0 : undefined}
                                                className={formControlClass}
                                                placeholder={field.placeholder}
                                            />
                                        </div>
                                    </div>
                                ))}

                                <div className="space-y-1.5">
                                    <label className={cn(
                                        "ml-1 text-[10px] font-bold uppercase tracking-wider",
                                        isDarkMode ? "text-white/55" : "text-slate-700"
                                    )}>Date</label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const base = selectedDate || today;
                                                setCalendarMonth(new Date(base.getFullYear(), base.getMonth(), 1));
                                                setIsDateOpen((prev) => !prev);
                                                setCalendarPickerOpen(null);
                                            }}
                                            className={cn(
                                                "flex w-full items-center justify-between rounded-lg border py-2.5 pl-10 pr-3 text-[13px] font-semibold outline-none transition-all focus-visible:border-blue-400/50 focus-visible:ring-1 focus-visible:ring-blue-500/30",
                                                isDarkMode
                                                    ? "border-white/10 bg-[#131313] text-white"
                                                    : "border-slate-300 bg-white text-slate-900"
                                            )}
                                        >
                                            <Calendar size={16} className={cn("absolute left-3", isDarkMode ? "text-white/35" : "text-slate-500")} />
                                            <span>{selectedDate ? selectedDate.toLocaleDateString('en-US') : 'Select date'}</span>
                                            <ChevronDown size={14} className={cn("transition-transform duration-300 ease-out", isDateOpen && "rotate-180")} />
                                        </button>

                                        <AnimatePresence>
                                            {isDateOpen && (
                                                <motion.div
                                                    initial={dropdownMotion.initial}
                                                    animate={dropdownMotion.animate}
                                                    exit={dropdownMotion.exit}
                                                    className={cn(
                                                        "relative z-40 mt-2 w-full min-w-0 rounded-xl border p-3 shadow-2xl md:min-w-[300px] md:w-[320px]",
                                                        isDarkMode ? "border-white/10 bg-[#121212]" : "border-slate-300 bg-white"
                                                    )}
                                                >
                                                <div className="mb-3 flex items-center justify-between">
                                                    <button
                                                        type="button"
                                                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                                                        className={cn("rounded-md p-1.5", isDarkMode ? "text-white/80 hover:bg-white/10" : "text-slate-700 hover:bg-slate-100")}
                                                    >
                                                        <ChevronLeft size={16} />
                                                    </button>
                                                    <div className="relative flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setCalendarPickerOpen((prev) => (prev === 'month' ? null : 'month'))}
                                                            className={cn(
                                                                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-bold",
                                                                isDarkMode ? "text-white hover:bg-white/10" : "text-slate-900 hover:bg-slate-100"
                                                            )}
                                                        >
                                                            {calendarMonth.toLocaleDateString('en-US', { month: 'long' })}
                                                            <ChevronDown size={13} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setCalendarPickerOpen((prev) => (prev === 'year' ? null : 'year'))}
                                                            className={cn(
                                                                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-bold",
                                                                isDarkMode ? "text-white hover:bg-white/10" : "text-slate-900 hover:bg-slate-100"
                                                            )}
                                                        >
                                                            {calendarMonth.getFullYear()}
                                                            <ChevronDown size={13} />
                                                        </button>

                                                        {calendarPickerOpen === 'month' && (
                                                            <div className={cn(
                                                                "absolute left-0 top-full z-50 mt-1 grid w-[180px] grid-cols-2 gap-1 rounded-lg border p-2 shadow-xl",
                                                                isDarkMode ? "border-white/10 bg-[#121212]" : "border-slate-300 bg-white"
                                                            )}>
                                                                {Array.from({ length: 12 }, (_, monthIdx) => (
                                                                    <button
                                                                        key={`month-${monthIdx}`}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setCalendarMonth(new Date(calendarMonth.getFullYear(), monthIdx, 1));
                                                                            setCalendarPickerOpen(null);
                                                                        }}
                                                                        className={cn(
                                                                            "rounded px-2 py-1 text-left text-[12px] font-medium",
                                                                            monthIdx === calendarMonth.getMonth()
                                                                                ? "bg-blue-600 text-white"
                                                                                : (isDarkMode ? "text-white/85 hover:bg-white/10" : "text-slate-800 hover:bg-slate-100")
                                                                        )}
                                                                    >
                                                                        {new Date(2000, monthIdx, 1).toLocaleDateString('en-US', { month: 'short' })}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {calendarPickerOpen === 'year' && (
                                                            <div className={cn(
                                                                "absolute right-0 top-full z-50 mt-1 max-h-52 w-[120px] overflow-auto rounded-lg border p-2 shadow-xl",
                                                                isDarkMode ? "border-white/10 bg-[#121212]" : "border-slate-300 bg-white"
                                                            )}>
                                                                {Array.from({ length: 41 }, (_, idx) => calendarMonth.getFullYear() - 20 + idx).map((year) => (
                                                                    <button
                                                                        key={`year-${year}`}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setCalendarMonth(new Date(year, calendarMonth.getMonth(), 1));
                                                                            setCalendarPickerOpen(null);
                                                                        }}
                                                                        className={cn(
                                                                            "block w-full rounded px-2 py-1 text-left text-[12px] font-medium",
                                                                            year === calendarMonth.getFullYear()
                                                                                ? "bg-blue-600 text-white"
                                                                                : (isDarkMode ? "text-white/85 hover:bg-white/10" : "text-slate-800 hover:bg-slate-100")
                                                                        )}
                                                                    >
                                                                        {year}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                                                        className={cn("rounded-md p-1.5", isDarkMode ? "text-white/80 hover:bg-white/10" : "text-slate-700 hover:bg-slate-100")}
                                                    >
                                                        <ChevronRight size={16} />
                                                    </button>
                                                </div>

                                                <div className="mb-2 grid grid-cols-7 gap-1">
                                                    {weekdayLabels.map((day, idx) => (
                                                        <div key={`${day}-${idx}`} className={cn("text-center text-[10px] font-bold", isDarkMode ? "text-white/55" : "text-slate-500")}>
                                                            {day}
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="grid grid-cols-7 gap-1">
                                                    {calendarDays.map(({ key, date, inMonth }) => {
                                                        const isSelected = selectedDate ? toIsoDate(selectedDate) === key : false;
                                                        const isToday = toIsoDate(today) === key;
                                                        return (
                                                            <button
                                                                key={key}
                                                                type="button"
                                                                onClick={() => {
                                                                    setNewTxn({ ...newTxn, announcementDate: key });
                                                                    setIsDateOpen(false);
                                                                }}
                                                                className={cn(
                                                                    "h-8 rounded-md text-[12px] font-semibold",
                                                                    isSelected
                                                                        ? "bg-blue-600 text-white"
                                                                        : inMonth
                                                                            ? (isDarkMode ? "text-white/85 hover:bg-white/10" : "text-slate-800 hover:bg-slate-100")
                                                                            : (isDarkMode ? "text-white/30 hover:bg-white/5" : "text-slate-400 hover:bg-slate-100"),
                                                                    !isSelected && isToday && (isDarkMode ? "ring-1 ring-blue-400/60" : "ring-1 ring-blue-500/60")
                                                                )}
                                                            >
                                                                {date.getDate()}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className={cn(
                                        "ml-1 text-[10px] font-bold uppercase tracking-wider",
                                        isDarkMode ? "text-white/55" : "text-slate-700"
                                    )}>Deal Type</label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setOpenMenu((prev) => (prev === 'dealType' ? null : 'dealType'))}
                                            className={cn(
                                                "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-[13px] font-semibold outline-none transition-all focus-visible:border-blue-400/50 focus-visible:ring-1 focus-visible:ring-blue-500/30",
                                                isDarkMode
                                                    ? "border-white/10 bg-[#131313] text-white"
                                                    : "border-slate-300 bg-white text-slate-900"
                                            )}
                                        >
                                            <span>{newTxn.dealType || 'Strategic'}</span>
                                            <ChevronDown size={14} className={cn("transition-transform duration-300 ease-out", openMenu === 'dealType' && "rotate-180")} />
                                        </button>
                                        <AnimatePresence>
                                            {openMenu === 'dealType' && (
                                                <motion.div
                                                    initial={dropdownMotion.initial}
                                                    animate={dropdownMotion.animate}
                                                    exit={dropdownMotion.exit}
                                                    className={cn(
                                                        "absolute z-30 mt-1 w-full overflow-hidden rounded-lg border shadow-lg",
                                                        isDarkMode ? "border-white/10 bg-[#131313]" : "border-slate-300 bg-white"
                                                    )}
                                                >
                                                {(['Strategic', 'Financial', 'Merger', 'Takeover'] as const).map((option) => (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => {
                                                            setNewTxn({ ...newTxn, dealType: option });
                                                            setOpenMenu(null);
                                                        }}
                                                        className={cn(
                                                            "block w-full px-3 py-2 text-left text-[13px] font-medium",
                                                            isDarkMode ? "text-white hover:bg-white/10" : "text-slate-900 hover:bg-slate-100",
                                                            (newTxn.dealType || 'Strategic') === option && (isDarkMode ? "bg-white/10" : "bg-slate-100")
                                                        )}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className={cn(
                                        "ml-1 text-[10px] font-bold uppercase tracking-wider",
                                        isDarkMode ? "text-white/55" : "text-slate-700"
                                    )}>Payment Type</label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setOpenMenu((prev) => (prev === 'paymentType' ? null : 'paymentType'))}
                                            className={cn(
                                                "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-[13px] font-semibold outline-none transition-all focus-visible:border-blue-400/50 focus-visible:ring-1 focus-visible:ring-blue-500/30",
                                                isDarkMode
                                                    ? "border-white/10 bg-[#131313] text-white"
                                                    : "border-slate-300 bg-white text-slate-900"
                                            )}
                                        >
                                            <span>{newTxn.paymentType || 'Cash'}</span>
                                            <ChevronDown size={14} className={cn("transition-transform duration-300 ease-out", openMenu === 'paymentType' && "rotate-180")} />
                                        </button>
                                        <AnimatePresence>
                                            {openMenu === 'paymentType' && (
                                                <motion.div
                                                    initial={dropdownMotion.initial}
                                                    animate={dropdownMotion.animate}
                                                    exit={dropdownMotion.exit}
                                                    className={cn(
                                                        "absolute z-30 mt-1 w-full overflow-hidden rounded-lg border shadow-lg",
                                                        isDarkMode ? "border-white/10 bg-[#131313]" : "border-slate-300 bg-white"
                                                    )}
                                                >
                                                {(['Cash', 'Stock', 'Mixed'] as const).map((option) => (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => {
                                                            setNewTxn({ ...newTxn, paymentType: option });
                                                            setOpenMenu(null);
                                                        }}
                                                        className={cn(
                                                            "block w-full px-3 py-2 text-left text-[13px] font-medium",
                                                            isDarkMode ? "text-white hover:bg-white/10" : "text-slate-900 hover:bg-slate-100",
                                                            (newTxn.paymentType || 'Cash') === option && (isDarkMode ? "bg-white/10" : "bg-slate-100")
                                                        )}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setIsAdding(false)}
                                    className="rounded-lg border border-[var(--border-default)] px-4 py-2 text-[12px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-glass)] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/[0.04]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddTransaction}
                                    disabled={!isTxnInputValid}
                                    className={cn(
                                        "rounded-lg px-5 py-2 text-[12px] font-bold uppercase tracking-wide text-white transition-all",
                                        isTxnInputValid
                                            ? "bg-gradient-to-r from-blue-700 to-blue-500 hover:brightness-110"
                                            : "cursor-not-allowed bg-[var(--bg-glass)] text-[var(--text-tertiary)] dark:bg-white/10 dark:text-white/40"
                                    )}
                                >
                                    Commit Deal
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="precedent-table-head border-b border-[var(--border-default)] bg-[var(--bg-glass)] text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-tertiary)] dark:border-white/10 dark:bg-[#0f0f0f] dark:text-white/45">
                                    <th className="w-14 px-4 py-4 text-left">Sel</th>
                                    <th className="px-5 py-4 text-left">Target Company</th>
                                    <th className="px-5 py-4 text-left">Acquirer</th>
                                    <th className="px-5 py-4 text-right">Date</th>
                                    <th className="px-5 py-4 text-right">Value (TV)</th>
                                    <th className="px-5 py-4 text-right text-blue-600 dark:text-blue-300/70">EV / Rev</th>
                                    <th className="px-5 py-4 text-right text-violet-600 dark:text-violet-300/70">EV / EBITDA</th>
                                    <th className="px-5 py-4 text-right">Premium</th>
                                    <th className="px-5 py-4 text-center">Status</th>
                                    <th className="w-14 px-4 py-4" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)] text-sm dark:divide-white/5">
                                {baseTransactions.length === 0 && (
                                    <tr
                                        onClick={() => setIsAdding(true)}
                                        className="precedent-empty-row cursor-pointer border-t border-dashed border-[var(--border-default)] bg-[var(--bg-glass)] transition-colors hover:bg-[var(--bg-glass-hover)] dark:border-white/10 dark:bg-[#0c0c0c] dark:hover:bg-[#111]"
                                    >
                                        <td className="px-4 py-5 text-center text-[var(--text-tertiary)] dark:text-white/45">
                                            <Plus size={14} className="mx-auto" />
                                        </td>
                                        <td colSpan={9} className="px-5 py-5 text-[13px] text-[var(--text-tertiary)] dark:text-white/45">
                                            <span className="font-semibold not-italic text-[var(--text-secondary)] dark:text-white/70">No transactions added.</span>{' '}
                                            Click to open the manual deal form and start building the comp set.
                                        </td>
                                    </tr>
                                )}

                                {baseTransactions.map((txn) => (
                                    <tr
                                        key={txn.id}
                                        className={cn(
                                            "group transition-colors hover:bg-[var(--bg-glass)] dark:hover:bg-white/[0.02]",
                                            !txn.isSelected && "opacity-55"
                                        )}
                                    >
                                        <td className="px-4 py-5">
                                            <button
                                                onClick={() => toggleTransaction(txn.id)}
                                                className={cn(
                                                    "flex h-5 w-5 items-center justify-center rounded border transition-all",
                                                    txn.isSelected ? "border-blue-400 bg-blue-500 text-white" : "border-[var(--border-default)] bg-transparent text-[var(--text-tertiary)] dark:border-white/25 dark:text-white/30"
                                                )}
                                            >
                                                {txn.isSelected ? <Check size={12} /> : null}
                                            </button>
                                        </td>
                                        <td className="px-5 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-glass)] text-[10px] font-bold text-[var(--text-primary)] dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
                                                    {(txn.targetTicker || txn.targetName.slice(0, 4)).toUpperCase().slice(0, 4)}
                                                </div>
                                                <div>
                                                    <div className="text-[14px] font-semibold text-[var(--text-primary)]">{txn.targetName}</div>
                                                    <div className="mt-0.5 text-[11px] text-[var(--text-tertiary)] dark:text-white/45">{txn.sector || normalizedSector}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-5 text-[13px] font-medium text-[var(--text-secondary)] dark:text-white/75">{txn.acquirerName}</td>
                                        <td className="px-5 py-5 text-right font-mono text-[12px] text-[var(--text-tertiary)] dark:text-white/50">{formatDate(txn.announcementDate)}</td>
                                        <td className="px-5 py-5 text-right font-mono text-[14px] font-semibold text-[var(--text-primary)] dark:text-white">{formatMoney(txn.transactionValue)}</td>
                                        <td className="px-5 py-5 text-right font-mono text-[14px] font-bold text-blue-600 dark:text-blue-300">{formatMult(txn.evRevenue)}</td>
                                        <td className="px-5 py-5 text-right font-mono text-[14px] font-bold text-violet-600 dark:text-violet-300">{formatMult(txn.evEbitda)}</td>
                                        <td className="px-5 py-5 text-right font-mono text-[14px] font-semibold text-emerald-600 dark:text-emerald-300">{formatPct(txn.premiumPaid)}</td>
                                        <td className="px-5 py-5 text-center">
                                            <span className={cn(
                                                "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                                                txn.isSelected
                                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                                    : "border-[var(--border-default)] bg-[var(--bg-glass)] text-[var(--text-tertiary)] dark:border-white/15 dark:bg-white/[0.03] dark:text-white/45"
                                            )}>
                                                <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", txn.isSelected ? "bg-emerald-300" : "bg-[var(--text-tertiary)] dark:bg-white/35")} />
                                                {txn.isSelected ? 'Included' : 'Excluded'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-5 text-right">
                                            <button
                                                onClick={() => deleteTransaction(txn.id)}
                                                className="rounded p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-red-500/10 hover:text-red-400 dark:text-white/35 dark:hover:text-red-300"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {baseTransactions.length > 0 && (
                        <div className="precedent-table-footer flex items-center justify-between border-t border-[var(--border-default)] bg-[var(--bg-glass)] px-6 py-3 text-[12px] text-[var(--text-tertiary)] dark:border-white/10 dark:bg-[#0f0f0f] dark:text-white/50">
                            <span>
                                Showing <span className="font-semibold text-[var(--text-secondary)] dark:text-white/75">1-{baseTransactions.length}</span> of{' '}
                                <span className="font-semibold text-[var(--text-secondary)] dark:text-white/75">{baseTransactions.length}</span>
                            </span>
                            <div className="flex items-center gap-2">
                                <button className="rounded border border-[var(--border-default)] px-2 py-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-glass)] dark:border-white/10 dark:text-white/45 dark:hover:bg-white/[0.04]">{'<'}</button>
                                <button className="rounded border border-[var(--border-default)] bg-[var(--bg-glass)] px-2 py-1 text-[var(--text-primary)] dark:border-white/15 dark:bg-white/[0.06] dark:text-white">1</button>
                                <button className="rounded border border-[var(--border-default)] px-2 py-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-glass)] dark:border-white/10 dark:text-white/45 dark:hover:bg-white/[0.04]">{'>'}</button>
                            </div>
                        </div>
                    )}
                </div>

                {baseTransactions.length > 0 && (
                    <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
                        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 dark:border-white/10 dark:bg-[#0c0c0c]">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] dark:text-white/55">Revenue Method EV</p>
                            <p className="mt-2 text-[30px] font-black tabular-nums text-[var(--text-primary)] dark:text-white">{formatMoney(impliedEvRevenue)}</p>
                            <p className="mt-1 text-[11px] text-[var(--text-tertiary)] dark:text-white/45">@ {stats.medianEvRevenue.toFixed(1)}x EV/Rev</p>
                        </div>
                        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 dark:border-white/10 dark:bg-[#0c0c0c]">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] dark:text-white/55">EBITDA Method EV</p>
                            <p className="mt-2 text-[30px] font-black tabular-nums text-[var(--text-primary)] dark:text-white">{formatMoney(impliedEvEbitda)}</p>
                            <p className="mt-1 text-[11px] text-[var(--text-tertiary)] dark:text-white/45">@ {stats.medianEvEbitda.toFixed(1)}x EV/EBITDA</p>
                        </div>
                        <div className="rounded-xl border border-blue-400/30 bg-gradient-to-br from-blue-700/20 to-blue-900/20 p-5">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] dark:text-white/65">Blended Implied EV</p>
                            <p className="mt-2 text-[34px] font-black tabular-nums text-[var(--text-primary)] dark:text-white">{formatMoney((impliedEvRevenue + impliedEvEbitda) / 2)}</p>
                            <p className="mt-1 text-[11px] text-[var(--text-tertiary)] dark:text-white/55">Median premium: {formatPct(stats.medianPremium)}</p>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
