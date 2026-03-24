/**
 * DCF Excel Exporter - Type Definitions
 * Investment Banking Quality Export System
 */

// =============================================================================
// MAIN EXPORT PAYLOAD
// =============================================================================

export type UnitsScale = 'units' | 'thousands' | 'millions' | 'billions';
export type ScenarioMode = 'Conservative' | 'Base' | 'Aggressive';
export type RevenueMethod = 'TopDown' | 'BottomUp';
export type CapexMethod = '%Revenue' | 'Absolute';
export type DaMethod = '%Revenue' | '%PPE' | 'HistoricalRatio';
export type WcMethod = 'NWC_%Revenue' | 'Days';
export type TerminalMethod = 'Perpetuity' | 'ExitMultiple' | 'Both';
export type ExitMetric = 'EBITDA' | 'EBIT';
export type ConfidenceLabel = 'Low' | 'Medium' | 'High';
export type WaccLoopMode = 'current_equity' | 'iterative';

import type { ForecastYear, RevenueBuild } from '@/core/types';

export interface CompanyInfo {
    name: string;
    ticker: string;
    exchange?: string;
    cik?: string;
    currency: string;
    unitsScale: UnitsScale;
    asOfDate: string;
    fiscalYearEnd?: string;
    sector?: string;
    industry?: string;
    description?: string;
    location?: string;
    employees?: number;
    website?: string;
}

export interface MarketData {
    currentPrice: number;
    sharesDiluted: number;
    netDebt?: number;
    cash?: number;
    debt?: number;
    minorityInterest?: number;
    preferredEquity?: number;
    nonOperatingAssets?: number;
    optionsValue?: number;
    otherAdjustments?: number;
}

export interface HistoricalFinancials {
    years: number[];
    income: Record<string, number[]>;
    balance: Record<string, number[]>;
    cashflow: Record<string, number[]>;
}

export interface WaccAssumptions {
    rf: number;
    erp: number;
    beta: number;
    sizePremium?: number;
    costOfDebt?: number;
    debtWeight?: number;
    equityWeight?: number;
}

export interface TerminalAssumptions {
    method: TerminalMethod;
    g?: number;
    exitMultiple?: number;
    exitMetric?: ExitMetric;
}

export interface ScenarioDeltaConfig {
    revenueGrowthBps?: number;
    ebitMarginBps?: number;
    waccBps?: number;
    terminalGrowthBps?: number;
    exitMultipleDelta?: number;
    capexRatioBps?: number;
    nwcChangeRatioBps?: number;
    taxRateBps?: number;
}

export interface ScenarioConfig {
    bull?: ScenarioDeltaConfig;
    bear?: ScenarioDeltaConfig;
}

export interface ScenarioAssumptionsSnapshot {
    waccRate?: number;
    taxRate?: number;
    daPctRevenue?: number;
    terminalGrowthRate?: number;
    terminalExitMultiple?: number;
    capexRatio?: number;
    nwcChangeRatio?: number;
}

export interface ScenarioSummarySnapshot {
    enterpriseValue?: number;
    equityValue?: number;
    impliedSharePrice?: number;
    upside?: number;
}

export interface ScenarioSnapshot {
    assumptions: ScenarioAssumptionsSnapshot;
    summary: ScenarioSummarySnapshot;
    forecasts: ForecastYear[];
}

export interface ExportScenarios {
    base: ScenarioSnapshot;
    bull: ScenarioSnapshot;
    bear: ScenarioSnapshot;
}

export interface ModelAssumptions {
    scenarioMode: ScenarioMode;
    horizonYears: number;
    revenueMethod: RevenueMethod;

    // Top-down revenue
    revenueCagr?: number;
    revenueYoY?: number[];

    // Bottom-up revenue
    baseUnits?: number;
    unitGrowth?: number;
    basePrice?: number;
    priceGrowth?: number;

    // Margins
    grossMargin?: number;
    ebitMarginTarget?: number;
    marginRampYears?: number;

    // Tax & Capital
    taxRate: number;
    capexMethod: CapexMethod;
    capexPctRevenue?: number;
    capexAbsolute?: number[];
    daMethod: DaMethod;
    daPctRevenue?: number;

    // Working Capital
    wcMethod: WcMethod;
    nwcPctRevenue?: number;
    dso?: number;
    dpo?: number;
    dio?: number;
    accountsReceivableDays?: number;
    inventoryDays?: number;
    accountsPayableDays?: number;
    revenueGrowth?: number;
    ebitMargin?: number;
    ebitdaMargin?: number;
    rdMargin?: number;
    sgaMargin?: number;
    deaRatio?: number;
    capexRatio?: number;

