import { proxy } from "valtio";
import { notice } from "../../components/ui/local-ui/7-toaster";
import { appSettings } from "../1-ui-settings";
import { type TraceLine } from "../../trace-viewer-core/9-core-types";
import { type FileState, filesStore } from "./9-types-files-store";
import { type AllTimesItemOutput } from "../../workers/all-times-worker-types";
import { asyncBuildAllTimesInWorker } from "../../workers-client/all-times-client";

export interface AllTimesStore {
    // State
    allTimes: AllTimesItemOutput[];                    // All times items
    allTimesIsLoading: boolean;                        // Whether the all times is loading
    allTimesError: string | null;                      // Error message for the all times
    allTimesSelectedTimestamp: string | null;          // Timestamp of the selected item in the all times
    pendingScrollTimestamp: string | null;             // Timestamp to scroll TraceList to when the all times item is selected
    pendingScrollFileId: string | null;                // File ID to scroll TraceList to

    // Actions
    setAllTimes: (items: AllTimesItemOutput[]) => void;
    setAllTimesLoading: (loading: boolean) => void;
    setAllTimesSelectedTimestamp: (timestamp: string | null) => void;
    setPendingScrollTimestamp: (timestamp: string | null, fileId?: string) => void;
    asyncBuildAllTimes: (precision: number) => Promise<void>;
}

export const allTimesStore = proxy<AllTimesStore>({
    // Initial state
    allTimes: [],
    allTimesIsLoading: false,
    allTimesError: null,
    allTimesSelectedTimestamp: null,
    pendingScrollTimestamp: null,
    pendingScrollFileId: null,

    // Actions
    setAllTimes: (items: AllTimesItemOutput[]) => {
        allTimesStore.allTimes = items;
        allTimesStore.allTimesIsLoading = false;
        allTimesStore.allTimesError = null;
    },

    setAllTimesLoading: (loading: boolean) => {
        allTimesStore.allTimesIsLoading = loading;
        if (loading) {
            allTimesStore.allTimesError = null;
        }
    },

    setAllTimesSelectedTimestamp: (timestamp: string | null) => {
        allTimesStore.allTimesSelectedTimestamp = timestamp;
    },

    setPendingScrollTimestamp: (timestamp: string | null, fileId?: string) => {
        allTimesStore.pendingScrollTimestamp = timestamp;
        allTimesStore.pendingScrollFileId = fileId ?? null;
    },

    asyncBuildAllTimes: async (precision: number) => {
        allTimesStore.setAllTimesLoading(true);
        try {
            const { selectedFilterId } = appSettings;

            const inputFiles = filesStore.states
                .filter(f => !selectedFilterId || (f.matchedFilterIds && f.matchedFilterIds.includes(selectedFilterId)))
                .map(
                    (f: FileState) => ({
                        id: f.id,
                        lines: f.data.viewLines.map(
                            (l: TraceLine) => ({ timestamp: l.timestamp, lineIndex: l.lineIndex, date: l.date })
                        )
                    })
                );

            const items = await asyncBuildAllTimesInWorker(inputFiles, precision);
            allTimesStore.setAllTimes(items);

            if (appSettings.allTimes.showBuildDoneNotice) {
                notice.success("Timeline is ready");
            }
        } catch (e: any) {
            if (e.message === 'Timeline build cancelled') {
                // unexpected here unless we cancelled it
                notice.info("Timeline build cancelled");
            } else {
                console.error("Timeline build failed", e);
                allTimesStore.setAllTimesLoading(false); // Make sure to stop loading
                notice.error(`Timeline build failed: ${e.message}`);
            }
        }
    }
});
