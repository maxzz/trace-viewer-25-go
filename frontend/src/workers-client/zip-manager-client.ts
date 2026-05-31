import { getDefaultStore } from 'jotai';
import { isZipProcessingAtom } from '@/store/2-ui-atoms';
import { type ZipWorkerRequest, type ZipWorkerResponse } from '@/workers/zip-worker-types';
import ZipWorker from '@/workers/zip.worker?worker';

// Reuse the worker instance
let workerInstance: Worker | null = null;

function getWorker(): Worker {
    if (!workerInstance) {
        workerInstance = new ZipWorker();
    }
    return workerInstance;
}

export interface ZipExtractionResult {
    files: File[];
    zipFileName: string;
    blockedFilesCount: number;
}

export async function extractTracesFromZipInWorker(file: File, blockPatterns: string[] = []): Promise<ZipExtractionResult> {
    const store = getDefaultStore();

    // Set loading state
    store.set(isZipProcessingAtom, true);

    // We do NOT close existing files here. The caller is responsible for clearing state 
    // if this is a "new open" operation. This allows adding files from ZIP to existing ones
    // or processing multiple ZIPs.

    const worker = getWorker();

    return new Promise((resolve, reject) => {

        function handleMessage(e: MessageEvent<ZipWorkerResponse>) {
            const response = e.data;

            // Clean up listener for this request (assuming serial requests for now)
            // Ideally we'd match IDs but for single file drop it's fine.
            worker.removeEventListener('message', handleMessage);
            store.set(isZipProcessingAtom, false);

            if (response.type === 'SUCCESS') {
                if (response.files.length === 0) {
                    // No .trc3 files found
                    resolve({ files: [], zipFileName: file.name, blockedFilesCount: response.blockedFilesCount });
                    return;
                }

                // Convert extracted buffers to File objects
                const extractedFiles = response.files.map(
                    (extracted) => {
                        return new File([extracted.buffer], extracted.name, { type: 'application/octet-stream' });
                    }
                );

                resolve({ files: extractedFiles, zipFileName: file.name, blockedFilesCount: response.blockedFilesCount });
            } else {
                console.error('ZIP Worker Error:', response.error);
                reject(new Error(response.error));
            }
        }

        worker.addEventListener('message', handleMessage);

        const request: ZipWorkerRequest = { type: 'EXTRACT', file, blockPatterns };
        worker.postMessage(request);
    });
}
