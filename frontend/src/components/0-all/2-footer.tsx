import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings } from "../../store/1-ui-settings";
import { Cpu } from "lucide-react";
import { filesCountAtom } from "../../store/6-filtered-files";
import { currentFileStateAtom } from "../../store/traces-store/0-1-files-current-state";
import { allFilesErrorsTotalsAtom } from "../../store/traces-store/4-4-errors-totals";
import { excludeNoiseErrorsInSelectedFileAtom } from "../../store/8-errors-noise-setting";
import { fileLoadSummaryAtom } from "../../store/traces-store/8-4-file-load-summary";
import { dialogFileHeaderOpenAtom } from "../../store/2-ui-atoms";

export function Footer() {
    const fileCount = useAtomValue(filesCountAtom);
    const { showFooter } = useSnapshot(appSettings);
    const { hasRecentLoadResult } = useAtomValue(fileLoadSummaryAtom);
    return (<>
        {showFooter && (fileCount || hasRecentLoadResult) && <TraceFooter />}
    </>);
}

function TraceFooter() {
    const { extraInFooter } = useSnapshot(appSettings);
    return (
        <div className="text-xs text-muted-foreground bg-background border-t">
            <ErrorBanner />

            {/* Metadata Bar */}
            <div className="p-2 pt-1 flex items-center gap-1 select-none">
                <div className="ml-2 text-[10px] flex items-center gap-1.5">
                    <FilesCount />
                    <BlockedCount />
                    <ErrorsAllFilesCounter />
                </div>

                {extraInFooter && <BuildInfo />}

                <LinesErrorsCounter />
            </div>
        </div>
    );
}

function FilesCount() {
    const fileCount = useAtomValue(filesCountAtom);
    return (
        <span className="flex items-center gap-0.5">
            <span className="text-[8px]">
                Loaded:
            </span>
            {fileCount}
        </span>
    );
}

function BlockedCount() {
    const fileCount = useAtomValue(filesCountAtom);
    const { blockedCount, hasRecentLoadResult } = useAtomValue(fileLoadSummaryAtom);

    if (!hasRecentLoadResult || (blockedCount === 0 && fileCount > 0)) {
        return null;
    }

    return (
        <span className="flex items-center gap-0.5">
            <span className="text-[8px]">
                Blocked:
            </span>
            <span className="py-0.5 rounded">{blockedCount.toLocaleString()}</span>
        </span>
    );
}

function ErrorsAllFilesCounter() {
    const excludeNoise = useAtomValue(excludeNoiseErrorsInSelectedFileAtom);
    const { errorsCount, errorsCountWithoutNoise } = useAtomValue(allFilesErrorsTotalsAtom);

    if (!errorsCount) {
        return null;
    }

    const title = `All files errors: ${errorsCountWithoutNoise}/${errorsCount} (without noise/total)`;
    const errorsCountWithoutNoiseText = excludeNoise ? errorsCountWithoutNoise.toLocaleString() : errorsCount.toLocaleString();

    return (
        <span className="flex items-center gap-0.5" title={title}>
            <span className="text-[8px]">
                Errors:
            </span>

            {errorsCountWithoutNoiseText}

            <span className="text-[8px] opacity-70">
                ({errorsCountWithoutNoise.toLocaleString()}/{errorsCount.toLocaleString()})
            </span>
        </span>
    );
}

function LinesErrorsCounter() {
    const currentFileState = useAtomValue(currentFileStateAtom);
    const viewLines = currentFileState?.data?.viewLines || [];
    const lineCount = viewLines.length;
    const errorCount = currentFileState?.data.errorsInTraceCount || 0;
    return (<>
        <div className="ml-2 flex items-center flex-wrap">
            <Cpu className="mr-0.5 size-2.5" />
            <span className="mr-0.5 text-[8px] text-nowrap">
                In File:
            </span>

            <span className="text-[8px] flex items-center gap-0.5">
                <span className="text-[10px]">{lineCount.toLocaleString()}</span>
                <span>{plural(lineCount, 'line')}</span>
                {!!errorCount && <span className="-ml-0.5 mr-1">, </span>}
            </span>

            {!!errorCount && (<>
                <span className="text-[8px] flex items-center gap-0.5">
                    <span className="text-[10px]">{errorCount.toLocaleString()}</span>
                    <span>{plural(errorCount, 'error')}</span>
                </span>
            </>)}
        </div>
    </>);
}

function BuildInfo() {
    const setShowFileHeaderDialog = useSetAtom(dialogFileHeaderOpenAtom);
    const currentFileState = useAtomValue(currentFileStateAtom);
    const header = currentFileState?.data?.header || { magic: '' };
    return (<>
        {header.compiled && (<>
            <span className="flex items-center gap-1 cursor-pointer" onClick={() => setShowFileHeaderDialog(currentFileState?.id ?? null)}>
                <span className="pt-0.5 text-[8px] text-nowrap">
                    💻 Compiled:
                </span>
                <span className="pt-0.5 text-[0.6rem] text-center">{header.compiled}</span>
            </span>
        </>)}
    </>);
}

function ErrorBanner() {
    const currentFileState = useAtomValue(currentFileStateAtom);
    const error = currentFileState?.data?.errorLoadingFile;

    if (!error) {
        return null;
    }

    return (
        <div className="p-4 bg-red-100 border-red-500 text-red-700 border-l-4" role="alert">
            <p className="font-bold">Error loading trace</p>
            <p>{error}</p>
        </div>
    );
}

function plural(n: number, word: string) {
    return n === 1 ? word : `${word}s`;
}
