"use client";

import { useState, useRef, useEffect, useMemo, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Assumptions, DCFResults } from '@/core/types';
import {
  ChevronRight,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/core/utils/cn';
import { INDUSTRY_PRESETS, IndustryPresetKey, detectIndustryTemplate } from '@/core/data/industry-templates';
import {
  FORECAST_YEAR_OPTIONS,
  INDUSTRY_TEMPLATE_OPTIONS,
  SCENARIOS,
  type TemplateSelection,
} from './parameters-sidebar.constants';

interface ParametersSidebarProps {
  assumptions: Assumptions | null;
  results: DCFResults | null;
  isDarkMode: boolean;
  onUpdateAssumption: (key: keyof Assumptions, value: number | string | boolean) => void;
  onApplyScenario: (type: 'base' | 'conservative' | 'aggressive') => void;
  activeScenario: 'base' | 'conservative' | 'aggressive';
  onResetToDefaults: () => void;
  companyName?: string; // Optional company name for dynamic text
  companyTicker?: string;
  companySector?: string;
  companyIndustry?: string;
}

interface SectionProps {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ label, isOpen, onToggle, children }: SectionProps) {
  return (
    <div className="border-b border-[var(--border-default)] last:border-0 border-solid">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4.5 px-6 hover:bg-[var(--bg-glass)] transition-colors duration-200 group cursor-pointer outline-none"
      >
        <span className="text-[13px] font-black text-[var(--text-primary)] uppercase tracking-[0.12em] group-hover:text-[var(--text-primary)] transition-colors">
          {label}
        </span>
        <ChevronRight
          size={14}
          className={cn(
            "text-[var(--text-secondary)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            isOpen ? "rotate-90" : "rotate-0"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="pl-6 pr-8 pb-8 pt-5 space-y-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ParamInput({
  label,
  value,
  unit = '%',
  onChange,
  min = 0,
  max = 100,
  step = 0.1
}: {
  label: string;
  value: number;
  unit?: string;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [localValue, setLocalValue] = useState(value);
  const [isSliderActive, setIsSliderActive] = useState(false);
  const [isEditingInput, setIsEditingInput] = useState(false);
  const debouncedValue = useDebounce(localValue, 300);
  const onChangeRef = useRef(onChange);
  const isUserInteraction = useRef(false);

  const formatDisplayValue = (val: number) => (unit === '%' ? (val * 100).toFixed(1) : val.toFixed(2));
  const [inputDraft, setInputDraft] = useState(formatDisplayValue(value));

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (isEditingInput) return;
    const formatted = unit === '%' ? (value * 100).toFixed(1) : value.toFixed(2);
    Promise.resolve().then(() => {
      setLocalValue((prev) => (Math.abs(prev - value) > 0.0001 ? value : prev));
      setInputDraft((prev) => (prev !== formatted ? formatted : prev));
      isUserInteraction.current = false; // Reset interaction flag on external update
    });
  }, [value, isEditingInput, unit]);

  useEffect(() => {
    // Only fire update if it came from user interaction and value is different
    if (isUserInteraction.current && Math.abs(debouncedValue - value) > 0.0001) {
      onChangeRef.current(debouncedValue);
    }
  }, [debouncedValue, value]);

  const handleUserChange = (newVal: number) => {
    isUserInteraction.current = true;
    setLocalValue(newVal);
  };

  const clampValue = (num: number) => Math.min(max, Math.max(min, num));

  const commitInputDraft = () => {
    const cleaned = inputDraft.replace(/,/g, '').trim();
    if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') {
      setInputDraft(formatDisplayValue(localValue));
      setIsEditingInput(false);
      return;
    }

    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed)) {
      setInputDraft(formatDisplayValue(localValue));
      setIsEditingInput(false);
      return;
    }

    const normalized = clampValue(unit === '%' ? parsed / 100 : parsed);
    handleUserChange(normalized);
    setInputDraft(formatDisplayValue(normalized));
    setIsEditingInput(false);
  };

  const cancelInputDraft = () => {
    setInputDraft(formatDisplayValue(localValue));
    setIsEditingInput(false);
  };

