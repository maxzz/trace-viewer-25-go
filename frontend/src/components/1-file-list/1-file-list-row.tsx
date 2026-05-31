import { memo, useMemo } from "react";
import { type Atom, useAtomValue, useSetAtom } from "jotai";
import { selectAtom } from "jotai/utils";
import { useSnapshot, type Snapshot } from "valtio";
import { cn } from "@/utils/index";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger, } from "../ui/shadcn/context-menu";
import { appSettings, type HighlightRule } from "@/store/1-ui-settings";
import { AlertCircle, FileText } from "lucide-react";
import { SymbolQuestion, SymbolWarning } from "@/components/ui/icons";
import { SymbolArrowCircleLeft } from "../ui/icons/symbols/all-other/33-arrow-circle-left";
import { SymbolSpinner } from "../ui/icons/symbols";
import { type FileState } from "@/store/traces-store/9-types-files-store";
import { selectFile, closeFile, closeOtherFiles, closeAllFiles } from "@/store/traces-store/0-2-files-actions";
import { allTimesStore } from "@/store/traces-store/3-1-all-times-store";
import { dialogFileHeaderOpenAtom, dialogEditHighlightsOpenAtom } from "@/store/2-ui-atoms";
import { getFileLoadingAtom } from "@/store/traces-store/8-3-file-loading-atoms";
import { highlightActions } from "@/store/5-highlight-rules";
import { getOverlayKeyClasses } from "../ui/local-ui/color-picker-popup";
import { excludeNoiseErrorsInSelectedFileAtom } from "@/store/8-errors-noise-setting";
import { getErrorsCountForFileData } from "@/store/traces-store/4-3-errors-count";

export const FileListRow = memo(
    function FileListRow({ fileState, currentFileStateAtom }: { fileState: Snapshot<FileState>; currentFileStateAtom: Atom<FileState | null>; }) {
        const isSelectedAtom = useMemo(
            () => selectAtom(currentFileStateAtom, (s) => s?.id === fileState.id),
            [currentFileStateAtom, fileState.id]
        );
        const isSelected = useAtomValue(isSelectedAtom);

        const isLoading = useAtomValue(getFileLoadingAtom(fileState.id));
        const excludeNoiseErrors = useAtomValue(excludeNoiseErrorsInSelectedFileAtom);
        const errorsCount = getErrorsCountForFileData(fileState.data, excludeNoiseErrors);
        const hasError = errorsCount > 0 || !!fileState.data.errorLoadingFile;
        const { highlightRules, highlightEnabled, fileUpdates } = useSnapshot(appSettings);
        const { allTimes, allTimesSelectedTimestamp } = useSnapshot(allTimesStore);
        const setFileHeaderOpen = useSetAtom(dialogFileHeaderOpenAtom);
        const setEditHighlightsOpen = useSetAtom(dialogEditHighlightsOpenAtom);

        const overlayClasses = getOverlayClasses(highlightEnabled, highlightRules, fileState.matchedHighlightIds);
        const showInlineUpdateFailure = !fileUpdates.showFailureNotice && fileState.updateInfo.status === "failed";
        const showSizeChangeWarning = fileUpdates.sizeMonitorEnabled && fileState.updateInfo.hasUnreloadedSizeChange;

        const isMarked = allTimesSelectedTimestamp
            ? allTimes.find((t) => t.timestamp === allTimesSelectedTimestamp)?.fileIds.includes(fileState.id)
            : false;

        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div className={cn(getRowClasses(isSelected, hasError))} onClick={() => selectFile(fileState.id)}>

                        {/* Highlight rule background overlay */}
                        {!isSelected && overlayClasses && (
                            <div className={cn("absolute inset-0 opacity-20 pointer-events-none", overlayClasses)} />
                        )}

                        {/* File icon */}
                        <div className="relative shrink-0 z-10">
                            <FileText className={cn("size-4", isSelected ? "text-primary" : "opacity-70", hasError && "text-red-600 dark:text-red-400")} />

                            {errorsCount === 0 && !!fileState.data.errorLoadingFile && (
                                <div className="absolute -top-1 -right-1 bg-background rounded-full">
                                    <AlertCircle className="size-3 text-red-500 fill-background" />
                                </div>
                            )}

                            {/* Error count badge */}
                            {errorsCount > 0 && (
                                <span className={localClasses.errorCountBadge}>
                                    {errorsCount}
                                </span>
                            )}
                        </div>

                        {/* File name */}
                        <span className="flex-1 truncate z-10" title={fileState.data.fileName}>
                            {fileState.data.fileName}
                        </span>

                        {showSizeChangeWarning && (
                            <SymbolWarning
                                className="shrink-0 size-3.5 text-amber-500 z-10"
                                title={`File size changed from ${fileState.updateInfo.lastLoadedSize} to ${fileState.updateInfo.lastObservedSize} bytes. Reload the file to refresh it.`}
                            />
                        )}

                        {/* Loading indicator */}
                        {isLoading && (
                            <SymbolSpinner className="shrink-0 size-2 text-blue-500/40 stroke-2 animate-spin z-10" />
                        )}

                        {showInlineUpdateFailure && !isLoading && (
                            <SymbolQuestion className="shrink-0 size-3.5 text-red-500 z-10" title={fileState.updateInfo.failureMessage ?? "File update failed."} />
                        )}

                        {/* Jump to file in timeline Marker */}
                        {isMarked && (
                            <div
                                className="ml-auto shrink-0 z-10 hover:scale-125 transition-transform cursor-pointer"
                                title={allTimesSelectedTimestamp ?? undefined}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    selectFile(fileState.id);
                                    allTimesStore.setPendingScrollTimestamp(allTimesSelectedTimestamp, fileState.id);
                                }}
                            >
                                <SymbolArrowCircleLeft className="mr-0.5 size-4 rotate-180 1border border-foreground/60 rounded-full stroke-foreground/60 1fill-green-500/50!" />
                                {/* <div className="size-2 rounded-full bg-green-500 ring-1 ring-background" title="Present in selected timeline" /> */}
                            </div>
                        )}
                    </div>
                </ContextMenuTrigger>

                <ContextMenuContent>
                    <ContextMenuItem onClick={() => { navigator.clipboard.writeText(fileState.data.fileName); }}>
                        Copy File Name
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => { /*traceStore.selectFile(file.id);*/ setFileHeaderOpen(fileState.id); }}>
                        Show File Header...
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => { highlightActions.addRule(fileState.data.fileName); setEditHighlightsOpen(true); }}>
                        Add Highlight Rule...
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => closeFile(fileState.id)}>
                        Close
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => closeOtherFiles(fileState.id)}>
                        Close Others
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => closeAllFiles()}>
                        Close All
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );
    }
);

