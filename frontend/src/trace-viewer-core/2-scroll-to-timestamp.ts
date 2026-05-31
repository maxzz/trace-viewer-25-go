import { type TraceLine } from "./9-core-types";

/**
 * Find the best index for a pending scroll timestamp.
 * @param viewLines - The lines to search through.
 * @param pendingScrollTimestamp - The timestamp to search for.
 * @returns The best index for the pending scroll timestamp.
 * @example
 * findBestIndexForPendingScrollTimestamp([{ date: "2026-02-13", timestamp: "12:00:00" }], "2026-02-13 12:00:00") // 0
 * findBestIndexForPendingScrollTimestamp([{ date: "2026-02-13", timestamp: "12:00:00" }], "12:00:00") // 0
 * findBestIndexForPendingScrollTimestamp([{ date: "2026-02-13", timestamp: "12:00:00" }], "2026-02-13") // 0
 * findBestIndexForPendingScrollTimestamp([{ date: "2026-02-13", timestamp: "12:00:00" }], "2026-02-13 12:00:00.123") // 0
 * findBestIndexForPendingScrollTimestamp([{ date: "2026-02-13", timestamp: "12:00:00" }], "2026-02-13 12:00:00.123456") // 0
 */
export function findBestIndexForPendingScrollTimestamp(viewLines: readonly TraceLine[], pendingScrollTimestamp: string): number {
    const target = splitPendingTimestamp(pendingScrollTimestamp);

    // If we have a date, we MUST include date in matching (otherwise time-only may pick the wrong day).
    if (target.date && target.time) {
        return findBestIndexForDateTime(viewLines, target.date, target.time);
    }

    if (target.time) {
        // Time-only fallback (previous behavior).
        return findBestIndexForTimeOnly(viewLines, target.time);
    }

    return -1;
}

/**
 * Split a pending scroll timestamp into date and time parts.
 * @param pendingScrollTimestamp - The timestamp to split into date and time parts.
 * @returns An object with the date and time parts.
 * @example
 * splitPendingTimestamp("2026-02-13 12:00:00") // { date: "2026-02-13", time: "12:00:00" }
 * splitPendingTimestamp("12:00:00") // { date: null, time: "12:00:00" }
 * splitPendingTimestamp("2026-02-13") // { date: "2026-02-13", time: null }
 * splitPendingTimestamp("2026-02-13 12:00:00.123") // { date: "2026-02-13", time: "12:00:00.123" }
 * splitPendingTimestamp("2026-02-13 12:00:00.123456") // { date: "2026-02-13", time: "12:00:00.123456" }
 */
function splitPendingTimestamp(pendingScrollTimestamp: string): { date: string | null; time: string | null; } {
    const trimmed = pendingScrollTimestamp.trim();
    if (!trimmed) return { date: null, time: null };

    if (!trimmed.includes(' ')) {
        return { date: null, time: trimmed };
    }

    const parts = trimmed.split(' ').filter(Boolean);
    if (parts.length < 2) {
        return { date: null, time: trimmed };
    }

    return {
        date: parts.slice(0, parts.length - 1).join(' '),
        time: parts[parts.length - 1] ?? null,
    };
}

/**
 * Find the best index for a pending scroll timestamp that includes both date and time.
 * @param viewLines - The lines to search through.
 * @param targetDate - The target date to search for.
 * @param targetTimePrefix - The target time prefix to search for.
 * @returns The best index for the pending scroll timestamp.
 */
