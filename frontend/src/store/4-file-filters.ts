import { type FileFilter, appSettings } from './1-ui-settings';
import { type FileState, filesStore } from './traces-store/9-types-files-store';
import { isFileNameMatch } from '@/utils/filter-match';

export const filterActions = {
    addFilter: (name: string, pattern: string) => {
        const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
        appSettings.fileFilters.push({ id, name, pattern });
        recomputeFilterMatches();
    },

    deleteFilter: (id: string) => {
        const index = appSettings.fileFilters.findIndex(f => f.id === id);
        if (index !== -1) {
            appSettings.fileFilters.splice(index, 1);
        }
        if (appSettings.selectedFilterId === id) {
            appSettings.selectedFilterId = null;
        }
        recomputeFilterMatches();
    },

    updateFilter: (id: string, updates: Partial<Omit<FileFilter, 'id'>>) => {
        const filter = appSettings.fileFilters.find(f => f.id === id);
        if (filter) {
            Object.assign(filter, updates);
            // Only recompute if pattern changed
            if (updates.pattern !== undefined) {
                recomputeFilterMatches();
            }
        }
    },

    reorderFilters: (newOrder: FileFilter[]) => {
        const idMap = new Map(appSettings.fileFilters.map(f => [f.id, f]));
        appSettings.fileFilters = newOrder.map(f => idMap.get(f.id) || { ...f });
    },

    selectFilter: (id: string | null) => {
        appSettings.selectedFilterId = id;
    }
};

// Use this for FILTERING (Hiding files)
export function recomputeFilterMatches() {
    const filters = appSettings.fileFilters;
    const fileStates = filesStore.states;

    if (fileStates.length === 0) return;

    fileStates.forEach(
        (fileState: FileState) => {
            const matchedIds: string[] = [];
            
            filters.forEach(
                (filter: FileFilter) => {
                    if (isFileNameMatch(fileState.data.fileName, filter.pattern)) {
                        matchedIds.push(filter.id);
                    }
                }
            );

            // Update only if changed to avoid unnecessary renders
            if (JSON.stringify(fileState.matchedFilterIds) !== JSON.stringify(matchedIds)) {
                fileState.matchedFilterIds = matchedIds;
            }
        }
    );
}
