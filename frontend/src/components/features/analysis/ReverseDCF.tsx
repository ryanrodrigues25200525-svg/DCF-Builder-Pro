"use client";

import { useMemo, useState } from "react";
import { Assumptions, HistoricalData, Overrides } from "@/core/types";
import { calculateDCF } from "@/services/dcf/engine";
import {
  applyReverseDCFValue,
  buildReverseDCFResults,
  normalizeAssumptionsForReverse,
  ReverseDCFKey,
  reverseAxisDefs,
} from "@/services/dcf/reverse-dcf";
import {
  formatDisplayCompactCurrency,
  formatDisplayPercent,
  formatDisplayShareValue,
} from "@/core/utils/financial-format";
import { cn } from "@/core/utils/cn";

interface ReverseDCFProps {
  historicals: HistoricalData;
  assumptions: Assumptions;
  overrides: Overrides;
  isDarkMode?: boolean;
}

type ReverseWorksheetRow = {
  year: number;
  revenue: number;
  ebit: number;
  nopat: number;
  depreciation: number;
  capex: number;
  nwcChange: number;
  fcff: number;
  discountExponent: number;
  pvFcff: number;
};

type ReverseBridge = {
  stageOnePv: number;
  pvTerminalValue: number;
  enterpriseValue: number;
  netDebt: number;
  equityValue: number;
  shareCount: number;
  impliedSharePrice: number;
};

type ReverseControlCard =
  | {
      label: string;
      readOnly: true;
      value: string;
      helperText?: string;
    }
  | {
      label: string;
      readOnly?: false;
      value: number;
      suffix: string;
      onChange: (value: number) => void;
      stringInput?: false;
      disabled?: boolean;
      helperText?: string;
    }
  | {
      label: string;
      readOnly?: false;
      value: string;
      suffix: string;
      stringInput: true;
      onChange: (value: string) => void;
      disabled?: boolean;
      helperText?: string;
    };

const solveOptions: Array<{ key: ReverseDCFKey; label: string }> = [
  { key: "revenueGrowth", label: "5Y Revenue CAGR" },
  { key: "ebitMargin", label: "EBIT Margin" },
  { key: "terminalGrowthRate", label: "Terminal Growth" },
  { key: "wacc", label: "WACC" },
  { key: "terminalExitMultiple", label: "Exit Multiple" },
];

const solveOptionColorMap: Record<
  ReverseDCFKey,
  {
    active: string;
    activeBorder: string;
    activeText: string;
    activeLabel: string;
    inactiveTint: string;
    inactiveBorder: string;
  }
> = {
  revenueGrowth: {
    active: "bg-[linear-gradient(135deg,#60a5fa,#2563eb)]",
    activeBorder: "border-[#2563eb]",
    activeText: "text-white",
    activeLabel: "text-white/72",
    inactiveTint: "bg-[linear-gradient(135deg,#93c5fd,#3b82f6)]",
    inactiveBorder: "border-[#60a5fa]",
  },
  ebitMargin: {
    active: "bg-[linear-gradient(135deg,#34d399,#16a34a)]",
    activeBorder: "border-[#16a34a]",
    activeText: "text-white",
    activeLabel: "text-white/72",
    inactiveTint: "bg-[linear-gradient(135deg,#6ee7b7,#22c55e)]",
    inactiveBorder: "border-[#4ade80]",
  },
  terminalGrowthRate: {
    active: "bg-[linear-gradient(135deg,#fb923c,#f59e0b)]",
    activeBorder: "border-[#f59e0b]",
    activeText: "text-white",
    activeLabel: "text-white/72",
    inactiveTint: "bg-[linear-gradient(135deg,#fdba74,#f97316)]",
    inactiveBorder: "border-[#fb923c]",
  },
  wacc: {
    active: "bg-[linear-gradient(135deg,#a78bfa,#7c3aed)]",
    activeBorder: "border-[#7c3aed]",
    activeText: "text-white",
    activeLabel: "text-white/72",
    inactiveTint: "bg-[linear-gradient(135deg,#c4b5fd,#8b5cf6)]",
    inactiveBorder: "border-[#a78bfa]",
  },
  terminalExitMultiple: {
    active: "bg-[linear-gradient(135deg,#f472b6,#db2777)]",
    activeBorder: "border-[#db2777]",
    activeText: "text-white",
    activeLabel: "text-white/72",
    inactiveTint: "bg-[linear-gradient(135deg,#f9a8d4,#ec4899)]",
    inactiveBorder: "border-[#f472b6]",
  },
};

const solvedAssumptionKeyMap: Partial<Record<ReverseDCFKey, keyof Assumptions>> = {
  ebitMargin: "ebitMargin",
  terminalGrowthRate: "terminalGrowthRate",
  wacc: "wacc",
  terminalExitMultiple: "terminalExitMultiple",
};

function formatSolveValue(key: ReverseDCFKey, value: number) {
  if (key === "terminalExitMultiple") return `${value.toFixed(1)}x`;
  return formatDisplayPercent(value);
}

function formatEditableValue(value: number) {
  if (!Number.isFinite(value)) return "";
  return Number(value.toFixed(1)).toString();
}

