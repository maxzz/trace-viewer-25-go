import { type FileWithHandle } from "browser-fs-access";
import { atom, getDefaultStore } from "jotai";
import { ref } from "valtio";
import { extractTracesFromZipInWorker, isTrc3File, isZipFile } from "@/workers-client";
import { setAppTitle } from "@/store/3-ui-app-title";
import { notice } from "@/components/ui/local-ui/7-toaster";
import { filesStore, type FileData, type FileSourceInfo, type FileState } from "./9-types-files-store";
import { asyncParseTraceFile, type ParsedTraceData } from "./8-2-parse-trace-file";
import { emptyFileHeader, LineCode, type TraceLine } from "@/trace-viewer-core/9-core-types";
import { NOISE_ERROR_CODE } from "@/trace-viewer-core/3-format-error-line";
import { delay } from "@/utils";
import { recomputeFilterMatches } from "../4-file-filters";
import { appSettings } from "../1-ui-settings";
import { matchesFilePattern } from "../6-filtered-files";
import { buildAlltimes } from "./3-2-all-times-listener";
import { setFileLoading } from "./8-3-file-loading-atoms";
import { recomputeHighlightMatches } from "../5-highlight-rules";
import { allTimesStore } from "./3-1-all-times-store";
import { selectFile } from "./0-2-files-actions";
import { getCurrentFileState, setCurrentFileState } from "./0-1-files-current-state";
import { getActiveBlockLoadPatterns, shouldBlockFileLoad } from "../9-block-load-filters";
import { setFileLoadSummary } from "./8-4-file-load-summary";

export const isLoadingFilesAtom = atom(false);

const NEW_LINES_MARKER_DURATION_MS = 1000;
const FILE_RELOAD_RETRY_ATTEMPTS = 4;
const FILE_RELOAD_RETRY_DELAY_MS = 500;

type FileLoadItem = {
    file: File;
    source: FileSourceInfo;
};

type ReloadReason = "manual" | "auto";

type ReloadBatchOptions = {
    reason?: ReloadReason;
    prefetchedFiles?: Map<string, File>;
};

type ReloadSingleOptions = {
    reason: ReloadReason;
    prefetchedFile?: File;
};

type ReloadableFileState = FileState & {
    source: Extract<FileSourceInfo, { kind: "handle"; }>;
};

const activeFileReloadControllers = new Map<string, AbortController>();

export async function asyncLoadAnyFiles(files: File[], droppedFolderName?: string, filePaths?: string[]) {
    getDefaultStore().set(isLoadingFilesAtom, true);
    allTimesStore.setAllTimes([]);
    try {
        let loadedTrc3FilesCount = 0;
        let blockedTrc3FilesCount = 0;
        const blockPatterns = getActiveBlockLoadPatterns();
        const zipFiles = files.filter(f => isZipFile(f));
        const trc3Files = files.filter(f => isTrc3File(f));
        const allowedTrc3Files = trc3Files.filter(file => !shouldBlockFileLoad(file.name));
        blockedTrc3FilesCount += trc3Files.length - allowedTrc3Files.length;

        // Extract and load files from ZIPs
        for (const file of zipFiles) {
            const result = await extractTracesFromZipInWorker(file, blockPatterns);
            blockedTrc3FilesCount += result.blockedFilesCount;

            if (result.files.length > 0) {
                loadedTrc3FilesCount += result.files.length;
                await loadFilesToStore(
                    result.files.map(
                        (zipEntry) => ({
                            file: zipEntry,
                            source: { kind: "zip", zipFileName: result.zipFileName },
                        })
                    )
                );
                setAppTitle(result.files, result.zipFileName);
            }
        }

        // Load .TRC3 files directly
        await loadFilesToStore(allowedTrc3Files.map((file) => ({ file, source: createFileSourceInfo(file) })));
        loadedTrc3FilesCount += allowedTrc3Files.length;
        setAppTitle(files, droppedFolderName, filePaths);
        setFileLoadSummary(blockedTrc3FilesCount);

        if (loadedTrc3FilesCount === 0) {
            const sourceName = buildDroppedSourceName(files, droppedFolderName);
            if (blockedTrc3FilesCount > 0 && appSettings.showAllBlockedFilesNotice) {
                notice.info(`All .trc3 files were blocked by load filters from "${sourceName}".`);
            }
        }

        appSettings.allTimes.needToRebuild = true;
        buildAlltimes();
    } finally {
        getDefaultStore().set(isLoadingFilesAtom, false);
    }
}

