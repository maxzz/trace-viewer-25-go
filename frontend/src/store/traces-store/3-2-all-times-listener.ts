import { atomEffect } from "jotai-effect";
import { subscribe } from "valtio";
import { subscribeKey } from "valtio/utils";
import { appSettings } from "../1-ui-settings";
import { allTimesStore } from "./3-1-all-times-store";
import { filesStore } from "./9-types-files-store";
import { cancelAllTimesBuild } from "../../workers-client/all-times-client";
import { dialogEditFiltersOpenAtom } from "../2-ui-atoms";

export const listenerToBuildAllTimesEffectAtom = atomEffect(
    (get, set) => {
        const isFiltersOpen = get(dialogEditFiltersOpenAtom);

        // If dialog just closed and we need to rebuild, do it
        if (!isFiltersOpen && appSettings.allTimes.needToRebuild) {
            buildAlltimes();
        }

        const unsubShow = subscribeKey(appSettings.allTimes, 'show', buildAlltimes);

        const unsubPrecision = subscribeKey(appSettings.allTimes, 'precision', () => {
            appSettings.allTimes.needToRebuild = true;
            if (!isFiltersOpen) buildAlltimes();
        });

        const unsubSelectedFilter = subscribeKey(appSettings, 'selectedFilterId', () => {
            appSettings.allTimes.needToRebuild = true;
            if (!isFiltersOpen) buildAlltimes();
        });

        const unsubFilesData = subscribe(filesStore.states, (ops) => {
            const selectedId = appSettings.selectedFilterId;

            const relevantChange = ops.some(
                (op) => {
                    const path = op[1];
                    if (path.length >= 2 && path[1] === 'matchedHighlightIds') {
                        return false;
                    }

                    if (path.length >= 2 && path[1] === 'matchedFilterIds') {
                        if (!selectedId) {
                            return false; // Changes to filters don't affect "All files" view
                        }
                        const newVal = (op[2] as string[]) || [];
                        const oldVal = (op[3] as string[]) || [];

                        // Defensive check
                        if (!Array.isArray(newVal) || !Array.isArray(oldVal)) return true;

                        const hasNew = newVal.includes(selectedId);
                        const hadOld = oldVal.includes(selectedId);
                        return hasNew !== hadOld;
                    }

                    return true;
                }
            );

            if (!relevantChange) {
                return;
            }

            appSettings.allTimes.needToRebuild = true;
            if (!isFiltersOpen) {
                buildAlltimes();
            }
        });

        return () => {
            unsubShow();
            unsubPrecision();
            unsubSelectedFilter();
            unsubFilesData();
            cancelAllTimesBuild();
        };
    }
);

export function buildAlltimes() {
    const { show, precision, needToRebuild } = appSettings.allTimes;
    // const { quickFileData } = filesStore; // Use states directly

    if (!show) {
        // Don't clear if hidden, just don't build?
        // User logic: "When toggled ... show if it was built then don't need to rebuild it."
        // implies we keep the data if we hide it?
        // But previously we cleared it: traceStore.setAllTimes([]);
        // If we clear it, we MUST rebuild it when shown.
        // So we should NOT clear it if we want to avoid rebuild.

        // However, if I remove `traceStore.setAllTimes([])` here, then the memory is held.
        // Maybe the user wants to keep it in memory.

        // But if I clear it, then `needToRebuild` must be true next time?
        // Or `needToRebuild` tracks if *inputs* changed.
        // If inputs haven't changed, but I cleared the output, I still need to rebuild to show it.

        // If the user wants to avoid rebuild, I must NOT clear the data when hiding.

        cancelAllTimesBuild();
        allTimesStore.setAllTimes([]);
        appSettings.allTimes.needToRebuild = false; // not valid and needs to be rebuilt
        return;
    }

    if (!needToRebuild && allTimesStore.allTimes.length > 0) {
        return;
    }

    // Use states directly to determine if we have files, as it is the primary source of truth
    const hasFiles = filesStore.states.length > 0;
    const someFileIsLoading = filesStore.states.some(f => f.data.isLoading);

    if (someFileIsLoading) {
        return;
    }

    if (!hasFiles) {
        allTimesStore.setAllTimes([]);
        appSettings.allTimes.needToRebuild = false; // "Built" empty
        return;
    }

    allTimesStore.asyncBuildAllTimes(precision).then(() => {
        appSettings.allTimes.needToRebuild = false;
    });
}
