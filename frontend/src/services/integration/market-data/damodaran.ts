/**
 * Damodaran Market Data Service
 * Provides Equity Risk Premium, Industry Beta, and Country Risk Premium data
 * Based on Aswath Damodaran's research data
 */

export interface EquityRiskPremiumData {
  erp: number; // Equity Risk Premium as decimal (e.g., 0.052 = 5.2%)
  date: string;
  source: string;
}

export interface IndustryBetaData {
  industry: string;
  beta: number;
  totalDebtToEV: number;
  effectiveTaxRate: number;
  unleveredBeta: number;
  cashFirmValue: number;
  description?: string;
}

export interface CountryRiskPremiumData {
  country: string;
  totalEquityRiskPremium: number;
  countryRiskPremium: number;
  matureMarketERP: number;
  sovereignCDS: number | null;
  sovereignRating: string;
}

// Default Equity Risk Premium (January 2025)
// Updated based on Damodaran's latest estimates
export const DEFAULT_ERP = 0.052;

// Industry Beta Data (from Damodaran's January 2025 dataset)
// Industry betas are unlevered betas based on global comparable companies
export const INDUSTRY_BETAS: Record<string, IndustryBetaData> = {
  'advertising': { industry: 'Advertising', beta: 1.15, totalDebtToEV: 0.15, effectiveTaxRate: 0.21, unleveredBeta: 1.02, cashFirmValue: 0.05 },
  'aerospace': { industry: 'Aerospace/Defense', beta: 0.95, totalDebtToEV: 0.25, effectiveTaxRate: 0.18, unleveredBeta: 0.79, cashFirmValue: 0.08 },
  'airlines': { industry: 'Airlines', beta: 1.35, totalDebtToEV: 0.55, effectiveTaxRate: 0.12, unleveredBeta: 0.78, cashFirmValue: 0.10 },
  'apparel': { industry: 'Apparel', beta: 1.10, totalDebtToEV: 0.12, effectiveTaxRate: 0.20, unleveredBeta: 1.00, cashFirmValue: 0.08 },
  'auto': { industry: 'Auto & Truck', beta: 1.25, totalDebtToEV: 0.35, effectiveTaxRate: 0.19, unleveredBeta: 0.95, cashFirmValue: 0.10 },
  'auto_parts': { industry: 'Auto Parts', beta: 1.20, totalDebtToEV: 0.30, effectiveTaxRate: 0.20, unleveredBeta: 0.92, cashFirmValue: 0.08 },
  'bank': { industry: 'Banking', beta: 1.05, totalDebtToEV: 0.45, effectiveTaxRate: 0.21, unleveredBeta: 0.65, cashFirmValue: 0.06 },
  'biotech': { industry: 'Biotechnology', beta: 1.35, totalDebtToEV: 0.10, effectiveTaxRate: 0.15, unleveredBeta: 1.25, cashFirmValue: 0.15 },
  'broadcasting': { industry: 'Broadcasting', beta: 0.95, totalDebtToEV: 0.45, effectiveTaxRate: 0.21, unleveredBeta: 0.62, cashFirmValue: 0.05 },
  'business_services': { industry: 'Business Services', beta: 1.10, totalDebtToEV: 0.15, effectiveTaxRate: 0.21, unleveredBeta: 0.97, cashFirmValue: 0.08 },
  'chemicals': { industry: 'Chemicals', beta: 1.15, totalDebtToEV: 0.25, effectiveTaxRate: 0.19, unleveredBeta: 0.93, cashFirmValue: 0.06 },
  'computer_hardware': { industry: 'Computer Hardware', beta: 1.30, totalDebtToEV: 0.08, effectiveTaxRate: 0.18, unleveredBeta: 1.22, cashFirmValue: 0.18 },
  'computer_software': { industry: 'Computer Software', beta: 1.25, totalDebtToEV: 0.05, effectiveTaxRate: 0.18, unleveredBeta: 1.20, cashFirmValue: 0.12 },
  'construction': { industry: 'Construction', beta: 1.25, totalDebtToEV: 0.20, effectiveTaxRate: 0.22, unleveredBeta: 1.08, cashFirmValue: 0.08 },
  'consumer_products': { industry: 'Consumer Products', beta: 1.00, totalDebtToEV: 0.20, effectiveTaxRate: 0.21, unleveredBeta: 0.86, cashFirmValue: 0.06 },
  'data_processing': { industry: 'Data Processing', beta: 1.20, totalDebtToEV: 0.10, effectiveTaxRate: 0.21, unleveredBeta: 1.11, cashFirmValue: 0.08 },
  'diversified': { industry: 'Diversified', beta: 1.05, totalDebtToEV: 0.30, effectiveTaxRate: 0.20, unleveredBeta: 0.83, cashFirmValue: 0.08 },
  'drugs': { industry: 'Pharmaceuticals', beta: 1.05, totalDebtToEV: 0.15, effectiveTaxRate: 0.18, unleveredBeta: 0.93, cashFirmValue: 0.10 },
  'education': { industry: 'Education', beta: 0.80, totalDebtToEV: 0.12, effectiveTaxRate: 0.18, unleveredBeta: 0.72, cashFirmValue: 0.06 },
  'electronics': { industry: 'Electronics', beta: 1.35, totalDebtToEV: 0.12, effectiveTaxRate: 0.17, unleveredBeta: 1.24, cashFirmValue: 0.14 },
  'energy': { industry: 'Energy', beta: 1.15, totalDebtToEV: 0.30, effectiveTaxRate: 0.20, unleveredBeta: 0.91, cashFirmValue: 0.06 },
  'entertainment': { industry: 'Entertainment', beta: 1.15, totalDebtToEV: 0.20, effectiveTaxRate: 0.21, unleveredBeta: 0.99, cashFirmValue: 0.08 },
  'environmental': { industry: 'Environmental', beta: 0.95, totalDebtToEV: 0.25, effectiveTaxRate: 0.22, unleveredBeta: 0.78, cashFirmValue: 0.05 },
  'farming': { industry: 'Farming', beta: 0.85, totalDebtToEV: 0.20, effectiveTaxRate: 0.18, unleveredBeta: 0.72, cashFirmValue: 0.08 },
  'financial_services': { industry: 'Financial Services', beta: 1.00, totalDebtToEV: 0.40, effectiveTaxRate: 0.21, unleveredBeta: 0.68, cashFirmValue: 0.08 },
  'food_processing': { industry: 'Food Processing', beta: 0.85, totalDebtToEV: 0.20, effectiveTaxRate: 0.21, unleveredBeta: 0.73, cashFirmValue: 0.05 },
  'food_retail': { industry: 'Food Retail', beta: 0.75, totalDebtToEV: 0.25, effectiveTaxRate: 0.22, unleveredBeta: 0.60, cashFirmValue: 0.05 },
  'healthcare': { industry: 'Healthcare', beta: 0.95, totalDebtToEV: 0.18, effectiveTaxRate: 0.20, unleveredBeta: 0.82, cashFirmValue: 0.08 },
  'healthcare_equipment': { industry: 'Healthcare Equipment', beta: 1.05, totalDebtToEV: 0.12, effectiveTaxRate: 0.17, unleveredBeta: 0.95, cashFirmValue: 0.12 },
  'homebuilding': { industry: 'Homebuilding', beta: 1.35, totalDebtToEV: 0.30, effectiveTaxRate: 0.23, unleveredBeta: 1.06, cashFirmValue: 0.10 },
  'hospitality': { industry: 'Hospitality', beta: 1.15, totalDebtToEV: 0.35, effectiveTaxRate: 0.21, unleveredBeta: 0.83, cashFirmValue: 0.05 },
  'household_products': { industry: 'Household Products', beta: 0.90, totalDebtToEV: 0.18, effectiveTaxRate: 0.21, unleveredBeta: 0.78, cashFirmValue: 0.06 },
  'insurance': { industry: 'Insurance', beta: 0.90, totalDebtToEV: 0.15, effectiveTaxRate: 0.21, unleveredBeta: 0.80, cashFirmValue: 0.08 },
  'internet': { industry: 'Internet', beta: 1.35, totalDebtToEV: 0.05, effectiveTaxRate: 0.18, unleveredBeta: 1.29, cashFirmValue: 0.15 },
  'investment_banking': { industry: 'Investment Banking', beta: 1.15, totalDebtToEV: 0.50, effectiveTaxRate: 0.21, unleveredBeta: 0.70, cashFirmValue: 0.06 },
  'machinery': { industry: 'Machinery', beta: 1.20, totalDebtToEV: 0.20, effectiveTaxRate: 0.22, unleveredBeta: 1.03, cashFirmValue: 0.08 },
  'media': { industry: 'Media', beta: 1.05, totalDebtToEV: 0.30, effectiveTaxRate: 0.21, unleveredBeta: 0.80, cashFirmValue: 0.06 },
  'metals': { industry: 'Metals & Mining', beta: 1.25, totalDebtToEV: 0.20, effectiveTaxRate: 0.20, unleveredBeta: 1.08, cashFirmValue: 0.08 },
  'office_equipment': { industry: 'Office Equipment', beta: 1.10, totalDebtToEV: 0.15, effectiveTaxRate: 0.20, unleveredBeta: 0.98, cashFirmValue: 0.10 },
  'oil_gas': { industry: 'Oil & Gas', beta: 1.10, totalDebtToEV: 0.25, effectiveTaxRate: 0.20, unleveredBeta: 0.90, cashFirmValue: 0.06 },
  'packaging': { industry: 'Packaging', beta: 1.05, totalDebtToEV: 0.30, effectiveTaxRate: 0.21, unleveredBeta: 0.82, cashFirmValue: 0.05 },
  'paper': { industry: 'Paper', beta: 1.15, totalDebtToEV: 0.35, effectiveTaxRate: 0.22, unleveredBeta: 0.85, cashFirmValue: 0.05 },
  'personal_services': { industry: 'Personal Services', beta: 0.95, totalDebtToEV: 0.15, effectiveTaxRate: 0.22, unleveredBeta: 0.83, cashFirmValue: 0.06 },
  'precious_metals': { industry: 'Precious Metals', beta: 0.95, totalDebtToEV: 0.10, effectiveTaxRate: 0.20, unleveredBeta: 0.88, cashFirmValue: 0.15 },
  'publishing': { industry: 'Publishing', beta: 0.85, totalDebtToEV: 0.15, effectiveTaxRate: 0.21, unleveredBeta: 0.75, cashFirmValue: 0.10 },
  'railroads': { industry: 'Railroads', beta: 1.05, totalDebtToEV: 0.30, effectiveTaxRate: 0.22, unleveredBeta: 0.81, cashFirmValue: 0.03 },
  'real_estate': { industry: 'Real Estate', beta: 0.85, totalDebtToEV: 0.50, effectiveTaxRate: 0.21, unleveredBeta: 0.52, cashFirmValue: 0.04 },
  'recreation': { industry: 'Recreation', beta: 1.20, totalDebtToEV: 0.20, effectiveTaxRate: 0.22, unleveredBeta: 1.03, cashFirmValue: 0.06 },
  'restaurants': { industry: 'Restaurants', beta: 0.95, totalDebtToEV: 0.30, effectiveTaxRate: 0.21, unleveredBeta: 0.74, cashFirmValue: 0.05 },
  'retail': { industry: 'Retail', beta: 1.05, totalDebtToEV: 0.20, effectiveTaxRate: 0.22, unleveredBeta: 0.90, cashFirmValue: 0.06 },
  'semiconductor': { industry: 'Semiconductor', beta: 1.45, totalDebtToEV: 0.05, effectiveTaxRate: 0.15, unleveredBeta: 1.38, cashFirmValue: 0.20 },
  'software': { industry: 'Software', beta: 1.25, totalDebtToEV: 0.05, effectiveTaxRate: 0.18, unleveredBeta: 1.20, cashFirmValue: 0.15 },
  'steel': { industry: 'Steel', beta: 1.35, totalDebtToEV: 0.25, effectiveTaxRate: 0.22, unleveredBeta: 1.13, cashFirmValue: 0.08 },
  'telecom': { industry: 'Telecom', beta: 0.75, totalDebtToEV: 0.40, effectiveTaxRate: 0.20, unleveredBeta: 0.52, cashFirmValue: 0.05 },
  'transportation': { industry: 'Transportation', beta: 1.05, totalDebtToEV: 0.25, effectiveTaxRate: 0.22, unleveredBeta: 0.86, cashFirmValue: 0.06 },
  'utilities': { industry: 'Utilities', beta: 0.55, totalDebtToEV: 0.50, effectiveTaxRate: 0.20, unleveredBeta: 0.35, cashFirmValue: 0.03 },
};