function buildDroppedSourceName(files: File[], droppedFolderName?: string): string {
    if (droppedFolderName) {
        return droppedFolderName;
    }
    if (files.length === 1) {
        return files[0].name;
    }
    if (files.length > 1) {
        return `${files.length} files`;
    }
    return "drop";
}

async function loadFilesToStore(items: FileLoadItem[]) {
    // Check if this is the first load (no files existed before)
    const isFirstLoad = filesStore.states.length === 0;

    const itemsToLoad: { file: File, fileState: FileState; }[] = [];

    // Populate the store with new file states
    for (const item of items) {
        const newFileState = newTraceItemCreate(item.file, item.source);
        filesStore.states.push(newFileState);
        setFileLoading(newFileState.id, true);
        itemsToLoad.push({ file: item.file, fileState: newFileState });
    }

    // Recompute filters and highlights after all files list is populated
    recomputeFilterMatches();
    recomputeHighlightMatches();

    // Load the files
    for (const { file, fileState } of itemsToLoad) {
        await newTraceItemLoad(fileState, file);
    }

    // After all files are loaded, populate the quick file data
    for (const fileState of filesStore.states) {
        filesStore.quickFileData[fileState.id] = fileState.data;
    }

    // Handle file selection after loading
    const currentState = getCurrentFileState();
    if (itemsToLoad.length > 0) {
        // On first load, apply startup pattern to select a specific file
        if (isFirstLoad) {
            const startupPattern = appSettings.startupFilePattern;
            let fileToSelect = itemsToLoad[0].fileState;

            // If startup pattern is set, find the first matching file
            if (startupPattern) {
                const matchingFile = itemsToLoad.find(item => 
                    matchesFilePattern(item.fileState.data.fileName, startupPattern)
                );
                if (matchingFile) {
                    fileToSelect = matchingFile.fileState;
                }
            }

            selectFile(fileToSelect.id);
        } else if (!currentState) {
            // Not first load but no file selected - select first loaded file
            selectFile(itemsToLoad[0].fileState.id);
        } else if (itemsToLoad.some(item => item.fileState.id === currentState.id)) {
            // Force UI refresh by creating a new reference (data is loaded now)
            setCurrentFileState(currentState, true);
        }
    }
}

function newTraceItemCreate(file: File, source: FileSourceInfo): FileState {
    const id = MakeUuid();
    const newFileData = createNewFileData(id, file.name);
    const newFile = createNewFileState(id, ref(newFileData), source);
    return newFile;

    function MakeUuid(): string {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    }

    function createNewFileData(id: string, fileName: string): FileData {
        return {
            id,
            fileName,
            rawLines: [],
            viewLines: [],
            uniqueThreadIds: [],
            header: emptyFileHeader,
            errorsInTraceCount: 0,
            errorsInTraceCountWithoutNoise: 0,
            isLoading: true,
            errorLoadingFile: null,
        };
    }

    function createNewFileState(id: string, data: FileData, source: FileSourceInfo): FileState {
        return {
            id,
            data, // Placeholder, will update after adding to store
            source: ref(source),
            newLinesMarker: null,
            updateInfo: {
                status: "idle",
                lastLoadedSize: file.size,
                lastObservedSize: file.size,
                hasUnreloadedSizeChange: false,
                lastAttemptAt: null,
                lastSuccessAt: null,
                lastFailureAt: null,
                failureMessage: null,
            },
            currentLineIdxAtom: atom(-1),
            scrollTopAtom: atom(0),
            showOnlySelectedThreadAtom: atom(false),
            threadLinesAtom: atom<TraceLine[] | undefined>(undefined),
            threadLineBaseIndicesAtom: atom<number[] | undefined>(undefined),
            threadBaseIndexToDisplayIndexAtom: atom<number[] | undefined>(undefined),
            threadLinesThreadIdAtom: atom<number | null>(null),
            matchedFilterIds: [],
            matchedHighlightIds: []
        };
    }
}

async function newTraceItemLoad(fileState: FileState, file: File): Promise<void> {
    const data = fileState.data;
    try {
        const parsed = await asyncParseTraceFile(file);

        applyParsedTraceData(fileState, file.name, parsed);
        fileState.newLinesMarker = null;
        syncLoadedFileSize(fileState, file.size);
        data.isLoading = false;
    } catch (e: any) {
        data.errorLoadingFile = e.message || "Unknown error";
        data.isLoading = false;
        console.error("Failed to load trace", e);
    }

    // Update the reactive atom to trigger UI re-render for this specific file
    setFileLoading(fileState.id, false, false);

    // If this file is currently selected, force a refresh to show loaded data
    const currentState = getCurrentFileState();
    if (currentState?.id === fileState.id) {
        setCurrentFileState(fileState, true);
    }
}