function getAssumptionNote(label: string, readOnly: boolean) {
  if (readOnly) {
    if (label === "Solving For") return "Current goal-seek target selected above.";
    return "Calculated by the reverse DCF engine.";
  }

  switch (label) {
    case "EBIT Margin":
      return "Operating profitability assumption used in stage 1.";
    case "Tax Rate":
      return "Effective tax rate applied to convert EBIT into NOPAT.";
    case "WACC":
      return "Discount rate used to present-value forecast cash flows.";
    case "Terminal Growth":
      return "Perpetual growth rate used in the Gordon Growth terminal value.";
    case "Exit Multiple":
      return "Terminal multiple applied when exit multiple mode is selected.";
    case "Base Revenue":
      return "Revenue anchor used to start the reverse DCF forecast.";
    default:
      return "Editable on this page only.";
  }
}

function midpointDiscountExponent(index: number) {
  return index + 0.5;
}

function buildWorksheetRows(
  impliedResults: ReturnType<typeof calculateDCF> | null,
  impliedAssumptions: Assumptions | null,
): ReverseWorksheetRow[] {
  if (!impliedResults || !impliedAssumptions) return [];
  return impliedResults.forecasts.slice(0, 5).map((forecast, index) => ({
    year: forecast.year,
    revenue: forecast.revenue,
    ebit: forecast.ebit,
    nopat: forecast.ebit * (1 - impliedAssumptions.taxRate),
    depreciation: forecast.depreciation,
    capex: forecast.capex,
    nwcChange: forecast.nwcChange,
    fcff: forecast.fcff,
    discountExponent: midpointDiscountExponent(index),
    pvFcff: forecast.pvFcff,
  }));
}

function buildReverseBridge(
  historicals: HistoricalData,
  impliedResults: ReturnType<typeof calculateDCF> | null,
  stageOnePv: number,
): ReverseBridge | null {
  if (!impliedResults) return null;
  const currentCash = historicals.cash[historicals.cash.length - 1] || 0;
  const currentMarketableSecurities = historicals.marketableSecurities?.[historicals.marketableSecurities.length - 1] || 0;
  const currentDebt = historicals.totalDebt[historicals.totalDebt.length - 1] || 0;
  return {
    stageOnePv,
    pvTerminalValue: impliedResults.pvTerminalValue,
    enterpriseValue: impliedResults.enterpriseValue,
    netDebt: currentDebt - currentCash - currentMarketableSecurities,
    equityValue: impliedResults.equityValue,
    shareCount: impliedResults.shareCount,
    impliedSharePrice: impliedResults.impliedSharePrice,
  };
}

function getSelectedResultDescription(selectedKey: ReverseDCFKey) {
  switch (selectedKey) {
    case "revenueGrowth":
      return "Revenue growth required over the next five years to justify the current target price.";
    case "ebitMargin":
      return "EBIT margin the company would need to sustain for the market price to make sense.";
    case "terminalGrowthRate":
      return "Perpetual growth the terminal value must assume to support today’s price.";
    case "wacc":
      return "Discount rate the market is implicitly underwriting in this reverse DCF.";
    case "terminalExitMultiple":
      return "Exit multiple implied by the current price when using the terminal multiple method.";
    default:
      return "";
  }
}

