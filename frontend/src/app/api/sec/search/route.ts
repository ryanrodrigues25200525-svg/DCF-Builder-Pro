
import { NextResponse } from 'next/server';
import { searchIndex } from '@/core/utils/search-index';

export const dynamic = 'force-dynamic'; // Ensure we don't cache the API response itself excessively, though the index caches data

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();
    const requestedLimit = Number(searchParams.get('limit') || 8);
    const limit = Number.isFinite(requestedLimit)
        ? Math.max(1, Math.min(20, requestedLimit))
        : 8;

    if (!query || query.length < 1) {
        return NextResponse.json([]);
    }

    try {
        const results = await searchIndex.search(query, limit);
        const status = searchIndex.getStatus();

        const formatted = results.map(t => ({
            ticker: t.ticker,
            name: t.title,
            cik: t.cik_str.toString().padStart(10, '0')
        }));

        return NextResponse.json(formatted, {
            headers: {
                'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
                'X-Search-Degraded': status.degraded ? 'true' : 'false',
                'X-Search-Data-Available': status.hasData ? 'true' : 'false',
            }
        });
    } catch (error) {
        console.error("Search API error:", error);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}
