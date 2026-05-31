import { atom } from "jotai";
import { atomWithProxy } from "jotai-valtio";
import { appSettings } from "./1-ui-settings";

const appSettingsAtom = atomWithProxy(appSettings);

export const showOnlyErrorsInSelectedFileAtom = atom(
    (get) => get(appSettingsAtom).showOnlyErrorsInSelectedFile
);

export const setShowOnlyErrorsInSelectedFileAtom = atom(
    null,
    (_get, _set, enabled: boolean) => {
        appSettings.showOnlyErrorsInSelectedFile = enabled;
    }
);
