"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ComparableCompany } from '@/core/types';
import { cn } from '@/core/utils/cn';
import { AnimatePresence, motion } from 'framer-motion';

interface CompsTableProps {
    isDarkMode?: boolean;
    targetTicker: string;
    targetRevenue: number;
    targetEbitda: number;
    peers?: ComparableCompany[];
    onDataChange?: (data: ComparableCompany[]) => void;
    modelExitMultiple?: number;
    impliedSharePrice?: number;
    currentSharePrice?: number;
}

// Sparkline component - mini SVG line chart
interface SparklineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
}

function normalizeComparablePeers(input: ComparableCompany[]): ComparableCompany[] {
    return input
        .map((peer) => {
            const record = peer as unknown as Record<string, unknown>;
            const ticker = String(record.ticker || record.symbol || '').trim().toUpperCase();
            if (!ticker) return null;
            return {
                ...peer,
                ticker,
                name: peer.name || ticker,
                isSelected: peer.isSelected ?? true,
            };
        })
        .filter((peer): peer is ComparableCompany => Boolean(peer));
}

function median(values: number[]) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(values: number[]) {
    return values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function formatPrice(val: number | undefined) {
    return val ? `$${val.toFixed(2)}` : '-';
}

function formatMoneyCompact(val: number | undefined) {
    if (!val || val <= 0) return '-';
    if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    return `$${val.toFixed(0)}`;
}

function formatMult(val: number) {
    return val ? `${val.toFixed(1)}x` : '-';
}

function formatPct(val: number) {
    const normalized = Math.abs(val) > 1.5 && Math.abs(val) <= 1000 ? val / 100 : val;
    return `${(normalized * 100).toFixed(1)}%`;
}

function formatBeta(val: number | undefined) {
    if (val === undefined || !Number.isFinite(val) || val <= 0) return '-';
    return val.toFixed(2);
}

const Sparkline = ({ data, width = 60, height = 20, color = '#3b82f6' }: SparklineProps) => {
    const signature = `${width}:${height}:${Array.isArray(data) ? data.join(",") : ""}`;
    let hash = 0;
    for (let i = 0; i < signature.length; i++) {
        hash = ((hash << 5) - hash) + signature.charCodeAt(i);
        hash |= 0;
    }
    const gradientId = `sparkline-gradient-${Math.abs(hash)}`;

    if (!data || data.length < 2) {
        return (
            <svg width={width} height={height} className="opacity-30">
                <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" strokeWidth="1" />
            </svg>
        );
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
    }).join(' ');
    const isPositive = data[data.length - 1] >= data[0];
    const strokeColor = color;

    return (
        <svg width={width} height={height} className="overflow-visible">
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polyline
                points={points}
                fill="none"
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle
                cx={width}
                cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2}
                r="2"
                fill={isPositive ? '#22c55e' : '#ef4444'}
            />
        </svg>
    );
};

// Generate mock 52-week price data for sparklines
const generateSparklineData = (ticker: string): number[] => {
    const safeTicker = String(ticker || '').trim().toUpperCase() || 'UNKNOWN';
    const seed = safeTicker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const base = 100 + (seed % 50);
    const volatility = 0.02 + (seed % 10) / 100;
    let state = seed || 1;
    const nextRandom = () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };

    const data: number[] = [base];
    for (let i = 1; i < 52; i++) {
        const change = (nextRandom() - 0.5) * 2 * volatility;
        data.push(data[i - 1] * (1 + change));
    }
    return data;
};

