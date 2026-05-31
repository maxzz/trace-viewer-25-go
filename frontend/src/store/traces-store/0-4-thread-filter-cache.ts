import { atom, type Getter, type Setter } from "jotai";
import { atomWithProxy } from "jotai-valtio";
import { currentFileStateAtom } from "./0-1-files-current-state";
import { appSettings } from "../1-ui-settings";
import { type TraceLine, LineCode } from "@/trace-viewer-core/9-core-types";
import { type FileState } from "./9-types-files-store";
import { NOISE_ERROR_CODE } from "@/trace-viewer-core/3-format-error-line";

export type CurrentFileThreadFilterViewState = {
    isThreadFilterActive: boolean;
    isErrorsOnlyActive: boolean;
    linesForView: TraceLine[];
    threadIdsForView: number[];
    displayIndexToBaseIndex: number[] | undefined;
    baseIndexToDisplayIndex: number[] | undefined;
};

const appSettingsAtom = atomWithProxy(appSettings);

export const currentFileThreadFilterViewStateAtom = atom<CurrentFileThreadFilterViewState>(
    (get) => {
        const fileState = get(currentFileStateAtom);
        const viewLines = fileState?.data.viewLines ?? [];
        const threadIds = fileState?.data.uniqueThreadIds ?? [];
        const { showOnlyErrorsInSelectedFile, excludeNoiseErrorsInSelectedFile } = get(appSettingsAtom);
        if (!fileState) {
            return {
                isThreadFilterActive: false,
                isErrorsOnlyActive: false,
                linesForView: viewLines,
                threadIdsForView: threadIds,
                displayIndexToBaseIndex: undefined,
                baseIndexToDisplayIndex: undefined,
            };
        }

        const showOnlySelectedThread = get(fileState.showOnlySelectedThreadAtom);
        const threadLines = get(fileState.threadLinesAtom);
        const threadLineBaseIndices = get(fileState.threadLineBaseIndicesAtom);
        const threadBaseIndexToDisplayIndex = get(fileState.threadBaseIndexToDisplayIndexAtom);
        const threadLinesThreadId = get(fileState.threadLinesThreadIdAtom);

        const isThreadFilterActive = showOnlySelectedThread
            && threadLines !== undefined
            && threadLineBaseIndices !== undefined
            && threadBaseIndexToDisplayIndex !== undefined
            && threadLinesThreadId !== null;

        const isErrorsOnlyActive = showOnlyErrorsInSelectedFile;
        if (isErrorsOnlyActive) {
            // Errors-only view is independent of thread-only view.
            // If thread-only toggle is ON, we still show errors from all threads so user can jump out.
            const built = buildErrorsOnlyLinesCache(viewLines.length, viewLines, excludeNoiseErrorsInSelectedFile);
            return {
                isThreadFilterActive,
                isErrorsOnlyActive,
                linesForView: built.lines,
                threadIdsForView: threadIds,
                displayIndexToBaseIndex: built.displayIndexToBaseIndex,
                baseIndexToDisplayIndex: built.baseIndexToDisplayIndex,
            };
        }

        const sourceLines = isThreadFilterActive ? threadLines : viewLines;
        const sourceThreadIds = isThreadFilterActive ? [threadLinesThreadId] : threadIds;
        const sourceDisplayIndexToBaseIndex = isThreadFilterActive ? threadLineBaseIndices : undefined;

        return {
            isThreadFilterActive,
            isErrorsOnlyActive,
            linesForView: sourceLines,
            threadIdsForView: sourceThreadIds,
            displayIndexToBaseIndex: sourceDisplayIndexToBaseIndex,
            baseIndexToDisplayIndex: isThreadFilterActive ? threadBaseIndexToDisplayIndex : undefined,
        };
    }
);

export const currentFileSelectedThreadIdAtom = atom(
    (get) => {
        const fileState = get(currentFileStateAtom);
        if (!fileState) return null;

        const currentLineIndex = get(fileState.currentLineIdxAtom);
        return getSelectedThreadIdFromSelection(fileState.data.viewLines, currentLineIndex);
    }
);

