import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { isThemeDark, toggleTheme } from "@/utils/theme-utils";
import { Button } from "@/components/ui/shadcn/button";
import { IconThemeMoon, IconThemeSun } from "@/components/ui/icons/normal";

export function ButtonThemeToggle() {
    const { theme } = useSnapshot(appSettings);
    const isDark = isThemeDark(theme);

    return (
        <Button
            className="size-6 rounded"
            variant="ghost"
            size="icon"
            onClick={() => toggleTheme(theme)}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            type="button"
        >
            {isDark
                ? <IconThemeSun className="size-3 stroke-1!" />
                : <IconThemeMoon className="size-3 stroke-1!" />
            }
        </Button>
    );
}