const COMPS_DATABASE: Record<string, ComparableCompany[]> = {
    'AAPL': [
        {
            ticker: 'MSFT',
            name: 'Microsoft',
            sector: 'Technology',
            industry: 'Software',
            marketCap: 3_000_000_000_000,
            enterpriseValue: 2_985_000_000_000,
            evRevenue: 12.2,
            evEbitda: 23.9,
            revenue: 245_000_000_000,
            ebitda: 125_000_000_000,
            revenueGrowth: 0.16,
            ebitdaMargin: 0.51,
            isSelected: true,
            price: 405.00,
            sharesOutstanding: 7_400_000_000,
            beta: 0.89
        },
        {
            ticker: 'GOOGL',
            name: 'Alphabet',
            sector: 'Technology',
            industry: 'Internet Services',
            marketCap: 2_000_000_000_000,
            enterpriseValue: 1_900_000_000_000,
            evRevenue: 6.2,
            evEbitda: 17.6,
            revenue: 307_000_000_000,
            ebitda: 108_000_000_000,
            revenueGrowth: 0.14,
            ebitdaMargin: 0.35,
            isSelected: true,
            price: 165.00,
            sharesOutstanding: 12_100_000_000,
            beta: 1.05
        },
        {
            ticker: 'META',
            name: 'Meta Platforms',
            sector: 'Technology',
            industry: 'Social Media',
            marketCap: 1_500_000_000_000,
            enterpriseValue: 1_450_000_000_000,
            evRevenue: 9.3,
            evEbitda: 19.3,
            revenue: 156_000_000_000,
            ebitda: 75_000_000_000,
            revenueGrowth: 0.20,
            ebitdaMargin: 0.48,
            isSelected: true,
            price: 485.00,
            sharesOutstanding: 3_100_000_000,
            beta: 1.22
        },
        {
            ticker: 'AMZN',
            name: 'Amazon',
            sector: 'Technology',
            industry: 'E-commerce / Cloud',
            marketCap: 2_000_000_000_000,
            enterpriseValue: 2_050_000_000_000,
            evRevenue: 3.3,
            evEbitda: 21.6,
            revenue: 620_000_000_000,
            ebitda: 95_000_000_000,
            revenueGrowth: 0.11,
            ebitdaMargin: 0.15,
            isSelected: true,
            price: 180.00,
            sharesOutstanding: 11_100_000_000,
            beta: 1.15
        },
        {
            ticker: 'NVDA',
            name: 'NVIDIA',
            sector: 'Technology',
            industry: 'Semiconductors',
            marketCap: 3_200_000_000_000,
            enterpriseValue: 3_200_000_000_000,
            evRevenue: 28.3,
            evEbitda: 41.0,
            revenue: 113_000_000_000,
            ebitda: 78_000_000_000,
            revenueGrowth: 1.25,
            ebitdaMargin: 0.69,
            isSelected: false,
            price: 130.00,
            sharesOutstanding: 24_600_000_000,
            beta: 1.68
        },
        {
            ticker: 'AVGO',
            name: 'Broadcom',
            sector: 'Technology',
            industry: 'Semiconductors',
            marketCap: 850_000_000_000,
            enterpriseValue: 915_000_000_000,
            evRevenue: 17.9,
            evEbitda: 30.5,
            revenue: 51_000_000_000,
            ebitda: 30_000_000_000,
            revenueGrowth: 0.40,
            ebitdaMargin: 0.59,
            isSelected: false,
            price: 1650.00,
            sharesOutstanding: 515_000_000,
            beta: 1.12
        },
        {
            ticker: 'ADBE',
            name: 'Adobe',
            sector: 'Technology',
            industry: 'Software',
            marketCap: 160_000_000_000,
            enterpriseValue: 160_000_000_000,
            evRevenue: 7.6,
            evEbitda: 26.7,
            revenue: 21_000_000_000,
            ebitda: 6_000_000_000,
            revenueGrowth: 0.11,
            ebitdaMargin: 0.29,
            isSelected: false,
            price: 490.00,
            sharesOutstanding: 326_000_000,
            beta: 1.30
        },
        {
            ticker: 'ORCL',
            name: 'Oracle',
            sector: 'Technology',
            industry: 'Software / Cloud',
            marketCap: 450_000_000_000,
            enterpriseValue: 540_000_000_000,
            evRevenue: 10.2,
            evEbitda: 25.7,
            revenue: 53_000_000_000,
            ebitda: 21_000_000_000,
            revenueGrowth: 0.07,
            ebitdaMargin: 0.40,
            isSelected: false,
            price: 140.00,
            sharesOutstanding: 3_200_000_000,
            beta: 1.02
        },
    ],
    'MSFT': [
        {
            ticker: 'GOOGL',
            name: 'Alphabet',
            sector: 'Technology',
            industry: 'Internet Services',
            marketCap: 2_000_000_000_000,
            enterpriseValue: 1_900_000_000_000,
            evRevenue: 6.2,
            evEbitda: 17.6,
            revenue: 307_000_000_000,
            ebitda: 108_000_000_000,
            revenueGrowth: 0.14,
            ebitdaMargin: 0.35,
            isSelected: true,
            price: 165.00,
            sharesOutstanding: 12_100_000_000,
            beta: 1.05
        },
        {
            ticker: 'META',
            name: 'Meta Platforms',
            sector: 'Technology',
            industry: 'Social Media',
            marketCap: 1_500_000_000_000,
            enterpriseValue: 1_450_000_000_000,
            evRevenue: 9.3,
            evEbitda: 19.3,
            revenue: 156_000_000_000,
            ebitda: 75_000_000_000,
            revenueGrowth: 0.20,
            ebitdaMargin: 0.48,
            isSelected: true,
            price: 485.00,
            sharesOutstanding: 3_100_000_000,
            beta: 1.22
        },
        {
            ticker: 'ORCL',
            name: 'Oracle',
            sector: 'Technology',
            industry: 'Enterprise Software',
            marketCap: 450_000_000_000,
            enterpriseValue: 540_000_000_000,
            evRevenue: 10.2,
            evEbitda: 25.7,
            revenue: 53_000_000_000,
            ebitda: 21_000_000_000,
            revenueGrowth: 0.07,
            ebitdaMargin: 0.40,
            isSelected: true,
            price: 140.00,
            sharesOutstanding: 3_200_000_000,
            beta: 1.02
        },
        {
            ticker: 'CRM',
            name: 'Salesforce',
            sector: 'Technology',
            industry: 'Enterprise Software',
            marketCap: 300_000_000_000,
            enterpriseValue: 310_000_000_000,
            evRevenue: 8.8,
            evEbitda: 22.0,
            revenue: 35_000_000_000,
            ebitda: 7_900_000_000,
            revenueGrowth: 0.11,
            ebitdaMargin: 0.23,
            isSelected: true,
            price: 295.00,
            sharesOutstanding: 1_020_000_000,
            beta: 1.18
        },
        {
            ticker: 'SAP',
            name: 'SAP',
            sector: 'Technology',
            industry: 'Enterprise Software',
            marketCap: 220_000_000_000,
            enterpriseValue: 235_000_000_000,
            evRevenue: 6.7,
            evEbitda: 24.7,
            revenue: 35_000_000_000,
            ebitda: 9_500_000_000,
            revenueGrowth: 0.09,
            ebitdaMargin: 0.27,
            isSelected: true,
            price: 195.00,
            sharesOutstanding: 1_130_000_000,
            beta: 0.95
        },
        {
            ticker: 'ADBE',
            name: 'Adobe',
            sector: 'Technology',
            industry: 'Creative Software',
            marketCap: 160_000_000_000,
            enterpriseValue: 160_000_000_000,
            evRevenue: 7.6,
            evEbitda: 26.7,
            revenue: 21_000_000_000,
            ebitda: 6_000_000_000,
            revenueGrowth: 0.11,
            ebitdaMargin: 0.29,
            isSelected: false,
            price: 490.00,
            sharesOutstanding: 326_000_000,
            beta: 1.30
        },
        {
            ticker: 'INTU',
            name: 'Intuit',
            sector: 'Technology',
            industry: 'Financial Software',
            marketCap: 190_000_000_000,
            enterpriseValue: 195_000_000_000,
            evRevenue: 10.5,
            evEbitda: 28.0,
            revenue: 18_000_000_000,
            ebitda: 4_800_000_000,
            revenueGrowth: 0.12,
            ebitdaMargin: 0.27,
            isSelected: false,
            price: 650.00,
            sharesOutstanding: 290_000_000,
            beta: 1.15
        },
        {
            ticker: 'NOW',
            name: 'ServiceNow',
            sector: 'Technology',
            industry: 'Enterprise Software',
            marketCap: 220_000_000_000,
            enterpriseValue: 225_000_000_000,
            evRevenue: 16.0,
            evEbitda: 42.0,
            revenue: 14_000_000_000,
            ebitda: 3_200_000_000,
            revenueGrowth: 0.23,
            ebitdaMargin: 0.23,
            isSelected: false,
            price: 780.00,
            sharesOutstanding: 280_000_000,
            beta: 1.40
        },
    ],
    'NVDA': [
        {
            ticker: 'AVGO',
            name: 'Broadcom',
            sector: 'Technology',
            industry: 'Semiconductors',
            marketCap: 850_000_000_000,
            enterpriseValue: 915_000_000_000,
            evRevenue: 17.9,
            evEbitda: 30.5,
            revenue: 51_000_000_000,
            ebitda: 30_000_000_000,
            revenueGrowth: 0.40,
            ebitdaMargin: 0.59,
            isSelected: true,
            price: 1650.00,
            sharesOutstanding: 515_000_000,
            beta: 1.12
        },
        {
            ticker: 'AMD',
            name: 'AMD',
            sector: 'Technology',
            industry: 'Semiconductors',
            marketCap: 200_000_000_000,
            enterpriseValue: 210_000_000_000,
            evRevenue: 9.5,
            evEbitda: 28.0,
            revenue: 22_000_000_000,
            ebitda: 4_200_000_000,
            revenueGrowth: 0.18,
            ebitdaMargin: 0.19,
            isSelected: true,
            price: 160.00,
            sharesOutstanding: 1_250_000_000,
            beta: 1.65
        },
        {
            ticker: 'INTC',
            name: 'Intel',
            sector: 'Technology',
            industry: 'Semiconductors',
            marketCap: 90_000_000_000,
            enterpriseValue: 115_000_000_000,
            evRevenue: 2.8,
            evEbitda: 6.5,
            revenue: 55_000_000_000,
            ebitda: 12_000_000_000,
            revenueGrowth: -0.02,
            ebitdaMargin: 0.22,
            isSelected: true,
            price: 21.00,
            sharesOutstanding: 4_280_000_000,
            beta: 1.10
        },
        {
            ticker: 'TSM',
            name: 'TSMC',
            sector: 'Technology',
            industry: 'Semiconductor Manufacturing',
            marketCap: 700_000_000_000,
            enterpriseValue: 670_000_000_000,
            evRevenue: 8.9,
            evEbitda: 13.7,
            revenue: 75_000_000_000,
            ebitda: 49_000_000_000,
            revenueGrowth: 0.30,
            ebitdaMargin: 0.65,
            isSelected: true,
            price: 175.00,
            sharesOutstanding: 4_000_000_000,
            beta: 1.25
        },
        {
            ticker: 'QCOM',
            name: 'Qualcomm',
            sector: 'Technology',
            industry: 'Semiconductors',
            marketCap: 190_000_000_000,
            enterpriseValue: 195_000_000_000,
            evRevenue: 5.5,
            evEbitda: 14.0,
            revenue: 35_000_000_000,
            ebitda: 12_000_000_000,
            revenueGrowth: 0.09,
            ebitdaMargin: 0.34,
            isSelected: true,
            price: 170.00,
            sharesOutstanding: 1_120_000_000,
            beta: 1.28
        },
        {
            ticker: 'MU',
            name: 'Micron',
            sector: 'Technology',
            industry: 'Memory Semiconductors',
            marketCap: 85_000_000_000,
            enterpriseValue: 95_000_000_000,
            evRevenue: 5.8,
            evEbitda: 12.5,
            revenue: 16_000_000_000,
            ebitda: 5_400_000_000,
            revenueGrowth: 0.45,
            ebitdaMargin: 0.34,
            isSelected: false,
            price: 95.00,
            sharesOutstanding: 895_000_000,
            beta: 1.55
        },
        {
            ticker: 'MRVL',
            name: 'Marvell',
            sector: 'Technology',
            industry: 'Semiconductors',
            marketCap: 65_000_000_000,
            enterpriseValue: 70_000_000_000,
            evRevenue: 9.0,
            evEbitda: 28.0,
            revenue: 5_800_000_000,
            ebitda: 1_500_000_000,
            revenueGrowth: 0.20,
            ebitdaMargin: 0.26,
            isSelected: false,
            price: 75.00,
            sharesOutstanding: 865_000_000,
            beta: 1.45
        },
        {
            ticker: 'LRCX',
            name: 'Lam Research',
            sector: 'Technology',
            industry: 'Semiconductor Equipment',
            marketCap: 110_000_000_000,
            enterpriseValue: 112_000_000_000,
            evRevenue: 6.8,
            evEbitda: 16.0,
            revenue: 16_000_000_000,
            ebitda: 5_400_000_000,
            revenueGrowth: 0.16,
            ebitdaMargin: 0.34,
            isSelected: false,
            price: 850.00,
            sharesOutstanding: 129_000_000,
            beta: 1.35
        },
    ],
    'AMZN': [
        {
            ticker: 'META',
            name: 'Meta Platforms',
            sector: 'Technology',
            industry: 'Internet Services',
            marketCap: 1_500_000_000_000,
            enterpriseValue: 1_450_000_000_000,
            evRevenue: 9.3,
            evEbitda: 19.3,
            revenue: 156_000_000_000,
            ebitda: 75_000_000_000,
            revenueGrowth: 0.20,
            ebitdaMargin: 0.48,
            isSelected: true,
            price: 485.00,
            sharesOutstanding: 3_100_000_000,
            beta: 1.22
        },
        {
            ticker: 'GOOGL',
            name: 'Alphabet',
            sector: 'Technology',
            industry: 'Internet Services',
            marketCap: 2_000_000_000_000,
            enterpriseValue: 1_900_000_000_000,
            evRevenue: 6.2,
            evEbitda: 17.6,
            revenue: 307_000_000_000,
            ebitda: 108_000_000_000,
            revenueGrowth: 0.14,
            ebitdaMargin: 0.35,
            isSelected: true,
            price: 165.00,
            sharesOutstanding: 12_100_000_000,
            beta: 1.05
        },
        {
            ticker: 'SHOP',
            name: 'Shopify',
            sector: 'Technology',
            industry: 'E-commerce Platform',
            marketCap: 110_000_000_000,
            enterpriseValue: 105_000_000_000,
            evRevenue: 12.0,
            evEbitda: 60.0,
            revenue: 9_200_000_000,
            ebitda: 1_200_000_000,
            revenueGrowth: 0.26,
            ebitdaMargin: 0.13,
            isSelected: true,
            price: 85.00,
            sharesOutstanding: 1_290_000_000,
            beta: 1.85
        },
        {
            ticker: 'EBAY',
            name: 'eBay',
            sector: 'Technology',
            industry: 'E-commerce',
            marketCap: 32_000_000_000,
            enterpriseValue: 38_000_000_000,
            evRevenue: 3.2,
            evEbitda: 10.5,
            revenue: 10_000_000_000,
            ebitda: 2_800_000_000,
            revenueGrowth: 0.02,
            ebitdaMargin: 0.28,
            isSelected: true,
            price: 60.00,
            sharesOutstanding: 533_000_000,
            beta: 0.95
        },
        {
            ticker: 'WMT',
            name: 'Walmart',
            sector: 'Consumer',
            industry: 'Retail / E-commerce',
            marketCap: 680_000_000_000,
            enterpriseValue: 750_000_000_000,
            evRevenue: 1.0,
            evEbitda: 12.5,
            revenue: 648_000_000_000,
            ebitda: 42_000_000_000,
            revenueGrowth: 0.05,
            ebitdaMargin: 0.06,
            isSelected: true,
            price: 85.00,
            sharesOutstanding: 8_000_000_000,
            beta: 0.55
        },
        {
            ticker: 'TGT',
            name: 'Target',
            sector: 'Consumer',
            industry: 'Retail',
            marketCap: 65_000_000_000,
            enterpriseValue: 95_000_000_000,
            evRevenue: 0.6,
            evEbitda: 9.0,
            revenue: 106_000_000_000,
            ebitda: 7_800_000_000,
            revenueGrowth: -0.01,
            ebitdaMargin: 0.07,
            isSelected: false,
            price: 140.00,
            sharesOutstanding: 464_000_000,
            beta: 1.05
        },
        {
            ticker: 'COST',
            name: 'Costco',
            sector: 'Consumer',
            industry: 'Membership Retail',
            marketCap: 380_000_000_000,
            enterpriseValue: 385_000_000_000,
            evRevenue: 1.2,
            evEbitda: 18.0,
            revenue: 254_000_000_000,
            ebitda: 13_000_000_000,
            revenueGrowth: 0.07,
            ebitdaMargin: 0.05,
            isSelected: false,
            price: 850.00,
            sharesOutstanding: 447_000_000,
            beta: 0.75
        },
    ],
};

