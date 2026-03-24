export interface StatementRow {
    id: string; // The key used for data retrieval (e.g. 'revenue', 'gm')
    label: string;
    format?: 'currency' | 'percent' | 'number' | 'text'; // default currency
    bold?: boolean;
    indent?: boolean;
    isCalculation?: boolean; // Visual indicator or logic flag
    description?: string; // For tooltips later
}

export const INCOME_STATEMENT_ROWS: StatementRow[] = [
    { label: "Total Revenue", id: "revenue", bold: true },
    { label: "Revenue Growth", id: "revenueGrowth", format: "percent", indent: true },
    { label: "Cost of Revenue", id: "cogs", indent: true },
    { label: "Gross Profit", id: "gp", bold: true },
    { label: "Gross Margin", id: "gm", format: "percent", indent: true },
    // Operating Expenses
    { label: "Research & Development", id: "rnd", indent: true },
    { label: "SG&A", id: "sga", indent: true },
    { label: "D&A (included in Operating)", id: "daInOp", indent: true },
    { label: "EBITDA", id: "ebitda", bold: true },
    { label: "EBITDA Margin", id: "ebitdaMargin", format: "percent", indent: true },
    { label: "Operating Income (EBIT)", id: "ebit", bold: true },
    { label: "EBIT Margin", id: "ebitMargin", format: "percent", indent: true },
    // Interest and Taxes
    { label: "Interest Expense", id: "interestExpense" },
    { label: "Pre-Tax Income", id: "preTaxIncome", bold: true },
    { label: "Income Taxes", id: "taxExpense" },
    { label: "Effective Tax Rate", id: "effectiveTaxRate", format: "percent", indent: true },
    { label: "Net Income", id: "netIncome", bold: true },
    { label: "Net Margin", id: "netMargin", format: "percent", indent: true },
];

export const BALANCE_SHEET_ROWS: StatementRow[] = [
    // Assets
    { label: "Total Current Assets", id: "totalCurrentAssets", bold: true },
    { label: "  Cash & Cash Equivalents", id: "cash", indent: true },
    { label: "  Marketable Securities", id: "marketableSecurities", indent: true },
    { label: "  Accounts Receivable", id: "accountsReceivable", indent: true },
    { label: "  Inventory", id: "inventory", indent: true },
    { label: "  Other Current Assets", id: "otherCurrentAssets", indent: true },
    // Non-Current Assets
    { label: "Non-Current Assets", id: "nonCurrentAssets", bold: true },
    { label: "  Property, Plant & Equipment", id: "ppeNet", indent: true },
    { label: "  Other Non-Current Assets", id: "otherAssets", indent: true },
    { label: "TOTAL ASSETS", id: "totalAssets", bold: true },
    // Liabilities
    { label: "Total Liabilities", id: "totalLiabilities", bold: true },
    { label: "  Current Liabilities", id: "totalCurrentLiabilities", indent: true },
    { label: "    Short-term Debt", id: "shortTermDebt", indent: true },
    { label: "    Accounts Payable", id: "accountsPayable", indent: true },
    { label: "    Other Current Liabilities", id: "otherCurrentLiabilities", indent: true },
    { label: "  Non-Current Liabilities", id: "nonCurrentLiabilities", bold: true, indent: true },
    { label: "    Long-term Debt", id: "longTermDebt", indent: true },
    { label: "    Other Non-Current Liabilities", id: "otherLiabilities", indent: true },
    // Equity
    { label: "Total Shareholders' Equity", id: "shareholdersEquity", bold: true },
    { label: "  Common Stock", id: "commonStock", indent: true },
    { label: "  Retained Earnings", id: "retainedEarnings", indent: true },
    { label: "TOTAL LIABILITIES & EQUITY", id: "liabilitiesAndEquity", bold: true },
];

export const CASH_FLOW_ROWS: StatementRow[] = [
    { label: "Net Income", id: "netIncome", bold: true },
    { label: "Depreciation & Amortization", id: "depreciation" },
    { label: "Stock Based Compensation", id: "stockBasedComp" },
    { label: "Change in Working Capital", id: "nwcChange" },
    { label: "Cash Flow from Operations", id: "cfo", bold: true },
    { label: "Capital Expenditures", id: "capex" },
    { label: "Free Cash Flow (FCFF)", id: "fcff", bold: true },
];

export const DCF_BRIDGE_ROWS: StatementRow[] = [
    { label: "Free Cash Flow (FCFF)", id: "fcff", bold: true },
    { label: "Discount Factor", id: "df", format: "number", indent: true },
    { label: "Present Value (PV)", id: "pv", bold: true },
];

export const FCFE_BRIDGE_ROWS: StatementRow[] = [
    { label: "Free Cash Flow to Equity (FCFE)", id: "fcfe", bold: true },
    { label: "Discount Factor", id: "df", format: "number", indent: true },
    { label: "Present Value (PV)", id: "pv", bold: true },
];
