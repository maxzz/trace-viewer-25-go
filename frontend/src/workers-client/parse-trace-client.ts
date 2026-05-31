import { type ParseTraceWorkerInput, type ParseTraceWorkerOutput, type ParsedTraceData } from '../workers/parse-trace-worker-types';

export function asyncParseTraceInWorker(arrayBuffer: ArrayBuffer): Promise<ParsedTraceData> {
    const worker = new Worker(new URL('../workers/parse-trace.worker.ts', import.meta.url), { type: 'module' });

    return new Promise(
        (resolve, reject) => {
            worker.onmessage = (e: MessageEvent<ParseTraceWorkerOutput>) => {
                const { type, data, error } = e.data;
                if (type === 'SUCCESS' && data) {
                    resolve(data);
                } else if (type === 'ERROR') {
                    reject(new Error(error));
                }
                worker.terminate();
            };

            worker.onerror = (err) => {
                reject(err);
                worker.terminate();
            };

            const msg: ParseTraceWorkerInput = {
                type: 'PARSE',
                arrayBuffer
            };
            worker.postMessage(msg, [arrayBuffer]); // Transfer ownership for performance
        }
    );
}