function findBestIndexForDateTime(viewLines: readonly TraceLine[], targetDate: string, targetTimePrefix: string): number {
    const targetDateMsUtc = parseMdyToUtcMidnightMs(targetDate);
    if (targetDateMsUtc === null) {
        // If date parsing fails, fall back to time-only rather than doing the wrong thing.
        return findBestIndexForTimeOnly(viewLines, targetTimePrefix);
    }

    const timeRange = getTimeRangeMsWithinDay(targetTimePrefix);
    if (!timeRange) {
        return findBestIndexForTimeOnly(viewLines, targetTimePrefix);
    }

    const rangeStart = targetDateMsUtc + timeRange.minMs;
    const rangeEnd = targetDateMsUtc + timeRange.maxMs;
    const rangeCenter = (rangeStart + rangeEnd) / 2;

    // Lower-bound search for the first line >= rangeStart.
    let low = 0;
    let high = viewLines.length - 1;
    let insertionIndex = viewLines.length;

    while (low <= high) {
        const mid = (low + high) >>> 1;
        const v = getLineDateTimeValueMs(viewLines[mid]);
        if (v === null) {
            // Typically only happens before any Day/Time lines; move forward.
            low = mid + 1;
            continue;
        }
        if (v >= rangeStart) {
            insertionIndex = mid;
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }

    // Priority 1: find a prefix match within the selected date and time bucket.
    for (let i = insertionIndex; i < viewLines.length; i++) {
        const line = viewLines[i];
        if (!line.timestamp) continue;

        // Date mismatch: stop once we go past the requested date.
        if (line.date !== targetDate) {
            const lineDateMs = line.date ? parseMdyToUtcMidnightMs(line.date) : null;
            if (lineDateMs !== null && lineDateMs > targetDateMsUtc) break;
            continue;
        }

        const v = getLineDateTimeValueMs(line);
        if (v !== null && v > rangeEnd) break;

        if (line.timestamp.startsWith(targetTimePrefix)) {
            return i;
        }
    }

    // Priority 2: closest by time (still pinned to the selected date).
    let bestIndex = -1;
    let minDiff = Infinity;
    const range = 10;
    const start = Math.max(0, insertionIndex - range);
    const end = Math.min(viewLines.length - 1, insertionIndex + range);

    for (let i = start; i <= end; i++) {
        const line = viewLines[i];
        if (line.date !== targetDate) continue;
        const v = getLineDateTimeValueMs(line);
        if (v === null) continue;
        const diff = Math.abs(v - rangeCenter);
        if (diff < minDiff) {
            minDiff = diff;
            bestIndex = i;
        }
    }

    if (bestIndex === -1) {
        // If we didn't find anything on this date (or date mapping is missing),
        // fall back to time-only rather than doing nothing.
        return findBestIndexForTimeOnly(viewLines, targetTimePrefix);
    }

    return bestIndex;
}

/**
 * Find the best index for a pending scroll timestamp that includes only time.
 * @param viewLines - The lines to search through.
 * @param targetTimestampStr - The target timestamp to search for.
 * @returns The best index for the pending scroll timestamp.
 */
function findBestIndexForTimeOnly(viewLines: readonly TraceLine[], targetTimestampStr: string): number {
    // Parse target timestamp to ms for accurate comparison
    const targetTime = parseTimeMsWithinDay(targetTimestampStr);
    let bestIndex = -1;
    let minDiff = Infinity;

    // Binary search for insertion point (first line >= targetTimestampStr)
    let low = 0;
    let high = viewLines.length - 1;
    let insertionIndex = viewLines.length;

    while (low <= high) {
        const mid = (low + high) >>> 1;
        const tStr = viewLines[mid].timestamp;
        if (!tStr) {
            low = mid + 1;
            continue;
        }
        // Use string comparison on cleaned timestamp
        if (tStr >= targetTimestampStr) {
            insertionIndex = mid;
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }

    // Priority 1: Check for prefix match (starts with) starting from insertionIndex
    if (insertionIndex < viewLines.length) {
        const tStr = viewLines[insertionIndex].timestamp;
        if (tStr && tStr.startsWith(targetTimestampStr)) {
            bestIndex = insertionIndex;
        }
    }

    // Priority 2: If no prefix match, look for closest by time difference
    if (bestIndex === -1) {
        const candidates = [];
        const range = 5;
        for (let i = Math.max(0, insertionIndex - range); i <= Math.min(viewLines.length - 1, insertionIndex + range); i++) {
            candidates.push(i);
        }

        for (const idx of candidates) {
            const tStr = viewLines[idx].timestamp;
            if (tStr) {
                const tVal = parseTimeMsWithinDay(tStr);
                const diff = Math.abs(tVal - targetTime);
                if (diff < minDiff) {
                    minDiff = diff;
                    bestIndex = idx;
                }
            }
        }
    }

    return bestIndex;
}

/**
 * Get the UTC milliseconds value of a line's date and time.
 * @param line - The line to get the date and time value for.
 * @returns The UTC milliseconds value of the line's date and time.
 * @example
 * getLineDateTimeValueMs({ date: "2026-02-13", timestamp: "12:00:00" }) // 1739412000000
 * getLineDateTimeValueMs({ date: "2026-02-13", timestamp: "12:00:00.123" }) // 1739412000123
 * getLineDateTimeValueMs({ date: "2026-02-13", timestamp: "12:00:00.123456" }) // 1739412000123
 */
function getLineDateTimeValueMs(line: TraceLine): number | null {
    if (!line.date || !line.timestamp) return null;
    const dateMsUtc = parseMdyToUtcMidnightMs(line.date);
    if (dateMsUtc === null) return null;
    return dateMsUtc + parseTimeMsWithinDay(line.timestamp);
}

/**
 * Parse a time string into UTC milliseconds within a day.
 * @param t - The time string to parse.
 * @returns The UTC milliseconds value of the time string.
 * @example
 * parseTimeMsWithinDay("12:00:00") // 43200000
 * parseTimeMsWithinDay("12:00:00.123") // 43200123
 * parseTimeMsWithinDay("12:00:00.123456") // 43200123
 */
function parseTimeMsWithinDay(t: string): number {
    const [hms, msPart] = t.split('.');
    if (!hms) return 0;
    const [h, m, s] = hms.split(':').map(Number);
    // Pad milliseconds to ensure proper decimal comparison (e.g. .5 -> 500ms, .05 -> 50ms)
    const ms = parseInt((msPart || '').padEnd(3, '0').slice(0, 3), 10);
    return ((h || 0) * 3600 + (m || 0) * 60 + (s || 0)) * 1000 + (ms || 0);
}

/**
 * Get the UTC milliseconds range within a day for a time prefix.
 * @param timePrefix - The time prefix to get the range for.
 * @returns The UTC milliseconds range within a day for the time prefix.
 * @example
 * getTimeRangeMsWithinDay("12:00") // { minMs: 43200000, maxMs: 43200999 }
 * getTimeRangeMsWithinDay("12:00:00") // { minMs: 43200000, maxMs: 43200999 }
 * getTimeRangeMsWithinDay("12:00:00.123") // { minMs: 43200123, maxMs: 43200123 }
 * getTimeRangeMsWithinDay("12:00:00.123456") // { minMs: 43200123, maxMs: 43200123 }
 */
function getTimeRangeMsWithinDay(timePrefix: string): { minMs: number; maxMs: number; } | null {
    // Handles the same precision output as all-times worker:
    // - HH:MM
    // - HH:MM:S (10-second bucket)
    // - HH:MM:SS
    // - HH:MM:SS.m / .mm / .mmm
    const parts = timePrefix.split(':');
    if (parts.length < 2) return null;

    const h = Number(parts[0] ?? 0);
    const m = Number(parts[1] ?? 0);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;

    // HH:MM
    if (parts.length === 2) {
        const minMs = ((h * 3600) + (m * 60)) * 1000;
        const maxMs = minMs + (60 * 1000) - 1;
        return { minMs, maxMs };
    }

    const secPart = parts[2] ?? '0';
    if (!secPart) return null;

    // HH:MM:S  (single digit, bucket of 10 seconds)
    if (!secPart.includes('.') && secPart.length === 1) {
        const tens = Number(secPart);
        if (!Number.isFinite(tens)) return null;
        const minSeconds = tens * 10;
        const maxSeconds = (tens * 10) + 10 - 0.001; // inclusive
        return {
            minMs: ((h * 3600) + (m * 60) + minSeconds) * 1000,
            maxMs: ((h * 3600) + (m * 60) + maxSeconds) * 1000,
        };
    }

    // HH:MM:SS[.ms]
    const [secStr, msStr = ''] = secPart.split('.');
    const s = Number(secStr ?? 0);
    if (!Number.isFinite(s)) return null;

    if (!msStr) {
        const minMs = ((h * 3600) + (m * 60) + s) * 1000;
        const maxMs = minMs + 1000 - 1;
        return { minMs, maxMs };
    }

    // msStr length determines bucket size
    const digits = Math.min(3, msStr.length);
    const bucketSizeMs = 10 ** (3 - digits); // 1->100ms, 2->10ms, 3->1ms
    const msBase = Number(msStr.padEnd(3, '0').slice(0, 3));
    if (!Number.isFinite(msBase)) return null;

    const minMs = ((h * 3600) + (m * 60) + s) * 1000 + msBase;
    const maxMs = minMs + bucketSizeMs - 1;
    return { minMs, maxMs };
}

/**
 * Parse a date string into UTC milliseconds at midnight.
 * @param mdy - The date string to parse.
 * @returns The UTC milliseconds value of the date string.
 * @example
 * parseMdyToUtcMidnightMs("02/13/26") // 1739412000000
 * parseMdyToUtcMidnightMs("02/13/2026") // 1739412000000
 */
function parseMdyToUtcMidnightMs(mdy: string): number | null {
    // Trace format is documented as MDY.
    // Supports: M/D/YY, MM/DD/YY, M/D/YYYY, MM/DD/YYYY
    const m = mdy.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (!m) return null;
    const month = Number(m[1]);
    const day = Number(m[2]);
    let year = Number(m[3]);
    if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) return null;
    if (year < 100) year = 2000 + year;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return Date.UTC(year, month - 1, day);
}