// Country Risk Premium Data (from Damodaran's January 2025 dataset)
export const COUNTRY_RISK_PREMIUMS: Record<string, CountryRiskPremiumData> = {
  'us': { country: 'United States', totalEquityRiskPremium: 0.0520, countryRiskPremium: 0.0000, matureMarketERP: 0.0520, sovereignCDS: null, sovereignRating: 'AAA' },
  'canada': { country: 'Canada', totalEquityRiskPremium: 0.0520, countryRiskPremium: 0.0000, matureMarketERP: 0.0520, sovereignCDS: null, sovereignRating: 'AAA' },
  'uk': { country: 'United Kingdom', totalEquityRiskPremium: 0.0555, countryRiskPremium: 0.0035, matureMarketERP: 0.0520, sovereignCDS: null, sovereignRating: 'AA' },
  'germany': { country: 'Germany', totalEquityRiskPremium: 0.0520, countryRiskPremium: 0.0000, matureMarketERP: 0.0520, sovereignCDS: null, sovereignRating: 'AAA' },
  'france': { country: 'France', totalEquityRiskPremium: 0.0555, countryRiskPremium: 0.0035, matureMarketERP: 0.0520, sovereignCDS: null, sovereignRating: 'AA' },
  'japan': { country: 'Japan', totalEquityRiskPremium: 0.0555, countryRiskPremium: 0.0035, matureMarketERP: 0.0520, sovereignCDS: null, sovereignRating: 'AA' },
  'china': { country: 'China', totalEquityRiskPremium: 0.0640, countryRiskPremium: 0.0120, matureMarketERP: 0.0520, sovereignCDS: 65, sovereignRating: 'A+' },
  'india': { country: 'India', totalEquityRiskPremium: 0.0765, countryRiskPremium: 0.0245, matureMarketERP: 0.0520, sovereignCDS: 85, sovereignRating: 'BBB-' },
  'brazil': { country: 'Brazil', totalEquityRiskPremium: 0.0890, countryRiskPremium: 0.0370, matureMarketERP: 0.0520, sovereignCDS: 145, sovereignRating: 'BB' },
  'mexico': { country: 'Mexico', totalEquityRiskPremium: 0.0690, countryRiskPremium: 0.0170, matureMarketERP: 0.0520, sovereignCDS: 95, sovereignRating: 'BBB' },
  'russia': { country: 'Russia', totalEquityRiskPremium: 0.1040, countryRiskPremium: 0.0520, matureMarketERP: 0.0520, sovereignCDS: null, sovereignRating: 'Not Rated' },
  'south_africa': { country: 'South Africa', totalEquityRiskPremium: 0.0840, countryRiskPremium: 0.0320, matureMarketERP: 0.0520, sovereignCDS: 280, sovereignRating: 'BB' },
  'australia': { country: 'Australia', totalEquityRiskPremium: 0.0520, countryRiskPremium: 0.0000, matureMarketERP: 0.0520, sovereignCDS: null, sovereignRating: 'AAA' },
  'south_korea': { country: 'South Korea', totalEquityRiskPremium: 0.0590, countryRiskPremium: 0.0070, matureMarketERP: 0.0520, sovereignCDS: 35, sovereignRating: 'AA-' },
  'taiwan': { country: 'Taiwan', totalEquityRiskPremium: 0.0555, countryRiskPremium: 0.0035, matureMarketERP: 0.0520, sovereignCDS: null, sovereignRating: 'AA+' },
  'singapore': { country: 'Singapore', totalEquityRiskPremium: 0.0520, countryRiskPremium: 0.0000, matureMarketERP: 0.0520, sovereignCDS: null, sovereignRating: 'AAA' },
  'hong_kong': { country: 'Hong Kong', totalEquityRiskPremium: 0.0520, countryRiskPremium: 0.0000, matureMarketERP: 0.0520, sovereignCDS: null, sovereignRating: 'AA+' },
  'switzerland': { country: 'Switzerland', totalEquityRiskPremium: 0.0520, countryRiskPremium: 0.0000, matureMarketERP: 0.0520, sovereignCDS: null, sovereignRating: 'AAA' },
  'netherlands': { country: 'Netherlands', totalEquityRiskPremium: 0.0520, countryRiskPremium: 0.0000, matureMarketERP: 0.0520, sovereignCDS: null, sovereignRating: 'AAA' },
  'sweden': { country: 'Sweden', totalEquityRiskPremium: 0.0520, countryRiskPremium: 0.0000, matureMarketERP: 0.0520, sovereignCDS: null, sovereignRating: 'AAA' },
  'norway': { country: 'Norway', totalEquityRiskPremium: 0.0520, countryRiskPremium: 0.0000, matureMarketERP: 0.0520, sovereignCDS: null, sovereignRating: 'AAA' },
  'denmark': { country: 'Denmark', totalEquityRiskPremium: 0.0520, countryRiskPremium: 0.0000, matureMarketERP: 0.0520, sovereignCDS: null, sovereignRating: 'AAA' },
  'italy': { country: 'Italy', totalEquityRiskPremium: 0.0620, countryRiskPremium: 0.0100, matureMarketERP: 0.0520, sovereignCDS: 85, sovereignRating: 'BBB' },
  'spain': { country: 'Spain', totalEquityRiskPremium: 0.0590, countryRiskPremium: 0.0070, matureMarketERP: 0.0520, sovereignCDS: 55, sovereignRating: 'A-' },
  'portugal': { country: 'Portugal', totalEquityRiskPremium: 0.0640, countryRiskPremium: 0.0120, matureMarketERP: 0.0520, sovereignCDS: 75, sovereignRating: 'BBB+' },
  'greece': { country: 'Greece', totalEquityRiskPremium: 0.0840, countryRiskPremium: 0.0320, matureMarketERP: 0.0520, sovereignCDS: 95, sovereignRating: 'BBB-' },
  'turkey': { country: 'Turkey', totalEquityRiskPremium: 0.0940, countryRiskPremium: 0.0420, matureMarketERP: 0.0520, sovereignCDS: 425, sovereignRating: 'B+' },
  'argentina': { country: 'Argentina', totalEquityRiskPremium: 0.1440, countryRiskPremium: 0.0920, matureMarketERP: 0.0520, sovereignCDS: 850, sovereignRating: 'CCC+' },
};