  const displayValue = formatDisplayValue(localValue);
  const progress = ((localValue - min) / (max - min)) * 100;
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const sliderMin = unit === '%' ? min * 100 : min;
  const sliderMax = unit === '%' ? max * 100 : max;
  // Keep manual input precise, but make drag interactions less sluggish for percentage sliders.
  const sliderStep = unit === '%' ? Math.max(step, 0.5) : step;

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-3">
        <label
          className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.12em] transition-colors group-hover:text-[var(--text-primary)]"
          id={`label-${label}`}
        >
          {label}
        </label>

        <div className="relative group/input">
          <div className="flex items-center bg-[var(--bg-card)] rounded-[14px] border border-[var(--border-default)] w-[96px] px-3 py-1.5 transition-colors group-hover/input:border-[var(--border-hover)] focus-within:border-[var(--system-blue)] focus-within:ring-1 focus-within:ring-[var(--system-blue)]/30 shadow-sm">
            <input
              type="text"
              value={isEditingInput ? inputDraft : displayValue}
              aria-labelledby={`label-${label}`}
              onFocus={(e) => {
                setIsEditingInput(true);
                setInputDraft(displayValue);
                e.currentTarget.select();
              }}
              onChange={(e) => setInputDraft(e.target.value)}
              onBlur={commitInputDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelInputDraft();
                  e.currentTarget.blur();
                }
              }}
              className="w-full bg-transparent text-[15px] text-[var(--text-primary)] text-right font-bold tabular-nums focus:outline-none tracking-tight"
              spellCheck={false}
            />
            <span className="text-[11px] text-[var(--text-secondary)] ml-1.5 font-bold pb-[1px] uppercase tracking-[0.08em]">{unit}</span>
          </div>
        </div>
      </div>

      <div className="relative h-8 flex items-center cursor-pointer touch-none select-none">
        {/* Base Track */}
        <div className="absolute inset-x-0 h-[5px] rounded-full bg-[var(--border-default)]" />

        {/* Active Track Fill */}
        <div
          className="absolute left-0 h-[5px] rounded-full shadow-[0_0_0_1px_rgba(10,132,255,0.18),0_0_10px_rgba(10,132,255,0.22)]"
          style={{
            width: `${clampedProgress}%`,
            background: 'linear-gradient(90deg, #0A84FF 0%, #2997FF 100%)'
          }}
        />

        {/* Range Input (Invisible but interactive) */}
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={sliderStep}
          value={unit === '%' ? localValue * 100 : localValue}
          onChange={(e) => handleUserChange(unit === '%' ? parseFloat(e.target.value) / 100 : parseFloat(e.target.value))}
          onPointerDown={() => setIsSliderActive(true)}
          onPointerUp={() => setIsSliderActive(false)}
          onPointerCancel={() => setIsSliderActive(false)}
          onBlur={() => setIsSliderActive(false)}
          onFocus={() => setIsSliderActive(true)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          aria-labelledby={`label-${label}`}
        />

        {/* Apple-style interaction halo */}
        <div
          className={cn(
            "absolute h-8 w-8 -translate-x-1/2 rounded-full bg-[#0A84FF]/20 pointer-events-none transition-all duration-200 z-[9]",
            isSliderActive ? "opacity-100 scale-100" : "opacity-0 scale-75"
          )}
          style={{ left: `${clampedProgress}%` }}
        />

        {/* Apple-style Thumb */}
        <div
          className={cn(
            "absolute h-[20px] w-[20px] -translate-x-1/2 rounded-full bg-white border border-black/10 z-10 pointer-events-none transition-all duration-200",
            "shadow-[0_1px_2px_rgba(0,0,0,0.20),0_4px_10px_rgba(0,0,0,0.24)]",
            isSliderActive ? "scale-105 border-[#0A84FF]/40" : "scale-100"
          )}
          style={{ left: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

export function ParametersSidebar({
  assumptions,
  results,
  isDarkMode,
  onUpdateAssumption,
  onApplyScenario,
  activeScenario,
  onResetToDefaults,
  companyName,
  companyTicker,
  companySector,
  companyIndustry
}: ParametersSidebarProps) {
  void results;
  const [isMethodMenuOpen, setIsMethodMenuOpen] = useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSelection>("auto");
  const templateMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocMouseDown = (event: MouseEvent) => {
      if (!templateMenuRef.current) return;
      const target = event.target as Node;
      if (!templateMenuRef.current.contains(target)) {
        setIsTemplateMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    growth: true,
    margins: false,
    capital: false,
    wacc: false,
    debt: false,
    dividends: true,
    shares: true
  });

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const currentModelType = assumptions?.modelType || 'unlevered';
  const autoDetectedTemplate = useMemo(
    () => detectIndustryTemplate(companyTicker, companySector, companyIndustry),
    [companyTicker, companySector, companyIndustry]
  );
  const derivedCostOfEquity =
    (assumptions?.riskFreeRate || 0.04) + (assumptions?.beta || 1.0) * (assumptions?.equityRiskPremium || 0.05);

  const updateAssumption = (
    key: keyof Assumptions,
    value: number | string | boolean,
    markTemplateCustom: boolean = true
  ) => {
    onUpdateAssumption(key, value);
    const shouldKeepTemplate = key === 'forecastYears';
    if (markTemplateCustom && !shouldKeepTemplate && selectedTemplate !== "custom") {
      setSelectedTemplate("custom");
    }
  };

  const applyIndustryTemplate = (templateKey: IndustryPresetKey) => {
    const preset = INDUSTRY_PRESETS[templateKey];
    if (!preset) return;
    const p = preset.assumptions;

    updateAssumption('revenueGrowth', p.revenueCagr / 100, false);
    updateAssumption('terminalGrowthRate', p.terminalGrowth / 100, false);
    updateAssumption('grossMargin', p.grossMargin / 100, false);
    updateAssumption('ebitMargin', p.ebitMargin / 100, false);
    updateAssumption('taxRate', p.taxRate / 100, false);
    updateAssumption('capexRatio', p.capexPercent / 100, false);
    updateAssumption('deaRatio', p.daPercent / 100, false);
    updateAssumption('nwcChangeRatio', p.nwcPercent / 100, false);
    updateAssumption('beta', p.beta, false);
    updateAssumption('equityRiskPremium', p.marketRiskPremium / 100, false);
    updateAssumption('terminalExitMultiple', p.terminalExitMultiple, false);
  };

  const ensureMethodDefaults = (type: 'unlevered' | 'levered' | 'ddm') => {
    if (!assumptions) return;

    if (type !== 'unlevered') {
      if (!assumptions.riskFreeRate || assumptions.riskFreeRate <= 0) updateAssumption('riskFreeRate', 0.04, false);
      if (!assumptions.beta || assumptions.beta <= 0) updateAssumption('beta', 1.0, false);
      if (!assumptions.equityRiskPremium || assumptions.equityRiskPremium <= 0) updateAssumption('equityRiskPremium', 0.05, false);
    }

    if (type === 'levered') {
      if (!assumptions.currentDebt || assumptions.currentDebt < 0) updateAssumption('currentDebt', 0, false);
      if (!assumptions.costOfDebt || assumptions.costOfDebt <= 0) updateAssumption('costOfDebt', 0.05, false);
      if (assumptions.annualDebtRepayment === undefined || assumptions.annualDebtRepayment < 0) updateAssumption('annualDebtRepayment', 0, false);
    }

    if (type === 'ddm') {
      if (assumptions.currentDividendPerShare === undefined || assumptions.currentDividendPerShare < 0) updateAssumption('currentDividendPerShare', 0, false);
      if (assumptions.dividendPayoutRatio === undefined || assumptions.dividendPayoutRatio < 0) updateAssumption('dividendPayoutRatio', 0.3, false);
      if (assumptions.dividendGrowthRateStage1 === undefined) updateAssumption('dividendGrowthRateStage1', 0.05, false);
      if (assumptions.dividendGrowthRateStage2 === undefined) updateAssumption('dividendGrowthRateStage2', 0.03, false);
      if (!assumptions.stage1Duration || assumptions.stage1Duration < 1) updateAssumption('stage1Duration', 5, false);
      if (!assumptions.stage2Duration || assumptions.stage2Duration < 1) updateAssumption('stage2Duration', 5, false);
      if (!assumptions.dilutedSharesOutstanding || assumptions.dilutedSharesOutstanding <= 0) {
        updateAssumption('dilutedSharesOutstanding', assumptions.dilutedSharesOutstanding || 1, false);
      }
    }
  };

  const handleMethodChange = (type: 'unlevered' | 'levered' | 'ddm') => {
    updateAssumption('modelType', type, false);
    ensureMethodDefaults(type);
    setIsMethodMenuOpen(false);
  };

  const handleTemplateChange = (nextTemplate: TemplateSelection) => {
    setSelectedTemplate(nextTemplate);
    setIsTemplateMenuOpen(false);
    if (nextTemplate === "custom") return;
    const resolved = nextTemplate === "auto" ? autoDetectedTemplate : nextTemplate;
    applyIndustryTemplate(resolved);
  };

  useEffect(() => {
    // New company should default to auto mode label, without mutating assumptions.
    Promise.resolve().then(() => setSelectedTemplate("auto"));
  }, [companyTicker]);

  const selectedTemplateTitle = selectedTemplate === "auto"
    ? `Auto-detect (${INDUSTRY_PRESETS[autoDetectedTemplate].name})`
    : selectedTemplate === "custom"
      ? "Custom (Manual)"
      : INDUSTRY_PRESETS[selectedTemplate].name;
  const selectedTemplateOption = INDUSTRY_TEMPLATE_OPTIONS.find((o) => o.value === selectedTemplate);

  const activeIndex = SCENARIOS.findIndex(s => s.id === activeScenario);
  const safeIndex = activeIndex >= 0 ? activeIndex : 1;

  if (!assumptions || !results) return null;

  const debtSliderMax = Math.max(1_000_000_000, (assumptions.currentDebt || 0) * 2 || 0);
  const annualRepaymentSliderMax = Math.max(100_000_000, (assumptions.annualDebtRepayment || 0) * 4 || 0, (assumptions.currentDebt || 0));
  const dilutedSharesSliderMax = Math.max(100_000_000, (assumptions.dilutedSharesOutstanding || 0) * 2 || 0);
  const lightThemeVars = !isDarkMode ? {
    '--bg-sidebar': '#ffffff',
    '--bg-card': '#ffffff',
    '--bg-glass': 'rgba(15, 23, 42, 0.03)',
    '--bg-glass-hover': 'rgba(15, 23, 42, 0.05)',
    '--text-primary': '#0f172a',
    '--text-secondary': 'rgba(15, 23, 42, 0.72)',
    '--text-tertiary': 'rgba(15, 23, 42, 0.56)',
    '--border-default': 'rgba(15, 23, 42, 0.12)',
    '--border-subtle': 'rgba(15, 23, 42, 0.08)',
  } as CSSProperties : undefined;

  return (
    <aside
      className="assumptions-theme-scope flex flex-col h-full bg-[var(--bg-sidebar)] relative z-30"
      style={lightThemeVars}
    >
      <motion.div
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="assumptions-main-panel flex-1 flex flex-col min-h-0 bg-[var(--bg-sidebar)]"
      >
        {/* Heavy Header Area */}
        <div className={cn(
          "flex flex-col px-6 pb-6 border-b border-[var(--border-default)] shrink-0 gap-5 bg-[var(--bg-glass)] backdrop-blur-xl z-20 transition-all duration-300",
          "pt-6"
        )}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[15px] font-black text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-90">Assumptions</span>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                {(companyTicker || 'Ticker').toUpperCase()} / {companySector || companyIndustry || 'Model context'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onResetToDefaults}
                className="p-2 rounded-full hover:bg-[var(--bg-glass-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-200 group"
                title="Reset to Defaults"
              >
                <RotateCcw size={14} strokeWidth={2.5} className="group-hover:-rotate-180 transition-transform duration-500" />
              </button>
            </div>
          </div>

          <div className="relative z-40">
            <div
              onClick={() => setIsMethodMenuOpen(!isMethodMenuOpen)}
              className={cn(
                "valuation-method-trigger rounded-[30px] border px-4 py-4.5 flex flex-col gap-2.5 relative overflow-hidden shrink-0 group cursor-pointer transition-colors",
                isDarkMode
                  ? "border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-glass-hover)]"
                  : "border-[rgba(15,23,42,0.12)] bg-white hover:bg-[rgba(15,23,42,0.03)] shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
              )}
            >
              <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.14em] relative z-10 cursor-pointer pointer-events-none">
                Valuation Method
              </label>
              <div className="flex items-center justify-between relative z-10 gap-4">
                <span className="text-[16px] font-bold text-[var(--text-primary)] tracking-tight leading-tight">
                  {currentModelType === 'levered' ? 'Levered DCF' :
                    currentModelType === 'ddm' ? 'Dividend Discount Model' :
                      'Unlevered DCF (FCFF)'}
                </span>
                <ChevronDown
                  size={18}
                  className={cn(
                    "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-transform duration-200 shrink-0",
                    isMethodMenuOpen ? "rotate-180" : ""
                  )}
                />
              </div>
              <div
                className={cn(
                  "absolute inset-0 pointer-events-none",
                  isDarkMode
                    ? "bg-gradient-to-br from-white/5 to-transparent"
                    : "bg-gradient-to-br from-white via-white to-[rgba(15,23,42,0.02)]"
                )}
              />
            </div>

            <motion.div
              initial={false}
              animate={isMethodMenuOpen
                ? { opacity: 1, y: 0, scaleY: 1, height: 'auto' }
                : { opacity: 0, y: -8, scaleY: 0.98, height: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "valuation-method-menu absolute top-full left-0 right-0 mt-2 rounded-[28px] overflow-hidden z-[100] origin-top",
                isDarkMode
                  ? "shadow-2xl border border-[var(--border-default)] bg-[var(--bg-card)]"
                  : "shadow-[0_18px_40px_rgba(15,23,42,0.14)] border border-[rgba(15,23,42,0.12)] bg-white",
                isMethodMenuOpen ? "pointer-events-auto" : "pointer-events-none"
              )}
            >
              {[
                { id: 'unlevered', label: 'Unlevered DCF (FCFF)' },
                { id: 'levered', label: 'Levered DCF' },
                { id: 'ddm', label: 'Dividend Discount Model' }
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => handleMethodChange(method.id as 'unlevered' | 'levered' | 'ddm')}
                  className={cn(
                    "valuation-method-option w-full text-left px-5 py-3 text-[14px] font-semibold transition-colors hover:bg-[var(--bg-glass)]",
                    currentModelType === method.id ? "text-[var(--system-blue)]" : "text-[var(--text-primary)]"
                  )}
                >
                  {method.label}
                </button>
              ))}
            </motion.div>
          </div>

          {/* Apple-style Segmented Control */}
          <div className="relative p-1 bg-[var(--bg-card)] rounded-[28px] border border-[var(--border-default)] flex h-[40px] select-none gap-1">
            <motion.div
              className="absolute top-1 bottom-1 rounded-full shadow-md z-0"
              initial={false}
              animate={{
                left: `calc(4px + ((100% - 8px) / 3 * ${safeIndex}))`,
                backgroundColor: activeScenario === 'conservative' ? '#FF453A' :
                  activeScenario === 'aggressive' ? '#30D158' :
                    '#0A84FF'
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                width: `calc((100% - 12px) / 3)`
              }}
            />

            {SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => onApplyScenario(scenario.id)}
                className={cn(
                  "flex-1 relative z-10 text-[13px] font-semibold text-center h-full flex items-center justify-center transition-colors duration-200 outline-none focus:outline-none",
                  activeScenario === scenario.id ? "text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {scenario.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Sections */}
        <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden pt-4 pb-14 [scrollbar-gutter:stable]">
          <div className="px-6 pb-8">
            <div className="text-[12px] font-black text-[var(--text-secondary)] uppercase tracking-[0.16em] mb-3">
              Industry Template
            </div>
            <div className="relative" ref={templateMenuRef}>
              <button
                onClick={() => setIsTemplateMenuOpen((prev) => !prev)}
                className="w-full p-4 bg-[var(--bg-card)] rounded-[30px] border border-[var(--border-default)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-glass-hover)] transition-all duration-200 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold text-[var(--text-primary)] truncate flex items-center gap-2">
                      <span className="text-[15px] leading-none">{selectedTemplateOption?.icon || "🔍"}</span>
                      <span className="truncate">{selectedTemplateTitle}</span>
                    </div>
                    <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mt-1">
                      {selectedTemplate === "custom" ? "Manual editing active" : "Preset assumptions ready"}
                    </div>
                  </div>
                  <ChevronDown
                    size={16}
                    className={cn(
                      "text-[var(--text-secondary)] shrink-0 transition-transform duration-200",
                      isTemplateMenuOpen && "rotate-180"
                    )}
                  />
                </div>
              </button>

              <AnimatePresence>
                {isTemplateMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] rounded-[28px] border border-[var(--border-default)] shadow-2xl z-[120] overflow-hidden"
                  >
                    <div className="max-h-[290px] overflow-y-auto custom-scrollbar py-1">
                      {INDUSTRY_TEMPLATE_OPTIONS.map((option) => {
                        const isActive = selectedTemplate === option.value;
                        const resolvedLabel = option.value === "auto"
                          ? `${option.label}: ${INDUSTRY_PRESETS[autoDetectedTemplate].name}`
                          : option.label;
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleTemplateChange(option.value)}
                            className={cn(
                              "w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between gap-3",
                              isActive ? "bg-[var(--system-blue)]/15 text-[var(--system-blue)]" : "text-[var(--text-primary)] hover:bg-[var(--bg-glass)]"
                            )}
                          >
                            <div className="min-w-0 flex items-start gap-2.5">
                              <span className="text-[15px] leading-none mt-[1px]">{option.icon}</span>
                              <div className="min-w-0">
                                <div className="text-[12px] font-semibold truncate">{resolvedLabel}</div>
                                {option.examples && (
                                  <div className="text-[10px] font-medium text-[var(--text-tertiary)] truncate">
                                    {option.examples}
                                  </div>
                                )}
                              </div>
                            </div>
                            {isActive && (
                              <span className="text-[9px] font-black uppercase tracking-wider text-[var(--system-blue)]">
                                Active
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="px-6 pb-9">
            <div className="text-[12px] font-black text-[var(--text-secondary)] uppercase tracking-[0.16em] mb-3">
              Forecast Years
            </div>
            <div className="relative p-1 bg-[var(--bg-card)] rounded-[26px] border border-[var(--border-default)] flex h-[36px] select-none gap-1">
              {FORECAST_YEAR_OPTIONS.map((years) => (
                <button
                  key={years}
                  onClick={() => updateAssumption('forecastYears', years)}
                  className={cn(
                    "flex-1 text-[12px] font-semibold rounded-full transition-colors",
                    assumptions.forecastYears === years ? "bg-[var(--system-blue)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {years}Y
                </button>
              ))}
            </div>
          </div>
          <Section
            label="Growth Assumptions"
            isOpen={openSections.growth}
            onToggle={() => toggleSection('growth')}
          >
            <ParamInput
              label="Revenue CAGR"
              value={assumptions.revenueGrowth}
              onChange={(val) => updateAssumption('revenueGrowth', val)}
              min={0}
              max={0.5}
            />
            <div className="relative p-1 bg-[var(--bg-card)] rounded-[26px] border border-[var(--border-default)] flex h-[34px] select-none gap-1">
              {[
                { id: 'growth', label: 'Gordon Growth' },
                { id: 'multiple', label: 'Exit Multiple' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => updateAssumption('valuationMethod', m.id as 'growth' | 'multiple')}
                  className={cn(
                    "flex-1 text-[12px] font-semibold rounded-full transition-colors",
                    assumptions.valuationMethod === m.id ? "bg-[var(--system-blue)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {assumptions.valuationMethod === 'growth' ? (
              <ParamInput
                label="Terminal Growth"
                value={assumptions.terminalGrowthRate}
                onChange={(val) => updateAssumption('terminalGrowthRate', val)}
                min={0}
                max={0.1}
              />
            ) : (
              <ParamInput
                label="Terminal Exit Multiple"
                value={assumptions.terminalExitMultiple}
                onChange={(val) => updateAssumption('terminalExitMultiple', val)}
                min={2}
                max={30}
                step={0.1}
                unit="x"
              />
            )}
          </Section>

          {currentModelType === 'unlevered' ? (
            <>
              <Section
                label="Profitability Drivers"
                isOpen={openSections.margins}
                onToggle={() => toggleSection('margins')}
              >
                <ParamInput
                  label="Gross Margin"
                  value={assumptions.grossMargin}
                  onChange={(val) => updateAssumption('grossMargin', val)}
                  min={0}
                  max={1}
                />
                <ParamInput
                  label="EBIT Margin"
                  value={assumptions.ebitMargin}
                  onChange={(val) => updateAssumption('ebitMargin', val)}
                  min={0}
                  max={1}
                />
                <ParamInput
                  label="Effective Tax Rate"
                  value={assumptions.taxRate}
                  onChange={(val) => updateAssumption('taxRate', val)}
                  min={0}
                  max={0.5}
                />
              </Section>

              <Section
                label="Capital Efficiency"
                isOpen={openSections.capital}
                onToggle={() => toggleSection('capital')}
              >
                <ParamInput
                  label="D&A % Revenue"
                  value={assumptions.deaRatio}
                  onChange={(val) => updateAssumption('deaRatio', val)}
                  min={0}
                  max={0.2}
                />
                <ParamInput
                  label="CapEx % Revenue"
                  value={assumptions.capexRatio}
                  onChange={(val) => updateAssumption('capexRatio', val)}
                  min={0}
                  max={0.3}
                />
                <ParamInput
                  label="NWC Intensity"
                  value={assumptions.nwcChangeRatio}
                  onChange={(val) => updateAssumption('nwcChangeRatio', val)}
                  min={-0.1}
                  max={0.1}
                  unit="%"
                />
                <ParamInput
                  label="Receivable Days"
                  value={assumptions.accountsReceivableDays}
                  onChange={(val) => updateAssumption('accountsReceivableDays', val)}
                  min={0}
                  max={180}
                  unit="d"
                  step={1}
                />
                <ParamInput
                  label="Inventory Days"
                  value={assumptions.inventoryDays}
                  onChange={(val) => updateAssumption('inventoryDays', val)}
                  min={0}
                  max={365}
                  unit="d"
                  step={1}
                />
                <ParamInput
                  label="Payable Days"
                  value={assumptions.accountsPayableDays}
                  onChange={(val) => updateAssumption('accountsPayableDays', val)}
                  min={0}
                  max={180}
                  unit="d"
                  step={1}
                />
              </Section>

              <Section
                label="Discount Rates"
                isOpen={openSections.wacc}
                onToggle={() => toggleSection('wacc')}
              >
                <ParamInput
                  label="WACC (Discount Rate)"
                  value={assumptions.wacc}
                  onChange={(val) => updateAssumption('wacc', val)}
                  min={0}
                  max={0.25}
                />
                <ParamInput
                  label="Risk-Free Rate"
                  value={assumptions.riskFreeRate || 0.04}
                  onChange={(val) => updateAssumption('riskFreeRate', val)}
                  min={0}
                  max={0.15}
                />
                <ParamInput
                  label="Beta"
                  value={assumptions.beta || 1}
                  onChange={(val) => updateAssumption('beta', val)}
                  min={0.2}
                  max={3}
                  step={0.01}
                  unit="x"
                />
                <ParamInput
                  label="Equity Risk Premium"
                  value={assumptions.equityRiskPremium || 0.05}
                  onChange={(val) => updateAssumption('equityRiskPremium', val)}
                  min={0.02}
                  max={0.15}
                />
                <ParamInput
                  label="Pre-Tax Cost of Debt"
                  value={assumptions.costOfDebt || 0.05}
                  onChange={(val) => updateAssumption('costOfDebt', val)}
                  min={0.01}
                  max={0.2}
                />
                <ParamInput
                  label="Target Leverage"
                  value={assumptions.leverageTarget || 0}
                  onChange={(val) => updateAssumption('leverageTarget', val)}
                  min={0}
                  max={1}
                />
                <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center h-[44px]">
                  <span className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">→ Cost of Equity</span>
                  <span className="text-[14px] font-bold text-[var(--system-blue)]">
                    {(derivedCostOfEquity * 100).toFixed(2)}%
                  </span>
                </div>
              </Section>
            </>
          ) : currentModelType === 'levered' ? (
            <>
              <Section
                label="Discount Rates"
                isOpen={openSections.wacc}
                onToggle={() => toggleSection('wacc')}
              >
                <ParamInput
                  label="Risk-Free Rate"
                  value={assumptions.riskFreeRate || 0.04}
                  onChange={(val) => updateAssumption('riskFreeRate', val)}
                  min={0}
                  max={0.15}
                />
                <ParamInput
                  label="Beta"
                  value={assumptions.beta || 1.2}
                  onChange={(val) => updateAssumption('beta', val)}
                  min={0}
                  max={3}
                  step={0.01}
                  unit="x"
                />
                <ParamInput
                  label="Market Risk Premium"
                  value={assumptions.equityRiskPremium || 0.05}
                  onChange={(val) => updateAssumption('equityRiskPremium', val)}
                  min={0}
                  max={0.15}
                />

                <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center h-[44px]">
                  <span className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">→ Cost of Equity</span>
                  <span className="text-[14px] font-bold text-[var(--system-blue)]">
                    {(derivedCostOfEquity * 100).toFixed(1)}%
                  </span>
                </div>
              </Section>
              <Section
                label="Debt Schedules"
                isOpen={openSections.debt}
                onToggle={() => toggleSection('debt')}
              >
                <ParamInput
                  label="Current Debt"
                  value={assumptions.currentDebt || 0}
                  onChange={(val) => updateAssumption('currentDebt', val)}
                  min={0}
                  max={debtSliderMax}
                  unit="$"
                  step={1}
                />
                <ParamInput
                  label="Interest Rate"
                  value={assumptions.costOfDebt || 0.05}
                  onChange={(val) => updateAssumption('costOfDebt', val)}
                  min={0}
                  max={0.2}
                />
                <ParamInput
                  label="Annual Repayment"
                  value={assumptions.annualDebtRepayment || 0}
                  onChange={(val) => updateAssumption('annualDebtRepayment', val)}
                  min={0}
                  max={annualRepaymentSliderMax}
                  unit="$"
                  step={1}
                />
              </Section>
            </>
          ) : (
            <>
              <Section
                label="Dividend Assumptions"
                isOpen={openSections.dividends}
                onToggle={() => toggleSection('dividends')}
              >
                <ParamInput
                  label="Current Dividend"
                  value={assumptions.currentDividendPerShare || 0}
                  onChange={(val) => updateAssumption('currentDividendPerShare', val)}
                  min={0}
                  max={100}
                  step={0.01}
                  unit="$"
                />

                <div className="flex items-center justify-center relative h-10">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <span className="relative bg-[var(--bg-sidebar)] px-3 text-[10px] text-[var(--text-secondary)] uppercase font-black tracking-[0.2em]">Or</span>
                </div>

                <ParamInput
                  label="Payout Ratio"
                  value={assumptions.dividendPayoutRatio || 0}
                  onChange={(val) => updateAssumption('dividendPayoutRatio', val)}
                  min={0}
                  max={1}
                />

                <ParamInput
                  label="Stage 1 Growth"
                  value={assumptions.dividendGrowthRateStage1 || 0.05}
                  onChange={(val) => updateAssumption('dividendGrowthRateStage1', val)}
                  min={-0.2}
                  max={0.5}
                />
                <ParamInput
                  label="Stage 1 Years"
                  value={assumptions.stage1Duration || 5}
                  onChange={(val) => updateAssumption('stage1Duration', val)}
                  min={1}
                  max={20}
                  step={1}
                  unit="Yr"
                />

                <ParamInput
                  label="Stage 2 Growth"
                  value={assumptions.dividendGrowthRateStage2 || 0.03}
                  onChange={(val) => updateAssumption('dividendGrowthRateStage2', val)}
                  min={-0.2}
                  max={0.5}
                />
                <ParamInput
                  label="Stage 2 Years"
                  value={assumptions.stage2Duration || 5}
                  onChange={(val) => updateAssumption('stage2Duration', val)}
                  min={1}
                  max={20}
                  step={1}
                  unit="Yr"
                />

                <ParamInput
                  label="Terminal Growth"
                  value={assumptions.terminalGrowthRate}
                  onChange={(val) => updateAssumption('terminalGrowthRate', val)}
                  min={0}
                  max={0.1}
                />
              </Section>

              <Section
                label="Discount Rates"
                isOpen={openSections.wacc}
                onToggle={() => toggleSection('wacc')}
              >
                <ParamInput
                  label="Risk-Free Rate"
                  value={assumptions.riskFreeRate || 0.04}
                  onChange={(val) => updateAssumption('riskFreeRate', val)}
                  min={0}
                  max={0.15}
                />
                <ParamInput
                  label="Beta"
                  value={assumptions.beta || 1.2}
                  onChange={(val) => updateAssumption('beta', val)}
                  min={0}
                  max={3}
                  step={0.01}
                  unit="x"
                />
                <ParamInput
                  label="Market Risk Premium"
                  value={assumptions.equityRiskPremium || 0.05}
                  onChange={(val) => updateAssumption('equityRiskPremium', val)}
                  min={0}
                  max={0.15}
                />

                <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center h-[44px]">
                  <span className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">→ Cost of Equity</span>
                  <span className="text-[14px] font-bold text-[var(--system-blue)]">
                    {(derivedCostOfEquity * 100).toFixed(1)}%
                  </span>
                </div>
              </Section>

              <Section
                label="Share Count"
                isOpen={openSections.shares}
                onToggle={() => toggleSection('shares')}
              >
                <ParamInput
                  label="Diluted Shares"
                  value={assumptions.dilutedSharesOutstanding || 0}
                  onChange={(val) => updateAssumption('dilutedSharesOutstanding', val)}
                  min={0}
                  max={dilutedSharesSliderMax}
                  step={1}
                  unit="M"
                />
              </Section>

              <div className="mx-6 mt-6 p-4 rounded-xl border border-[var(--system-blue)]/20 bg-[var(--system-blue)]/5">
                <div className="flex gap-3">
                  <div className="text-[16px]">ℹ️</div>
                  <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                    DDM values equity based on expected dividend payments. Best suited for mature companies with stable dividend policies like {companyName || 'Target'}.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-[var(--border-default)] bg-[var(--bg-card)] shrink-0">
          <div className="flex justify-between items-center text-[11px] uppercase tracking-wider">
            <span className="text-[var(--text-secondary)] font-semibold">Current Scenario</span>
            <span className={cn(
              "font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider transition-colors duration-300",
              activeScenario === 'aggressive' ? "text-[#30D158] bg-[#30D158]/10" :
                activeScenario === 'conservative' ? "text-[#FF453A] bg-[#FF453A]/10" :
                  "text-[var(--system-blue)] bg-[var(--system-blue)]/10"
            )}>
              {activeScenario === 'aggressive' ? 'Bull' : activeScenario === 'conservative' ? 'Bear' : 'Base'} Case
            </span>
          </div>
        </div>
      </motion.div>
    </aside>
  );
}
