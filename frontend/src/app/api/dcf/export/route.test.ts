import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

import { POST } from './route';

function payload() {
    return {
        company: { ticker: 'AAPL', name: 'Apple Inc.' },
        market: { currentPrice: 100, sharesDiluted: 1000 },
        historicals: { years: [2024], income: { Revenue: [1000] }, balance: {}, cashflow: {} },
        assumptions: { taxRate: 0.21 },
        forecasts: [{ year: 2025, revenue: 1100 }],
    };
}

describe('DCF export proxy route', () => {
    beforeEach(() => {
        process.env.NEXT_PUBLIC_SEC_SERVICE_URL = 'http://localhost:8000';
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('proxies binary workbook response and preserves content-disposition', async () => {
        const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': 'attachment; filename="aapl_dcf.xlsx"',
                },
            })
        );

        const request = new NextRequest('http://localhost:3000/api/dcf/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload()),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        expect(response.headers.get('content-disposition')).toContain('aapl_dcf.xlsx');
        expect(response.headers.get('content-type')).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('returns upstream error message when backend export fails', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ error: { message: 'template integrity check failed' } }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        const request = new NextRequest('http://localhost:3000/api/dcf/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload()),
        });

        const response = await POST(request);
        expect(response.status).toBe(500);
        const body = await response.json() as { error: string };
        expect(body.error).toContain('template integrity check failed');
    });
});
