import { type AllTimesWorkerInput, type AllTimesWorkerOutput, type AllTimesItemOutput, type AllTimesFileInput, type AllTimesLineInput } from '../workers/all-times-worker-types';

let worker: Worker | null = null;
let currentReject: ((reason?: any) => void) | null = null;

export function asyncBuildAllTimesInWorker(files: AllTimesFileInput[], precision: number): Promise<AllTimesItemOutput[]> {
    cancelAllTimesBuild(); // Cancel any existing work

    worker = new Worker(new URL('../workers/all-times.worker.ts', import.meta.url), { type: 'module' });

    return new Promise(
        (resolve, reject) => {
            currentReject = reject;

            worker!.onmessage = (e: MessageEvent<AllTimesWorkerOutput>) => {
                const { type, allTimes, error } = e.data;
                if (type === 'SUCCESS' && allTimes) {
                    resolve(allTimes);
                    cleanup();
                } else if (type === 'ERROR') {
                    reject(new Error(error));
                    cleanup();
                }
            };

            worker!.onerror = (err) => {
                reject(err);
                cleanup();
            };

            // Prepare minimal data to send
            const filesData = files.map(
                (f: AllTimesFileInput) => ({
                    id: f.id,
                    lines: f.lines.map((l: AllTimesLineInput) => ({ timestamp: l.timestamp, lineIndex: l.lineIndex, date: l.date }))
                })
            );

            const msg: AllTimesWorkerInput = {
                type: 'BUILD',
                files: filesData,
                precision
            };
            worker!.postMessage(msg);
        }
    );
}

export function cancelAllTimesBuild() {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    if (currentReject) {
        currentReject(new Error('Timeline build cancelled'));
        currentReject = null;
    }
}

function cleanup() {
    // We can keep the worker alive if we want to reuse, but for now strict lifecycle
    if (worker) {
        worker.terminate();
        worker = null;
    }
    currentReject = null;
}
