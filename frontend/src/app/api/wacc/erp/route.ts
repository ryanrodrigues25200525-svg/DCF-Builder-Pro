import { NextResponse } from 'next/server';
import { getEquityRiskPremium, getAllCountryRiskPremiums } from '@/services/integration/market-data/damodaran';

export const dynamic = 'force-dynamic';

/**
 * GET /api/wacc/erp
 * Returns the current Equity Risk Premium data
 */
export async function GET() {
  try {
    const erp = getEquityRiskPremium();
    const allCountries = getAllCountryRiskPremiums();

    return NextResponse.json({
      erp,
      countries: allCountries,
      defaultERP: erp.erp,
    });
  } catch (error) {
    console.error('[API /wacc/erp] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ERP data' },
      { status: 500 }
    );
  }
}
