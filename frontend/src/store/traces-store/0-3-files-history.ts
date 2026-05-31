import { atom, getDefaultStore } from "jotai";
import { appSettings } from "../1-ui-settings";
import { selectFile } from "./0-2-files-actions";

interface FileHistory {
    items: string[];
    currentIndex: number;
}

export const fileHistoryAtom = atom<FileHistory>({
    items: [],                                  // Stores the history of selected files items: array of file IDs
    currentIndex: -1,                           // currentIndex: pointer to the current file in items array
});

// Navigation history state

export const canGoBackAtom = atom(
    (get) => {
        const history = get(fileHistoryAtom);
        return history.currentIndex > 0;
    }
);

export const canGoForwardAtom = atom(
    (get) => {
        const history = get(fileHistoryAtom);
        return history.currentIndex < history.items.length - 1;
    }
);

// Flag to indicate if the current file selection is triggered by history navigation
// This prevents adding the file to history again when we're just moving back/forward
let isNavigatingHistory = false;

export function getIsNavigatingHistory() {
    return isNavigatingHistory;
}

export const historyActions = {
    addToHistory: (fileId: string) => {
        if (isNavigatingHistory) return;

        const store = getDefaultStore();
        const history = store.get(fileHistoryAtom);
        const limit = appSettings.historyLimit ?? 100;

        // If we are currently at a file that is the same as the new one, do nothing
        // (unless it's null/empty, but usually we don't add null to history unless we want to track "closed" state?)
        // The requirement says "File IDs are added to the history when a file is selected".
        // Let's avoid duplicates if user clicks the same file again? 
        // Typically browser history allows same page reload, but for file selection it might be redundant.
        // However, if we navigate A -> B -> A, we should record A.
        // If we are at A and click A, maybe not.

        const currentFileId = history.currentIndex >= 0 ? history.items[history.currentIndex] : null;
        if (currentFileId === fileId) {
            return;
        }

        // If we're in the middle of history, discard future items
        const newItems = history.items.slice(0, history.currentIndex + 1);

        newItems.push(fileId);

        // Apply limit
        if (newItems.length > limit) {
            newItems.splice(0, newItems.length - limit);
        }

        store.set(fileHistoryAtom, {
            items: newItems,
            currentIndex: newItems.length - 1
        });
    },

    goBack: () => {
        const store = getDefaultStore();
        const history = store.get(fileHistoryAtom);

        if (history.currentIndex > 0) {
            isNavigatingHistory = true;
            const newIndex = history.currentIndex - 1;
            const fileId = history.items[newIndex];

            store.set(fileHistoryAtom, {
                ...history,
                currentIndex: newIndex
            });

            selectFile(fileId);
            isNavigatingHistory = false;
        }
    },

    goForward: () => {
        const store = getDefaultStore();
        const history = store.get(fileHistoryAtom);

        if (history.currentIndex < history.items.length - 1) {
            isNavigatingHistory = true;
            const newIndex = history.currentIndex + 1;
            const fileId = history.items[newIndex];

            store.set(fileHistoryAtom, {
                ...history,
                currentIndex: newIndex
            });

            selectFile(fileId);
            isNavigatingHistory = false;
        }
    },

    removeFromHistory: (fileId: string) => {
        const store = getDefaultStore();
        const history = store.get(fileHistoryAtom);

        const newItems = history.items.filter(id => id !== fileId);

        // If the removed file was in history, we need to adjust currentIndex
        // It's a bit tricky because we might remove a file that is before or after current index.
        // Or even the current index (though closeFile typically selects another file afterwards).

        // If we just filter, the indices shift.
        // We need to find where the current file (if it wasn't the removed one) ended up.
        // If the removed file was the current one, we need to decide where to point.
        // Since closeFile() logic selects another file, that selection will trigger addToHistory.
        // So here we probably just want to clean up occurrences.

        // However, if closeFile triggers selectFile, and we are not navigating, 
        // addToHistory will be called for the new file.
        // If we blindly remove the file from history, we might mess up the "back" stack logic if not careful.

        // Simpler approach: 
        // 1. Remove all instances of fileId.
        // 2. Adjust currentIndex to point to the same file as before if possible, or clamp it.

        let currentItem = history.currentIndex >= 0 ? history.items[history.currentIndex] : null;

        if (currentItem === fileId) {
            // The current file is being removed.
            // We can let selectFile logic handle the new selection state, which will add to history.
            // But we should remove this file from history so we don't navigate back to it.
            // If we remove it, what becomes current?
            // Usually closeFile selects next/prev.
            currentItem = null; // It's gone
        }

        if (newItems.length === 0) {
            store.set(fileHistoryAtom, { items: [], currentIndex: -1 });
            return;
        }

        // Find new index of currentItem
        let newIndex = -1;
        if (currentItem) {
            // If duplicate IDs were possible, this might jump. But we assume unique IDs in file list usually.
            // Wait, history can have [A, B, A]. If current is 2nd A.
            // We need to be careful.

            // Let's rebuild the items and track where currentIndex goes.
            // Actually, the requirements say: "If one file is closed, it should be removed from the history."

            // Implementation: Reconstruct history excluding the file, try to keep relative position close to where we were.
        }

        // Let's do a more robust filter and index adjustment
        const adjustedItems: string[] = [];
        let adjustedIndex = -1;

        for (let i = 0; i < history.items.length; i++) {
            const item = history.items[i];
            if (item !== fileId) {
                adjustedItems.push(item);
                if (i === history.currentIndex) {
                    adjustedIndex = adjustedItems.length - 1;
                } else if (i < history.currentIndex) {
                    // if we are keeping an item before current, no change needed to adjustedIndex calc logic 
                    // (wait, if we haven't found current yet, adjustedIndex is still -1)
                }
                // If i > history.currentIndex, we just add it.
            } else {
                // Item removed
                if (i === history.currentIndex) {
                    // Current item removed. 
                    // adjustedIndex remains at the last added item (or -1 if empty)
                    // We'll fix it up below.
                    adjustedIndex = Math.max(0, adjustedItems.length - 1);
                    // Actually if we removed the current item, we might want to point to the previous one
                    // or just let the new selection (from closeFile) take over.
                    // But closeFile calls removeFromHistory BEFORE selectFile(next).
                    // So we should just remove it. The subsequent selectFile will add the new current file.
                }
            }
        }

        // If we removed items before current index, we need to decrement adjustedIndex.
        // Let's try a different way: map old indices to new indices.

        const keptIndices: number[] = [];
        const filteredItems: string[] = [];

        history.items.forEach((item, idx) => {
            if (item !== fileId) {
                filteredItems.push(item);
                keptIndices.push(idx);
            }
        });

        let newCurrentIndex = -1;

        // If current index was pointing to a kept item, find its new index
        // If current index was pointing to a removed item, find the nearest kept item?

        // Use case: [A, B, C]. Current B (1). Close B.
        // Result: [A, C]. New current?
        // closeFile selects A or C. Let's say it selects A.
        // It calls selectFile(A). addToHistory(A).
        // If we leave index at A (0), then addToHistory(A) might add A again if we are not careful? 
        // No, addToHistory checks against current.

        // Let's rely on simple filtering.
        // If we lost the current item, point to the previous valid one, or -1.

        if (history.items[history.currentIndex] === fileId) {
            // We removed the current item.
            // Ideally we step back.
            newCurrentIndex = -1;
            // We search backwards from current index for a kept item
            for (let i = history.currentIndex - 1; i >= 0; i--) {
                if (history.items[i] !== fileId) {
                    // Find where this item ended up in filtered list
                    // This is inefficient but safe
                    const keptItem = history.items[i];
                    newCurrentIndex = filteredItems.lastIndexOf(keptItem);
                    // lastIndexOf might be risky if duplicates exist.
                    // But we filtered properly.

                    // Let's just correct the index based on how many items were removed before it.
                    break;
                }
            }
            if (newCurrentIndex === -1 && filteredItems.length > 0) {
                // Try forward?
                newCurrentIndex = 0;
            }
        } else {
            // Current item kept. Find its new index.
            // We need to count how many items BEFORE current index were removed.
            let removedBefore = 0;
            for (let i = 0; i < history.currentIndex; i++) {
                if (history.items[i] === fileId) removedBefore++;
            }
            newCurrentIndex = history.currentIndex - removedBefore;
        }

        // Clamp
        if (filteredItems.length === 0) {
            newCurrentIndex = -1;
        } else if (newCurrentIndex >= filteredItems.length) {
            newCurrentIndex = filteredItems.length - 1;
        } else if (newCurrentIndex < 0 && filteredItems.length > 0) {
            // if we couldn't find a place, maybe default to end?
            newCurrentIndex = filteredItems.length - 1;
        }

        store.set(fileHistoryAtom, {
            items: filteredItems,
            currentIndex: newCurrentIndex
        });
    },

    clearHistory: () => {
        const store = getDefaultStore();
        store.set(fileHistoryAtom, {
            items: [],
            currentIndex: -1
        });
    }
};
