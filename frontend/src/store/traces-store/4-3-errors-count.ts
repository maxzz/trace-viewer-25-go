import { atom } from "jotai";
import { currentFileStateAtom } from "./0-1-files-current-state";
import { excludeNoiseErrorsInSelectedFileAtom } from "../8-errors-noise-setting";

export type ErrorsCountSource = {
    errorsInTraceCount?: number;
    errorsInTraceCountWithoutNoise?: number;
};

export function getErrorsCountForFileData(fileData: ErrorsCountSource, excludeNoise: boolean) {
    return excludeNoise
        ? (fileData.errorsInTraceCountWithoutNoise ?? 0)
        : (fileData.errorsInTraceCount ?? 0);
}

export const currentFileErrorsCountAtom = atom(
    (get) => {
        const fileState = get(currentFileStateAtom);
        if (!fileState) return 0;

        const excludeNoise = get(excludeNoiseErrorsInSelectedFileAtom);
        return getErrorsCountForFileData(fileState.data, excludeNoise);
    }
);