const DEFAULT_TECH_COMPS: ComparableCompany[] = COMPS_DATABASE['AAPL'];

const GICS_SECTOR_BY_TICKER: Record<string, string> = {
    AAPL: 'Information Technology',
    MSFT: 'Information Technology',
    GOOGL: 'Communication Services',
    META: 'Communication Services',
    AMZN: 'Consumer Discretionary',
    NVDA: 'Information Technology',
    AVGO: 'Information Technology',
    ADBE: 'Information Technology',
    ORCL: 'Information Technology',
    CRM: 'Information Technology',
    SAP: 'Information Technology',
    INTU: 'Information Technology',
    NOW: 'Information Technology',
    AMD: 'Information Technology',
    INTC: 'Information Technology',
    TSM: 'Information Technology',
    QCOM: 'Information Technology',
    MU: 'Information Technology',
    MRVL: 'Information Technology',
    LRCX: 'Information Technology',
    SHOP: 'Information Technology',
    EBAY: 'Consumer Discretionary',
    WMT: 'Consumer Staples',
    TGT: 'Consumer Staples',
    COST: 'Consumer Staples',
};

import { memo } from 'react';

export const CompsTableInstitutional = memo(function CompsTableInstitutional({
    isDarkMode = true,
    targetTicker,
    peers: externalPeers,
    onDataChange,
    modelExitMultiple,
    impliedSharePrice,
    currentSharePrice,
}: CompsTableProps) {
    const peers = useMemo(() => {
        // If parent explicitly provides peers (including empty array), trust that data.
        if (externalPeers !== undefined) {
            return normalizeComparablePeers(externalPeers);
        }
        const ticker = targetTicker.toUpperCase();
        return normalizeComparablePeers(COMPS_DATABASE[ticker] || DEFAULT_TECH_COMPS);
    }, [targetTicker, externalPeers]);

    // Generate sparkline data for each peer
    const sparklineData = useMemo(() => {
        const data: Record<string, number[]> = {};
        peers.forEach(peer => {
            const ticker = String(peer?.ticker || '').trim().toUpperCase();
            if (!ticker) return;
            data[ticker] = generateSparklineData(ticker);
        });
        return data;
    }, [peers]);

    const selectedPeers = useMemo<Record<string, boolean>>(() => {
        const selections: Record<string, boolean> = {};
        for (const peer of peers) {
            selections[peer.ticker] = peer.isSelected;
        }
        return selections;
    }, [peers]);

    const [selectionOverrides, setSelectionOverrides] = useState<Record<string, boolean>>({});
    const shouldSyncSelectionRef = useRef(false);

    const togglePeer = useCallback((ticker: string) => {
        shouldSyncSelectionRef.current = true;
        setSelectionOverrides(prev => {
            const baseSelection = selectedPeers[ticker] ?? false;
            const isCurrentlySelected = prev[ticker] !== undefined ? prev[ticker] : baseSelection;
            return { ...prev, [ticker]: !isCurrentlySelected };
        });
    }, [selectedPeers]);

    useEffect(() => {
        if (!shouldSyncSelectionRef.current) return;
        const updatedPeers = peers.map(p => ({
            ...p,
            isSelected: selectionOverrides[p.ticker] !== undefined ? selectionOverrides[p.ticker] : selectedPeers[p.ticker]
        }));
        onDataChange?.(updatedPeers);
        shouldSyncSelectionRef.current = false;
    }, [selectionOverrides, peers, selectedPeers, onDataChange]);

    const selected = peers.filter(p => {
        const baseSelection = selectedPeers[p.ticker];
        return selectionOverrides[p.ticker] !== undefined ? selectionOverrides[p.ticker] : baseSelection;
    });

    // Calculate statistics
    const evRevenueValues = selected.map(p => p.evRevenue).filter(v => v > 0);
    const evEbitdaValues = selected.map(p => p.evEbitda).filter(v => v > 0 && v < 100);
    const revGrowthValues = selected.map(p => p.revenueGrowth);
    const ebitdaMarginValues = selected.map(p => p.ebitdaMargin);
    const betaValues = selected
        .map(p => p.beta)
        .filter((v): v is number => v !== undefined && Number.isFinite(v) && v > 0 && v < 5);

    const stats = {
        evRevenue: { median: median(evRevenueValues), mean: mean(evRevenueValues) },
        evEbitda: { median: median(evEbitdaValues), mean: mean(evEbitdaValues) },
        revGrowth: { median: median(revGrowthValues), mean: mean(revGrowthValues) },
        ebitdaMargin: { median: median(ebitdaMarginValues), mean: mean(ebitdaMarginValues) },
        beta: { median: median(betaValues), mean: mean(betaValues) },
    };
    const modelImpactDelta = modelExitMultiple !== undefined ? stats.evEbitda.median - modelExitMultiple : 0;

    // Peer quality score (0-100) from similarity factors: size, growth, margin, beta.
    const selectedForScoring = selected.length > 0 ? selected : peers;
    const scoringRef = {
        sizeLog: median(selectedForScoring.map((p) => Math.log10(Math.max(1, p.marketCap || 1)))),
        growth: median(selectedForScoring.map((p) => p.revenueGrowth)),
        margin: median(selectedForScoring.map((p) => p.ebitdaMargin)),
        beta: median(selectedForScoring.map((p) => p.beta ?? 1)),
    };

    const getPeerQualityScore = (peer: ComparableCompany) => {
        const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
        const sizeLog = Math.log10(Math.max(1, peer.marketCap || 1));
        const beta = peer.beta ?? scoringRef.beta;

        const sizeScore = clamp01(1 - Math.abs(sizeLog - scoringRef.sizeLog) / 2.0); // ~2 orders of magnitude band
        const growthScore = clamp01(1 - Math.abs(peer.revenueGrowth - scoringRef.growth) / 0.5); // 50pp band
        const marginScore = clamp01(1 - Math.abs(peer.ebitdaMargin - scoringRef.margin) / 0.5); // 50pp band
        const betaScore = clamp01(1 - Math.abs(beta - scoringRef.beta) / 1.5); // broad beta band

        const weighted =
            sizeScore * 0.35 +
            growthScore * 0.25 +
            marginScore * 0.25 +
            betaScore * 0.15;

        return Math.round(weighted * 100);
    };

    // Formatters
    const isPeerSelected = (ticker: string) => {
        const baseSelection = selectedPeers[ticker] ?? false;
        return selectionOverrides[ticker] !== undefined ? selectionOverrides[ticker] : baseSelection;
    };

    const normalizeSector = (raw?: string) => {
        if (!raw) return '';
        const key = raw.trim().toLowerCase();
        if (key.includes('tech')) return 'Information Technology';
        if (key.includes('communication')) return 'Communication Services';
        if (key.includes('consumer discretionary') || key === 'consumer') return 'Consumer Discretionary';
        if (key.includes('consumer staples')) return 'Consumer Staples';
        if (key.includes('financial')) return 'Financials';
        if (key.includes('health')) return 'Health Care';
        if (key.includes('industrial')) return 'Industrials';
        if (key.includes('energy')) return 'Energy';
        if (key.includes('material')) return 'Materials';
        if (key.includes('utility')) return 'Utilities';
        if (key.includes('real estate')) return 'Real Estate';
        return raw;
    };

    const getSectorLabel = (peer: ComparableCompany) => {
        const dynamicSector = normalizeSector(peer.sector);
        if (dynamicSector) return dynamicSector;
        return GICS_SECTOR_BY_TICKER[peer.ticker.toUpperCase()] || 'Unclassified';
    };

    return (
        <div
            data-local-theme={isDarkMode ? 'dark' : 'light'}
            className={cn(
                "comparables-theme-scope relative overflow-hidden rounded-[2rem] border shadow-[0_24px_64px_rgba(0,0,0,0.18)]",
                isDarkMode ? "border-white/10 bg-[#030913] shadow-[0_28px_90px_rgba(0,0,0,0.6)]" : "border-[var(--border-default)] bg-white"
            )}
        >
            <div className="comparables-aurora pointer-events-none absolute inset-0">
                <div className="absolute -left-20 -top-28 h-[420px] w-[520px] rounded-full bg-sky-400/15 blur-[90px]" />
                <div className="absolute left-1/2 -top-24 h-[360px] w-[500px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[90px]" />
                <div className="absolute -right-20 top-0 h-[420px] w-[520px] rounded-full bg-emerald-400/12 blur-[90px]" />
            </div>

            <div className="relative border-b border-[var(--border-default)] px-8 py-8 dark:border-white/10">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className={cn("text-[40px] font-black tracking-[-0.02em]", isDarkMode ? "text-white" : "text-slate-900")}>Peer Comparables</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "rounded-full border px-5 py-2 text-[13px] font-black uppercase tracking-[0.16em]",
                            isDarkMode
                                ? "border-sky-300/40 bg-sky-400/15 text-sky-100"
                                : "border-sky-300 bg-sky-100 text-sky-800"
                        )}>
                            {selected.length} Selected
                        </div>
                        <div className={cn(
                            "rounded-full border px-5 py-2 text-[13px] font-black uppercase tracking-[0.16em]",
                            isDarkMode
                                ? "border-white/20 bg-white/[0.05] text-white/75"
                                : "border-slate-300 bg-white text-slate-700"
                        )}>
                            {peers.length} Total
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative px-8 py-6">
                <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <div className={cn(
                        "group relative rounded-[1.6rem] border p-6 transform-gpu will-change-transform transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none",
                        isDarkMode
                            ? "border-sky-300/25 bg-gradient-to-br from-sky-500/25 via-blue-600/15 to-blue-900/20"
                            : "border-cyan-300 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-[0_24px_65px_rgba(37,99,235,0.55)]"
                    )}>
                        <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white">Median EV/Rev</p>
                        <p className="mt-3 text-[42px] leading-none font-black tabular-nums text-white">{formatMult(stats.evRevenue.median)}</p>
                    </div>
                    <div className={cn(
                        "group relative rounded-[1.6rem] border p-6 transform-gpu will-change-transform transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none",
                        isDarkMode
                            ? "border-indigo-300/25 bg-gradient-to-br from-indigo-500/25 via-violet-600/15 to-indigo-900/20"
                            : "border-violet-300 bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-700 shadow-[0_24px_65px_rgba(139,92,246,0.55)]"
                    )}>
                        <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white">Median EV/EBITDA</p>
                        <p className="mt-3 text-[42px] leading-none font-black tabular-nums text-white">{formatMult(stats.evEbitda.median)}</p>
                    </div>
                    <div className={cn(
                        "group relative rounded-[1.6rem] border p-6 transform-gpu will-change-transform transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none",
                        isDarkMode
                            ? "border-emerald-300/20 bg-gradient-to-br from-emerald-500/20 via-teal-700/15 to-emerald-900/20"
                            : "border-emerald-300 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 shadow-[0_24px_65px_rgba(16,185,129,0.52)]"
                    )}>
                        <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white">Revenue Growth</p>
                        <p className="mt-3 text-[42px] leading-none font-black tabular-nums text-white">{formatPct(stats.revGrowth.median)}</p>
                    </div>
                    <div className={cn(
                        "group relative rounded-[1.6rem] border p-6 transform-gpu will-change-transform transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none",
                        isDarkMode
                            ? "border-amber-300/20 bg-gradient-to-br from-amber-500/18 via-orange-600/14 to-amber-900/20"
                            : "border-amber-300 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 shadow-[0_24px_65px_rgba(249,115,22,0.52)]"
                    )}>
                        <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white">EBITDA Margin</p>
                        <p className="mt-3 text-[42px] leading-none font-black tabular-nums text-white">{formatPct(stats.ebitdaMargin.median)}</p>
                    </div>
                    <div className={cn(
                        "group relative rounded-[1.6rem] border p-6 transform-gpu will-change-transform transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none",
                        isDarkMode
                            ? "border-slate-300/20 bg-gradient-to-br from-slate-400/18 via-slate-700/16 to-slate-900/22"
                            : "border-slate-300 bg-gradient-to-br from-slate-400 via-slate-500 to-slate-700 shadow-[0_24px_65px_rgba(100,116,139,0.45)]"
                    )}>
                        <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white">Median Beta</p>
                        <p className="mt-3 text-[42px] leading-none font-black tabular-nums text-white">{formatBeta(stats.beta.median)}</p>
                    </div>
                </div>

                <div className={cn(
                    "mb-8 rounded-[1.6rem] border px-6 py-5",
                    isDarkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50"
                )}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <p className={cn(
                                "text-[12px] font-black uppercase tracking-[0.18em]",
                                isDarkMode ? "text-white/60" : "text-slate-600"
                            )}>Model Impact</p>
                            <p className={cn(
                                "mt-2 text-[15px] font-semibold",
                                isDarkMode ? "text-white/85" : "text-slate-700"
                            )}>
                                Selected peer medians flow directly into the DCF exit-multiple assumption. Changing the peer set reruns valuation immediately.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[560px]">
                            <div className={cn("rounded-2xl border px-4 py-4", isDarkMode ? "border-white/10 bg-[#0b1426]" : "border-slate-200 bg-white")}>
                                <p className={cn("text-[11px] font-black uppercase tracking-[0.14em]", isDarkMode ? "text-white/55" : "text-slate-500")}>Selected Peer Median</p>
                                <p className={cn("mt-2 text-[28px] font-black tabular-nums", isDarkMode ? "text-sky-300" : "text-sky-700")}>{formatMult(stats.evEbitda.median)}</p>
                                <p className={cn("mt-1 text-[12px] font-semibold", isDarkMode ? "text-white/55" : "text-slate-500")}>EV / EBITDA</p>
                            </div>
                            <div className={cn("rounded-2xl border px-4 py-4", isDarkMode ? "border-white/10 bg-[#0b1426]" : "border-slate-200 bg-white")}>
                                <p className={cn("text-[11px] font-black uppercase tracking-[0.14em]", isDarkMode ? "text-white/55" : "text-slate-500")}>Model Exit Multiple</p>
                                <p className={cn("mt-2 text-[28px] font-black tabular-nums", isDarkMode ? "text-indigo-300" : "text-indigo-700")}>{formatMult(modelExitMultiple ?? 0)}</p>
                                <p className={cn(
                                    "mt-1 text-[12px] font-semibold",
                                    modelImpactDelta > 0
                                        ? "text-emerald-500"
                                        : modelImpactDelta < 0
                                            ? "text-rose-500"
                                            : (isDarkMode ? "text-white/55" : "text-slate-500")
                                )}>
                                    {modelExitMultiple !== undefined ? `${modelImpactDelta >= 0 ? '+' : ''}${modelImpactDelta.toFixed(1)}x vs selected median` : 'Awaiting model sync'}
                                </p>
                            </div>
                            <div className={cn("rounded-2xl border px-4 py-4", isDarkMode ? "border-white/10 bg-[#0b1426]" : "border-slate-200 bg-white")}>
                                <p className={cn("text-[11px] font-black uppercase tracking-[0.14em]", isDarkMode ? "text-white/55" : "text-slate-500")}>DCF Implied Share Price</p>
                                <p className={cn("mt-2 text-[28px] font-black tabular-nums", isDarkMode ? "text-emerald-300" : "text-emerald-700")}>
                                    {impliedSharePrice && impliedSharePrice > 0 ? `$${impliedSharePrice.toFixed(2)}` : '—'}
                                </p>
                                <p className={cn("mt-1 text-[12px] font-semibold", isDarkMode ? "text-white/55" : "text-slate-500")}>
                                    {currentSharePrice && currentSharePrice > 0 ? `vs CMP $${currentSharePrice.toFixed(2)}` : 'Live DCF output'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className={cn(
                        "comparables-table-shell overflow-hidden rounded-[1.6rem] border backdrop-blur-xl",
                        isDarkMode
                            ? "border-white/10 bg-[rgba(8,14,28,0.65)]"
                            : "border-[var(--border-default)] bg-white"
                    )}
                >
                    <div className="overflow-x-auto overflow-y-visible">
                        <table className="w-full border-separate border-spacing-0">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-[var(--bg-glass)] dark:bg-white/[0.04]">
                                    <th className="w-16 border-b border-[var(--border-default)] px-5 py-6 text-left text-[13px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)] dark:border-white/10 dark:text-white/70">Sel</th>
                                    <th className="border-b border-[var(--border-default)] px-5 py-6 text-left text-[13px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)] dark:border-white/10 dark:text-white/70">Company</th>
                                    <th className="border-b border-[var(--border-default)] px-5 py-6 text-right text-[13px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)] dark:border-white/10 dark:text-white/70">Price</th>
                                    <th className="w-32 border-b border-[var(--border-default)] px-5 py-6 text-center text-[13px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)] dark:border-white/10 dark:text-white/70">52W Trend</th>
                                    <th className="border-b border-[var(--border-default)] px-5 py-6 text-right text-[13px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)] dark:border-white/10 dark:text-white/70">Mkt Cap</th>
                                    <th className="border-b border-[var(--border-default)] px-5 py-6 text-right text-[13px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)] dark:border-white/10 dark:text-white/70">EV</th>
                                    <th className="border-b border-[var(--border-default)] px-5 py-6 text-right text-[13px] font-black uppercase tracking-[0.18em] text-sky-500 dark:border-white/10 dark:text-sky-300">EV/Rev</th>
                                    <th className="border-b border-[var(--border-default)] px-5 py-6 text-right text-[13px] font-black uppercase tracking-[0.18em] text-indigo-500 dark:border-white/10 dark:text-indigo-300">EV/EBITDA</th>
                                    <th className="border-b border-[var(--border-default)] px-5 py-6 text-right text-[13px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)] dark:border-white/10 dark:text-white/70">Rev Grw</th>
                                    <th className="border-b border-[var(--border-default)] px-5 py-6 text-right text-[13px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)] dark:border-white/10 dark:text-white/70">EBITDA Mgn</th>
                                    <th className="border-b border-[var(--border-default)] px-5 py-6 text-right text-[13px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)] dark:border-white/10 dark:text-white/70">Beta</th>
                                    <th className="border-b border-[var(--border-default)] px-5 py-6 text-right text-[13px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)] dark:border-white/10 dark:text-white/70">Qual Score</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {peers.map((peer) => {
                                    const active = isPeerSelected(peer.ticker);
                                    const quality = getPeerQualityScore(peer);
                                    return (
                                        <motion.tr
                                            key={peer.ticker}
                                            onClick={() => togglePeer(peer.ticker)}
                                            layout
                                            initial={false}
                                            animate={{
                                                opacity: active ? 1 : 0.58,
                                                scale: active ? 1 : 0.996,
                                            }}
                                            transition={{ duration: 0.22, ease: 'easeOut' }}
                                            whileTap={{ scale: 0.992 }}
                                            className={cn(
                                                "cursor-pointer transition-colors duration-300 ease-out",
                                                active ? "bg-transparent hover:bg-[var(--bg-glass)] dark:hover:bg-white/[0.04]" : "bg-[var(--bg-glass)] dark:bg-white/[0.01]"
                                            )}
                                        >
                                            <td className="border-b border-[var(--border-subtle)] px-5 py-5 dark:border-white/[0.07]">
                                                <motion.div
                                                    className={cn(
                                                        "flex h-6 w-6 items-center justify-center rounded-md border transition-colors duration-300",
                                                        active ? "border-sky-300 bg-sky-500" : "border-[var(--border-default)] bg-transparent dark:border-white/25"
                                                    )}
                                                    initial={false}
                                                    animate={{ scale: active ? 1 : 0.9 }}
                                                    transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        togglePeer(peer.ticker);
                                                    }}
                                                >
                                                    <AnimatePresence initial={false}>
                                                        {active && (
                                                            <motion.svg
                                                                key="check"
                                                                className="h-3.5 w-3.5 text-white"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                                initial={{ opacity: 0, scale: 0.5 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.6 }}
                                                                transition={{ duration: 0.16, ease: 'easeOut' }}
                                                            >
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
                                                            </motion.svg>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            </td>
                                            <td className="border-b border-[var(--border-subtle)] px-5 py-5 dark:border-white/[0.07]">
                                                <div className="flex flex-col">
                                                    <div className="flex items-baseline gap-3">
                                                        <span className="text-[22px] leading-none font-black tracking-[0.03em] text-[var(--text-primary)]">{peer.ticker}</span>
                                                        <span className="max-w-[280px] truncate text-[14px] font-medium text-[var(--text-secondary)]">{peer.name}</span>
                                                    </div>
                                                    <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{getSectorLabel(peer)}</span>
                                                </div>
                                            </td>
                                            <td className="border-b border-[var(--border-subtle)] px-5 py-5 text-right text-[18px] font-semibold tabular-nums tracking-tight text-[var(--text-primary)] dark:border-white/[0.07]">{formatPrice(peer.price)}</td>
                                            <td className="border-b border-[var(--border-subtle)] px-5 py-5 text-center dark:border-white/[0.07]"><Sparkline data={sparklineData[peer.ticker] || []} width={110} height={28} /></td>
                                            <td className="border-b border-[var(--border-subtle)] px-5 py-5 text-right text-[18px] font-semibold tabular-nums text-[var(--text-secondary)] dark:border-white/[0.07]">{formatMoneyCompact(peer.marketCap)}</td>
                                            <td className="border-b border-[var(--border-subtle)] px-5 py-5 text-right text-[18px] font-semibold tabular-nums text-[var(--text-secondary)] dark:border-white/[0.07]">{formatMoneyCompact(peer.enterpriseValue)}</td>
                                            <td className="border-b border-[var(--border-subtle)] px-5 py-5 text-right text-[18px] font-black tabular-nums text-sky-500 dark:border-white/[0.07] dark:text-sky-300">{formatMult(peer.evRevenue)}</td>
                                            <td className="border-b border-[var(--border-subtle)] px-5 py-5 text-right text-[18px] font-black tabular-nums text-indigo-500 dark:border-white/[0.07] dark:text-indigo-300">{formatMult(peer.evEbitda)}</td>
                                            <td className={cn("border-b border-[var(--border-subtle)] px-5 py-5 text-right text-[18px] font-black tabular-nums dark:border-white/[0.07]", peer.revenueGrowth >= 0 ? "text-emerald-500 dark:text-emerald-300" : "text-red-500 dark:text-red-300")}>
                                                {formatPct(peer.revenueGrowth)}
                                            </td>
                                            <td className="border-b border-[var(--border-subtle)] px-5 py-5 text-right text-[18px] font-semibold tabular-nums text-[var(--text-primary)] dark:border-white/[0.07]">{formatPct(peer.ebitdaMargin)}</td>
                                            <td className="border-b border-[var(--border-subtle)] px-5 py-5 text-right text-[18px] font-semibold tabular-nums text-[var(--text-secondary)] dark:border-white/[0.07]">{formatBeta(peer.beta)}</td>
                                            <td className="border-b border-[var(--border-subtle)] px-5 py-5 text-right dark:border-white/[0.07]">
                                                <div className="inline-flex items-center gap-2">
                                                    <span className={cn(
                                                        "text-[18px] font-black tabular-nums",
                                                        quality >= 80 ? "text-emerald-500 dark:text-emerald-300" : quality >= 65 ? "text-sky-500 dark:text-sky-300" : quality >= 50 ? "text-amber-500 dark:text-amber-300" : "text-red-500 dark:text-red-300"
                                                    )}>
                                                        {quality}
                                                    </span>
                                                    <span className={cn(
                                                        "h-2.5 w-2.5 rounded-full",
                                                        quality >= 80 ? "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]" : quality >= 65 ? "bg-sky-300" : quality >= 50 ? "bg-amber-300" : "bg-red-300"
                                                    )} />
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}

                                <tr className={cn(isDarkMode ? "bg-sky-500/[0.06]" : "bg-sky-50")}>
                                    <td className="border-t border-[var(--border-default)] px-5 py-6 dark:border-white/15" colSpan={6}>
                                        <span className={cn("text-[14px] font-black uppercase tracking-[0.2em]", isDarkMode ? "text-white/75" : "text-slate-700")}>Peer Median</span>
                                    </td>
                                    <td className="border-t border-[var(--border-default)] px-5 py-6 text-right text-[20px] font-black text-sky-500 dark:border-white/15 dark:text-sky-300">{formatMult(stats.evRevenue.median)}</td>
                                    <td className="border-t border-[var(--border-default)] px-5 py-6 text-right text-[20px] font-black text-indigo-500 dark:border-white/15 dark:text-indigo-300">{formatMult(stats.evEbitda.median)}</td>
                                    <td className="border-t border-[var(--border-default)] px-5 py-6 text-right text-[20px] font-black text-emerald-500 dark:border-white/15 dark:text-emerald-300">{formatPct(stats.revGrowth.median)}</td>
                                    <td className="border-t border-[var(--border-default)] px-5 py-6 text-right text-[20px] font-black text-amber-600 dark:border-white/15 dark:text-amber-200">{formatPct(stats.ebitdaMargin.median)}</td>
                                    <td className="border-t border-[var(--border-default)] px-5 py-6 text-right text-[20px] font-black text-[var(--text-primary)] dark:border-white/15 dark:text-white/90">{formatBeta(stats.beta.median)}</td>
                                    <td className="border-t border-[var(--border-default)] px-5 py-6 text-right text-[20px] font-black text-[var(--text-tertiary)] dark:border-white/15 dark:text-white/40">-</td>
                                </tr>
                                <tr className={cn(isDarkMode ? "bg-[#050b18]/80" : "bg-slate-50")}>
                                    <td className="border-t border-[var(--border-default)] px-5 py-5 dark:border-white/10" colSpan={6}>
                                        <span className={cn("text-[14px] font-black uppercase tracking-[0.2em]", isDarkMode ? "text-white/60" : "text-slate-600")}>Peer Mean</span>
                                    </td>
                                    <td className="border-t border-[var(--border-default)] px-5 py-5 text-right text-[18px] text-[var(--text-secondary)] dark:border-white/10 dark:text-white/70">{formatMult(stats.evRevenue.mean)}</td>
                                    <td className="border-t border-[var(--border-default)] px-5 py-5 text-right text-[18px] text-[var(--text-secondary)] dark:border-white/10 dark:text-white/70">{formatMult(stats.evEbitda.mean)}</td>
                                    <td className="border-t border-[var(--border-default)] px-5 py-5 text-right text-[18px] text-[var(--text-secondary)] dark:border-white/10 dark:text-white/70">{formatPct(stats.revGrowth.mean)}</td>
                                    <td className="border-t border-[var(--border-default)] px-5 py-5 text-right text-[18px] text-[var(--text-secondary)] dark:border-white/10 dark:text-white/70">{formatPct(stats.ebitdaMargin.mean)}</td>
                                    <td className="border-t border-[var(--border-default)] px-5 py-5 text-right text-[18px] text-[var(--text-secondary)] dark:border-white/10 dark:text-white/70">{formatBeta(stats.beta.mean)}</td>
                                    <td className="border-t border-[var(--border-default)] px-5 py-5 text-right text-[18px] text-[var(--text-tertiary)] dark:border-white/10 dark:text-white/35">-</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className={cn(
                    "mt-4 flex items-center justify-between border-t border-[var(--border-default)] pt-4 text-[12px] font-semibold tracking-[0.08em]",
                    isDarkMode ? "text-white/45 dark:border-white/10" : "text-slate-600"
                )}>
                    <span className={cn(isDarkMode ? "text-white/45" : "text-slate-600")}>Selection updates peer median metrics in real time</span>
                    <span className={cn(isDarkMode ? "text-white/45" : "text-slate-600")}>Market data snapshot</span>
                </div>
            </div>
        </div>
    );
});

export default CompsTableInstitutional;
