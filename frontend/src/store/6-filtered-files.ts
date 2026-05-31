import { atom } from 'jotai';
import { atomEffect } from 'jotai-effect';
import { atomWithProxy } from 'jotai-valtio';
import { appSettings, type FileFilter } from './1-ui-settings';
import { filesStore, type FileState } from './traces-store/9-types-files-store';
import { currentFileStateAtom } from './traces-store/0-1-files-current-state';
import { selectFile } from './traces-store/0-2-files-actions';

// Atoms to track valtio state changes
const filesStatesAtom = atomWithProxy(filesStore);
const appSettingsAtom = atomWithProxy(appSettings);

// Derived atom for filtered files
export const filteredFilesAtom = atom(
    (get) => {
        const { states } = get(filesStatesAtom);
        const { fileFilters, selectedFilterId } = get(appSettingsAtom);
        return filterFiles(states, selectedFilterId, fileFilters);
    }
);

// Derived atom for files count
export const filesCountAtom = atom(
    (get) => {
        const { states } = get(filesStatesAtom);
        return states.length;
    }
);

/**
 * Check if a filename matches a pattern (supports wildcard * and regex /pattern/)
 */
export function matchesFilePattern(fileName: string, pattern: string): boolean {
    if (!pattern) return false;

    // Check if pattern is regex (starts and ends with /)
    if (pattern.startsWith('/') && pattern.endsWith('/') && pattern.length > 1) {
        try {
            const regexPattern = pattern.slice(1, -1);
            const regex = new RegExp(regexPattern, 'i');
            return regex.test(fileName);
        } catch (e) {
            console.warn('Invalid regex pattern:', pattern, e);
            return false;
        }
    }

    // Non-regex pattern
    const patternLower = pattern.toLowerCase();
    const fileNameLower = fileName.toLowerCase();

    // Convert glob to regex if contains *
    if (patternLower.includes('*')) {
        try {
            const regexStr = "^" + patternLower.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + "$";
            const regex = new RegExp(regexStr, 'i');
            return regex.test(fileName);
        } catch (e) {
            // fallback to contains
            return fileNameLower.includes(patternLower.replace(/\*/g, ''));
        }
    }

    return fileNameLower.includes(patternLower);
}

function filterFiles(files: readonly FileState[], selectedFilterId: string | null, fileFilters: readonly FileFilter[]): readonly FileState[] {
    const filter = !selectedFilterId ? null : fileFilters.find(f => f.id === selectedFilterId);
    if (!filter) {
        return files;
    }

    return files.filter((file) => matchesFilePattern(file.data.fileName, filter.pattern));
}

// Effect atom to handle selection change when filter results change
export const filteredFilesSelectionEffectAtom = atomEffect(
    (get) => {
        const { states } = get(filesStatesAtom);
        const currentFileState = get(currentFileStateAtom);
        const selectedFileId = currentFileState?.id ?? null;
        const filteredFiles = get(filteredFilesAtom);

        if (states.length === 0) return;

        // Check if currently selected file is in the filtered list
        const isSelectedInFiltered = filteredFiles.some(f => f.id === selectedFileId);

        if (!isSelectedInFiltered) {
            if (filteredFiles.length > 0) {
                // Select first file if current selection is hidden
                selectFile(filteredFiles[0].id);
            } else if (selectedFileId) {
                // Deselect if no files match filter
                selectFile(null);
            }
        }
    }
);