function getRowClasses(isSelected: boolean, hasError: boolean) {
    return cn(
        "group relative px-2 py-0.5 text-xs cursor-default select-none flex items-center gap-1.5",
        isSelected
            ? localClasses.rowSelected
            : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 border-transparent",
        hasError && "text-red-600 dark:text-red-400",
    );
}

const localClasses = {

    rowSelected: "\
bg-muted-foreground/20 \
border-primary \
\
outline -outline-offset-1 \
outline-primary dark:outline-primary/50 \
\
group-focus/filelist:bg-blue-100 dark:group-focus/filelist:bg-blue-900 \
group-focus/filelist:outline-blue-500 dark:group-focus/filelist:outline-blue-500 \
\
before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.75 \
\
before:bg-primary dark:before:bg-primary/70 \
group-focus/filelist:before:bg-blue-500 group-focus/filelist:dark:before:bg-blue-500 \
",

    errorCountBadge: "\
absolute -top-1 -right-1 \
px-1 py-px \
text-[0.5rem] \
font-mono \
text-red-700 dark:text-black \
bg-red-100 dark:bg-red-400 \
border-red-500/50 dark:border-red-600 \
border-[1.5px] \
rounded-full",

};

function getOverlayClasses(highlightEnabled: boolean, highlightRules: readonly HighlightRule[], matchedHighlightIds: readonly string[] | undefined): string | undefined {
    if (!highlightEnabled || !matchedHighlightIds || matchedHighlightIds.length === 0) {
        return undefined;
    }

    // Find the first rule in appSettings that matches one of the file's matched IDs.
    // We iterate through highlightRules to preserve order priority
    const rule = highlightRules.find(r => matchedHighlightIds.includes(r.id));
    return rule?.ruleEnabled ? getOverlayKeyClasses(rule.overlayKey) : undefined;
}

//TODO: add shortcuts for "File Header..." and "Show File Filters..." dialogs
