import * as fflate from 'fflate';
import { type ExtractedFile, type ZipWorkerRequest, type ZipWorkerResponse } from './zip-worker-types';
import { isFileNameMatch } from '@/utils/filter-match';

self.onmessage = async function handleZipExtract(e: MessageEvent<ZipWorkerRequest>) {
    const { type, file, blockPatterns } = e.data;

    if (type !== 'EXTRACT') {
        return;
    }

    try {
        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        const extractedFiles: ExtractedFile[] = [];
        let blockedFilesCount = 0;

        // Unzip synchronously (inside worker)
        const unzipped = fflate.unzipSync(uint8Array, {
            filter: (file) => {
                const baseName = file.name.split('/').pop() || file.name;
                if (!baseName.toLowerCase().endsWith('.trc3')) {
                    return false;
                }

                const isBlocked = blockPatterns.some(pattern => isFileNameMatch(baseName, pattern));
                if (isBlocked) {
                    blockedFilesCount += 1;
                    return false;
                }

                return true;
            }
        });

        for (const [filename, fileData] of Object.entries(unzipped)) {
            // fileData is Uint8Array
            extractedFiles.push({
                name: filename.split('/').pop() || filename, // Use only the base name
                buffer: fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength) as ArrayBuffer
            });
        }

        const response: ZipWorkerResponse = {
            type: 'SUCCESS',
            files: extractedFiles,
            blockedFilesCount
        };
        self.postMessage(response);

    } catch (error: any) {
        const response: ZipWorkerResponse = {
            type: 'ERROR',
            error: error.message || 'Unknown error during unzip'
        };
        self.postMessage(response);
    }
};