export function canReloadFile(fileState: FileState | null | undefined): fileState is ReloadableFileState {
    return !!fileState && fileState.source.kind === "handle";
}

export async function asyncReloadFile(fileState: ReloadableFileState): Promise<void> {
    await asyncReloadFiles([fileState], { reason: "manual" });
}

export async function asyncReloadFiles(fileStates: readonly FileState[], options: ReloadBatchOptions = {}): Promise<number> {
    const reason = options.reason ?? "manual";
    const prefetchedFiles = options.prefetchedFiles ?? new Map<string, File>();
    const reloadableStates = dedupeReloadableFiles(fileStates).filter((fileState) => !activeFileReloadControllers.has(fileState.id));
    if (reloadableStates.length === 0) {
        return 0;
    }

    const results = await Promise.allSettled(
        reloadableStates.map(
            (fileState) => reloadSingleFile(
                fileState,
                {
                    reason,
                    prefetchedFile: prefetchedFiles.get(fileState.id),
                }
            )
        )
    );

    const updatedFilesCount = results.filter(
        (result) => result.status === "fulfilled" && result.value === "success"
    ).length;

    if (updatedFilesCount > 0) {
        recomputeFilterMatches();
        recomputeHighlightMatches();
        appSettings.allTimes.needToRebuild = true;
        buildAlltimes();
    }

    return updatedFilesCount;
}

export async function asyncAutoReloadFiles(): Promise<number> {
    const intervalMs = Math.max(FILE_RELOAD_RETRY_DELAY_MS, appSettings.fileUpdates.autoUpdateIntervalMs);
    const minSizeDeltaBytes = Math.max(0, appSettings.fileUpdates.autoUpdateMinSizeChangeBytes);
    const now = Date.now();

    const probeResults = await Promise.all(
        filesStore.states.map(
            async (fileState) => {
                if (!canReloadFile(fileState)) return null;
                if (activeFileReloadControllers.has(fileState.id)) return null;

                const lastAttemptAt = fileState.updateInfo.lastAttemptAt;
                if (lastAttemptAt !== null && now - lastAttemptAt < intervalMs) {
                    return null;
                }

                try {
                    const currentFile = await fileState.source.handle.getFile();
                    updateObservedFileSize(fileState, currentFile.size, appSettings.fileUpdates.sizeMonitorEnabled);

                    if (Math.abs(currentFile.size - fileState.updateInfo.lastLoadedSize) < minSizeDeltaBytes) {
                        return null;
                    }

                    return { fileState, currentFile };
                } catch {
                    return null;
                }
            }
        )
    );

    const prefetchedFiles = new Map<string, File>();
    const candidates: ReloadableFileState[] = [];

    for (const result of probeResults) {
        if (!result) continue;
        prefetchedFiles.set(result.fileState.id, result.currentFile);
        candidates.push(result.fileState);
    }

    if (candidates.length === 0) {
        return 0;
    }

    return asyncReloadFiles(candidates, { reason: "auto", prefetchedFiles });
}

export async function asyncCheckFileSizeChanges(): Promise<number> {
    const probeResults = await Promise.all(
        filesStore.states.map(
            async (fileState) => {
                if (!canReloadFile(fileState)) return false;
                if (activeFileReloadControllers.has(fileState.id)) return false;

                try {
                    const currentFile = await fileState.source.handle.getFile();
                    updateObservedFileSize(fileState, currentFile.size, true);
                    return fileState.updateInfo.hasUnreloadedSizeChange;
                } catch {
                    return false;
                }
            }
        )
    );

    return probeResults.filter(Boolean).length;
}

export function cancelFileReload(fileId: string) {
    const controller = activeFileReloadControllers.get(fileId);
    if (!controller) {
        return;
    }

    controller.abort();

    const fileState = filesStore.states.find((item) => item.id === fileId);
    if (fileState) {
        clearCancelledUpdate(fileState);
    }

    setFileLoading(fileId, false);
}

export function cancelAllFileReloads() {
    const fileIds = Array.from(activeFileReloadControllers.keys());
    fileIds.forEach(cancelFileReload);
}