/**
 * Get the current Equity Risk Premium
 * Returns the default ERP of 5.2% (January 2025 estimate)
 * In a production environment, this could fetch from Damodaran's website or an API
 */
export function getEquityRiskPremium(): EquityRiskPremiumData {
  try {
    return {
      erp: DEFAULT_ERP,
      date: new Date().toISOString().split('T')[0],
      source: 'Damodaran (January 2025)'
    };
  } catch (error) {
    console.warn('[Damodaran] Error getting ERP, using default:', error);
    return {
      erp: 0.052,
      date: new Date().toISOString().split('T')[0],
      source: 'Hardcoded Fallback'
    };
  }
}

/**
 * Get industry beta data
 * @param industryKey - The industry key (e.g., 'software', 'bank', 'energy')
 * @returns IndustryBetaData or null if not found
 */
export function getIndustryBeta(industryKey: string): IndustryBetaData | null {
  const key = industryKey.toLowerCase().replace(/\s+/g, '_').replace(/&/g, 'and');

  // Try exact match first
  if (INDUSTRY_BETAS[key]) {
    return INDUSTRY_BETAS[key];
  }

  // Try partial matches
  for (const [k, v] of Object.entries(INDUSTRY_BETAS)) {
    if (k.includes(key) || key.includes(k)) {
      return v;
    }
  }

  return null;
}

