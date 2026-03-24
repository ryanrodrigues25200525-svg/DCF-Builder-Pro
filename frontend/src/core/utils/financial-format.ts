export function formatDisplayMillions(value: number): string {
    const num = value / 1_000_000;
    const formatted = Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return num < 0 ? `(${formatted})` : formatted;
}

export function formatDisplayCompactCurrency(value: number): string {
    const absolute = Math.abs(value);

    if (absolute >= 1_000_000_000_000) {
        const num = value / 1_000_000_000_000;
        const formatted = Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        return num < 0 ? `(${formatted}T)` : `${formatted}T`;
    }

    if (absolute >= 1_000_000_000) {
        const num = value / 1_000_000_000;
        const formatted = Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        return num < 0 ? `(${formatted}B)` : `${formatted}B`;
    }

    if (absolute >= 1_000_000) {
        const num = value / 1_000_000;
        const formatted = Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        return num < 0 ? `(${formatted}M)` : `${formatted}M`;
    }

    if (absolute >= 1_000) {
        const num = value / 1_000;
        const formatted = Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        return num < 0 ? `(${formatted}K)` : `${formatted}K`;
    }

    return formatDisplayNumber(value, 1);
}

export function formatDisplayPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

export function formatDisplayNumber(value: number, maximumFractionDigits = 1): string {
    return value.toLocaleString(undefined, { maximumFractionDigits });
}

export function formatDisplayShareValue(value: number): string {
    return `$${value.toFixed(2)}`;
}