function applyParsedTraceData(fileState: FileState, fileName: string, parsed: ParsedTraceData) {
    const data = fileState.data;
    data.fileName = fileName;
    data.rawLines = parsed.rawLines;
    data.viewLines = parsed.viewLines;
    data.uniqueThreadIds = parsed.uniqueThreadIds;
    data.header = parsed.header;
    data.errorsInTraceCount = parsed.errorCount;
    data.errorsInTraceCountWithoutNoise = getErrorLinesCountWithoutNoise(parsed.viewLines);
    data.errorLoadingFile = null;
}

function resetThreadViewCache(fileState: FileState) {
    const store = getDefaultStore();
    store.set(fileState.threadLinesAtom, undefined);
    store.set(fileState.threadLineBaseIndicesAtom, undefined);
    store.set(fileState.threadBaseIndexToDisplayIndexAtom, undefined);
    store.set(fileState.threadLinesThreadIdAtom, null);
}

function clampCurrentLineIndex(fileState: FileState, viewLinesLength: number) {
    const store = getDefaultStore();
    const currentLineIndex = store.get(fileState.currentLineIdxAtom);
    if (currentLineIndex < 0) return;

    const maxLineIndex = viewLinesLength - 1;
    store.set(fileState.currentLineIdxAtom, maxLineIndex >= 0 ? Math.min(currentLineIndex, maxLineIndex) : -1);
}

function createNewLinesMarker(previousRawLineCount: number, nextRawLineCount: number) {
    if (nextRawLineCount <= previousRawLineCount) {
        return null;
    }

    return {
        fromLineIndex: previousRawLineCount,
        expiresAt: Date.now() + NEW_LINES_MARKER_DURATION_MS,
        token: Date.now(),
    };
}

function createFileSourceInfo(file: File): FileSourceInfo {
    const handle = (file as FileWithHandle).handle;
    if (handle) {
        return { kind: "handle", handle };
    }

    return { kind: "transient" };
}

function dedupeReloadableFiles(fileStates: readonly FileState[]) {
    const uniqueReloadableFiles = new Map<string, ReloadableFileState>();

    for (const fileState of fileStates) {
        if (!canReloadFile(fileState)) continue;
        uniqueReloadableFiles.set(fileState.id, fileState);
    }

    return Array.from(uniqueReloadableFiles.values());
}

async function reloadSingleFile(fileState: ReloadableFileState, options: ReloadSingleOptions): Promise<"success" | "failed" | "cancelled"> {
    const existingController = activeFileReloadControllers.get(fileState.id);
    if (existingController) {
        return "cancelled";
    }

    const controller = new AbortController();
    activeFileReloadControllers.set(fileState.id, controller);

    const hadPreviousFailure = fileState.updateInfo.status === "failed";
    const previousRawLineCount = fileState.data.rawLines.length;

    startFileUpdate(fileState);

    try {
        const { file, parsed } = await parseLatestFileWithRetry(fileState, controller, options.prefetchedFile);
        throwIfReloadCancelled(fileState.id, controller);

        applyParsedTraceData(fileState, file.name, parsed);
        resetThreadViewCache(fileState);
        clampCurrentLineIndex(fileState, parsed.viewLines.length);
        fileState.newLinesMarker = createNewLinesMarker(previousRawLineCount, parsed.rawLines.length);
        markUpdateSucceeded(fileState, file.size);
        refreshCurrentFileStateIfSelected(fileState);
        return "success";
    } catch (error) {
        if (isReloadCancelled(fileState.id, controller, error)) {
            clearCancelledUpdate(fileState);
            refreshCurrentFileStateIfSelected(fileState);
            return "cancelled";
        }

        markUpdateFailed(fileState, error, options.reason, hadPreviousFailure);
        refreshCurrentFileStateIfSelected(fileState);
        return "failed";
    } finally {
        if (activeFileReloadControllers.get(fileState.id) === controller) {
            activeFileReloadControllers.delete(fileState.id);
        }
        setFileLoading(fileState.id, false, false);
    }
}

function startFileUpdate(fileState: FileState) {
    fileState.newLinesMarker = null;
    fileState.updateInfo.status = "updating";
    fileState.updateInfo.lastAttemptAt = Date.now();
    fileState.updateInfo.failureMessage = null;
    setFileLoading(fileState.id, true);
    refreshCurrentFileStateIfSelected(fileState);
}

function syncLoadedFileSize(fileState: FileState, fileSize: number) {
    fileState.updateInfo.lastLoadedSize = fileSize;
    fileState.updateInfo.lastObservedSize = fileSize;
    fileState.updateInfo.hasUnreloadedSizeChange = false;
}

