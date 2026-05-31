import { type AllTimesItemOutput, type AllTimesWorkerInput, type AllTimesWorkerOutput } from './all-times-worker-types';

self.onmessage = function handleAllTimesBuild(e: MessageEvent<AllTimesWorkerInput>) {
    const { type, files, precision } = e.data;

    if (type !== 'BUILD') return;

    try {
        const timestampMap = new Map<string, Set<string>>();
        const dateMap = new Map<string, string>(); // Store date for each timestamp

        for (const file of files) {
            let lastDate: string | undefined = undefined;

            for (const line of file.lines) {
                // Update last known date from lines that have it (LineCode.Day usually)
                if (line.date) {
                    lastDate = line.date;
                }

                if (!line.timestamp) continue;

                const formatted = formatTimestamp(line.timestamp, precision);
                if (!formatted) continue;

                if (!timestampMap.has(formatted)) {
                    timestampMap.set(formatted, new Set());
                    // Store the date associated with this timestamp if available
                    if (lastDate) {
                        dateMap.set(formatted, lastDate);
                    }
                } else if (lastDate && !dateMap.has(formatted)) {
                    // Backfill date if we found this timestamp before but didn't have a date then (unlikely but possible with multiple files)
                    dateMap.set(formatted, lastDate);
                }

                timestampMap.get(formatted)!.add(file.id);
            }
        }

        const allTimes: AllTimesItemOutput[] = Array.from(timestampMap.entries())
            .map(
                ([timestamp, fileIdSet]) => {
                    const date = dateMap.get(timestamp);
                    const fullTimestamp = date ? `${date} ${timestamp}` : timestamp;
                    return {
                        timestamp: fullTimestamp, // Combined date + time for display/key
                        fileIds: Array.from(fileIdSet)
                    };
                }
            )
            .sort(
                (a, b) => compareTimestamps(a.timestamp, b.timestamp)
            );

        const response: AllTimesWorkerOutput = { type: 'SUCCESS', allTimes };
        self.postMessage(response);
    }
    catch (error: any) {
        const response: AllTimesWorkerOutput = { type: 'ERROR', error: error.message || 'Unknown error during timeline build' };
        self.postMessage(response);
    }
};

function formatTimestamp(ts: string, precision: number): string | null {
    // Expected format: HH:MM:SS.mmm or similar
    // We assume the timestamp is somewhat valid.
    // Examples: "11:16:47.515"

    // If precision logic:
    // 5: HH:MM
    // 4: HH:MM:S (10s)
    // 3: HH:MM:SS.mmm (Full)
    // 2: HH:MM:SS.mm
    // 1: HH:MM:SS.m
    // 0: HH:MM:SS

    // Split by :
    const parts = ts.split(':');
    if (parts.length < 3) return ts; // Unexpected format, return as is or null?

    const hours = parts[0];
    const minutes = parts[1];
    const secondsAndMs = parts[2]; // "47.515" or "47"

    if (precision === 5) {
        return `${hours}:${minutes}`;
    }

    if (precision === 4) {
        // HH:MM:S (first digit of seconds)
        // secondsAndMs can be "47.515" -> "4"
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

    // precision 1, 2, 3
    // We take N digits of ms
    const msTruncated = ms.substring(0, precision);

    // If we want to pad? The requirement examples don't show padding for shorter ms.
    // "11:16:47.5"
    if (msTruncated.length > 0) {
        return `${hours}:${minutes}:${seconds}.${msTruncated}`;
    } else {
        // Fallback if no ms existed but precision > 0 requested?
        // E.g. precision 2, ts "11:16:47". Result "11:16:47".
        return `${hours}:${minutes}:${seconds}`;
    }
}

function compareTimestamps(a: string, b: string): number {
    // Expected format: "MM/DD/YY HH:MM:SS.mmm" or just "HH:MM:SS.mmm"
    // We can try to parse as Date if full format, or fallback to time comparison

    // If both have dates (space check)
    const hasDateA = a.includes(' ');
    const hasDateB = b.includes(' ');

    if (hasDateA && hasDateB) {
        // Try parsing as full date objects
        const dateA = new Date(a).getTime();
        const dateB = new Date(b).getTime();
        if (!isNaN(dateA) && !isNaN(dateB)) {
            return dateA - dateB;
        }
    }

    // If mixed or parsing failed, fallback to raw string comparison or just time component
    // If one has date and other doesn't, date one should conceptually be "more specific" or "later"?
    // But usually in trace viewer, if date is missing it implies same day or unknown.
    // Let's rely on parseToValue which currently handles Time only.
    // If we passed full string "MDY HMS" to parseToValue, it would fail or return partial.

    // Updated parseToValue to handle potential date prefix?
    // Actually, `parseToValue` logic below is specific to HH:MM:SS.

    // Let's update `parseToValue` to handle "MDY HMS".
    return parseToValue(a) - parseToValue(b);
}

function parseToValue(ts: string): number {
    // check for date part
    let timePart = ts;
    let datePart = '';

    if (ts.includes(' ')) {
        const split = ts.split(' ');
        // Assuming last part is time? "12/05/2024 10:00:00"
        timePart = split[split.length - 1];
        datePart = split.slice(0, split.length - 1).join(' ');
    }

    // Convert time to seconds
    const parts = timePart.split(':');
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);

    let s = 0;

    if (parts.length > 2) {
        const secStr = parts[2];
        if (secStr.includes('.')) {
            const [sec, msStr] = secStr.split('.');
            s = parseInt(sec, 10);
            const fraction = parseFloat(`0.${msStr}`);
            s += fraction;
        } else {
            s = parseInt(secStr, 10);
        }
    }

    let value = h * 3600 + m * 60 + s;

    // Add date component if available
    if (datePart) {
        // Date.parse returns ms since epoch
        const dateMs = Date.parse(datePart);
        if (!isNaN(dateMs)) {
            // Add date in seconds. Note: This might be huge, but consistent for sorting.
            // time value is seconds from start of day (0-86400).
            // dateMs is absolute.
            // We can just use dateMs / 1000 + value.
            return (dateMs / 1000) + value;
        }
    }

    return value;
}
