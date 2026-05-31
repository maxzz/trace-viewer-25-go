import { type FileWithHandle } from "browser-fs-access";
import { atom } from "jotai";
import { isOurFile, isTrc3File, isZipFile } from "@/workers-client";
import { closeAllFiles } from "@/store/traces-store/0-2-files-actions";
import { asyncLoadAnyFiles } from "@/store/traces-store/8-1-load-files";
import { setFileLoadSummary } from "@/store/traces-store/8-4-file-load-summary";
import { notice } from "@/components/ui/local-ui/7-toaster";

export type DoSetFilesFrom_Dnd_Atom = typeof doSetFilesFrom_Dnd_Atom;

interface FileWithPath {
    file: File;
    path: string;
}

interface DroppedItemCandidate {
    handlePromise: Promise<FileSystemHandle | null> | null;
    entry: FileSystemEntry | null;
    fallbackFile: File | null;
}

interface DataTransferItemWithFileSystemHandle extends DataTransferItem {
    getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
}

type FileSystemDirectoryHandleWithValues = FileSystemDirectoryHandle & {
    values(): AsyncIterableIterator<FileSystemDirectoryHandle | FileSystemFileHandle>;
};

export const doSetFilesFrom_Dnd_Atom = atom(                    // used by DropItDoc only
    null,
    async (get, set, dataTransfer: DataTransfer) => {
        const filesWithPaths: FileWithPath[] = [];
        let droppedFolderName: string | undefined;
        let unsupportedSingleFileName: string | undefined;
        let hasAnyFileDrop = false;

        // IMPORTANT: webkitGetAsEntry() and getAsFileSystemHandle() must be collected during the drop event.
        const droppedItems: DroppedItemCandidate[] = [];

        try {
            if (dataTransfer.items) {
                // Check if single folder/file dropped (for better feedback)
                if (dataTransfer.items.length === 1) {
                    const item = dataTransfer.items[0];
                    if (item.kind === 'file') {
                        hasAnyFileDrop = true;
                        const entry = (item as any).webkitGetAsEntry?.() as FileSystemEntry | null | undefined;
                        if (entry?.isDirectory) {
                            droppedFolderName = entry.name;
                        } else {
                            const file = item.getAsFile();
                            if (file && !isOurFile(file)) {
                                unsupportedSingleFileName = file.name;
                            }
                        }
                    }
                }

                // Collect all entries synchronously first
                for (let i = 0; i < dataTransfer.items.length; i++) {
                    const item = dataTransfer.items[i];

                    if (item.kind === 'file') {
                        hasAnyFileDrop = true;
                        const handlePromise = getDroppedItemHandle(item);
                        const entry = (item as any).webkitGetAsEntry?.() as FileSystemEntry | null | undefined;

                        let fallbackFile: File | null = null;
                        if (!entry && !handlePromise) {
                            fallbackFile = item.getAsFile();
                        }

                        droppedItems.push({
                            handlePromise,
                            entry: entry ?? null,
                            fallbackFile,
                        });
                    }
                }

                // Clear previously uploaded files
                if (hasAnyFileDrop) {
                    closeAllFiles();
                }

                if (unsupportedSingleFileName) {
                    notice.info(`Unsupported file "${unsupportedSingleFileName}". Please drop a .trc3 file or a ZIP archive with .trc3 files.`);
                    return;
                }

                // Now process dropped items asynchronously
                for (const droppedItem of droppedItems) {
                    const handle = droppedItem.handlePromise ? await droppedItem.handlePromise : null;

                    if (!droppedFolderName && droppedItems.length === 1 && handle?.kind === 'directory') {
                        droppedFolderName = handle.name;
                    }

                    if (handle) {
                        await processHandle(handle, filesWithPaths);
                        continue;
                    }

                    if (droppedItem.entry) {
                        await processEntry(droppedItem.entry, filesWithPaths);
                        continue;
                    }

                    const file = droppedItem.fallbackFile;
                    if (file && (isTrc3File(file) || isZipFile(file))) {
                        filesWithPaths.push({ file, path: '' });
                    }
                }
            } else {
                // Fallback for older browsers
                if (dataTransfer.files.length > 0) {
                    hasAnyFileDrop = true;
                    closeAllFiles();
                }

                if (dataTransfer.files.length === 1 && !isOurFile(dataTransfer.files[0])) {
                    notice.info(`Unsupported file "${dataTransfer.files[0].name}". Please drop a .trc3 file or a ZIP archive with .trc3 files.`);
                    return;
                }

                for (let i = 0; i < dataTransfer.files.length; i++) {
                    const file = dataTransfer.files[i];
                    if (isOurFile(file)) {
                        filesWithPaths.push({ file, path: '' });
                    }
                }
            }

            if (filesWithPaths.length === 0) {
                if (hasAnyFileDrop) {
                    // const sourceName = droppedFolderName || dataTransfer.files?.[0]?.name || "drop";
                    // notice.info(`No .trc3 files were found to load from "${sourceName}".`);
                    setFileLoadSummary(0);
                }
                return;
            }
        } catch (e) {
            console.error("Failed to process dropped files", e);
            if (hasAnyFileDrop) {
                const sourceName = droppedFolderName || dataTransfer.files?.[0]?.name || "drop";
                notice.info(`Failed to read dropped items from "${sourceName}".`);
            }
            return;
        }

        // Extract files and paths
        const files = filesWithPaths.map(fp => fp.file);
        const filePaths = filesWithPaths.map(fp => fp.path);

        // Load new files
        asyncLoadAnyFiles(files, droppedFolderName, filePaths);
    }
);