    // WACC
    wacc: WaccAssumptions;
    waccRate?: number;
    waccLoopMode?: WaccLoopMode;
    scenarioConfig?: ScenarioConfig;

    // Terminal
    terminal: TerminalAssumptions;

    // CRITICAL FIX: Advanced mode settings
    advancedMode?: boolean;
    revenueGrowthStage1?: number;
    revenueGrowthStage2?: number;
    revenueGrowthStage3?: number;
    salesToCapitalRatio?: number;
    leverageTarget?: number;
}

export interface SensitivityGrids {
    waccGrid: number[];
    gGrid: number[];
    waccAxis?: number[];
    terminalGrowthAxis?: number[];
    waccTerminalEvMatrix?: number[][];
    revenueGrowthAxis?: number[];
    ebitMarginAxis?: number[];
    revenueEbitEvMatrix?: number[][];
}

export interface CompData {
    company: string;
    ticker?: string;
    marketCap: number;
    ev: number;
    revenue?: number;
    ebitda?: number;
    ebitdaNtm?: number;
    ntmEbitda?: number;
    ebitda_ntm?: number;
    revenueNtm?: number;
    ntmRevenue?: number;
    revenue_ntm?: number;
    evRev?: number;
    evEbitda?: number;
    pe?: number;
    growth?: number;
    margin?: number;
    // Beta Calculation Data
    beta?: number;
    totalDebt?: number;
    taxRate?: number;
    equityValue?: number; // Should match marketCap but explicit alias might be useful 
    sharesOutstanding?: number;
    price?: number;
    depreciation?: number;
}

/**
 * Precedent Transaction data for M&A comparables
 */
export interface PrecedentTxn {
    target: string;
    acquirer: string;
    date: string;
    evMm: number;
    revenue?: number;
    ebitda?: number;
    evRev?: number;
    evEbitda?: number;
    premium?: number;
    type?: string;
}


export interface UiMeta {
    printDate: string;
    companyName?: string;
    currency?: string;
    preferLivePeerFetch?: boolean;
    confidenceLabel?: ConfidenceLabel;
    confidenceScore?: number; // CRITICAL FIX: Add confidence score
    warnings?: string[];
    sourceNotes?: string[];
    // CRITICAL FIX: Add key metrics for reference
    keyMetrics?: {
        avgROIC?: number;
        valueCreationFlag?: boolean;
        tvDivergenceFlag?: boolean;
        terminalValueGordon?: number;
        terminalValueExitMultiple?: number;
        terminalValue?: number;
        pvTerminalValue?: number;
        enterpriseValue?: number;
        equityValue?: number;
        impliedSharePrice?: number;
        impliedUpside?: number;
    };
}

/**
 * Main payload for DCF Excel export
 */
export interface DcfExportPayload {
    company: CompanyInfo;
    market: MarketData;
    historicals: HistoricalFinancials;
    assumptions: ModelAssumptions;
    scenarios?: ExportScenarios;
    forecasts: ForecastYear[];
    revenueBuild?: RevenueBuild;
    sensitivities?: SensitivityGrids;
    comps?: CompData[];
    precedents?: PrecedentTxn[];
    uiMeta?: UiMeta;
}

// =============================================================================
// CELL REFERENCE MAPS (for formula building)
// =============================================================================

export interface CellAddress {
    sheet: string;
    cell: string;
    absolute?: boolean;
}

export type CellAddressMap = Record<string, CellAddress>;

// Assumptions sheet cell addresses
export interface AssumptionsCellMap {
    SCENARIO_MODE: string;
    HORIZON_YEARS: string;
    REVENUE_METHOD: string;
    REVENUE_CAGR: string;
    GROSS_MARGIN: string;
    EBIT_MARGIN_TARGET: string;
    TAX_RATE: string;
    CAPEX_PCT: string;
    DA_PCT: string;
    NWC_PCT: string;
    DSO: string;
    DIO: string;
    DPO: string;
    RF: string;
    ERP: string;
    BETA: string;
    SIZE_PREMIUM: string;
    COST_OF_DEBT: string;
    DEBT_WEIGHT: string;
    EQUITY_WEIGHT: string;
    COST_OF_EQUITY: string;
    WACC: string;
    TERMINAL_METHOD: string;
    TERMINAL_G: string;
    EXIT_MULTIPLE: string;
    SHARES_DILUTED: string;
}

// DCF sheet cell addresses
export interface DcfCellMap {
    SUM_PV_UFCF: string;
    PV_TERMINAL: string;
    ENTERPRISE_VALUE: string;
    NET_DEBT: string;
    EQUITY_VALUE: string;
    VALUE_PER_SHARE: string;
    CURRENT_PRICE: string;
    UPSIDE: string;
    TV_PCT_EV: string;
}

