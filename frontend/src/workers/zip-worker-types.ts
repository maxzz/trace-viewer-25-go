export type ZipWorkerRequest = {
    type: 'EXTRACT';
    file: File;
    blockPatterns: string[];
};

export type ZipWorkerResponse =
    | { type: 'SUCCESS'; files: ExtractedFile[]; blockedFilesCount: number; }
    | { type: 'ERROR'; error: string; };

export type ExtractedFile = {
    name: string;
    buffer: ArrayBuffer;
};
