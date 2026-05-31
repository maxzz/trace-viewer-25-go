import { appSettings } from "../store/1-ui-settings";
import { type ThemeMode } from "./theme-apply";

export function isThemeDark(theme: ThemeMode): boolean {
    if (theme === 'light') return false;
    if (theme === 'dark') return true;
    return getIsSystemDark();
}

export function toggleTheme(theme: ThemeMode) {
    if (theme === 'dark') {
        appSettings.theme = 'light';
    }
    else if (theme === 'light') {
        appSettings.theme = 'dark';
    }
    else {
        const isSystemDark = getIsSystemDark();
        appSettings.theme = isSystemDark ? 'light' : 'dark';
    }
}

export function getIsSystemDark() {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
