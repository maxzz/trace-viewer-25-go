import { atom, getDefaultStore } from "jotai";

export type FileLoadSummary = {
    blockedCount: number;
    hasRecentLoadResult: boolean;
};

const emptyFileLoadSummary: FileLoadSummary = {
    blockedCount: 0,
    hasRecentLoadResult: false,
};

export const fileLoadSummaryAtom = atom<FileLoadSummary>(emptyFileLoadSummary);

export function clearFileLoadSummary() {
    getDefaultStore().set(fileLoadSummaryAtom, emptyFileLoadSummary);
}

export function setFileLoadSummary(blockedCount: number) {
    getDefaultStore().set(fileLoadSummaryAtom, {
        blockedCount,
        hasRecentLoadResult: true,
    });
}
