import { filesStore } from "./9-types-files-store";
import { getCurrentFileState, setCurrentFileState } from "./0-1-files-current-state";
import { historyActions } from "./0-3-files-history";
import { cancelFileReload } from "./8-1-load-files";
import { removeFileLoadingAtom } from "./8-3-file-loading-atoms";
import { clearFileLoadSummary } from "./8-4-file-load-summary";

export function selectFile(id: string | null) {
    if (id) {
        const fileState = filesStore.states.find(f => f.id === id);
        if (fileState) {
            setCurrentFileState(fileState);
            historyActions.addToHistory(id);
        }
    } else {
        setCurrentFileState(null);
    }
}

//#region close file actions

export function closeFile(id: string) {
    const index = filesStore.states.findIndex(f => f.id === id);
    if (index !== -1) {
        cancelFileReload(id);
        historyActions.removeFromHistory(id);
        filesStore.states.splice(index, 1);
        delete filesStore.quickFileData[id];
        removeFileLoadingAtom(id);

        // If closed file was selected, select another one
        if (getCurrentFileState()?.id === id) {
            if (filesStore.states.length > 0) {
                // Select the next file, or the previous one if we closed the last one
                const nextIndex = Math.min(index, filesStore.states.length - 1);
                selectFile(filesStore.states[nextIndex]?.id ?? null);
            } else {
                clearFileLoadSummary();
                selectFile(null);
            }
        }
    }
}

export function closeOtherFiles(id: string) {
    // Clean up loading atoms for files being closed
    filesStore.states.forEach(f => {
        if (f.id !== id) {
            cancelFileReload(f.id);
            removeFileLoadingAtom(f.id);
        }
    });

    const keep = filesStore.states.find(f => f.id === id);
    if (keep) {
        filesStore.states.splice(0, filesStore.states.length, keep);
    } else {
        filesStore.states.splice(0, filesStore.states.length);
        clearFileLoadSummary();
    }
    const keys = Object.keys(filesStore.quickFileData);
    keys.forEach(
        (key) => {
            if (key !== id) {
                delete filesStore.quickFileData[key];
            }
        }
    );

    if (getCurrentFileState()?.id !== id) {
        selectFile(id);
    }
}

export function closeAllFiles() {
    // Clean up all loading atoms
    filesStore.states.forEach(f => {
        cancelFileReload(f.id);
        removeFileLoadingAtom(f.id);
    });
    historyActions.clearHistory();
    clearFileLoadSummary();

    filesStore.states.splice(0, filesStore.states.length);
    filesStore.quickFileData = {};
    selectFile(null);
}

//#endregion close file actions
