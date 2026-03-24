export interface CompanyProfile {
    cik: string;
    ticker: string;
    name: string;
    exchange: string;
    fiscalYearEnd: string;
    currency: string;
    sic?: string;
    sector?: string;
    industry?: string;

    // Market Data (Hybrid)
    currentPrice?: number;
    marketCap?: number;
    beta?: number;
}

export interface HistoricalData {
    symbol: string;
    years: number[];
    revenue: number[];
    costOfRevenue: number[];
    grossProfit: number[];
    purchases?: number[];
    ebitda: number[];
    ebit: number[];
    interestExpense: number[];
    incomeTaxExpense: number[];
    netIncome: number[];
    depreciation: number[];
    capex: number[];
    nwcChange: number[];
    stockBasedComp?: number[];
    taxRate: number[];
    dividendsPaid?: number[];
    marketableSecurities?: number[];
    cfo?: number[];
    fcff?: number[];

    accountsReceivable: number[];
    inventory: number[];
    accountsPayable: number[];

    marketing?: number[];
    generalAndAdministrative?: number[];
    researchAndDevelopment?: number[];
    rent?: number[];
    badDebt?: number[];
    otherOperatingExpenses?: number[];

    deferredTax?: number[];
    otherNonCash?: number[];

    cash: number[];
    totalCurrentAssets: number[];
    otherCurrentAssets: number[];

    totalAssets: number[];
    totalDebt: number[];
    currentDebt: number[];
    longTermDebt?: number[];
    shareholdersEquity: number[];

    ppeNet: number[];
    otherAssets: number[];
    otherLiabilities: number[];
    totalLiabilities: number[];
    totalCurrentLiabilities: number[];
    otherCurrentLiabilities: number[];
    deferredRevenue: number[];
    retainedEarnings: number[];

    sharesOutstanding: number;
    price: number;
    beta: number;
    currency: string;
    sector?: string;
    industry?: string;
    tradingCurrency?: string;
    exchangeRate?: number;
    lastUpdated?: number;
}
