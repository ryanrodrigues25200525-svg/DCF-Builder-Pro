"use client";

import { Fragment, type ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { formatDisplayNumber, formatDisplayPercent } from '@/core/utils/financial-format';
import type { NativeStatementRow } from '@/core/types';

const YEAR_IN_KEY_RE = /(?:19|20)\d{2}/;
const STRUCTURAL_ROW_RE = /^(assets|liabilities|equity|liabilitiesandequity|currentassets|currentliabilities|noncurrentassets|noncurrentliabilities|operatingactivities|investingactivities|financingactivities)$/;

type StatementKind = 'income' | 'balance' | 'cashflow';
type DisplayMode = 'summary' | 'full';
type ValueScale = 'billions' | 'millions' | 'perShare';
type RowTone = 'section' | 'detail' | 'subtotal' | 'grand_total' | 'overview';
type SourceTone = 'Native actual' | 'Mapped forecast' | 'Modeled only' | 'No forecast mapping';

type SummaryConcept =
    | 'revenue'
    | 'cost_of_revenue'
    | 'gross_profit'
    | 'rnd'
    | 'sga'
    | 'operating_expenses'
    | 'operating_income'
    | 'interest_expense'
    | 'pre_tax_income'
    | 'tax_expense'
    | 'net_income'
    | 'eps_basic'
    | 'eps_diluted'
    | 'cash'
    | 'marketable_securities'
    | 'accounts_receivable'
    | 'inventory'
    | 'current_assets'
    | 'ppe'
    | 'total_assets'
    | 'accounts_payable'
    | 'current_liabilities'
    | 'total_debt'
    | 'total_liabilities'
    | 'retained_earnings'
    | 'equity'
    | 'liabilities_and_equity'
    | 'cfo'
    | 'dna'
    | 'sbc'
    | 'working_capital_change'
    | 'capex'
    | 'cfi'
    | 'cff'
    | 'fcf';

interface Props {
    rows: NativeStatementRow[];
    years: number[];
    foreYears?: number[];
    headerTitle: string;
    headerColor: string;
    statementKind: StatementKind;
    displayMode: DisplayMode;
    valueScale?: ValueScale;
    getForecastValueForRow?: (row: NativeStatementRow, year: number) => number | null;
}

interface CanonicalSummaryRow {
    concept: SummaryConcept;
    row: NativeStatementRow | null;
    source: 'native' | 'mapped' | 'modeled';
}

interface SummarySection {
    id: string;
    title: string;
    rows: CanonicalSummaryRow[];
}

interface StandardizedSection {
    id: string;
    title: string;
    rows: CanonicalSummaryRow[];
    additionalRows: NativeStatementRow[];
}

interface ConceptDefinition {
    concept: SummaryConcept;
    label: string;
    matchers: string[];
    integrity?: boolean;
}

const SUMMARY_DEFINITIONS: Record<StatementKind, ConceptDefinition[]> = {
    income: [
        { concept: 'revenue', label: 'Revenue', matchers: ['totalrevenue', 'revenue', 'salesrevenue', 'contractrevenue'] },
        { concept: 'cost_of_revenue', label: 'Cost of Rev.', matchers: ['costofrevenue', 'costofsales', 'costofgoodssold'] },
        { concept: 'gross_profit', label: 'Gross Profit', matchers: ['grossprofit'] },
        { concept: 'rnd', label: 'R&D', matchers: ['researchanddevelopment'] },
        { concept: 'sga', label: 'SG&A', matchers: ['sellinggeneralandadministrative', 'generalandadministrativeexpense', 'sellingexpense'] },
        { concept: 'operating_expenses', label: 'OpEx', matchers: ['operatingexpenses'] },
        { concept: 'operating_income', label: 'Operating Income', matchers: ['operatingincome', 'operatingincomeloss', 'ebit'] },
        { concept: 'interest_expense', label: 'Interest Exp.', matchers: ['interestexpense'] },
        { concept: 'pre_tax_income', label: 'Pre-Tax Income', matchers: ['pretaxincome', 'incomebeforetax', 'incomefromcontinuingoperationsbeforeincometaxes'] },
        { concept: 'tax_expense', label: 'Tax Expense', matchers: ['incometaxexpense', 'taxexpense', 'incometaxexpensebenefit'] },
        { concept: 'net_income', label: 'Net Income', matchers: ['netincome', 'profitloss', 'netincomeloss', 'netincomeattributabletoparent'] },
        { concept: 'eps_basic', label: 'Basic EPS', matchers: ['earningspersharebasic', 'basicearningspershare'] },
        { concept: 'eps_diluted', label: 'Diluted EPS', matchers: ['earningspersharediluted', 'dilutedearningspershare'] },
    ],
    balance: [
        { concept: 'cash', label: 'Cash & Equivalents', matchers: ['cashandcashequivalentsatcarryingvalue', 'cashandcashequivalents', 'cash'] },
        { concept: 'marketable_securities', label: 'Mkt. Securities', matchers: ['marketablesecurities', 'shortterminvestments'] },
        { concept: 'accounts_receivable', label: 'A/R', matchers: ['accountsreceivable', 'receivablesnetcurrent'] },
        { concept: 'inventory', label: 'Inventory', matchers: ['inventory'] },
        { concept: 'current_assets', label: 'Current Assets', matchers: ['totalcurrentassets', 'assetscurrent'] },
        { concept: 'ppe', label: 'PP&E', matchers: ['propertyplantandequipmentnet', 'propertyplantandequipment'] },
        { concept: 'total_assets', label: 'Total Assets', matchers: ['totalassets', 'assets'] },
        { concept: 'accounts_payable', label: 'A/P', matchers: ['accountspayable'] },
        { concept: 'current_liabilities', label: 'Current Liab.', matchers: ['totalcurrentliabilities', 'liabilitiescurrent'] },
        { concept: 'total_debt', label: 'Total Debt', matchers: ['totaldebt', 'longtermdebtandcapitalleaseobligations', 'longtermdebt', 'debt', 'shorttermdebt'] },
        { concept: 'total_liabilities', label: 'Total Liab.', matchers: ['totalliabilities', 'liabilities'] },
        { concept: 'retained_earnings', label: 'Retained Earn.', matchers: ['retainedearnings'] },
        { concept: 'equity', label: 'Equity', matchers: ['stockholdersequity', 'shareholdersequity', 'totalstockholdersequity', 'equity'] },
        { concept: 'liabilities_and_equity', label: 'Liabilities & Equity', matchers: ['liabilitiesandequity', 'liabilitiesandstockholdersequity'], integrity: true },
    ],
    cashflow: [
        { concept: 'net_income', label: 'Net Income', matchers: ['netincome', 'profitloss', 'netincomeloss'] },
        { concept: 'dna', label: 'D&A', matchers: ['depreciationandamortization', 'depreciationdepletionandamortization', 'depreciation'] },
        { concept: 'sbc', label: 'Stock Comp.', matchers: ['sharebasedcompensation', 'stockbasedcompensation'] },
        { concept: 'working_capital_change', label: 'Working Capital', matchers: ['changeinworkingcapital', 'workingcapital', 'changesinoperatingassetsandliabilities'] },
        { concept: 'cfo', label: 'Cash from Ops', matchers: ['netcashfromoperatingactivities', 'cashflowfromoperations', 'netcashprovidedbyusedinoperatingactivities'] },
        { concept: 'capex', label: 'Capital Expenditures', matchers: ['capitalexpenditures', 'purchaseofpropertyplantandequipment', 'paymentstoacquirepropertyplantandequipment'] },
        { concept: 'cfi', label: 'Cash from Investing', matchers: ['netcashfrominvestingactivities', 'netcashprovidedbyusedininvestingactivities'] },
        { concept: 'cff', label: 'Cash from Financing', matchers: ['netcashfromfinancingactivities', 'netcashprovidedbyusedinfinancingactivities'] },
        { concept: 'fcf', label: 'Free Cash Flow', matchers: ['freecashflow', 'freecashflowfcff'] },
    ],
};

const SUMMARY_SECTION_ORDER: Record<StatementKind, Array<{ id: string; title: string; concepts: SummaryConcept[] }>> = {
    income: [
        { id: 'performance', title: 'Performance', concepts: ['revenue', 'cost_of_revenue', 'gross_profit'] },
        { id: 'operating', title: 'Operating Expenses', concepts: ['rnd', 'sga', 'operating_expenses', 'operating_income'] },
        { id: 'profitability', title: 'Profitability', concepts: ['interest_expense', 'pre_tax_income', 'tax_expense', 'net_income'] },
        { id: 'per_share', title: 'Per Share', concepts: ['eps_basic', 'eps_diluted'] },
    ],
    balance: [
        { id: 'assets', title: 'Assets', concepts: ['cash', 'marketable_securities', 'accounts_receivable', 'inventory', 'current_assets', 'ppe', 'total_assets'] },
        { id: 'liabilities', title: 'Liabilities', concepts: ['accounts_payable', 'current_liabilities', 'total_debt', 'total_liabilities'] },
        { id: 'equity', title: 'Equity', concepts: ['retained_earnings', 'equity'] },
    ],
    cashflow: [
        { id: 'operations', title: 'Operating Activities', concepts: ['net_income', 'dna', 'sbc', 'working_capital_change', 'cfo'] },
        { id: 'investing', title: 'Investing Activities', concepts: ['capex', 'cfi'] },
        { id: 'financing', title: 'Financing Activities', concepts: ['cff', 'fcf'] },
    ],
};

const STANDARDIZED_SECTION_ORDER: Record<StatementKind, Array<{ id: string; title: string; concepts: SummaryConcept[]; aliases: string[] }>> = {
    income: [
        { id: 'revenue', title: 'Revenue', concepts: ['revenue', 'cost_of_revenue', 'gross_profit'], aliases: ['Revenue'] },
        { id: 'operating_costs', title: 'Operating Costs', concepts: ['rnd', 'sga', 'operating_expenses', 'operating_income'], aliases: ['Operating Expenses'] },
        { id: 'taxes_other', title: 'Taxes & Other', concepts: ['interest_expense', 'pre_tax_income', 'tax_expense', 'net_income'], aliases: ['Pre-Tax / Other', 'Taxes'] },
        { id: 'per_share', title: 'Per Share', concepts: ['eps_basic', 'eps_diluted'], aliases: ['EPS / Supplemental'] },
    ],
    balance: [
        { id: 'assets', title: 'Assets', concepts: ['cash', 'marketable_securities', 'accounts_receivable', 'inventory', 'current_assets', 'ppe', 'total_assets'], aliases: ['Current Assets', 'Non-Current Assets'] },
        { id: 'liabilities', title: 'Liabilities', concepts: ['accounts_payable', 'current_liabilities', 'total_debt', 'total_liabilities'], aliases: ['Current Liabilities', 'Non-Current Liabilities'] },
        { id: 'equity', title: 'Equity', concepts: ['retained_earnings', 'equity'], aliases: ['Equity'] },
    ],
    cashflow: [
        { id: 'operations', title: 'Operating Activities', concepts: ['net_income', 'dna', 'sbc', 'working_capital_change', 'cfo'], aliases: ['Operating Activities'] },
        { id: 'investing', title: 'Investing Activities', concepts: ['capex', 'cfi'], aliases: ['Investing Activities'] },
        { id: 'financing', title: 'Financing Activities', concepts: ['cff', 'fcf'], aliases: ['Financing Activities'] },
    ],
};

const SECTION_FALLBACKS: Record<StatementKind, Array<{ title: string; matchers: string[] }>> = {
    income: [
        { title: 'Revenue', matchers: ['revenue', 'grossprofit'] },
        { title: 'Operating Expenses', matchers: ['sellinggeneralandadministrative', 'researchanddevelopment', 'operatingexpenses', 'depreciation'] },
        { title: 'Pre-Tax / Other', matchers: ['pretaxincome', 'interestexpense', 'otherincome'] },
        { title: 'Taxes', matchers: ['tax', 'incometaxexpense'] },
        { title: 'EPS / Supplemental', matchers: ['earningspershare', 'shares', 'supplemental'] },
    ],
    balance: [
        { title: 'Current Assets', matchers: ['cash', 'marketablesecurities', 'accountsreceivable', 'inventory', 'assetscurrent'] },
        { title: 'Non-Current Assets', matchers: ['propertyplantandequipment', 'goodwill', 'intangibles', 'otherassets', 'assetsnoncurrent'] },
        { title: 'Current Liabilities', matchers: ['accountspayable', 'liabilitiescurrent', 'shorttermdebt', 'accrued'] },
        { title: 'Non-Current Liabilities', matchers: ['longtermdebt', 'otherliabilities', 'liabilitiesnoncurrent'] },
        { title: 'Equity', matchers: ['equity', 'stockholdersequity', 'retainedearnings', 'liabilitiesandequity'] },
    ],
    cashflow: [
        { title: 'Operating Activities', matchers: ['operatingactivities', 'netcashfromoperatingactivities', 'depreciation', 'workingcapital', 'sharebasedcompensation'] },
        { title: 'Investing Activities', matchers: ['investingactivities', 'capitalexpenditures', 'netcashfrominvestingactivities'] },
        { title: 'Financing Activities', matchers: ['financingactivities', 'netcashfromfinancingactivities', 'debt', 'repurchase'] },
    ],
};

function parseYearFromColumn(key: string): number | null {
    const match = key.match(YEAR_IN_KEY_RE);
    if (!match) return null;
    const year = Number(match[0]);
    return Number.isFinite(year) ? year : null;
}

function getNativeRowValue(row: NativeStatementRow, year: number): number | null {
    let selected: number | null = null;
    let selectedKey = '';
    for (const key of Object.keys(row)) {
        const keyYear = parseYearFromColumn(key);
        if (keyYear !== year) continue;
        if (key > selectedKey) {
            const parsed = Number(row[key]);
            selected = Number.isFinite(parsed) ? parsed : null;
            selectedKey = key;
        }
    }
    return selected;
}

function normalizeToken(value: string | null | undefined): string {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function getRowSearchText(row: NativeStatementRow): string {
    return [row.standard_concept, row.concept, row.label].map((value) => normalizeToken(value)).join(' ');
}

function getNativeLabel(row: NativeStatementRow, fallback = 'Line Item'): string {
    return String(row.label || row.standard_concept || row.concept || fallback).replace(/\s+/g, ' ').trim();
}

function getBestForecastMatch(row: NativeStatementRow, foreYears: number[], getForecastValueForRow?: (row: NativeStatementRow, year: number) => number | null): number | null {
    if (!getForecastValueForRow) return null;
    for (const year of foreYears) {
        const value = getForecastValueForRow(row, year);
        if (value !== null) return value;
    }
    return null;
}

function isNativeRowTotal(row: NativeStatementRow): boolean {
    const rowLike = row as NativeStatementRow & { is_total?: unknown };
    if (typeof rowLike.is_total === 'boolean') return rowLike.is_total;
    if (typeof rowLike.is_total === 'number') return rowLike.is_total !== 0;
    if (typeof rowLike.is_total === 'string') {
        const normalized = rowLike.is_total.trim().toLowerCase();
        return normalized === 'true' || normalized === '1' || normalized === 'yes';
    }
    return (row.level ?? 1) <= 0;
}

function hasAnyHistoricalValues(row: NativeStatementRow, historicalYears: number[]): boolean {
    return historicalYears.some((year) => getNativeRowValue(row, year) !== null);
}

function getRowDensity(row: NativeStatementRow, years: number[]): number {
    return years.reduce((count, year) => count + (getNativeRowValue(row, year) !== null ? 1 : 0), 0);
}

function rowLooksSection(row: NativeStatementRow, historicalYears: number[]): boolean {
    const normalizedLabel = normalizeToken(getNativeLabel(row));
    if (!hasAnyHistoricalValues(row, historicalYears)) return true;
    return STRUCTURAL_ROW_RE.test(normalizedLabel) && !isNativeRowTotal(row);
}

function scoreRowForConcept(
    row: NativeStatementRow,
    matchers: string[],
    historicalYears: number[],
    exactPreferredMatcher?: string,
): number {
    const search = getRowSearchText(row);
    const normalizedLabel = normalizeToken(getNativeLabel(row));
    let score = -1;

    for (const matcher of matchers) {
        if (normalizeToken(row.standard_concept) === matcher) score = Math.max(score, 1000);
        if (normalizeToken(row.concept) === matcher) score = Math.max(score, 900);
        if (normalizedLabel === matcher) score = Math.max(score, 800);
        if (search.includes(matcher)) score = Math.max(score, 700);
    }

    if (score < 0) return score;
    if (exactPreferredMatcher && normalizeToken(row.standard_concept) === exactPreferredMatcher) score += 60;
    if (isNativeRowTotal(row)) score += 40;
    score += Math.max(0, 20 - Math.min(20, row.level ?? 0));
    score += getRowDensity(row, historicalYears) * 3;
    if (rowLooksSection(row, historicalYears)) score -= 120;
    return score;
}

function chooseBestRepresentative(
    rows: NativeStatementRow[],
    definition: ConceptDefinition,
    historicalYears: number[],
): NativeStatementRow | null {
    let best: NativeStatementRow | null = null;
    let bestScore = -1;

    for (const row of rows) {
        const score = scoreRowForConcept(row, definition.matchers, historicalYears, definition.matchers[0]);
        if (score > bestScore) {
            best = row;
            bestScore = score;
        }
    }

    return bestScore >= 0 ? best : null;
}

function buildCanonicalSummaryRows(
    rows: NativeStatementRow[],
    kind: StatementKind,
    historicalYears: number[],
    foreYears: number[],
    getForecastValueForRow?: (row: NativeStatementRow, year: number) => number | null,
): CanonicalSummaryRow[] {
    return SUMMARY_DEFINITIONS[kind]
        .map<CanonicalSummaryRow | null>((definition) => {
            const row = chooseBestRepresentative(rows, definition, historicalYears);
            if (!row) {
                return definition.concept === 'fcf'
                    ? { concept: definition.concept, row: null, source: 'modeled' as const }
                    : null;
            }

            const hasHistorical = hasAnyHistoricalValues(row, historicalYears);
            const hasForecast = getBestForecastMatch(row, foreYears, getForecastValueForRow) !== null;
            const source = hasHistorical ? 'native' : hasForecast ? 'mapped' : 'modeled';
            return { concept: definition.concept, row, source };
        })
        .filter((entry): entry is CanonicalSummaryRow => entry !== null)
        .filter((entry) => entry.row !== null || entry.concept === 'fcf');
}

function getSummaryRows(canonicalRows: CanonicalSummaryRow[], kind: StatementKind): CanonicalSummaryRow[] {
    if (kind !== 'balance') return canonicalRows.filter((entry) => entry.row !== null);
    return canonicalRows.filter((entry) => entry.concept !== 'liabilities_and_equity' && entry.row !== null);
}

function getIntegrityRow(canonicalRows: CanonicalSummaryRow[]): CanonicalSummaryRow | null {
    return canonicalRows.find((entry) => entry.concept === 'liabilities_and_equity' && entry.row !== null) ?? null;
}

function getSummarySections(canonicalRows: CanonicalSummaryRow[], kind: StatementKind): SummarySection[] {
    const rowMap = new Map(canonicalRows.filter((entry) => entry.row !== null).map((entry) => [entry.concept, entry]));
    return SUMMARY_SECTION_ORDER[kind]
        .map((section) => ({
            id: section.id,
            title: section.title,
            rows: section.concepts
                .map((concept) => rowMap.get(concept))
                .filter((entry): entry is CanonicalSummaryRow => Boolean(entry)),
        }))
        .filter((section) => section.rows.length > 0);
}

function inferSectionTitle(row: NativeStatementRow, kind: StatementKind): string | null {
    const search = getRowSearchText(row);
    const match = SECTION_FALLBACKS[kind].find((section) => section.matchers.some((matcher) => search.includes(matcher)));
    return match?.title ?? null;
}

function getDisplayValue(
    row: NativeStatementRow,
    year: number,
    foreYears: number[],
    getForecastValueForRow?: (row: NativeStatementRow, year: number) => number | null,
): number | null {
    if (foreYears.includes(year) && getForecastValueForRow) {
        const forecastValue = getForecastValueForRow(row, year);
        if (forecastValue !== null) return forecastValue;
    }
    return getNativeRowValue(row, year);
}

function isRowEmpty(
    row: NativeStatementRow,
    years: number[],
    foreYears: number[],
    getForecastValueForRow?: (row: NativeStatementRow, year: number) => number | null,
): boolean {
    return years.every((year) => {
        const value = getDisplayValue(row, year, foreYears, getForecastValueForRow);
        return value === null || Math.abs(value) <= 0.0001;
    });
}

function getStandardizedSections(
    rows: NativeStatementRow[],
    canonicalRows: CanonicalSummaryRow[],
    kind: StatementKind,
    years: number[],
    foreYears: number[],
    historicalYears: number[],
    getForecastValueForRow?: (row: NativeStatementRow, year: number) => number | null,
): StandardizedSection[] {
    const rowMap = new Map(canonicalRows.filter((entry) => entry.row !== null).map((entry) => [entry.concept, entry]));
    const matchedRows = new Set(
        canonicalRows
            .map((entry) => entry.row)
            .filter((row): row is NativeStatementRow => row !== null),
    );

    return STANDARDIZED_SECTION_ORDER[kind]
        .map((section) => {
            const templateRows = section.concepts
                .map((concept) => rowMap.get(concept))
                .filter((entry): entry is CanonicalSummaryRow => Boolean(entry));

            const additionalRows = rows.filter((row) => {
                if (matchedRows.has(row)) return false;
                if (
                    kind === 'balance'
                    && SUMMARY_DEFINITIONS.balance
                        .filter((definition) => definition.integrity)
                        .some((definition) => scoreRowForConcept(row, definition.matchers, historicalYears) >= 900)
                ) {
                    return false;
                }
                if (rowLooksSection(row, historicalYears)) return false;
                if (isRowEmpty(row, years, foreYears, getForecastValueForRow)) return false;
                const inferred = inferSectionTitle(row, kind);
                return inferred !== null && section.aliases.includes(inferred);
            });

            return {
                id: section.id,
                title: section.title,
                rows: templateRows,
                additionalRows,
            };
        })
        .filter((section) => section.rows.length > 0 || section.additionalRows.length > 0);
}

function getSourceTone(row: NativeStatementRow, foreYears: number[], getForecastValueForRow?: (row: NativeStatementRow, year: number) => number | null): SourceTone {
    const forecastValue = getBestForecastMatch(row, foreYears, getForecastValueForRow);
    const hasHistorical = Object.keys(row).some((key) => parseYearFromColumn(key) !== null && Number.isFinite(Number(row[key])));
    if (hasHistorical && forecastValue !== null) return 'Mapped forecast';
    if (hasHistorical) return 'Native actual';
    if (forecastValue !== null) return 'Modeled only';
    return 'No forecast mapping';
}

function buildRowTooltip(row: NativeStatementRow, label: string, foreYears: number[], getForecastValueForRow?: (row: NativeStatementRow, year: number) => number | null): string {
    const parts = [label, `Source: ${getSourceTone(row, foreYears, getForecastValueForRow)}`];
    if (row.standard_concept) parts.push(`Standard: ${row.standard_concept}`);
    if (row.concept) parts.push(`Concept: ${row.concept}`);
    return parts.join('\n');
}

function formatCellValue(label: string, value: number, scale: ValueScale = 'billions'): string {
    const normalized = normalizeToken(label);
    if (normalized.includes('margin') || normalized.includes('growth') || normalized.includes('yield') || normalized.includes('rate')) {
        return formatDisplayPercent(value);
    }
    if (normalized.includes('earningspershare') || normalized.includes('pershare') || normalized.includes('eps')) {
        return formatDisplayNumber(value, 2);
    }
    if (scale === 'perShare') {
        return formatDisplayNumber(value, 2);
    }
    if (scale === 'millions') {
        const num = value / 1_000_000;
        const formatted = Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        return num < 0 ? `(${formatted}M)` : `${formatted}M`;
    }
    const num = value / 1_000_000_000;
    const formatted = Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return num < 0 ? `(${formatted}B)` : `${formatted}B`;
}

const SECTION_ACCENTS: Record<StatementKind, Record<string, string>> = {
    income: {
        revenue: '#10b981',
        operating_costs: '#f59e0b',
        taxes_other: '#a855f7',
        per_share: '#64748b',
    },
    balance: {
        assets: '#10b981',
        liabilities: '#a855f7',
        equity: '#ec4899',
    },
    cashflow: {
        operations: '#22c55e',
        investing: '#14b8a6',
        financing: '#10b981',
    },
};

const CONCEPT_ACCENTS: Partial<Record<SummaryConcept, string>> = {
    revenue: '#10b981',
    gross_profit: '#06b6d4',
    operating_income: '#3b82f6',
    pre_tax_income: '#3b82f6',
    net_income: '#ec4899',
    cash: '#10b981',
    marketable_securities: '#10b981',
    accounts_receivable: '#10b981',
    inventory: '#10b981',
    current_assets: '#06b6d4',
    ppe: '#10b981',
    total_assets: '#3b82f6',
    accounts_payable: '#a855f7',
    current_liabilities: '#d946ef',
    total_debt: '#a855f7',
    total_liabilities: '#f472b6',
    retained_earnings: '#ec4899',
    equity: '#ec4899',
};

function getSectionAccent(kind: StatementKind, sectionId: string, fallback: string): string {
    return SECTION_ACCENTS[kind][sectionId] ?? fallback;
}

function getCanonicalLabel(kind: StatementKind, concept: SummaryConcept, row: NativeStatementRow): string {
    return SUMMARY_DEFINITIONS[kind].find((definition) => definition.concept === concept)?.label || getNativeLabel(row);
}

function isKeyTotalConcept(kind: StatementKind, concept: SummaryConcept): boolean {
    if (kind === 'income') {
        return ['revenue', 'gross_profit', 'operating_income', 'pre_tax_income', 'net_income'].includes(concept);
    }
    if (kind === 'balance') {
        return ['current_assets', 'total_assets', 'current_liabilities', 'total_liabilities', 'equity'].includes(concept);
    }
    return ['net_income', 'cfo', 'cfi', 'cff', 'fcf'].includes(concept);
}

function getConceptAccent(kind: StatementKind, sectionId: string, concept: SummaryConcept, fallback: string): string {
    if (kind === 'income' || kind === 'balance') {
        return CONCEPT_ACCENTS[concept] ?? getSectionAccent(kind, sectionId, fallback);
    }
    return getSectionAccent(kind, sectionId, fallback);
}

function classifyRowTone(row: NativeStatementRow, label: string): RowTone {
    const normalized = normalizeToken(label);
    if (STRUCTURAL_ROW_RE.test(normalized) && !isNativeRowTotal(row)) return 'section';
    if (isNativeRowTotal(row)) {
        if (normalized.includes('total') || normalized.includes('netcash') || normalized.includes('operatingincome') || normalized.includes('netincome') || normalized.includes('stockholdersequity')) {
            return 'grand_total';
        }
        return 'subtotal';
    }
    return 'detail';
}

function SummarySectionHeader({ title }: { title: string }) {
    return (
        <tr className="financials-summary-header bg-[var(--financials-section-header-bg)]">
            <td className="financials-summary-header-cell sticky left-0 z-30 border-b border-r border-[var(--financials-border)] bg-[var(--financials-section-header-bg)] px-6 py-3">
                <span className="font-[family:var(--font-display)] text-[11px] font-medium tracking-[0.06em] text-[var(--financials-section-header-text)]">{title}</span>
            </td>
            <td colSpan={999} className="financials-summary-header-fill border-b border-[var(--financials-border)] bg-[var(--financials-section-header-bg)]" />
        </tr>
    );
}

function DataRow({
    row,
    label,
    rowIndex = 0,
    years,
    foreYears,
    firstForecastYear,
    headerColor,
    getForecastValueForRow,
    tone,
    compact = false,
    accentColor,
    indentLevel = 0,
    muted = false,
    valueScale = 'billions',
}: {
    row: NativeStatementRow;
    label: string;
    rowIndex?: number;
    years: number[];
    foreYears: number[];
    firstForecastYear: number | null;
    headerColor: string;
    getForecastValueForRow?: (row: NativeStatementRow, year: number) => number | null;
    tone?: RowTone;
    compact?: boolean;
    accentColor?: string;
    indentLevel?: number;
    muted?: boolean;
    valueScale?: ValueScale;
}) {
    const rowTone = tone ?? classifyRowTone(row, label);
    const tooltip = buildRowTooltip(row, label, foreYears, getForecastValueForRow);
    const isGrand = rowTone === 'grand_total' || rowTone === 'overview' || rowTone === 'subtotal';
    const zebra = rowIndex % 2 === 0;
    const resolvedAccent = accentColor ?? headerColor;
    const leftPaddingClass = indentLevel === 0 ? 'pl-0' : indentLevel === 1 ? 'pl-8' : 'pl-12';
    const rowBackground = isGrand
        ? 'bg-[var(--financials-row-strong-bg)] hover:bg-[var(--financials-row-hover-bg)]'
        : zebra
            ? 'bg-[var(--financials-row-alt-bg)] hover:bg-[var(--financials-row-hover-bg)]'
            : 'bg-[var(--financials-row-bg)] hover:bg-[var(--financials-row-hover-bg)]';
    const leftCellBackground = isGrand ? 'bg-[var(--financials-sticky-strong-bg)]' : 'bg-[var(--financials-sticky-bg)]';
    const leftLabelColor = isGrand ? resolvedAccent : muted ? 'var(--financials-label-muted)' : 'var(--financials-label-text)';
    const indicatorWidth = isGrand ? 'w-1' : 'w-px';
    const indicatorHeight = isGrand ? 'h-5' : 'h-4';
    const indicatorOpacity = isGrand ? 'opacity-100' : muted ? 'opacity-25' : 'opacity-35';

    return (
        <tr className={cn(
            'financials-data-row',
            rowTone === 'grand_total' && 'financials-row-grand',
            rowTone === 'overview' && 'financials-row-overview',
            rowTone === 'subtotal' && 'financials-row-subtotal',
            rowTone === 'detail' && 'financials-row-detail',
            'group transition-colors',
            rowBackground,
        )}>
            <td
                className={cn(
                    'financials-sticky-cell financials-label-cell',
                    'sticky left-0 z-30 border-b border-r border-[var(--financials-border)] px-4 transition-colors',
                    leftCellBackground,
                    compact ? 'py-3' : 'py-3.5',
                )}
                title={tooltip}
            >
                <div className={cn('flex items-center gap-3', leftPaddingClass)}>
                    <span
                        className={cn(
                            'block rounded-full',
                            indicatorWidth,
                            indicatorHeight,
                            indicatorOpacity,
                        )}
                        style={{ backgroundColor: resolvedAccent }}
                    />
                    <span
                        className={cn(
                            'block max-w-[340px] truncate font-[family:var(--font-display)] leading-snug lg:max-w-[400px]',
                            compact ? 'text-[13px]' : 'text-[14px]',
                            isGrand ? 'font-semibold' : 'font-normal',
                        )}
                        style={{ color: leftLabelColor }}
                    >
                        {label}
                    </span>
                </div>
            </td>
            {years.map((year) => {
                const isForecast = foreYears.includes(year);
                const value = getDisplayValue(row, year, foreYears, getForecastValueForRow);
                const isNA = value === null;
                const isNegative = value !== null && value < 0;
                return (
                    <td
                        key={`${label}-${year}`}
                        className={cn(
                            'financials-value-cell',
                            isForecast && 'financials-value-forecast',
                            isGrand && 'financials-value-grand',
                            isNA && 'financials-value-na',
                            isNegative && !isNA && 'financials-value-negative',
                            'border-b border-[var(--financials-border)] px-6 text-right font-mono tracking-tight tabular-nums',
                            compact ? 'py-3 text-[12px]' : 'py-3.5 text-[13px]',
                            isGrand ? 'font-bold' : 'font-medium',
                            isForecast ? 'forecast-column bg-[var(--financials-forecast-cell-bg)]' : isGrand ? 'bg-[var(--financials-row-strong-bg)]' : zebra ? 'bg-[var(--financials-row-alt-bg)]' : 'bg-[var(--financials-row-bg)]',
                            firstForecastYear === year && 'border-l border-l-[var(--financials-forecast-divider)]',
                            isNA ? 'text-[var(--financials-value-muted)]' : isGrand ? 'text-[var(--financials-value-strong)]' : 'text-[var(--financials-value-text)]',
                            isNegative && !isNA && 'text-[var(--color-red)]',
                            isForecast && !isNA && !isNegative && 'text-[var(--financials-forecast-value-text)]',
                        )}
                    >
                        {isNA ? '—' : formatCellValue(label, value, valueScale)}
                    </td>
                );
            })}
        </tr>
    );
}

function IntegrityRow({
    row,
    label,
    years,
    foreYears,
    firstForecastYear,
    getForecastValueForRow,
    valueScale = 'billions',
}: {
    row: NativeStatementRow;
    label: string;
    years: number[];
    foreYears: number[];
    firstForecastYear: number | null;
    getForecastValueForRow?: (row: NativeStatementRow, year: number) => number | null;
    valueScale?: ValueScale;
}) {
    return (
        <tr className="financials-integrity-row bg-[var(--financials-integrity-bg)]">
            <td className="financials-sticky-cell sticky left-0 z-30 border-b border-r border-[var(--financials-border)] bg-[var(--financials-integrity-bg)] px-6 py-4 text-[12px] font-semibold uppercase text-[var(--financials-integrity-text)]">
                {label}
            </td>
            {years.map((year) => {
                const value = getDisplayValue(row, year, foreYears, getForecastValueForRow);
                const isForecast = foreYears.includes(year);
                return (
                    <td
                        key={`${label}-${year}`}
                        className={cn(
                            'financials-value-cell',
                            isForecast && 'financials-value-forecast',
                            'border-b border-[var(--financials-border)] px-6 py-4 text-right text-[13px] font-mono font-bold uppercase',
                            firstForecastYear === year && 'border-l border-l-[var(--financials-forecast-divider)]',
                            isForecast ? 'bg-[var(--financials-forecast-cell-bg)] text-[var(--financials-integrity-text)]' : 'text-[var(--financials-value-muted)]',
                        )}
                    >
                        {value === null ? '—' : formatCellValue(label, value, valueScale)}
                    </td>
                );
            })}
        </tr>
    );
}

function SectionBlock({
    title,
    years,
    headerColor,
    showTitle = true,
    children,
}: {
    title: string;
    years: number;
    headerColor: string;
    showTitle?: boolean;
    children: ReactNode;
}) {
    if (!showTitle) {
        return <>{children}</>;
    }

    return (
        <>
            <tr className="financials-section-block bg-[var(--financials-section-bg)]">
                <td className="financials-sticky-cell sticky left-0 z-30 border-b border-r border-[var(--financials-border)] bg-[var(--financials-section-bg)] px-4 py-3.5">
                    <div className="relative flex w-full items-center">
                        <span
                            className="h-5 w-1 rounded-sm"
                            style={{ backgroundColor: headerColor }}
                        />
                        <span
                            className="truncate pl-3 font-[family:var(--font-display)] text-[14px] font-semibold"
                            style={{ color: headerColor }}
                        >
                            {title}
                        </span>
                    </div>
                </td>
                <td colSpan={years} className="financials-section-fill border-b border-[var(--financials-border)] bg-[var(--financials-section-bg)]" />
            </tr>
            {children}
        </>
    );
}

export function NativeStatementTable({
    rows,
    years,
    foreYears = [],
    headerTitle,
    headerColor,
    statementKind,
    displayMode,
    valueScale = 'billions',
    getForecastValueForRow,
}: Props) {
    const historicalYears = years.filter((year) => !foreYears.includes(year));
    const firstForecastYear = foreYears.length > 0 ? Math.min(...foreYears) : null;

    const canonicalRows = useMemo(
        () => buildCanonicalSummaryRows(rows, statementKind, historicalYears, foreYears, getForecastValueForRow),
        [rows, statementKind, historicalYears, foreYears, getForecastValueForRow],
    );
    const summaryRows = useMemo(() => getSummaryRows(canonicalRows, statementKind), [canonicalRows, statementKind]);
    const summarySections = useMemo(() => getSummarySections(summaryRows, statementKind), [summaryRows, statementKind]);
    const integrityRow = useMemo(() => statementKind === 'balance' ? getIntegrityRow(canonicalRows) : null, [canonicalRows, statementKind]);
    const fullSections = useMemo(
        () => getStandardizedSections(rows, summaryRows, statementKind, years, foreYears, historicalYears, getForecastValueForRow),
        [rows, summaryRows, statementKind, years, foreYears, historicalYears, getForecastValueForRow],
    );

    const [additionalOverrides, setAdditionalOverrides] = useState<Record<string, boolean>>({});

    if (rows.length === 0 || years.length === 0) {
        return (
            <tr>
                <td className="sticky left-0 z-30 border-r border-[var(--border-subtle)] bg-[var(--bg-app)]/95 px-6 py-6 text-[12px] font-semibold text-[var(--text-secondary)]">
                    {headerTitle}
                </td>
                <td colSpan={Math.max(years.length, 1)} className="px-6 py-6 text-[13px] text-[var(--text-secondary)]">
                    Native statement data unavailable.
                </td>
            </tr>
        );
    }

    const toggleAdditionalRows = (sectionId: string) => {
        setAdditionalOverrides((prev) => ({
            ...prev,
            [sectionId]: !(prev[sectionId] ?? false),
        }));
    };

    return (
        <>
            {displayMode === 'summary' && summarySections.map((section) => (
                <Fragment key={`summary-section-${section.id}`}>
                    <SummarySectionHeader title={section.title} />
                    {section.rows.map((entry, index) => (
                        entry.row ? (
                            <DataRow
                                key={`summary-${section.id}-${entry.concept}`}
                                row={entry.row}
                                rowIndex={index}
                                label={SUMMARY_DEFINITIONS[statementKind].find((definition) => definition.concept === entry.concept)?.label || getNativeLabel(entry.row)}
                                years={years}
                                foreYears={foreYears}
                                firstForecastYear={firstForecastYear}
                                headerColor={headerColor}
                                getForecastValueForRow={getForecastValueForRow}
                                valueScale={valueScale}
                                tone={
                                    entry.concept === 'revenue' ||
                                    entry.concept === 'gross_profit' ||
                                    entry.concept === 'operating_income' ||
                                    entry.concept === 'pre_tax_income' ||
                                    entry.concept === 'net_income' ||
                                    entry.concept === 'total_assets' ||
                                    entry.concept === 'total_liabilities' ||
                                    entry.concept === 'equity' ||
                                    entry.concept === 'cfo' ||
                                    entry.concept === 'cfi' ||
                                    entry.concept === 'cff' ||
                                    entry.concept === 'fcf'
                                        ? 'grand_total'
                                        : entry.source === 'mapped'
                                            ? 'overview'
                                            : undefined
                                }
                            />
                        ) : null
                    ))}
                </Fragment>
            ))}

            {displayMode === 'summary' && integrityRow?.row ? (
                <IntegrityRow
                    row={integrityRow.row}
                    label="Liabilities & Equity"
                    years={years}
                    foreYears={foreYears}
                    firstForecastYear={firstForecastYear}
                    getForecastValueForRow={getForecastValueForRow}
                    valueScale={valueScale}
                />
            ) : null}

            {displayMode === 'full' && fullSections.map((section) => {
                const sectionAccent = getSectionAccent(statementKind, section.id, headerColor);
                const hasCanonicalTitleRow = section.rows.some((entry) => (
                    entry.row
                    && normalizeToken(section.title) === normalizeToken(getCanonicalLabel(statementKind, entry.concept, entry.row))
                ));
                const shouldShowTitle = !hasCanonicalTitleRow;

                return (
                <SectionBlock
                    key={section.id}
                    title={section.title}
                    years={years.length}
                    headerColor={sectionAccent}
                    showTitle={shouldShowTitle}
                >
                    <>
                        {section.rows.map((entry, index) => (
                            entry.row ? (
                                (() => {
                                    const label = getCanonicalLabel(statementKind, entry.concept, entry.row);
                                    const isKeyTotal = isKeyTotalConcept(statementKind, entry.concept);
                                    const accent = getConceptAccent(statementKind, section.id, entry.concept, sectionAccent);

                                    return (
                                <DataRow
                                    key={`${section.id}-${entry.concept}`}
                                    row={entry.row}
                                    rowIndex={index}
                                    label={label}
                                    years={years}
                                    foreYears={foreYears}
                                    firstForecastYear={firstForecastYear}
                                    headerColor={sectionAccent}
                                    getForecastValueForRow={getForecastValueForRow}
                                    tone={isKeyTotal ? 'grand_total' : 'detail'}
                                    accentColor={accent}
                                    indentLevel={isKeyTotal ? 0 : 1}
                                    valueScale={valueScale}
                                />
                                    );
                                })()
                            ) : null
                        ))}
                        {section.additionalRows.length > 0 ? (
                            <>
                                <tr className="financials-additional-row">
                                    <td className="financials-sticky-cell sticky left-0 z-30 border-b border-r border-[var(--financials-border)] bg-[var(--financials-sticky-bg)] px-0 py-0">
                                        <button
                                            onClick={() => toggleAdditionalRows(section.id)}
                                            className="financials-additional-toggle group flex w-full items-center justify-between border-t border-dashed border-[var(--financials-border)] bg-[var(--financials-sticky-bg)] px-5 py-3 text-left transition hover:bg-[var(--financials-row-hover-bg)]"
                                        >
                                            <span className="flex min-w-0 items-center gap-3">
                                                <span className="font-[family:var(--font-display)] text-[11px] italic text-[var(--financials-value-muted)] transition group-hover:text-[var(--financials-label-text)]">
                                                    Additional line items
                                                </span>
                                            </span>
                                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full text-[var(--financials-header-icon)] transition group-hover:bg-[var(--financials-pill-bg)] group-hover:text-[var(--financials-header-muted)]">
                                                {additionalOverrides[section.id] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                            </span>
                                        </button>
                                    </td>
                                    <td colSpan={999} className="financials-additional-fill border-b border-[var(--financials-border)] bg-[var(--financials-row-bg)]" />
                                </tr>
                                {additionalOverrides[section.id] ? section.additionalRows.map((row, index) => (
                                    <DataRow
                                        key={`${section.id}-additional-${index}`}
                                        row={row}
                                        rowIndex={index}
                                        label={getNativeLabel(row)}
                                        years={years}
                                        foreYears={foreYears}
                                        firstForecastYear={firstForecastYear}
                                        headerColor={sectionAccent}
                                        getForecastValueForRow={getForecastValueForRow}
                                        accentColor={sectionAccent}
                                        indentLevel={2}
                                        muted
                                        valueScale={valueScale}
                                    />
                                )) : null}
                            </>
                        ) : null}
                    </>
                </SectionBlock>
            )})}

            {displayMode === 'full' && integrityRow?.row ? (
                <IntegrityRow
                    row={integrityRow.row}
                    label="Liabilities & Equity"
                    years={years}
                    foreYears={foreYears}
                    firstForecastYear={firstForecastYear}
                    getForecastValueForRow={getForecastValueForRow}
                    valueScale={valueScale}
                />
            ) : null}
        </>
    );
}