export const syncCurrentFileThreadLinesCacheAtom = atom(
    null,
    (get, set, _action: "sync") => {
        const fileState = get(currentFileStateAtom);
        if (!fileState) return;

        const enabled = get(fileState.showOnlySelectedThreadAtom);
        if (!enabled) {
            clearThreadLinesCache(fileState, get, set);
            return;
        }

        const selectedThreadId = get(currentFileSelectedThreadIdAtom);
        if (selectedThreadId === null) {
            return;
        }

        const cachedThreadId = get(fileState.threadLinesThreadIdAtom);
        const cachedLines = get(fileState.threadLinesAtom);
        if (cachedLines !== undefined && cachedThreadId === selectedThreadId) {
            return;
        }

        const built = buildThreadLinesCache(fileState.data.viewLines, selectedThreadId);
        set(fileState.threadLinesAtom, built.threadLines);
        set(fileState.threadLineBaseIndicesAtom, built.displayIndexToBaseIndex);
        set(fileState.threadBaseIndexToDisplayIndexAtom, built.baseIndexToDisplayIndex);
        set(fileState.threadLinesThreadIdAtom, selectedThreadId);
    }
);

export const setCurrentFileShowOnlySelectedThreadAtom = atom(
    null,
    (get, set, enabled: boolean) => {
        const fileState = get(currentFileStateAtom);
        if (!fileState) return;

        set(fileState.showOnlySelectedThreadAtom, enabled);
        set(syncCurrentFileThreadLinesCacheAtom, "sync");
    }
);

function clearThreadLinesCache(fileState: FileState, get: Getter, set: Setter,) {
    const hasLines = get(fileState.threadLinesAtom) !== undefined;
    const hasIndexMap = get(fileState.threadLineBaseIndicesAtom) !== undefined;
    const hasReverseMap = get(fileState.threadBaseIndexToDisplayIndexAtom) !== undefined;
    const hasTid = get(fileState.threadLinesThreadIdAtom) !== null;

    if (hasLines) set(fileState.threadLinesAtom, undefined);
    if (hasIndexMap) set(fileState.threadLineBaseIndicesAtom, undefined);
    if (hasReverseMap) set(fileState.threadBaseIndexToDisplayIndexAtom, undefined);
    if (hasTid) set(fileState.threadLinesThreadIdAtom, null);
}

function getSelectedThreadIdFromSelection(viewLines: readonly TraceLine[], currentLineIndexBase: number) {
    if (currentLineIndexBase < 0) return null;

    const selected = viewLines[currentLineIndexBase];
    if (!selected) return null;

    if (selected.code !== LineCode.Day && selected.code !== LineCode.DayRestarted) {
        return selected.threadId;
    }

    for (let i = currentLineIndexBase - 1; i >= 0; i--) {
        const line = viewLines[i];
        if (!line) continue;
        if (line.code !== LineCode.Day && line.code !== LineCode.DayRestarted) {
            return line.threadId;
        }
    }

    return null;
}

function buildThreadLinesCache(viewLines: readonly TraceLine[], selectedThreadId: number) {
    const threadLines: TraceLine[] = [];
    const displayIndexToBaseIndex: number[] = [];
    const baseIndexToDisplayIndex = Array.from({ length: viewLines.length }, () => -1);

    for (let baseIndex = 0; baseIndex < viewLines.length; baseIndex++) {
        const line = viewLines[baseIndex];
        if (!line) continue;

        const keepDayMarker = line.code === LineCode.Day || line.code === LineCode.DayRestarted;
        const keepThreadLine = line.threadId === selectedThreadId;
        if (!keepDayMarker && !keepThreadLine) continue;

        const displayIndex = threadLines.length;
        threadLines.push(line);
        displayIndexToBaseIndex.push(baseIndex);
        baseIndexToDisplayIndex[baseIndex] = displayIndex;
    }

    return { threadLines, displayIndexToBaseIndex, baseIndexToDisplayIndex };
}

function buildErrorsOnlyLinesCache(baseLinesCount: number, sourceLines: readonly TraceLine[], excludeNoiseErrors: boolean, sourceDisplayIndexToBaseIndex?: readonly number[]) {
    const lines: TraceLine[] = [];
    const displayIndexToBaseIndex: number[] = [];
    const baseIndexToDisplayIndex = Array.from({ length: baseLinesCount }, () => -1);

    for (let sourceDisplayIndex = 0; sourceDisplayIndex < sourceLines.length; sourceDisplayIndex++) {
        const line = sourceLines[sourceDisplayIndex];
        if (!line) continue;
        if (line.code !== LineCode.Error) continue;
        if (excludeNoiseErrors && line.content.includes(NOISE_ERROR_CODE)) continue;

        const baseIndex = sourceDisplayIndexToBaseIndex
            ? (sourceDisplayIndexToBaseIndex[sourceDisplayIndex] ?? -1)
            : sourceDisplayIndex;
        if (baseIndex < 0) continue;

        const displayIndex = lines.length;
        lines.push(line);
        displayIndexToBaseIndex.push(baseIndex);
        baseIndexToDisplayIndex[baseIndex] = displayIndex;
    }

    return { lines, displayIndexToBaseIndex, baseIndexToDisplayIndex };
}

