import { type ParseTraceWorkerInput, type ParseTraceWorkerOutput } from './parse-trace-worker-types';
import { TraceParser } from '../trace-viewer-core/0-parser';
import { LineCode, type TraceLine } from '../trace-viewer-core/9-core-types';

self.onmessage = function handleParse(e: MessageEvent<ParseTraceWorkerInput>) {
    const { type, arrayBuffer } = e.data;

    if (type !== 'PARSE') return;

    try {
        const parser = new TraceParser(arrayBuffer);
        parser.parse();

        const rawLines = parser.lines;
        const viewLines = parser.lines.filter((l: TraceLine) => l.code !== LineCode.Time);
        const uniqueThreadIds = Array.from(new Set(parser.lines.map((l: TraceLine) => l.threadId))).sort((a, b) => a - b);
        const errorCount = parser.lines.filter((l: TraceLine) => l.code === LineCode.Error).length;

        const response: ParseTraceWorkerOutput = {
            type: 'SUCCESS',
            data: {
                rawLines,
                viewLines,
                uniqueThreadIds,
                header: parser.header,
                errorCount,
            }
        };
        self.postMessage(response);
    }
    catch (error: any) {
        const response: ParseTraceWorkerOutput = {
            type: 'ERROR',
            error: error.message || 'Unknown error during parsing'
        };
        self.postMessage(response);
    }
};
