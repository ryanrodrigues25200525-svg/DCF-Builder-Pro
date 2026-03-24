import {
  HistoricalData,
  ModelDiagnostic,
} from "@/core/types";

const VALID_VIEWS = new Set([
  "Overview",
  "Financials",
  "Revenue Build",
  "WACC Build",
  "Reverse DCF",
  "Sensitivity",
  "Comparables",
  "Transactions",
]);

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveInitialValuationView(initialView?: string): string {
  return initialView && VALID_VIEWS.has(initialView) ? initialView : "Overview";
}

export function getLastValidBookDebt(historicals: HistoricalData | null): number {
  if (!historicals) return 0;

  const maxLen = Math.max(
    historicals.totalDebt?.length ?? 0,
    historicals.currentDebt?.length ?? 0,
    historicals.longTermDebt?.length ?? 0
  );

  for (let idx = maxLen - 1; idx >= 0; idx -= 1) {
    const totalDebt = toFiniteNumber(historicals.totalDebt?.[idx]);
    const currentDebt = toFiniteNumber(historicals.currentDebt?.[idx]);
    const longTermDebt = toFiniteNumber(historicals.longTermDebt?.[idx]);
    const summedDebt = (currentDebt ?? 0) + (longTermDebt ?? 0);

    if ((totalDebt ?? 0) > 0) return Math.max(totalDebt ?? 0, 0);
    if (summedDebt > 0) return summedDebt;
  }

  const fallbackTotalDebt = toFiniteNumber(historicals.totalDebt?.[maxLen - 1]);
  if ((fallbackTotalDebt ?? 0) >= 0) return fallbackTotalDebt ?? 0;
  return 0;
}

export function buildRevenuePoints(historicals: HistoricalData | null) {
  if (!historicals) return [];
  return historicals.years.map((year, idx) => ({
    year,
    revenue: historicals.revenue[idx] || 0,
  }));
}

export function getCurrentRevenue(historicals: HistoricalData | null): number {
  if (!historicals || historicals.revenue.length === 0) return 0;
  return historicals.revenue[historicals.revenue.length - 1] || 0;
}

export function calculateHealthScore(diagnostics: ModelDiagnostic[]): number {
  if (diagnostics.length === 0) return 100;
  const passedCount = diagnostics.filter((item) => item.status === "pass").length;
  const warningCount = diagnostics.filter((item) => item.status === "warning").length;
  return Math.round(((passedCount + warningCount * 0.5) / diagnostics.length) * 100);
}
