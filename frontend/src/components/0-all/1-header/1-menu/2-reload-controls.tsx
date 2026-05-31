import { useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/shadcn/button";
import { IconPlayStart, IconPlayStop, IconRefresh, IconStopCircle, SymbolWarning } from "@/components/ui/icons";
import { appSettings } from "@/store/1-ui-settings";
import { currentFileStateAtom } from "@/store/traces-store/0-1-files-current-state";
import { filesStore } from "@/store/traces-store/9-types-files-store";
import { asyncAutoReloadFiles, asyncCheckFileSizeChanges, asyncReloadFile, canReloadFile, cancelAllFileReloads } from "@/store/traces-store/8-1-load-files";
import { getFileLoadingAtom } from "@/store/traces-store/8-3-file-loading-atoms";
import { classNames } from "@/utils/classnames";

export function FileReloadControls() {
    const currentFileState = useAtomValue(currentFileStateAtom);
    const { states } = useSnapshot(filesStore);
    const { fileUpdates } = useSnapshot(appSettings);
    const [autoEnabled, setAutoEnabled] = useState(false);
    const [shouldShowCancelActiveUpdates, setShouldShowCancelActiveUpdates] = useState(false);
    const autoTickRunningRef = useRef(false);
    const sizeMonitorTickRunningRef = useRef(false);

    const hasReloadableFiles = states.some((fileState) => fileState.source.kind === "handle");
    const hasActiveUpdates = states.some((fileState) => fileState.updateInfo.status === "updating");
    const showCancelActiveUpdates = hasActiveUpdates && shouldShowCancelActiveUpdates;
    const reloadButtonClassName = showCancelActiveUpdates
        ? "rounded-none border-l-0"
        : "rounded-r rounded-l-none border-l-0";

    useEffect(
        () => {
            if (!hasActiveUpdates) {
                setShouldShowCancelActiveUpdates(false);
                return;
            }

            const timeoutId = window.setTimeout(() => setShouldShowCancelActiveUpdates(true), 1000);

            return () => {
                window.clearTimeout(timeoutId);
            };
        },
        [hasActiveUpdates]);

    useEffect(
        () => {
            if (autoEnabled && !hasReloadableFiles) {
                setAutoEnabled(false);
            }
        },
        [autoEnabled, hasReloadableFiles]);

    useEffect(
        () => {
            if (!autoEnabled || !hasReloadableFiles) {
                return;
            }

            let disposed = false;
            const intervalMs = Math.max(500, fileUpdates.autoUpdateIntervalMs);

            async function tick() {
                if (disposed || autoTickRunningRef.current) {
                    return;
                }

                autoTickRunningRef.current = true;
                try {
                    await asyncAutoReloadFiles();
                } finally {
                    autoTickRunningRef.current = false;
                }
            }

            const intervalId = window.setInterval(() => tick(), intervalMs);

            return () => {
                disposed = true;
                window.clearInterval(intervalId);
                autoTickRunningRef.current = false;
            };
        },
        [autoEnabled, hasReloadableFiles, fileUpdates.autoUpdateIntervalMs, fileUpdates.autoUpdateMinSizeChangeBytes]);

    useEffect(
        () => {
            if (!fileUpdates.sizeMonitorEnabled || !hasReloadableFiles) {
                return;
            }

            if (autoEnabled) {
                void asyncCheckFileSizeChanges();
                return;
            }

            let disposed = false;
            const intervalMs = Math.max(500, fileUpdates.autoUpdateIntervalMs);

            async function tick() {
                if (disposed || sizeMonitorTickRunningRef.current) {
                    return;
                }

                sizeMonitorTickRunningRef.current = true;
                try {
                    await asyncCheckFileSizeChanges();
                } finally {
                    sizeMonitorTickRunningRef.current = false;
                }
            }

            void tick();
            const intervalId = window.setInterval(() => void tick(), intervalMs);

            return () => {
                disposed = true;
                window.clearInterval(intervalId);
                sizeMonitorTickRunningRef.current = false;
            };
        },
        [autoEnabled, hasReloadableFiles, fileUpdates.sizeMonitorEnabled, fileUpdates.autoUpdateIntervalMs]);

    if (!hasReloadableFiles && !hasActiveUpdates) {
        return null;
    }

    return (
        <div className="h-6 border flex items-center rounded" title="File Updates">

            <Button
                className="group size-6 rounded-l rounded-r-none active:scale-75 focus:ring-0"
                variant="ghost"
                size="icon"
                onClick={() => setAutoEnabled((value) => !value)}
                disabled={!hasReloadableFiles}
                title={autoEnabled ? "Stop Automatic Updates" : "Start Automatic Updates"}
            >
                {autoEnabled
                    ? <IconPlayStop className="size-3.5 text-red-500/50 group-disabled:opacity-30" />
                    : <IconPlayStart className="size-3.5 text-foreground/50 group-disabled:opacity-30" />
                }
            </Button>

            <Button
                className="group size-6 border-l-0 rounded-none active:scale-75 focus:ring-0"
                variant="ghost"
                size="icon"
                onClick={() => { appSettings.fileUpdates.sizeMonitorEnabled = !fileUpdates.sizeMonitorEnabled; }}
                disabled={!hasReloadableFiles}
                title={fileUpdates.sizeMonitorEnabled ? "Disable File Size Monitor" : "Enable File Size Monitor"}
            >
                <SymbolWarning
                    className={classNames(
                        "size-3.5 group-disabled:opacity-30",
                        fileUpdates.sizeMonitorEnabled ? "text-amber-500" : "text-foreground/50"
                    )}
                />
            </Button>

            {canReloadFile(currentFileState)
                ? <ButtonReloadCurrentFileInner className={reloadButtonClassName} fileStateId={currentFileState.id} onReload={() => asyncReloadFile(currentFileState)} />
                : <DisabledReloadButton className={reloadButtonClassName} />
            }

            <AnimatePresence initial={false}>
                {showCancelActiveUpdates && (
                    <motion.div
                        className="overflow-hidden"
                        initial={{ width: 0 }}
                        animate={{ width: "auto" }}
                        exit={{ width: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Button
                            className="group size-6 border-l-0 rounded-r rounded-l-none active:scale-75 focus:ring-0"
                            variant="ghost"
                            size="icon"
                            onClick={cancelAllFileReloads}
                            title="Cancel Active Updates"
                        >
                            <IconStopCircle className="size-3.5 text-foreground/50" />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}

function ButtonReloadCurrentFileInner({ className, fileStateId, onReload }: { className?: string; fileStateId: string; onReload: () => Promise<void>; }) {
    const isLoading = useAtomValue(getFileLoadingAtom(fileStateId));
    return (
        <Button
            className={classNames("group size-6 active:scale-75 focus:ring-0", className)}
            variant="ghost"
            size="icon"
            onClick={() => void onReload()}
            disabled={isLoading}
            title="Reload Selected File"
        >
            <IconRefresh className={classNames("size-3 text-foreground/50", isLoading ? "animate-spin" : "group-disabled:opacity-30")} />
        </Button>
    );
}

function DisabledReloadButton({ className }: { className?: string; }) {
    return (
        <Button
            className={classNames("group size-6", className)}
            variant="ghost"
            size="icon"
            disabled
            title="Select a reloadable file to refresh it"
        >
            <IconRefresh className="size-3.5 text-foreground/50 group-disabled:opacity-30" />
        </Button>
    );
}
