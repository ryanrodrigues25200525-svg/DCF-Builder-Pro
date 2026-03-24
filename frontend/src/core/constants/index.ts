export const SIZE_PREMIUM_TABLE: Record<string, { minMcap: number; maxMcap: number; premium: number }> = {
    'Large-cap': { minMcap: 10000, maxMcap: Infinity, premium: 0.0 },
    'Mid-cap': { minMcap: 2000, maxMcap: 10000, premium: 0.01 },
    'Small-cap': { minMcap: 300, maxMcap: 2000, premium: 0.017 },
    'Micro-cap': { minMcap: 0, maxMcap: 300, premium: 0.038 },
};

export const CREDIT_SPREADS: Record<string, number> = {
    'AAA': 0.0050,
    'AA+': 0.0060,
    'AA': 0.0070,
    'AA-': 0.0080,
    'A+': 0.0090,
    'A': 0.0100,
    'A-': 0.0115,
    'BBB+': 0.0135,
    'BBB': 0.0155,
    'BBB-': 0.0180,
    'BB+': 0.0225,
    'BB': 0.0275,
    'BB-': 0.0330,
    'B+': 0.0400,
    'B': 0.0500,
    'B-': 0.0600,
    'CCC+': 0.0750,
    'CCC': 0.0900,
};

export const TAX_RATES: Record<string, number> = {
    'US': 0.21,
    'Canada': 0.265,
    'UK': 0.25,
    'Germany': 0.30,
    'Other': 0.25,
};
