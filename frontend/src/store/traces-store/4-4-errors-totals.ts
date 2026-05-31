import { atom } from "jotai";
import { atomWithProxy } from "jotai-valtio";
import { filesStore } from "./9-types-files-store";

const filesStoreAtom = atomWithProxy(filesStore);

export type AllFilesErrorsTotals = {
    errorsCount: number;
    errorsCountWithoutNoise: number;
};

export const allFilesErrorsTotalsAtom = atom<AllFilesErrorsTotals>(
    (get) => {
        const store = get(filesStoreAtom);

        let errorsCount = 0;
        let errorsCountWithoutNoise = 0;

        for (const fileState of store.states) {
            errorsCount += fileState.data.errorsInTraceCount ?? 0;
            errorsCountWithoutNoise += fileState.data.errorsInTraceCountWithoutNoise ?? 0;
        }

        return { errorsCount, errorsCountWithoutNoise };
    }
);

