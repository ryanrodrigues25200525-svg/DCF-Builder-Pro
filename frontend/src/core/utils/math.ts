/**
 * Shared utility functions for DCF calculations
 */

/**
 * Safely divide two numbers, returning a fallback if denominator is 0
 */
export function safeDiv(num: number, den: number, fallback: number = 0): number {
    if (!den || den === 0) return fallback;
    return num / den;
}

/**
 * Safely get an item from an array with bounds checking
 */
export function safeGet(arr: number[] | undefined, idx: number, fallback: number = 0): number {
    if (!arr || idx < 0 || idx >= arr.length) return fallback;
    return typeof arr[idx] === 'number' ? arr[idx] : fallback;
}

/**
 * Calculate the median of an array of numbers
 */
export function median(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate the mean of an array of numbers
 */
export function mean(arr: number[]): number {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

/**
 * Cap a value between min and max
 */
export function clamp(val: number, min: number, max: number): number {
    return Math.min(Math.max(val, min), max);
}