/**
 * Get country risk premium data
 * @param countryKey - The country key (e.g., 'us', 'uk', 'china')
 * @returns CountryRiskPremiumData or default US data if not found
 */
export function getCountryRiskPremium(countryKey: string): CountryRiskPremiumData {
  const key = countryKey.toLowerCase().replace(/\s+/g, '_');

  return COUNTRY_RISK_PREMIUMS[key] || COUNTRY_RISK_PREMIUMS['us'];
}

/**
 * Calculate levered beta from unlevered industry beta
 * Using Hamada equation: βL = βU × [1 + (1 - T) × (D/E)]
 * 
 * @param unleveredBeta - The unlevered industry beta
 * @param taxRate - Corporate tax rate
 * @param debtToEquity - Debt to equity ratio (market values)
 * @returns The levered beta
 */
export function calculateLeveredBeta(
  unleveredBeta: number,
  taxRate: number,
  debtToEquity: number
): number {
  return unleveredBeta * (1 + (1 - taxRate) * debtToEquity);
}

/**
 * Calculate unlevered beta from levered beta
 * Using Hamada equation rearranged: βU = βL / [1 + (1 - T) × (D/E)]
 * 
 * @param leveredBeta - The levered beta
 * @param taxRate - Corporate tax rate
 * @param debtToEquity - Debt to equity ratio (market values)
 * @returns The unlevered beta
 */
export function calculateUnleveredBeta(
  leveredBeta: number,
  taxRate: number,
  debtToEquity: number
): number {
  if (debtToEquity === 0) return leveredBeta;
  return leveredBeta / (1 + (1 - taxRate) * debtToEquity);
}

/**
 * Get all available industry betas
 * @returns Array of all industry beta data
 */
export function getAllIndustryBetas(): IndustryBetaData[] {
  return Object.values(INDUSTRY_BETAS);
}

/**
 * Get all available country risk premiums
 * @returns Array of all country risk premium data
 */
export function getAllCountryRiskPremiums(): CountryRiskPremiumData[] {
  return Object.values(COUNTRY_RISK_PREMIUMS);
}

/**
 * Get total ERP including country risk premium
 * @param countryKey - The country key
 * @returns Total ERP (mature market ERP + country risk premium)
 */
export function getTotalERP(countryKey: string = 'us'): number {
  const crp = getCountryRiskPremium(countryKey);
  return crp.matureMarketERP + crp.countryRiskPremium;
}
