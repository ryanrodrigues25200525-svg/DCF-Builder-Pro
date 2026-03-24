import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

const mockPayload = {
  profile: { ticker: "AAPL", name: "Apple Inc." },
  financials_native: { statements: { income_statement: [{ year: 2024, revenue: 100 }] } },
  market: { current_price: 190.12 },
  valuation_context: { risk_free_rate: 0.045, equity_risk_premium: 0.052 },
  peers: [],
  insider_trades: [],
};

describe("/api/sec/company route", () => {
  beforeEach(() => {
    process.env.SEC_SERVICE_URL = "http://localhost:8000";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a short-circuit validation error for invalid tickers", async () => {
    const request = new NextRequest("http://localhost:3000/api/sec/company?ticker=%%%");
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid ticker format" });
  });

  it("proxies backend payloads and sets observability headers", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const request = new NextRequest("http://localhost:3000/api/sec/company?ticker=AAPL");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Data-Source")).toBe("fresh");
    expect(response.headers.get("X-Cache-Hit")).toBe("false");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(await response.json()).toEqual(mockPayload);
  });

  it("surfaces upstream failures cleanly", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("upstream unavailable", {
        status: 503,
        statusText: "Service Unavailable",
      })
    );

    const request = new NextRequest("http://localhost:3000/api/sec/company?ticker=MSFT");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("Backend error: 503 Service Unavailable");
  });
});
