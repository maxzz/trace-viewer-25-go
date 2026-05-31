import { type TraceLine } from "@/trace-viewer-core/9-core-types";

// Input

export type AllTimesLineInput = Pick<TraceLine, 'timestamp' | 'lineIndex' | 'date'>;

export interface AllTimesFileInput {
    id: string;
    lines: AllTimesLineInput[];
}

export interface AllTimesWorkerInput {
    type: 'BUILD';
    files: AllTimesFileInput[];
    precision: number;
}

// Output

export interface AllTimesItemOutput {
    timestamp: string;
    fileIds: string[];
}

export interface AllTimesWorkerOutput {
    type: 'SUCCESS' | 'ERROR' | 'CANCELLED';
    allTimes?: AllTimesItemOutput[];
    error?: string;
}

