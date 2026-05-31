import { TopMenu } from "./1-header/1-menu/1-all-menu";
import { FileReloadControls } from "./1-header/1-menu/2-reload-controls";
import { HistoryButtons } from "./1-header/2-bar/1-btn-nav-history";
import { ErrorsNavControls } from "./1-header/2-bar/2-btn-nav-errors";
import { ToggleErrorsOnly, ToggleErrorsWithoutNoise, ToggleThreadOnly } from "./1-header/2-bar/3-top-menu-toggles";
import { FileFilterDropdown } from "./1-header/2-bar/4-btn-files-filter-as-select";
import { ParsingFilesProgress, TimelineBuildProgress } from "./1-header/1-menu/3-loading-progress";
import { ButtonHighlightToggle } from "./1-header/2-bar/5-btn-highlight-toggle";
import { ButtonThemeToggle } from "./1-header/2-bar/8-btn-theme-toggle";

export function HeaderRow() {
    return (
        <div className="bg-background items-center justify-between flex">

            <div className="flex-1 px-2 items-center gap-4 flex">
                <TopMenu />
                <FileReloadControls />
            </div>

            <div className="flex-1 px-2 gap-2 items-center justify-between flex">
                <div className="items-center flex">
                    <ParsingFilesProgress />
                    <TimelineBuildProgress />
                </div>

                <div className="px-2 gap-2 items-center flex">
                    <HistoryButtons />
                    <ErrorsNavControls />
                    <ToggleErrorsOnly />
                    <ToggleErrorsWithoutNoise />
                    <ToggleThreadOnly />
                    <FileFilterDropdown />
                    <ButtonHighlightToggle />
                    <ButtonThemeToggle />
                </div>
            </div>

        </div>
    );
}
