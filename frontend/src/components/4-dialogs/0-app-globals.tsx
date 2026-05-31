import { WindowsAppTitleCaption } from "./8-windows-app-title-caption";
import { DialogEditHighlightRules } from "./5-dialog-edit-highlight-rules";
import { DialogAbout } from "./3-dialog-about";
import { DialogEditFilters } from "./4-dialog-edit-filters";
import { DialogFileHeader } from "./2-dialog-file-header";
import { DialogOptions } from "./1-dialog-options";
import { DialogEditBlockLoadFilters } from "./6-dialog-edit-block-load-filters";
import { DialogErrorsNavWrap } from "../0-all/1-header/2-bar/2-btn-nav-errors";
import { useTopMenuGlobalShortcuts } from "./0-global-shortcuts";

export function AppGlobalsAndDialogs() {
    useTopMenuGlobalShortcuts();
    
    return (<>
        <WindowsAppTitleCaption />

        <Dialogs />
    </>);
}

function Dialogs() {
    return (<>
        <DialogFileHeader />
        <DialogAbout />
        <DialogOptions />
        <DialogEditFilters />
        <DialogEditBlockLoadFilters />
        <DialogEditHighlightRules />
        <DialogErrorsNavWrap />
    </>);
}
