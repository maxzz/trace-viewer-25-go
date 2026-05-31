import { type TraceLine, type TraceHeader } from "@/trace-viewer-core/9-core-types";

// Input

export interface ParseTraceWorkerInput {
    type: 'PARSE';
    arrayBuffer: ArrayBuffer;
}

// Output

export interface ParseTraceWorkerOutput {
    type: 'SUCCESS' | 'ERROR';
    data?: ParsedTraceData;
    error?: string;
}

export interface ParsedTraceData {
    rawLines: TraceLine[];
    viewLines: TraceLine[];
    uniqueThreadIds: number[];
    header: TraceHeader;
    errorCount: number;
}