// =============================================================================
// SHEET CONFIGURATION
// =============================================================================

export interface SheetConfig {
    name: string;
    order: number;
    freezeRows: number;
    freezeCols: number;
    colWidths: number[];
    printLandscape: boolean;
}

export const SHEET_CONFIGS: Record<string, SheetConfig> = {
    COVER: {
        name: '01_Cover',
        order: 1,
        freezeRows: 0,
        freezeCols: 0,
        colWidths: [3, 25, 20, 20, 20, 20, 3],
        printLandscape: false,
    },
    ASSUMPTIONS: {
        name: '02_Assumptions',
        order: 2,
        freezeRows: 1,
        freezeCols: 1,
        colWidths: [3, 35, 15, 15, 15, 15, 15, 15, 15, 3],
        printLandscape: false,
    },
    FINANCIALS: {
        name: '03_Financials',
        order: 3,
        freezeRows: 2,
        freezeCols: 2,
        colWidths: [3, 30, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 3],
        printLandscape: true,
    },
    DCF: {
        name: '04_DCF',
        order: 4,
        freezeRows: 2,
        freezeCols: 2,
        colWidths: [3, 30, 15, 15, 15, 15, 15, 15, 15, 3],
        printLandscape: true,
    },
    SENSITIVITIES: {
        name: '05_Sensitivities',
        order: 5,
        freezeRows: 3,
        freezeCols: 2,
        colWidths: [3, 15, 15, 15, 15, 15, 15, 15, 3],
        printLandscape: false,
    },
    COMPS: {
        name: '06_Comps',
        order: 6,
        freezeRows: 2,
        freezeCols: 1,
        colWidths: [3, 25, 10, 15, 15, 12, 12, 12, 12, 3],
        printLandscape: true,
    },

    CHECKS: {
        name: '08_Checks',
        order: 8,
        freezeRows: 1,
        freezeCols: 0,
        colWidths: [3, 50, 15, 3],
        printLandscape: false,
    },
    NOTES: {
        name: '99_Notes',
        order: 9,
        freezeRows: 1,
        freezeCols: 0,
        colWidths: [3, 80, 3],
        printLandscape: false,
    },
};

// =============================================================================
// FORECAST DATA STRUCTURES
// =============================================================================

export interface ForecastPeriod {
    year: number;
    isHistorical: boolean;
    revenue: number;
    revenueGrowth: number;
    costOfRevenue: number;
    grossProfit: number;
    grossMargin: number;
    ebitda: number;
    ebitdaMargin: number;
    ebit: number;
    ebitMargin: number;
    interestExpense: number;
    preTaxIncome: number;
    taxExpense: number;
    netIncome: number;
    netMargin: number;
    rdExpense: number;
    sgaExpense: number;
    depreciation: number;
    stockBasedComp: number;
    capex: number;
    nwcChange: number;
    nopat: number;
    ufcf: number;

    // Working Capital Drivers
    arDays: number;
    inventoryDays: number;
    apDays: number;
    discountFactor: number;
    pvUfcf: number;
    // Balance Sheet Dynamics
    cash: number;
    ppeNet: number;
    totalAssets: number;
    totalDebt: number;
    shareholdersEquity: number;
    investedCapital: number;
    // Analysis
    roic: number;
    economicProfit: number;
    taxShieldUsed: number;
    nolBalance: number;
    // Working Capital Detailed
    accountsReceivable: number;
    inventory: number;
    accountsPayable: number;
    // Financing Activities
    dividends: number;
    shareBuybacks: number;
    debtIssuance: number;
    debtRepayment: number;
    totalLiabilities: number;
}

export interface TerminalValueCalc {
    method: TerminalMethod;
    perpetuityTV?: number;
    exitMultipleTV?: number;
    selectedTV: number;
    pvTV: number;
}

export interface ValuationSummary {
    sumPvUfcf: number;
    pvTerminalValue: number;
    enterpriseValue: number;
    netDebt: number;
    minorityInterest: number;
    preferredEquity: number;
    nonOperatingAssets: number;
    equityValue: number;
    sharesOutstanding: number;
    valuePerShare: number;
    currentPrice: number;
    upside: number;
    tvPctOfEv: number;
}

// =============================================================================
// EXPORTER OPTIONS
// =============================================================================

export interface ExporterOptions {
    includeComps: boolean;
    includeNotes: boolean;
    protectSheets: boolean;
    showGridlines: boolean;
}

export const DEFAULT_EXPORTER_OPTIONS: ExporterOptions = {
    includeComps: true,
    includeNotes: true,
    protectSheets: true,
    showGridlines: false,
};
