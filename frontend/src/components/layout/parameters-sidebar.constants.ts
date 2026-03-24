import type { IndustryPresetKey } from '@/core/data/industry-templates';

export type TemplateSelection = 'auto' | IndustryPresetKey | 'custom';

export const SCENARIOS = [
  { label: 'Bear', id: 'conservative' as const },
  { label: 'Base', id: 'base' as const },
  { label: 'Bull', id: 'aggressive' as const },
];

export const FORECAST_YEAR_OPTIONS = [5, 7, 10, 12, 15] as const;

export const INDUSTRY_TEMPLATE_OPTIONS: Array<{
  value: TemplateSelection;
  label: string;
  icon: string;
  examples?: string;
}> = [
  { value: 'auto', label: 'Auto-detect from ticker', icon: '🔍' },
  { value: 'tech-hardware', label: 'Technology - Hardware', icon: '💻', examples: 'AAPL, MSFT, DELL' },
  { value: 'tech-saas', label: 'Technology - Software/SaaS', icon: '☁️', examples: 'CRM, NOW, ADBE' },
  { value: 'consumer-discretionary', label: 'Consumer Discretionary', icon: '🛍️', examples: 'NKE, SBUX, MCD' },
  { value: 'consumer-staples', label: 'Consumer Staples', icon: '🥫', examples: 'PG, KO, WMT' },
  { value: 'industrials', label: 'Industrials', icon: '🏭', examples: 'BA, CAT, GE' },
  { value: 'healthcare', label: 'Healthcare', icon: '💊', examples: 'JNJ, UNH, PFE' },
  { value: 'financials', label: 'Financials', icon: '💰', examples: 'JPM, GS, BAC' },
  { value: 'energy', label: 'Energy & Utilities', icon: '⚡', examples: 'XOM, CVX, NEE' },
  { value: 'real-estate', label: 'Real Estate', icon: '🏢', examples: 'AMT, PLD, SPG' },
  { value: 'custom', label: 'Custom (No template)', icon: '⚙️' },
];