export function ReverseDCF({
  historicals,
  assumptions,
  overrides,
  isDarkMode = false,
}: ReverseDCFProps) {
  const [selectedKey, setSelectedKey] = useState<ReverseDCFKey>("revenueGrowth");
  const [targetPriceInput, setTargetPriceInput] = useState(() => (historicals.price || 0).toFixed(2));
  const [localAssumptions, setLocalAssumptions] = useState<Partial<Assumptions>>({});
  const [baseRevenueInput, setBaseRevenueInput] = useState(() =>
    ((historicals.revenue[historicals.revenue.length - 1] || 0) / 1_000_000_000).toFixed(1)
  );

  const targetPrice = useMemo(() => {
    const parsed = Number(targetPriceInput);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [targetPriceInput]);

  const baseRevenueOverride = useMemo(() => {
    const parsed = Number(baseRevenueInput);
    return Number.isFinite(parsed) && parsed > 0 ? parsed * 1_000_000_000 : null;
  }, [baseRevenueInput]);

  const pageAssumptions = useMemo(
    () => ({
      ...assumptions,
      ...localAssumptions,
    }),
    [assumptions, localAssumptions]
  );

  const normalizedBaseAssumptions = useMemo(
    () => normalizeAssumptionsForReverse(pageAssumptions),
    [pageAssumptions]
  );

  const reverseHistoricals = useMemo(
    () => ({
      ...historicals,
      price: targetPrice || historicals.price,
      revenue:
        baseRevenueOverride && historicals.revenue.length > 0
          ? [...historicals.revenue.slice(0, -1), baseRevenueOverride]
          : historicals.revenue,
    }),
    [historicals, targetPrice, baseRevenueOverride]
  );

  const reverseResults = useMemo(
    () => buildReverseDCFResults(reverseHistoricals, normalizedBaseAssumptions, overrides),
    [reverseHistoricals, normalizedBaseAssumptions, overrides]
  );

  const selectedReverse = useMemo(
    () => reverseResults.find((item) => item.key === selectedKey) ?? reverseResults[0],
    [reverseResults, selectedKey]
  );

  const impliedAssumptions = useMemo(() => {
    if (selectedReverse?.impliedValue === null || selectedReverse?.impliedValue === undefined) return null;
    return applyReverseDCFValue(normalizedBaseAssumptions, selectedReverse.key, selectedReverse.impliedValue);
  }, [normalizedBaseAssumptions, selectedReverse]);

  const impliedResults = useMemo(() => {
    if (!impliedAssumptions) return null;
    return calculateDCF(reverseHistoricals, impliedAssumptions, overrides);
  }, [reverseHistoricals, impliedAssumptions, overrides]);

  const worksheetRows = useMemo(
    () => buildWorksheetRows(impliedResults, impliedAssumptions),
    [impliedResults, impliedAssumptions]
  );

  const stageOnePv = useMemo(
    () => worksheetRows.reduce((sum, row) => sum + row.pvFcff, 0),
    [worksheetRows]
  );

  const bridge = useMemo(
    () => buildReverseBridge(historicals, impliedResults, stageOnePv),
    [historicals, impliedResults, stageOnePv]
  );

  const selectedLabel =
    solveOptions.find((option) => option.key === selectedKey)?.label || reverseAxisDefs[selectedKey].label;

  const selectedResultValue =
    selectedReverse?.impliedValue != null
      ? formatSolveValue(selectedReverse.key, selectedReverse.impliedValue)
      : selectedReverse?.key === "terminalExitMultiple"
        ? "N/A — Gordon Growth used"
        : "N/A";

  const selectedResultDescription = useMemo(() => getSelectedResultDescription(selectedKey), [selectedKey]);

  const solvedAssumptionKey = solvedAssumptionKeyMap[selectedKey];
  const setLocalAssumptionValue = <K extends keyof Assumptions>(key: K, value: Assumptions[K]) => {
    setLocalAssumptions((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const reverseControlCards = useMemo<ReverseControlCard[]>(() => [
    {
      label: "Solving For",
      value: selectedLabel,
      readOnly: true,
      helperText: "Chosen from goal seek above",
    },
    {
      label: "EBIT Margin",
      value: (localAssumptions.ebitMargin ?? pageAssumptions.ebitMargin) * 100,
      suffix: "%",
      onChange: (value: number) => setLocalAssumptionValue("ebitMargin", value / 100),
      disabled: solvedAssumptionKey === "ebitMargin",
      helperText: solvedAssumptionKey === "ebitMargin" ? "Solved above" : undefined,
    },
    {
      label: "Tax Rate",
      value: (localAssumptions.taxRate ?? pageAssumptions.taxRate) * 100,
      suffix: "%",
      onChange: (value: number) => setLocalAssumptionValue("taxRate", value / 100),
    },
    {
      label: "WACC",
      value: (localAssumptions.wacc ?? pageAssumptions.wacc) * 100,
      suffix: "%",
      onChange: (value: number) => setLocalAssumptionValue("wacc", value / 100),
      disabled: solvedAssumptionKey === "wacc",
      helperText: solvedAssumptionKey === "wacc" ? "Solved above" : undefined,
    },
    normalizedBaseAssumptions.valuationMethod === "growth"
      ? {
          label: "Terminal Growth",
          value: (localAssumptions.terminalGrowthRate ?? pageAssumptions.terminalGrowthRate) * 100,
          suffix: "%",
          onChange: (value: number) => setLocalAssumptionValue("terminalGrowthRate", value / 100),
          disabled: solvedAssumptionKey === "terminalGrowthRate",
          helperText: solvedAssumptionKey === "terminalGrowthRate" ? "Solved above" : undefined,
        }
      : {
          label: "Exit Multiple",
          value: localAssumptions.terminalExitMultiple ?? pageAssumptions.terminalExitMultiple,
          suffix: "x",
          onChange: (value: number) => setLocalAssumptionValue("terminalExitMultiple", value),
          disabled: solvedAssumptionKey === "terminalExitMultiple",
          helperText: solvedAssumptionKey === "terminalExitMultiple" ? "Solved above" : undefined,
        },
    {
      label: "Base Revenue",
      value: baseRevenueInput,
      suffix: "B",
      stringInput: true,
      onChange: (value: string) => setBaseRevenueInput(value),
      helperText: "Start revenue",
    },
  ], [baseRevenueInput, localAssumptions, normalizedBaseAssumptions.valuationMethod, pageAssumptions, selectedLabel, solvedAssumptionKey]);

  return (
    <div
      data-local-theme={isDarkMode ? "dark" : "light"}
      className={cn(
        "min-h-full px-6 py-6",
        isDarkMode ? "bg-[#020814]" : "bg-[#edf2f8]"
      )}
    >
      <div className="mx-auto max-w-[1280px] 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_340px] 2xl:items-start 2xl:gap-6">
        <div className="min-w-0 space-y-8">
          <section>
            <div
              className={cn(
                "rounded-[32px] border px-7 py-7 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:px-8 sm:py-8",
                isDarkMode
                  ? "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]"
                  : "border-[rgba(76,140,255,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(244,248,255,0.94))]"
              )}
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className={cn("text-[40px] font-black tracking-[-0.02em]", isDarkMode ? "text-white" : "text-slate-900")}>
                    Reverse DCF
                  </h2>
                  <p className={cn("mt-2 text-[12px] font-semibold uppercase tracking-[0.14em]", isDarkMode ? "text-white/60" : "text-slate-600")}>
                    Goal Seek + Market-Implied Assumptions
                  </p>
                  <p className={cn("mt-3 text-[13px] font-semibold", isDarkMode ? "text-indigo-200/85" : "text-indigo-800")}>
                    Choose the variable you want the model to solve for. Each option shows the market-implied answer.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:inline-flex lg:shrink-0 lg:flex-nowrap lg:whitespace-nowrap">
                  <button
                    onClick={() => setLocalAssumptionValue("valuationMethod", "growth")}
                    className={cn(
                      "shrink-0 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em]",
                      normalizedBaseAssumptions.valuationMethod === "growth"
                        ? isDarkMode
                          ? "border border-[#7db2ff] bg-[#0f172a] text-white"
                          : "border border-[#2563eb] bg-[#eef5ff] text-[#0f172a] shadow-[0_10px_24px_rgba(76,140,255,0.12)]"
                        : isDarkMode
                          ? "border border-white/12 bg-white/[0.03] text-white/70"
                          : "border border-[rgba(15,23,42,0.10)] bg-white text-[#526071]"
                    )}
                  >
                    Gordon Growth
                  </button>
                  <button
                    onClick={() => setLocalAssumptionValue("valuationMethod", "multiple")}
                    className={cn(
                      "shrink-0 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em]",
                      normalizedBaseAssumptions.valuationMethod === "multiple"
                        ? isDarkMode
                          ? "border border-[#7db2ff] bg-[#0f172a] text-white"
                          : "border border-[#2563eb] bg-[#eef5ff] text-[#0f172a] shadow-[0_10px_24px_rgba(76,140,255,0.12)]"
                        : isDarkMode
                          ? "border border-white/12 bg-white/[0.03] text-white/70"
                          : "border border-[rgba(15,23,42,0.10)] bg-white text-[#526071]"
                    )}
                  >
                    Exit Multiple
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {solveOptions.map((option) => {
                  const active = selectedKey === option.key;
                  const colorTheme = solveOptionColorMap[option.key];
                  const selectorLabel =
                    option.key === "revenueGrowth"
                      ? "5Y Rev\nCAGR"
                      : option.key === "ebitMargin"
                        ? "EBIT\nMargin"
                        : option.key === "terminalGrowthRate"
                          ? "Terminal\nG"
                          : option.label;
                  return (
                    <button
                      key={`${option.key}-selector`}
                      onClick={() => setSelectedKey(option.key)}
                      className={cn(
                        "flex h-[88px] w-full min-w-0 flex-col items-start justify-between rounded-[18px] border px-4 py-3 text-left transition-all",
                        active
                          ? isDarkMode
                            ? "border-[#7db2ff] bg-[#0f172a] text-white shadow-[0_12px_28px_rgba(15,23,42,0.35)]"
                            : `${colorTheme.activeBorder} ${colorTheme.active} ${colorTheme.activeText} shadow-[0_18px_32px_rgba(15,23,42,0.14)]`
                          : isDarkMode
                            ? "border-white/12 bg-white/[0.02] text-white/90"
                            : `${colorTheme.inactiveBorder} ${colorTheme.inactiveTint} text-white shadow-[0_16px_28px_rgba(15,23,42,0.1)]`
                      )}
                    >
                      <span className={cn("whitespace-pre-line text-[12px] font-black uppercase leading-[1.1] tracking-[0.14em]", active ? colorTheme.activeLabel : isDarkMode ? "text-white/55" : "text-white/72")}>
                        {selectorLabel}
                      </span>
                      <span className="text-[24px] font-black tracking-tight">
                        {(() => {
                          const result = reverseResults.find((item) => item.key === option.key);
                          return result?.impliedValue != null
                            ? formatSolveValue(option.key, result.impliedValue)
                            : option.key === "terminalExitMultiple"
                              ? "N/A"
                              : "N/A";
                        })()}
                      </span>
                    </button>
                  );
                })}
              </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.7fr)_minmax(220px,0.8fr)]">
                  <div
                    className={cn(
                      "rounded-[22px] border px-5 py-5",
                      isDarkMode
                        ? "border-[#7db2ff] bg-[#d9ebff] text-[#0f172a]"
                        : "border-[#8fc0ff] bg-[linear-gradient(180deg,#edf5ff,#e4f0ff)] text-[#0f172a] shadow-[0_18px_34px_rgba(76,140,255,0.14)]"
                    )}
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#526071]">
                      Selected Variable
                    </p>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[28px] font-black tracking-tight">{selectedResultValue}</p>
                        <p className="mt-2 text-[13px] font-medium text-[#5b6472]">solved variable</p>
                      </div>
                      <p className="max-w-[240px] text-left text-[13px] leading-5 text-[#526071] sm:text-right">
                        {selectedLabel}
                      </p>
                    </div>
                    <p className="mt-4 max-w-[580px] text-[14px] leading-6 text-[#526071]">
                      {selectedResultDescription}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "rounded-[20px] border px-5 py-5",
                      isDarkMode
                        ? "border-white/12 bg-white/[0.03] text-white"
                        : "border-[rgba(15,23,42,0.08)] bg-white/96 text-[#0b0f18] shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
                    )}
                  >
                    <p className={cn("text-[11px] font-black uppercase tracking-[0.14em]", isDarkMode ? "text-white/50" : "text-[#7b818d]")}>
                      Valuation Method
                    </p>
                    <p className="mt-4 text-[22px] font-black tracking-tight">
                      {normalizedBaseAssumptions.valuationMethod === "multiple" ? "Exit Multiple" : "Gordon Growth"}
                    </p>
                    <p className={cn("mt-2 text-[13px] leading-5", isDarkMode ? "text-white/60" : "text-[#5b6472]")}>
                      Terminal value framework currently applied in this reverse DCF.
                    </p>
                  </div>

                  <div
                    className={cn(
                      "rounded-[20px] border px-5 py-5",
                      isDarkMode
                        ? "border-white/12 bg-white/[0.03] text-white"
                        : "border-[rgba(15,23,42,0.08)] bg-white/96 text-[#0b0f18] shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
                    )}
                  >
                    <p className={cn("text-[11px] font-black uppercase tracking-[0.14em]", isDarkMode ? "text-white/50" : "text-[#7b818d]")}>
                      Current Setup
                    </p>
                    <div className="mt-4 space-y-3 text-[14px]">
                      <div className="flex items-center justify-between gap-3">
                        <span className={isDarkMode ? "text-white/65" : "text-[#5b6472]"}>Target price</span>
                        <span className="font-black tabular-nums">{formatDisplayShareValue(targetPrice || historicals.price)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className={isDarkMode ? "text-white/65" : "text-[#5b6472]"}>Base revenue</span>
                        <span className="font-black tabular-nums">{baseRevenueInput}B</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className={isDarkMode ? "text-white/65" : "text-[#5b6472]"}>Status</span>
                        <span className="font-black">{selectedReverse?.status === "solved" ? "Solved" : "Unavailable"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div
              className={cn(
                "rounded-[28px] border px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:px-6 sm:py-6",
                isDarkMode
                  ? "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]"
                  : "border-[rgba(132,204,22,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(247,252,240,0.94))]"
              )}
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className={cn("text-[40px] font-black tracking-[-0.02em]", isDarkMode ? "text-white" : "text-slate-900")}>
                    Operating Assumptions
                  </h2>
                  <p className={cn("mt-2 text-[12px] font-semibold uppercase tracking-[0.14em]", isDarkMode ? "text-white/60" : "text-slate-600")}>
                    Reverse DCF + Page-Only Inputs
                  </p>
                  <p className={cn("mt-3 text-[13px] font-semibold", isDarkMode ? "text-emerald-200/85" : "text-emerald-800")}>
                    Changes here affect Reverse DCF only and do not alter the base model.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap items-center gap-2 lg:inline-flex lg:flex-nowrap lg:whitespace-nowrap">
                    <button
                      onClick={() => setLocalAssumptionValue("valuationMethod", "growth")}
                      className={cn(
                        "shrink-0 rounded-full border px-4 py-2 text-[12px] font-black uppercase tracking-[0.14em]",
                        normalizedBaseAssumptions.valuationMethod === "growth"
                          ? isDarkMode
                            ? "border-[#7db2ff] bg-[#0f172a] text-white"
                            : "border-[#2563eb] bg-[#eef5ff] text-[#0f172a] shadow-[0_10px_24px_rgba(76,140,255,0.12)]"
                          : isDarkMode
                            ? "border-white/12 bg-white/[0.03] text-white/70"
                            : "border-[rgba(15,23,42,0.10)] bg-white text-[#526071]"
                      )}
                    >
                      Gordon Growth
                    </button>
                    <button
                      onClick={() => setLocalAssumptionValue("valuationMethod", "multiple")}
                      className={cn(
                        "shrink-0 rounded-full border px-4 py-2 text-[12px] font-black uppercase tracking-[0.14em]",
                        normalizedBaseAssumptions.valuationMethod === "multiple"
                          ? isDarkMode
                            ? "border-[#7db2ff] bg-[#0f172a] text-white"
                            : "border-[#2563eb] bg-[#eef5ff] text-[#0f172a] shadow-[0_10px_24px_rgba(76,140,255,0.12)]"
                          : isDarkMode
                            ? "border-white/12 bg-white/[0.03] text-white/70"
                            : "border-[rgba(15,23,42,0.10)] bg-white text-[#526071]"
                      )}
                    >
                      Exit Multiple
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setLocalAssumptions({});
                      setBaseRevenueInput(((historicals.revenue[historicals.revenue.length - 1] || 0) / 1_000_000_000).toFixed(1));
                      setTargetPriceInput((historicals.price || 0).toFixed(2));
                    }}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2 text-[12px] font-black uppercase tracking-[0.14em]",
                      isDarkMode
                        ? "border-white/12 bg-white/[0.03] text-white/70"
                        : "border-[rgba(15,23,42,0.10)] bg-white text-[#526071]"
                    )}
                  >
                    Reset Local
                  </button>
                </div>
              </div>
            {selectedReverse?.status === "solved" && impliedAssumptions ? (
              <div className="mt-5">
                <div
                  className={cn(
                    "overflow-hidden rounded-[18px] border",
                    isDarkMode ? "border-white/12 bg-white/[0.03]" : "border-[rgba(15,23,42,0.10)] bg-white"
                  )}
                >
                  <div className="overflow-x-auto">
                  <table className="min-w-[760px] w-full table-fixed">
                    <colgroup>
                      <col className="w-[28%]" />
                      <col className="w-[28%]" />
                      <col className="w-[12%]" />
                      <col />
                    </colgroup>
                    <thead>
                      <tr className={cn(isDarkMode ? "bg-white/[0.02]" : "bg-[#f8fafc]")}>
                        {["Assumption", "Value", "Unit", "Notes"].map((header, index) => (
                          <th
                            key={header}
                            className={cn(
                              "px-4 py-4 text-[11px] font-black uppercase tracking-[0.16em]",
                              index === 0 ? "text-left" : index < 3 ? "text-right" : "text-left",
                              isDarkMode ? "text-white/50" : "text-[#7b818d]"
                            )}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reverseControlCards.map((item) => (
                        <tr
                          key={item.label}
                          className={cn("border-t", isDarkMode ? "border-white/10" : "border-[rgba(15,23,42,0.08)]")}
                        >
                          <td className={cn("px-4 py-4 text-[14px] font-black", isDarkMode ? "text-white" : "text-[#0b0f18]")}>
                            {item.label}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {item.readOnly ? (
                              <span className={cn("text-[20px] font-black tracking-tight", isDarkMode ? "text-white" : "text-[#0b0f18]")}>
                                {item.value}
                              </span>
                            ) : item.stringInput ? (
                              <div
                                className={cn(
                                  "ml-auto inline-flex min-w-[112px] items-center justify-end rounded-[12px] border px-3 py-2",
                                  item.disabled
                                    ? isDarkMode
                                      ? "border-white/10 bg-white/[0.03]"
                                      : "border-[rgba(15,23,42,0.08)] bg-[#f8fafc]"
                                    : isDarkMode
                                      ? "border-white/12 bg-white/[0.04] focus-within:border-sky-300/50"
                                      : "border-[rgba(76,140,255,0.2)] bg-[#f8fbff] focus-within:border-[#8fc0ff] focus-within:bg-white"
                                )}
                              >
                                <input
                                  value={String(item.value)}
                                  onChange={(e) => item.onChange?.(e.target.value)}
                                  disabled={item.disabled}
                                  className={cn(
                                    "w-full border-0 bg-transparent p-0 text-right text-[20px] font-black tracking-tight outline-none",
                                    item.disabled && "cursor-not-allowed opacity-50",
                                    isDarkMode ? "text-white" : "text-[#0b0f18]"
                                  )}
                                />
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  "ml-auto inline-flex min-w-[112px] items-center justify-end rounded-[12px] border px-3 py-2",
                                  item.disabled
                                    ? isDarkMode
                                      ? "border-white/10 bg-white/[0.03]"
                                      : "border-[rgba(15,23,42,0.08)] bg-[#f8fafc]"
                                    : isDarkMode
                                      ? "border-white/12 bg-white/[0.04] focus-within:border-sky-300/50"
                                      : "border-[rgba(76,140,255,0.2)] bg-[#f8fbff] focus-within:border-[#8fc0ff] focus-within:bg-white"
                                )}
                              >
                                <input
                                  type="number"
                                  step="0.1"
                                  value={formatEditableValue(Number(item.value))}
                                  onChange={(e) => item.onChange?.(Number(e.target.value))}
                                  disabled={item.disabled}
                                  className={cn(
                                    "w-full appearance-none border-0 bg-transparent p-0 text-right text-[20px] font-black tracking-tight outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                                    item.disabled && "cursor-not-allowed opacity-50",
                                    isDarkMode ? "text-white" : "text-[#0b0f18]"
                                  )}
                                />
                              </div>
                            )}
                          </td>
                          <td className={cn("px-4 py-4 text-right text-[14px] font-bold", isDarkMode ? "text-white/55" : "text-[#7b818d]")}>
                            {item.readOnly ? " " : item.suffix}
                          </td>
                          <td className={cn("px-4 py-4 text-[13px] leading-5", isDarkMode ? "text-white/55" : "text-[#6b7280]")}>
                            {item.helperText || getAssumptionNote(item.label, !!item.readOnly)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>
            ) : (
              <p className={cn("mt-5 text-[14px]", isDarkMode ? "text-white/70" : "text-[#5b6472]")}>
                No valid implied scenario was found for the selected variable inside the current model bounds.
              </p>
            )}
            </div>
          </section>

          <section>
            <div
              className={cn(
                "rounded-[28px] border px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:px-6 sm:py-6",
                isDarkMode
                  ? "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]"
                  : "border-[rgba(245,158,11,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,251,235,0.94))]"
              )}
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-[760px]">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
                      isDarkMode
                        ? "border-white/12 bg-white/[0.04] text-white/70"
                        : "border-[rgba(245,158,11,0.16)] bg-[rgba(255,251,235,0.92)] text-[#a65a00]"
                    )}
                  >
                    Forecast Engine
                  </span>
                  <h2 className={cn("mt-4 text-[34px] font-black tracking-[-0.03em] sm:text-[38px]", isDarkMode ? "text-white" : "text-slate-900")}>
                    Stage 1 FCFF Projection
                  </h2>
                  <p className={cn("mt-2 text-[12px] font-semibold uppercase tracking-[0.14em]", isDarkMode ? "text-white/60" : "text-slate-600")}>
                    Revenue + EBIT + Reinvestment + Free Cash Flow
                  </p>
                  <p className={cn("mt-4 max-w-[680px] text-[14px] leading-7 font-semibold", isDarkMode ? "text-amber-200/85" : "text-amber-800")}>
                    Five-year forecast using the current reverse DCF setup and implied operating assumptions.
                  </p>
                </div>
                <div
                  className={cn(
                    "relative w-full max-w-[500px] overflow-hidden rounded-[22px] border px-4 py-4 xl:ml-6",
                    isDarkMode
                      ? "border-white/12 bg-white/[0.03] text-white"
                      : "border-[rgba(245,158,11,0.16)] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(255,247,235,0.98))] text-[#0b0f18] shadow-[0_16px_32px_rgba(15,23,42,0.06)]"
                  )}
                >
                  {!isDarkMode && (
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[4px] bg-[linear-gradient(90deg,#f59e0b_0%,#fbbf24_45%,rgba(251,191,36,0.15)_100%)]" />
                  )}
                  <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-stretch 2xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-[11px] font-black uppercase tracking-[0.16em]", isDarkMode ? "text-white/50" : "text-[#7b818d]")}>
                        Stage 1 Present Value
                      </p>
                      <p className="mt-2 text-[30px] font-black tabular-nums tracking-[-0.03em] sm:text-[36px]">
                        ${formatDisplayCompactCurrency(stageOnePv)}
                      </p>
                      <p className={cn("mt-2 max-w-[280px] text-[12px] leading-5", isDarkMode ? "text-white/58" : "text-[#6b7280]")}>
                        Discounted sum of projected free cash flow across the five-year forecast horizon.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:min-w-[250px]">
                      <div
                        className={cn(
                          "rounded-[16px] border px-3 py-3",
                          isDarkMode
                            ? "border-white/10 bg-white/[0.04]"
                            : "border-[rgba(245,158,11,0.14)] bg-white/88 shadow-[0_10px_20px_rgba(15,23,42,0.04)]"
                        )}
                      >
                        <p className={cn("text-[10px] font-black uppercase tracking-[0.16em]", isDarkMode ? "text-white/45" : "text-[#7b818d]")}>
                          Years
                        </p>
                        <p className={cn("mt-2 text-[20px] font-black tabular-nums", isDarkMode ? "text-white" : "text-[#0b0f18]")}>5</p>
                        <p className={cn("mt-1 text-[11px]", isDarkMode ? "text-white/40" : "text-[#8b93a1]")}>Forecast rows</p>
                      </div>
                      <div
                        className={cn(
                          "rounded-[16px] border px-3 py-3",
                          isDarkMode
                            ? "border-white/10 bg-white/[0.04]"
                            : "border-[rgba(245,158,11,0.14)] bg-white/88 shadow-[0_10px_20px_rgba(15,23,42,0.04)]"
                        )}
                      >
                        <p className={cn("text-[10px] font-black uppercase tracking-[0.16em]", isDarkMode ? "text-white/45" : "text-[#7b818d]")}>
                          Discounting
                        </p>
                        <p className={cn("mt-2 text-[20px] font-black tracking-[-0.03em]", isDarkMode ? "text-white" : "text-[#0b0f18]")}>Mid-Year</p>
                        <p className={cn("mt-1 text-[11px]", isDarkMode ? "text-white/40" : "text-[#8b93a1]")}>DCF convention</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={cn(
                "mt-6 overflow-hidden rounded-[22px] border",
                isDarkMode ? "border-white/12 bg-white/[0.03]" : "border-[rgba(15,23,42,0.10)] bg-white"
              )}>
                <div className="overflow-x-auto">
                <table className="min-w-[860px] w-full table-fixed">
                  <colgroup>
                    <col className="w-[92px]" />
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                  </colgroup>
                  <thead>
                    <tr className={cn(isDarkMode ? "bg-white/[0.02]" : "bg-[#f8fafc]")}>
                      {["Year", "Revenue", "EBIT", "NOPAT", "D&A", "Capex", "Δ NWC", "FCFF"].map((header) => (
                        <th
                          key={header}
                          className={cn(
                            "px-4 py-4 text-[11px] font-black uppercase tracking-[0.16em]",
                            header === "Year" ? "text-left" : "text-right",
                            isDarkMode ? "text-white/50" : "text-[#7b818d]"
                          )}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {worksheetRows.map((row) => (
                      <tr key={row.year} className={cn("border-t", isDarkMode ? "border-white/10" : "border-[rgba(15,23,42,0.08)]")}>
                        <td className={cn("px-4 py-[15px] text-left text-[14px] font-black", isDarkMode ? "text-white" : "text-[#0b0f18]")}>{row.year}</td>
                        <td className={cn("px-4 py-[15px] text-right text-[14px] font-semibold tabular-nums", isDarkMode ? "text-white/88" : "text-[#111827]")}>${formatDisplayCompactCurrency(row.revenue)}</td>
                        <td className={cn("px-4 py-[15px] text-right text-[14px] font-semibold tabular-nums", isDarkMode ? "text-white/88" : "text-[#111827]")}>${formatDisplayCompactCurrency(row.ebit)}</td>
                        <td className={cn("px-4 py-[15px] text-right text-[14px] font-semibold tabular-nums", isDarkMode ? "text-white/88" : "text-[#111827]")}>${formatDisplayCompactCurrency(row.nopat)}</td>
                        <td className={cn("px-4 py-[15px] text-right text-[14px] font-semibold tabular-nums", isDarkMode ? "text-white/88" : "text-[#111827]")}>${formatDisplayCompactCurrency(row.depreciation)}</td>
                        <td className={cn("px-4 py-[15px] text-right text-[14px] font-semibold tabular-nums", isDarkMode ? "text-white/88" : "text-[#111827]")}>${formatDisplayCompactCurrency(row.capex)}</td>
                        <td className={cn("px-4 py-[15px] text-right text-[14px] font-semibold tabular-nums", row.nwcChange < 0 ? "text-[#f87171]" : isDarkMode ? "text-white/88" : "text-[#111827]")}>${formatDisplayCompactCurrency(row.nwcChange)}</td>
                        <td className={cn("px-4 py-[15px] text-right text-[14px] font-black tabular-nums", isDarkMode ? "text-white" : "text-[#0b0f18]")}>${formatDisplayCompactCurrency(row.fcff)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <div className={cn(
                  "flex flex-col gap-4 border-t px-4 py-4 lg:flex-row lg:items-center lg:justify-between",
                  isDarkMode ? "border-white/10 text-white" : "border-[rgba(15,23,42,0.08)] text-[#0b0f18]"
                )}>
                  <div className="flex flex-col gap-1">
                    <span className={cn("text-[13px] font-semibold", isDarkMode ? "text-white/72" : "text-[#4b5565]")}>
                      Stage 1 present value flows directly into the valuation bridge.
                    </span>
                    <p className={cn("text-[12px]", isDarkMode ? "text-white/50" : "text-[#7b818d]")}>
                      Five projected years, discounted using the current reverse DCF setup.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em]",
                        isDarkMode
                          ? "border-white/12 bg-white/[0.04] text-white/78"
                          : "border-[rgba(245,158,11,0.18)] bg-[rgba(255,251,235,0.95)] text-[#9a5b00]"
                      )}
                    >
                      Included Above
                    </span>
                    <span className={cn("text-[20px] font-black tabular-nums tracking-tight", isDarkMode ? "text-white" : "text-[#0b0f18]")}>
                      ${formatDisplayCompactCurrency(stageOnePv)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="mt-8 self-start 2xl:mt-0">
          <div
            className={cn(
              "overflow-hidden rounded-[28px] border shadow-[0_18px_40px_rgba(15,23,42,0.06)]",
              isDarkMode
                ? "border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]"
                : "border-[rgba(76,140,255,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,246,255,0.9))]"
            )}
          >
            {!isDarkMode && (
              <div className="h-[4px] bg-[linear-gradient(90deg,#3b82f6_0%,#60a5fa_45%,rgba(96,165,250,0.12)_100%)]" />
            )}

            <div className="px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex flex-col gap-3.5">
                <div>
                  <p className={cn("text-[18px] font-black uppercase tracking-[0.2em]", isDarkMode ? "text-white/50" : "text-[#7b818d]")}>
                    Target Price
                  </p>
                  <p className={cn("mt-2 text-[12px] font-semibold uppercase tracking-[0.14em]", isDarkMode ? "text-white/55" : "text-[#5a6a82]")}>
                    Valuation Bridge + Implied Equity Output
                  </p>
                </div>

                <div
                  className={cn(
                    "rounded-[20px] border px-3.5 py-3.5",
                    isDarkMode
                      ? "border-white/10 bg-white/[0.03]"
                      : "border-[rgba(76,140,255,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.88))]"
                  )}
                >
                  <p className={cn("text-[11px] font-black uppercase tracking-[0.15em]", isDarkMode ? "text-white/45" : "text-[#7b818d]")}>
                    Set Cell
                  </p>
                  <input
                    value={targetPriceInput}
                    onChange={(e) => setTargetPriceInput(e.target.value)}
                    className={cn(
                      "mt-2 w-full border-0 bg-transparent p-0 text-[42px] font-black tracking-[-0.03em] outline-none",
                      isDarkMode ? "text-white" : "text-[#0b0f18]"
                    )}
                  />
                  <p className={cn("mt-2 text-[12px] leading-5", isDarkMode ? "text-white/58" : "text-[#627084]")}>
                    Implied share price used for the reverse DCF solve.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      { label: "Market", value: (historicals.price || 0).toFixed(2) },
                      { label: "-10%", value: ((historicals.price || 0) * 0.9).toFixed(2) },
                      { label: "+10%", value: ((historicals.price || 0) * 1.1).toFixed(2) },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setTargetPriceInput(preset.value)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em]",
                          isDarkMode
                            ? "border-white/12 bg-white/[0.03] text-white/70"
                            : "border-[rgba(76,140,255,0.14)] bg-white text-[#4e5f76] shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {bridge && (
                  <div className={cn(
                    "overflow-hidden rounded-[20px] border",
                    isDarkMode ? "border-white/10 bg-white/[0.03]" : "border-[rgba(15,23,42,0.08)] bg-white/96"
                  )}>
                    <div className={cn(
                      "grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em]",
                      isDarkMode ? "border-white/10 bg-white/[0.02] text-white/48" : "border-[rgba(15,23,42,0.08)] bg-[#f8fbff] text-[#7b818d]"
                    )}>
                      <span>Bridge Component</span>
                      <span>Value</span>
                    </div>

                    {[
                      ["Stage 1 PV", bridge.stageOnePv],
                      ["PV of terminal value", bridge.pvTerminalValue],
                      ["Enterprise value", bridge.enterpriseValue],
                      ["Net debt", bridge.netDebt],
                      ["Equity value", bridge.equityValue],
                    ].map(([label, value], index, rows) => (
                      <div
                        key={label}
                        className={cn(
                          "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-[14px]",
                          index < rows.length - 1 && (isDarkMode ? "border-b border-white/10" : "border-b border-[rgba(15,23,42,0.08)]")
                        )}
                      >
                        <span className={cn("font-medium", isDarkMode ? "text-white/78" : "text-[#3f4c5f]")}>{label}</span>
                        <span className={cn("text-[15px] font-black tabular-nums", isDarkMode ? "text-white" : "text-[#0b0f18]")}>
                          ${formatDisplayCompactCurrency(Number(value))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {bridge && (
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-[20px] border px-4 py-3.5",
                      isDarkMode
                        ? "border-sky-300/20 bg-[linear-gradient(90deg,rgba(191,219,254,0.92),rgba(219,234,254,0.84))] text-[#0f172a]"
                        : "border-[rgba(76,140,255,0.18)] bg-[linear-gradient(90deg,rgba(225,238,255,0.98),rgba(235,245,255,0.92))] text-[#0f172a]"
                    )}
                  >
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#5f6f87]">Implied Output</p>
                      <span className="mt-1 block text-[18px] font-black tracking-tight">Implied share price</span>
                    </div>
                    <span className="text-[30px] font-black tabular-nums tracking-[-0.03em]">{formatDisplayShareValue(bridge.impliedSharePrice)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
