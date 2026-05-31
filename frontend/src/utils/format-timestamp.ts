/**
 * Format timestamp to a specific precision level.
 * 
 * Precision levels:
 * - 5: HH:MM
 * - 4: HH:MM:S (10s)
 * - 3: HH:MM:SS.mmm (Full milliseconds)
 * - 2: HH:MM:SS.mm
 * - 1: HH:MM:SS.m
 * - 0: HH:MM:SS
 * 
 * @param ts - Timestamp string in format "HH:MM:SS.mmm" or similar
 * @param precision - Precision level (0-5)
 * @returns Formatted timestamp or null if invalid
 */
export function formatTimestamp(ts: string, precision: number): string | null {
    // Split by :
    const parts = ts.split(':');
    if (parts.length < 3) return ts; // Unexpected format, return as is

    const hours = parts[0];
    const minutes = parts[1];
    const secondsAndMs = parts[2]; // "47.515" or "47"

    if (precision === 5) {
        return `${hours}:${minutes}`;
    }

    if (precision === 4) {
        // HH:MM:S (first digit of seconds)
        const secondsFirstDigit = secondsAndMs.charAt(0);
        return `${hours}:${minutes}:${secondsFirstDigit}`;
    }

    // For precision 0-3, we handle seconds and ms
    const secParts = secondsAndMs.split('.');
    const seconds = secParts[0];
    const ms = secParts[1] || '';

    if (precision === 0) {
        return `${hours}:${minutes}:${seconds}`;
    }

    // precision 1, 2, 3 - take N digits of ms
    const msTruncated = ms.substring(0, precision);

    if (msTruncated.length > 0) {
        return `${hours}:${minutes}:${seconds}.${msTruncated}`;
    } else {
        // Fallback if no ms existed but precision > 0 requested
        return `${hours}:${minutes}:${seconds}`;
    }
}