function updateObservedFileSize(fileState: FileState, fileSize: number, trackSizeChange: boolean) {
    const previousSizeChanged = fileState.updateInfo.hasUnreloadedSizeChange;

    fileState.updateInfo.lastObservedSize = fileSize;

    if (!trackSizeChange) {
        return;
    }

    fileState.updateInfo.hasUnreloadedSizeChange = fileSize !== fileState.updateInfo.lastLoadedSize;

    if (previousSizeChanged !== fileState.updateInfo.hasUnreloadedSizeChange) {
        refreshCurrentFileStateIfSelected(fileState);
    }
}

function markUpdateSucceeded(fileState: FileState, fileSize: number) {
    fileState.updateInfo.status = "idle";
    syncLoadedFileSize(fileState, fileSize);
    fileState.updateInfo.lastSuccessAt = Date.now();
    fileState.updateInfo.lastFailureAt = null;
    fileState.updateInfo.failureMessage = null;
}

function markUpdateFailed(fileState: FileState, error: unknown, reason: ReloadReason, hadPreviousFailure: boolean) {
    const failureMessage = buildUpdateFailureMessage(fileState.data.fileName);
    fileState.updateInfo.status = "failed";
    fileState.updateInfo.lastFailureAt = Date.now();
    fileState.updateInfo.failureMessage = failureMessage;

    console.error("Failed to reload trace", error);

    if (appSettings.fileUpdates.showFailureNotice && (!hadPreviousFailure || reason === "manual")) {
        notice.info(failureMessage);
    }
}

function clearCancelledUpdate(fileState: FileState) {
    fileState.updateInfo.status = "idle";
    fileState.updateInfo.failureMessage = null;
    refreshCurrentFileStateIfSelected(fileState);
}

async function parseLatestFileWithRetry(fileState: ReloadableFileState, controller: AbortController, prefetchedFile?: File) {
    let nextFile: File | undefined = prefetchedFile;

    for (let attempt = 1; attempt <= FILE_RELOAD_RETRY_ATTEMPTS; attempt++) {
        throwIfReloadCancelled(fileState.id, controller);

        try {
            const fileToParse = nextFile ?? await fileState.source.handle.getFile();
            updateObservedFileSize(fileState, fileToParse.size, appSettings.fileUpdates.sizeMonitorEnabled);
            const parsed = await asyncParseTraceFile(fileToParse);
            throwIfReloadCancelled(fileState.id, controller);
            return { file: fileToParse, parsed };
        } catch (error) {
            if (isReloadCancelled(fileState.id, controller, error) || attempt >= FILE_RELOAD_RETRY_ATTEMPTS) {
                throw error;
            }

            nextFile = undefined;
            await delayWithAbort(FILE_RELOAD_RETRY_DELAY_MS, controller.signal);
        }
    }

    throw new Error("Failed to reload trace.");
}

async function delayWithAbort(ms: number, signal: AbortSignal) {
    if (signal.aborted) {
        throw new DOMException("File reload cancelled.", "AbortError");
    }

    await Promise.race([
        delay(ms),
        new Promise((_, reject) => {
            signal.addEventListener(
                "abort",
                () => reject(new DOMException("File reload cancelled.", "AbortError")),
                { once: true }
            );
        })
    ]);
}

function throwIfReloadCancelled(fileId: string, controller: AbortController) {
    if (controller.signal.aborted || activeFileReloadControllers.get(fileId) !== controller) {
        throw new DOMException("File reload cancelled.", "AbortError");
    }
}

function isReloadCancelled(fileId: string, controller: AbortController, error: unknown) {
    return controller.signal.aborted
        || activeFileReloadControllers.get(fileId) !== controller
        || (error instanceof DOMException && error.name === "AbortError");
}

function refreshCurrentFileStateIfSelected(fileState: FileState) {
    if (getCurrentFileState()?.id === fileState.id) {
        setCurrentFileState(fileState, true);
    }
}

function buildUpdateFailureMessage(fileName: string) {
    return `Could not update "${fileName}" after ${FILE_RELOAD_RETRY_ATTEMPTS} attempts. The file may be locked by another process.`;
}

function getErrorLinesCountWithoutNoise(viewLines: readonly TraceLine[]) {
    let count = 0;
    for (const line of viewLines) {
        if (line.code !== LineCode.Error) continue;
        if (line.content.includes(NOISE_ERROR_CODE)) continue;
        count++;
    }
    return count;
}
