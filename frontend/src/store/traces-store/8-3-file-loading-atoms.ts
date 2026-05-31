import { atom, getDefaultStore } from 'jotai';

// Map of file ID to loading state atom
const fileLoadingAtoms = new Map<string, ReturnType<typeof atom<boolean>>>();

// Get or create a loading atom for a specific file ID
export function getFileLoadingAtom(fileId: string) {
    let loadingAtom = fileLoadingAtoms.get(fileId);
    if (!loadingAtom) {
        loadingAtom = atom(true); // Default to loading when created
        fileLoadingAtoms.set(fileId, loadingAtom);
    }
    return loadingAtom;
}

// Set the loading state for a specific file
export function setFileLoading(fileId: string, isLoading: boolean, createIfMissing = true) {
    const store = getDefaultStore();
    const loadingAtom = createIfMissing ? getFileLoadingAtom(fileId) : fileLoadingAtoms.get(fileId);
    if (!loadingAtom) {
        return;
    }
    store.set(loadingAtom, isLoading);
}

// Clean up atom when file is closed
export function removeFileLoadingAtom(fileId: string) {
    fileLoadingAtoms.delete(fileId);
}
