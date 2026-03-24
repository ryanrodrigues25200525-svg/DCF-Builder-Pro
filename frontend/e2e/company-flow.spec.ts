import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

type CompanyCase = {
  ticker: string;
  sizeBucket: 'mega' | 'large' | 'mid';
  sector: string;
};

type CompanyResult = {
  ticker: string;
  sizeBucket: CompanyCase['sizeBucket'];
  sector: string;
  status: 'passed' | 'failed';
  companyName?: string;
  apiMs?: number;
  upstreamMs?: number;
  cacheHit?: boolean;
  dataSource?: string;
  intrinsicValue?: number;
  currentPrice?: number;
  impliedPotentialPct?: number;
  degradedReason?: string | null;
  diagnosticsVisible?: boolean;
  notes: string[];
  error?: string;
};

const COMPANIES: CompanyCase[] = [
  { ticker: 'AAPL', sizeBucket: 'mega', sector: 'technology' },
  { ticker: 'MSFT', sizeBucket: 'mega', sector: 'technology' },
  { ticker: 'NVDA', sizeBucket: 'mega', sector: 'semiconductors' },
  { ticker: 'AMZN', sizeBucket: 'mega', sector: 'consumer' },
  { ticker: 'GOOGL', sizeBucket: 'mega', sector: 'internet' },
  { ticker: 'JPM', sizeBucket: 'large', sector: 'financials' },
  { ticker: 'XOM', sizeBucket: 'large', sector: 'energy' },
  { ticker: 'COST', sizeBucket: 'large', sector: 'retail' },
  { ticker: 'PLTR', sizeBucket: 'large', sector: 'software' },
  { ticker: 'F', sizeBucket: 'mid', sector: 'autos' },
];

const REPORT_DIR = path.resolve(process.cwd(), 'output/playwright');
const REPORT_PATH = path.join(REPORT_DIR, 'dcf-company-flow-report.json');

function parseMetric(text: string, label: string): number | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`${escaped}\\s*\\$?([+\\-]?[0-9][0-9,]*\\.?[0-9]*)`, 'i'));
  if (!match) return null;
  const parsed = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePotential(text: string): number | null {
  const match = text.match(/Implied Potential\s*([+\-]?[0-9][0-9,.]*)%/i);
  if (!match) return null;
  const parsed = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

async function searchAndLoadCompany(page: Page, ticker: string) {
  const searchInput = page.getByPlaceholder(/Search ticker/i).first();

  await searchInput.click();
  await searchInput.fill('');
  await searchInput.fill(ticker);

  const requestStartedAt = Date.now();
  const responsePromise = page.waitForResponse((response) => {
    return response.url().includes(`/api/sec/company?ticker=${ticker}`) && response.request().method() === 'GET';
  }, { timeout: 45_000 });

  await searchInput.press('Enter');
  const response = await responsePromise;
  const apiMs = Date.now() - requestStartedAt;
  const payload = await response.json();

  await expect(page).toHaveURL(new RegExp(`\\?ticker=${ticker}$|\\?ticker=${ticker}&|ticker=${ticker}`), { timeout: 30_000 });
  await expect(page.getByText('Intrinsic Value')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Current Price')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Implied Potential')).toBeVisible({ timeout: 30_000 });

  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return /Intrinsic Value\s*\$?[0-9]/i.test(text) && /Current Price\s*\$?[0-9]/i.test(text);
  }, undefined, { timeout: 45_000 });

  return {
    response,
    payload,
    apiMs,
    pageText: await page.locator('body').innerText(),
  };
}

test('search -> parse -> valuation works across 10 companies', async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const results: CompanyResult[] = [];

  await page.goto('/');
  await expect(page.getByPlaceholder(/Search ticker/i).first()).toBeVisible();

  for (const company of COMPANIES) {
    const notes: string[] = [];

    try {
      console.warn(`\n[dcf-e2e] loading ${company.ticker} (${company.sizeBucket}, ${company.sector})`);
      const { response, payload, apiMs, pageText } = await searchAndLoadCompany(page, company.ticker);

      const companyName = String(payload?.profile?.name || '').trim();
      const intrinsicValue = parseMetric(pageText, 'Intrinsic Value');
      const currentPrice = parseMetric(pageText, 'Current Price');
      const impliedPotentialPct = parsePotential(pageText);
      const degradedReason = typeof payload?.degraded_reason === 'string' ? payload.degraded_reason : null;
      const diagnosticsVisible = pageText.includes('Model Health');
      const upstreamMsHeader = Number(response.headers()['x-upstream-time-ms'] || '0');
      const upstreamMs = Number.isFinite(upstreamMsHeader) ? upstreamMsHeader : 0;
      const cacheHit = response.headers()['x-cache-hit'] === 'true';
      const dataSource = response.headers()['x-data-source'] || 'unknown';
      const statements = payload?.financials_native?.statements;

      expect(payload?.profile).toBeTruthy();
      expect(payload?.financials_native).toBeTruthy();
      expect(Array.isArray(statements?.income_statement)).toBeTruthy();
      expect(Array.isArray(statements?.balance_sheet)).toBeTruthy();
      expect(Array.isArray(statements?.cashflow_statement)).toBeTruthy();
      expect(companyName.length).toBeGreaterThan(0);
      expect(intrinsicValue).not.toBeNull();
      expect(currentPrice).not.toBeNull();
      expect(impliedPotentialPct).not.toBeNull();

      if (degradedReason) {
        notes.push(`degraded inputs: ${degradedReason}`);
      }
      if (upstreamMs > 5_000) {
        notes.push(`slow upstream fetch: ${upstreamMs}ms`);
      }
      if (apiMs > 10_000) {
        notes.push(`slow end-to-end UI load: ${apiMs}ms`);
      }
      if (!cacheHit) {
        notes.push('cold or non-cached company fetch');
      }
      if (!pageText.includes(company.ticker)) {
        notes.push('ticker not obviously visible in rendered page text');
      }

      console.warn(`[dcf-e2e] passed ${company.ticker} in ${apiMs}ms`);

      results.push({
        ticker: company.ticker,
        sizeBucket: company.sizeBucket,
        sector: company.sector,
        status: 'passed',
        companyName,
        apiMs,
        upstreamMs,
        cacheHit,
        dataSource,
        intrinsicValue: intrinsicValue ?? undefined,
        currentPrice: currentPrice ?? undefined,
        impliedPotentialPct: impliedPotentialPct ?? undefined,
        degradedReason,
        diagnosticsVisible,
        notes,
      });
    } catch (error) {
      console.error(`[dcf-e2e] failed ${company.ticker}: ${error instanceof Error ? error.message : String(error)}`);
      results.push({
        ticker: company.ticker,
        sizeBucket: company.sizeBucket,
        sector: company.sector,
        status: 'failed',
        notes,
        error: error instanceof Error ? error.message : String(error),
      });

      await page.goto('/');
      await expect(page.getByPlaceholder(/Search ticker/i).first()).toBeVisible();
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    total: results.length,
    passed: results.filter((result) => result.status === 'passed').length,
    failed: results.filter((result) => result.status === 'failed').length,
    results,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2));

  expect(summary.failed, `Multi-company DCF flow report written to ${REPORT_PATH}`).toBe(0);
});
