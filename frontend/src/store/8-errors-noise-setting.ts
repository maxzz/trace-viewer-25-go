import { atom } from "jotai";
import { atomWithProxy } from "jotai-valtio";
import { appSettings } from "./1-ui-settings";

const appSettingsAtom = atomWithProxy(appSettings);

export const excludeNoiseErrorsInSelectedFileAtom = atom(
    (get) => get(appSettingsAtom).excludeNoiseErrorsInSelectedFile
);

export const setExcludeNoiseErrorsInSelectedFileAtom = atom(
    null,
    (_get, _set, enabled: boolean) => {
        appSettings.excludeNoiseErrorsInSelectedFile = enabled;
    }
);

