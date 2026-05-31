import { useEffect } from "react";
import { atom, useSetAtom } from "jotai";
import { dialogBlockLoadFiltersOpenAtom, dialogEditFiltersOpenAtom, dialogEditHighlightsOpenAtom, dialogOptionsOpenAtom } from "@/store/2-ui-atoms";
import { ToggleDevTools } from "@/wailsjs/go/main/App";

export function useTopMenuGlobalShortcuts() {
    const handleGlobalKeyDown = useSetAtom(handleTopMenuKeyDownAtom);

    useEffect(
        () => {
            const controller = new AbortController();
            window.addEventListener('keydown', handleGlobalKeyDown, { signal: controller.signal });
            return () => controller.abort();
        },
        [handleGlobalKeyDown]
    );
}

const handleTopMenuKeyDownAtom = atom(
    null,
    (_get, set, e: KeyboardEvent) => {
        const key = e.key.toLowerCase();

        const isDevToolsShortcut = e.key === 'F12' || e.code === 'F12' || (e.ctrlKey && e.shiftKey && (key === 'i' || e.code === 'KeyI'));
        if (isDevToolsShortcut) {
            e.preventDefault();
            ToggleDevTools().catch(console.error);
            return;
        }

        switch (key) {
            case ',': {
                if (!(e.ctrlKey || e.metaKey)) return;
                e.preventDefault();
                set(dialogOptionsOpenAtom, true);
                return;
            }
            case 'r': {
                if (!e.altKey) return;
                e.preventDefault();
                set(dialogEditHighlightsOpenAtom, true);
                return;
            }
            case 'h': {
                if (!e.altKey) return;
                e.preventDefault();
                set(dialogEditFiltersOpenAtom, true);
                return;
            }
            case 'b': {
                if (!e.altKey) return;
                e.preventDefault();
                set(dialogBlockLoadFiltersOpenAtom, true);
                return;
            }
        }
    }
);
