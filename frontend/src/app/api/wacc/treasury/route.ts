import { NextResponse } from 'next/server';
import { getRiskFreeRate, getYieldCurve, DEFAULT_YIELDS } from '@/services/integration/market-data/treasury';

export const dynamic = 'force-dynamic';

/**
 * GET /api/wacc/treasury
 * Returns current US Treasury yields
 * Query params:
 *   - maturity: '10y' | '30y' (optional, defaults to full curve)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const maturity = searchParams.get('maturity') as '10y' | '30y' | null;

    if (maturity) {
      // Return specific maturity
      const rate = await getRiskFreeRate(maturity);
      return NextResponse.json({
        maturity,
        rate,
        asOf: new Date().toISOString(),
      });
    }

    // Return full yield curve
    const yieldCurve = await getYieldCurve();

    return NextResponse.json({
      yieldCurve,
      defaults: DEFAULT_YIELDS,
      asOf: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /wacc/treasury] Error:', error);

    // Return default data on error
    return NextResponse.json({
      yieldCurve: DEFAULT_YIELDS,
      error: 'Failed to fetch live treasury data, using defaults',
      asOf: new Date().toISOString(),
    });
  }
}
