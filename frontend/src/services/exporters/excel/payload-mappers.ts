import type { Assumptions, CompanyProfile, DCFResults, HistoricalData } from '@/core/types';
import type { HistoricalFinancials, MarketData, UiMeta } from './types';

export function buildMarketSnapshot(historicals: HistoricalData, assumptions: Assumptions): MarketData {
    const lastIdx = Math.max(0, historicals.years.length - 1);
    const latestCash = historicals.cash[lastIdx] || 0;
    const latestDebt = historicals.totalDebt[lastIdx] || 0;
    const latestMarketableSecurities = (historicals.marketableSecurities?.[lastIdx]) || 0;
    const sharesDiluted = (assumptions.dilutedSharesOutstanding && assumptions.dilutedSharesOutstanding > 0)
        ? assumptions.dilutedSharesOutstanding
        : historicals.sharesOutstanding;

    return {
        currentPrice: historicals.price,
        sharesDiluted,
        cash: latestCash,
        debt: latestDebt,
        netDebt: latestDebt - latestCash,
        minorityInterest: 0,
        preferredEquity: 0,
        nonOperatingAssets: latestMarketableSecurities,
    };
}

export function buildHistoricalFinancials(historicals: HistoricalData): HistoricalFinancials {
    const preTaxIncome = historicals.ebit.map((e, i) => e - (historicals.interestExpense[i] || 0));
    const revenueGrowth = historicals.revenue.map((rev, i) => {
        if (i === 0) return 0;
        const prev = historicals.revenue[i - 1] || 0;
        return prev > 0 ? (rev / prev) - 1 : 0;
    });
    const grossMargin = historicals.revenue.map((rev, i) => rev > 0 ? ((historicals.grossProfit[i] || 0) / rev) : 0);
    const ebitdaMargin = historicals.revenue.map((rev, i) => rev > 0 ? ((historicals.ebitda[i] || 0) / rev) : 0);
    const ebitMargin = historicals.revenue.map((rev, i) => rev > 0 ? ((historicals.ebit[i] || 0) / rev) : 0);
    const effectiveTaxRate = preTaxIncome.map((pti, i) => {
        const tax = historicals.incomeTaxExpense[i] || 0;
        if (Math.abs(pti) > 0) return Math.abs(tax) / Math.abs(pti);
        return historicals.taxRate[i] || 0;
    });
    const netMargin = historicals.revenue.map((rev, i) => rev > 0 ? ((historicals.netIncome[i] || 0) / rev) : 0);
    const taxExpenseAbs = historicals.incomeTaxExpense.map((t) => Math.abs(t || 0));

    return {
        years: historicals.years,
        income: {
            'Total Revenue': historicals.revenue,
            'Revenue Growth': revenueGrowth,
            'Cost of Revenue': historicals.costOfRevenue,
            'Gross Profit': historicals.grossProfit,
            'Gross Margin': grossMargin,
            'Research & Development': historicals.researchAndDevelopment || [],
            'SG&A': historicals.generalAndAdministrative || [],
            'D&A (included in Operating)': historicals.depreciation,
            'EBITDA': historicals.ebitda,
            'EBITDA Margin': ebitdaMargin,
            'Operating Income (EBIT)': historicals.ebit,
            'EBIT Margin': ebitMargin,
            'Interest Expense': historicals.interestExpense,
            'Pre-Tax Income': preTaxIncome,
            'Income Taxes': taxExpenseAbs,
            'Effective Tax Rate': effectiveTaxRate,
            'Net Income': historicals.netIncome,
            'Net Margin': netMargin,
            Revenue: historicals.revenue,
            COGS: historicals.costOfRevenue,
            GrossProfit: historicals.grossProfit,
            EBIT: historicals.ebit,
            'Income Tax Expense': taxExpenseAbs,
            Tax: taxExpenseAbs,
            'Tax Rate': historicals.taxRate,
            'R&D': historicals.researchAndDevelopment || [],
            DA: historicals.depreciation,
            NetIncome: historicals.netIncome,
            'Operating Expenses': historicals.grossProfit.map((gp, i) => gp - (historicals.ebit[i] || 0)),
            'Other Operating Expenses': historicals.otherOperatingExpenses || [],
            'Sales Commission': historicals.marketing || [],
            'G&A': historicals.generalAndAdministrative || [],
            Rent: historicals.rent || [],
            'Bad Debt': historicals.badDebt || [],
            Purchases: historicals.purchases || historicals.costOfRevenue,
        },
        balance: {
            Cash: historicals.cash,
            TotalDebt: historicals.totalDebt,
            TotalAssets: historicals.totalAssets,
            ShareholdersEquity: historicals.shareholdersEquity,
            AccountsReceivable: historicals.accountsReceivable || [],
            Inventory: historicals.inventory || [],
            AccountsPayable: historicals.accountsPayable || [],
            PPENet: historicals.ppeNet || [],
            NetPPE: historicals.ppeNet || [],
            OtherAssets: historicals.otherAssets || [],
            OtherLiabilities: historicals.otherLiabilities || [],
        },
        cashflow: {
            Depreciation: historicals.depreciation,
            Capex: historicals.capex,
            StockBasedComp: historicals.stockBasedComp || [],
            DeferredTax: historicals.deferredTax || [],
            OtherNonCash: historicals.otherNonCash || [],
        },
    };
}

export function buildUiMeta(company: CompanyProfile, historicals: HistoricalData, assumptions: Assumptions, results: DCFResults): UiMeta {
    return {
        printDate: new Date().toLocaleDateString(),
        companyName: company.name,
        currency: historicals.currency || 'USD',
        confidenceLabel: results.confidenceRank,
        confidenceScore: results.confidenceScore,
        warnings: [
            ...(results.terminalGrowthWarning ? [results.terminalGrowthWarning] : []),
            ...(results.bsImbalanceWarning ? [results.bsImbalanceWarning] : []),
            ...(results.negativeCashFlowWarning ? [results.negativeCashFlowWarning] : []),
            ...(results.sectorWarning ? [results.sectorWarning] : []),
            ...(results.tvDivergenceFlag ? ['Terminal value methods show significant divergence'] : []),
        ],
        sourceNotes: [
            'WACC calculated using CAPM methodology',
            'Terminal value: ' + (assumptions.valuationMethod === 'growth' ? 'Gordon Growth Model' : 'Exit Multiple Method'),
            `Data as of ${new Date().toLocaleDateString()}`,
        ],
        keyMetrics: {
            avgROIC: results.avgROIC,
            valueCreationFlag: results.valueCreationFlag,
            tvDivergenceFlag: results.tvDivergenceFlag,
            terminalValue: results.terminalValue,
            pvTerminalValue: results.pvTerminalValue,
            enterpriseValue: results.enterpriseValue,
            equityValue: results.equityValue,
            impliedSharePrice: results.impliedSharePrice,
            impliedUpside: results.upside,
            terminalValueGordon: results.terminalValueGordon,
            terminalValueExitMultiple: results.terminalValueExitMultiple,
        },
    };
}