async function processHandle(handle: FileSystemHandle, rv: FileWithPath[]): Promise<void> {
    if (handle.kind === 'file') {
        const fileHandle = handle as FileSystemFileHandle;
        const file = await getFileWithHandle(fileHandle);
        if (isOurFile(file)) {
            rv.push({ file, path: '' });
        }
        return;
    }

    await collectFilesFromDirectoryHandle(handle as FileSystemDirectoryHandle, rv);
}

// Helper function to process a single entry (file or directory)
async function processEntry(entry: FileSystemEntry, rv: FileWithPath[]): Promise<void> {
    if (entry.isFile) {
        return new Promise((resolve, reject) => {
            (entry as FileSystemFileEntry).file(
                (file) => {
                    if (isOurFile(file)) {
                        rv.push({ file, path: entry.fullPath });
                    }
                    resolve();
                },
                reject
            );
        });
    } else if (entry.isDirectory) {
        // Only process first-level files in directory
        await collectFilesFromDirectory(entry as FileSystemDirectoryEntry, rv);
    }
}

function getDroppedItemHandle(item: DataTransferItem): Promise<FileSystemHandle | null> | null {
    const itemWithHandle = item as DataTransferItemWithFileSystemHandle;
    return typeof itemWithHandle.getAsFileSystemHandle === 'function'
        ? itemWithHandle.getAsFileSystemHandle()
        : null;
}

async function getFileWithHandle(handle: FileSystemFileHandle): Promise<FileWithHandle> {
    const file = await handle.getFile();
    (file as FileWithHandle).handle = handle;
    return file as FileWithHandle;
}

// TypeScript declarations for FileSystemEntry API (webkitGetAsEntry)

interface FileSystemEntry {
    readonly isFile: boolean;
    readonly isDirectory: boolean;
    readonly name: string;
    readonly fullPath: string;
}

interface FileSystemFileEntry extends FileSystemEntry {
    readonly isFile: true;
    readonly isDirectory: false;
    file(successCallback: (file: File) => void, errorCallback?: (error: Error) => void): void;
}

interface FileSystemDirectoryEntry extends FileSystemEntry {
    readonly isFile: false;
    readonly isDirectory: true;
    createReader(): FileSystemDirectoryReader;
}

interface FileSystemDirectoryReader {
    readEntries(successCallback: (entries: FileSystemEntry[]) => void, errorCallback?: (error: Error) => void): void;
}

// Helper function to recursively collect files from a directory entry (first level only)
async function collectFilesFromDirectory(entry: FileSystemDirectoryEntry, rv: FileWithPath[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const reader = entry.createReader();
        const entries: FileSystemEntry[] = [];

        function readEntries() {
            reader.readEntries(
                (batch) => {
                    if (batch.length === 0) {
                        // All entries read, now process them
                        Promise.all(
                            entries.map(
                                async (childEntry) => {
                                    if (childEntry.isFile) {
                                        return new Promise<FileWithPath | null>((resolveFile) => {
                                            (childEntry as FileSystemFileEntry).file(
                                                (file) => {
                                                    resolveFile((isOurFile(file)) ? { file, path: childEntry.fullPath } : null);
                                                },
                                                reject
                                            );
                                        });
                                    }
                                    return null;
                                }
                            )
                        ).then((fileResults) => {
                            rv.push(...fileResults.filter((f): f is FileWithPath => f !== null));
                            resolve();
                        });
                    } else {
                        entries.push(...batch);
                        readEntries(); // Continue reading
                    }
                },
                reject
            );
        }

        readEntries();
    });
}

async function collectFilesFromDirectoryHandle(entry: FileSystemDirectoryHandle, rv: FileWithPath[]): Promise<void> {
    const rootPath = `/${entry.name}`;
    const directoryHandle = entry as FileSystemDirectoryHandleWithValues;

    for await (const childHandle of directoryHandle.values()) {
        if (childHandle.kind !== 'file') {
            continue;
        }

        const fileHandle = childHandle as FileSystemFileHandle;
        const file = await getFileWithHandle(fileHandle);
        if (!isOurFile(file)) {
            continue;
        }

        rv.push({ file, path: `${rootPath}/${file.name}` });
    }
}
