import { atom } from "jotai";
import { appSettings } from "@/store/1-ui-settings";
import { atomWithProxy } from "jotai-valtio";
import { currentFileStateAtom } from "@/store/traces-store/0-1-files-current-state";
import { LineCode } from "@/trace-viewer-core/9-core-types";
import { NOISE_ERROR_CODE } from "@/trace-viewer-core/3-format-error-line";
import { currentFileSelectedThreadIdAtom, setCurrentFileShowOnlySelectedThreadAtom, syncCurrentFileThreadLinesCacheAtom } from "@/store/traces-store/0-4-thread-filter-cache";

const appSettingsAtom = atomWithProxy(appSettings);

export const currentFileErrorBaseIndicesAtom = atom(
    (get) => {
        const fileState = get(currentFileStateAtom);
        if (!fileState) return [];

        const { excludeNoiseErrorsInSelectedFile } = get(appSettingsAtom);
        const viewLines = fileState.data.viewLines;
        const errors: number[] = [];
        for (let i = 0; i < viewLines.length; i++) {
            const line = viewLines[i];
            if (!line || line.code !== LineCode.Error) continue;
            if (excludeNoiseErrorsInSelectedFile && line.content.includes(NOISE_ERROR_CODE)) continue;
            errors.push(i);
        }
        return errors;
    }
);

export const currentFileErrorsNavPositionAtom = atom(
    (get) => {
        const fileState = get(currentFileStateAtom);
        const errors = get(currentFileErrorBaseIndicesAtom);
        const total = errors.length;
        if (!fileState || total === 0) {
            return { current: 0, total };
        }

        const currentLineIndex = get(fileState.currentLineIdxAtom);
        const idx = errors.indexOf(currentLineIndex);
        return { current: idx >= 0 ? idx + 1 : 0, total };
    }
);

// Dialog for confirming error navigation wrap dialog

type ErrorsNavConfirmDlgState = {
    direction: "prev" | "next";
    targetBaseIndex: number;
} | null;

export const errorsNavConfirmDlgAtom = atom<ErrorsNavConfirmDlgState>(null);

export const errorsNavConfirmDlgOnCancelAtom = atom(
    null,
    (_get, set) => {
        set(errorsNavConfirmDlgAtom, null);
    }
);

export const errorsNavConfirmDlgOnOKAtom = atom(
    null,
    (get, set) => {
        const dialog = get(errorsNavConfirmDlgAtom);
        if (!dialog) return;
        set(errorsNavConfirmDlgAtom, null);
        set(selectErrorBaseIndexAtom, dialog.targetBaseIndex);
    }
);

// Go to next/prev error

export const goToNextErrorAtom = atom(
    null,
    (get, set) => {
        const fileState = get(currentFileStateAtom);
        if (!fileState) return;

        const errors = get(currentFileErrorBaseIndicesAtom);
        if (errors.length === 0) return;

        const currentLineIndex = get(fileState.currentLineIdxAtom);
        const nextIndex = findNextErrorBaseIndex(errors, currentLineIndex);
        if (nextIndex !== null) {
            set(selectErrorBaseIndexAtom, nextIndex);
            return;
        }

        const target = errors[0]!;
        if (!appSettings.showErrorsNavigationWrapDialog) {
            set(selectErrorBaseIndexAtom, target);
            return;
        }

        set(errorsNavConfirmDlgAtom, { direction: "next", targetBaseIndex: target });
    }
);

export const goToPrevErrorAtom = atom(
    null,
    (get, set) => {
        const fileState = get(currentFileStateAtom);
        if (!fileState) return;

        const errors = get(currentFileErrorBaseIndicesAtom);
        if (errors.length === 0) return;

        const currentLineIndex = get(fileState.currentLineIdxAtom);
        const prevIndex = findPrevErrorBaseIndex(errors, currentLineIndex);
        if (prevIndex !== null) {
            set(selectErrorBaseIndexAtom, prevIndex);
            return;
        }

        const target = errors[errors.length - 1]!;
        if (!appSettings.showErrorsNavigationWrapDialog) {
            set(selectErrorBaseIndexAtom, target);
            return;
        }

        set(errorsNavConfirmDlgAtom, { direction: "prev", targetBaseIndex: target });
    }
);

// Select error base index

const selectErrorBaseIndexAtom = atom(
    null,
    (get, set, baseIndex: number) => {
        const fileState = get(currentFileStateAtom);
        if (!fileState) return;

        const viewedThreadId = get(currentFileSelectedThreadIdAtom);
        const showOnlySelectedThreadEnabled = get(fileState.showOnlySelectedThreadAtom);
        const lineThreadId = fileState.data.viewLines[baseIndex]?.threadId;
        if (showOnlySelectedThreadEnabled && viewedThreadId !== null && lineThreadId !== undefined && lineThreadId !== viewedThreadId) {
            set(setCurrentFileShowOnlySelectedThreadAtom, false);
        }

        set(fileState.currentLineIdxAtom, baseIndex);
        set(syncCurrentFileThreadLinesCacheAtom, "sync");
    }
);

function findNextErrorBaseIndex(errors: readonly number[], currentLineIndex: number) {
    const isUnset = currentLineIndex < 0;
    if (isUnset) return errors[0] ?? null;

    for (const idx of errors) {
        if (idx > currentLineIndex) return idx;
    }
    return null;
}

function findPrevErrorBaseIndex(errors: readonly number[], currentLineIndex: number) {
    const isUnset = currentLineIndex < 0;
    if (isUnset) return errors[errors.length - 1] ?? null;

    for (let i = errors.length - 1; i >= 0; i--) {
        const idx = errors[i]!;
        if (idx < currentLineIndex) return idx;
    }
    return null;
}
