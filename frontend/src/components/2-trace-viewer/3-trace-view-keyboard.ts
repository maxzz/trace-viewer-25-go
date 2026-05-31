import React from "react";
import { getDefaultStore } from "jotai";
import { getCurrentFileState, setCurrentLineIndex } from "../../store/traces-store/0-1-files-current-state";
import { currentFileThreadFilterViewStateAtom } from "../../store/traces-store/0-4-thread-filter-cache";
import { ITEM_HEIGHT } from "./9-trace-view-constants";

export function handleKeyboardNavigation(e: KeyboardEvent, scrollRef: React.RefObject<HTMLDivElement | null>, containerHeight: number, scrollTop: number) {
    // Check focus: allow if body is focused OR focus is within this component
    // This prevents conflict with FileList navigation
    const isFocused = document.activeElement === document.body || scrollRef.current?.contains(document.activeElement);
    if (!isFocused) {
        return;
    }
    
    // Ignore if focus is not in the scroll container
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
    }

    const currentFileState = getCurrentFileState();
    const viewLinesCount = currentFileState?.data.viewLines.length ?? 0;
    if (viewLinesCount === 0) return;

    const currentIndex = currentFileState ? getDefaultStore().get(currentFileState.currentLineIdxAtom) : -1;
    const { displayIndexToBaseIndex: filteredBaseIndices } = getDefaultStore().get(currentFileThreadFilterViewStateAtom);

    const navigationLinesCount = filteredBaseIndices?.length ?? viewLinesCount;
    if (navigationLinesCount === 0) return;

    const linesPerPage = Math.floor(containerHeight / ITEM_HEIGHT);
    
    // Calculate current visible range based on scrollTop
    const firstVisibleIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    const lastVisibleIndex = Math.min(navigationLinesCount - 1, firstVisibleIndex + linesPerPage - 1);

    let newIndex = currentIndex;

    const currentPos = filteredBaseIndices ? filteredBaseIndices.indexOf(currentIndex) : -1;

    switch (e.key) {
        case 'ArrowUp':
            if (filteredBaseIndices) {
                const nextPos = Math.max(0, (currentPos === -1 ? 0 : currentPos - 1));
                newIndex = filteredBaseIndices[nextPos] ?? currentIndex;
            } else {
                newIndex = Math.max(0, currentIndex - 1);
            }
            break;
        case 'ArrowDown':
            if (filteredBaseIndices) {
                const nextPos = Math.min(navigationLinesCount - 1, (currentPos === -1 ? 0 : currentPos + 1));
                newIndex = filteredBaseIndices[nextPos] ?? currentIndex;
            } else {
                newIndex = currentIndex === -1 ? 0 : Math.min(navigationLinesCount - 1, currentIndex + 1);
            }
            break;
        case 'PageUp':
            if (e.altKey) {
                if (filteredBaseIndices) {
                    newIndex = filteredBaseIndices[firstVisibleIndex] ?? currentIndex;
                } else {
                    newIndex = firstVisibleIndex;
                }
            } else {
                if (filteredBaseIndices) {
                    const start = currentPos === -1 ? 0 : currentPos;
                    const nextPos = Math.max(0, start - linesPerPage);
                    newIndex = filteredBaseIndices[nextPos] ?? currentIndex;
                } else {
                    newIndex = Math.max(0, currentIndex - linesPerPage);
                }
            }
            break;
        case 'PageDown':
            if (e.altKey) {
                if (filteredBaseIndices) {
                    newIndex = filteredBaseIndices[lastVisibleIndex] ?? currentIndex;
                } else {
                    newIndex = lastVisibleIndex;
                }
            } else {
                if (filteredBaseIndices) {
                    const start = currentPos === -1 ? 0 : currentPos;
                    const nextPos = Math.min(navigationLinesCount - 1, start + linesPerPage);
                    newIndex = filteredBaseIndices[nextPos] ?? currentIndex;
                } else {
                    const start = currentIndex === -1 ? 0 : currentIndex;
                    newIndex = Math.min(navigationLinesCount - 1, start + linesPerPage);
                }
            }
            break;
        case 'Home':
            if (filteredBaseIndices) {
                newIndex = filteredBaseIndices[0] ?? currentIndex;
            } else {
                newIndex = 0;
            }
            break;
        case 'End':
            if (filteredBaseIndices) {
                newIndex = filteredBaseIndices[navigationLinesCount - 1] ?? currentIndex;
            } else {
                newIndex = navigationLinesCount - 1;
            }
            break;
        default:
            return;
    }

    e.preventDefault();
    if (newIndex !== currentIndex) {
        setCurrentLineIndex(newIndex);
    }
}
