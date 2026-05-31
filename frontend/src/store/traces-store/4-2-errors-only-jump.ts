import { atom } from "jotai";
import { setShowOnlyErrorsInSelectedFileAtom } from "../7-errors-only-setting";
import { currentFileStateAtom } from "./0-1-files-current-state";
import { currentFileSelectedThreadIdAtom, setCurrentFileShowOnlySelectedThreadAtom, syncCurrentFileThreadLinesCacheAtom } from "./0-4-thread-filter-cache";

export const jumpFromErrorsOnlyToContextAtom = atom(
    null,
    (get, set, payload: { baseIndex: number; lineThreadId: number; }) => {
        const fileState = get(currentFileStateAtom);
        if (!fileState) return;

        const showOnlySelectedThreadEnabled = get(fileState.showOnlySelectedThreadAtom);
        const viewedThreadId = get(currentFileSelectedThreadIdAtom);
        if (showOnlySelectedThreadEnabled && viewedThreadId !== null && payload.lineThreadId !== viewedThreadId) {
            set(setCurrentFileShowOnlySelectedThreadAtom, false);
        }

        set(setShowOnlyErrorsInSelectedFileAtom, false);

        set(fileState.currentLineIdxAtom, payload.baseIndex);
        set(syncCurrentFileThreadLinesCacheAtom, "sync");
    }
);

