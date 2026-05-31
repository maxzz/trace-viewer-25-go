import React, { useMemo } from "react";
import { useAtomValue } from "jotai";
import { selectAtom } from "jotai/utils";
import type { PrimitiveAtom } from "jotai";
import { classNames } from "@/utils";
import { type TraceLine, LineCode } from "../../trace-viewer-core/9-core-types";
import { setCurrentLineIndex } from "../../store/traces-store/0-1-files-current-state";
import { ITEM_HEIGHT } from "./9-trace-view-constants";
import { columnLineNumberClasses, columnTimeClasses, columnThreadIdClasses, lineClasses, lineCurrentClasses, lineNotCurrentClasses, lineErrorClasses } from "./8-trace-view-classes";

export const TraceRowMemo = React.memo(TraceRow);

type TraceRowParams = {
    line: TraceLine;
    baseIndex: number;
    currentLineIdxAtom: PrimitiveAtom<number>;
    useIconsForEntryExit: boolean;
    showLineNumbers: boolean;
    uniqueThreadIds: readonly number[];
    firstLineLength: number;
    isNewlyAppended: boolean;
    isErrorsOnlyActive: boolean;
    onErrorJump: (baseIndex: number, line: TraceLine) => void;
};

function TraceRow({ line, baseIndex, currentLineIdxAtom, useIconsForEntryExit, showLineNumbers, uniqueThreadIds, firstLineLength, isNewlyAppended, isErrorsOnlyActive, onErrorJump }: TraceRowParams) {
    const isSelectedAtom = useMemo(() => selectAtom(currentLineIdxAtom, (s) => s === baseIndex), [currentLineIdxAtom, baseIndex]);
    const isSelected = useAtomValue(isSelectedAtom);
    const showThreadBackground = uniqueThreadIds.length > 0 && uniqueThreadIds[0] !== line.threadId;

    return (
        <div className={classNames(getRowClasses(line, isSelected), "group/trace-row relative")} style={{ height: ITEM_HEIGHT }} onClick={() => setCurrentLineIndex(baseIndex)}>
            {isNewlyAppended && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500/80 pointer-events-none" />
            )}

            {/* Time Column */}
            <div className={classNames(columnTimeClasses, firstLineLength === 12 ? "w-18" : "w-20", line.code === LineCode.Day && "pl-0 justify-center")} title={line.timestamp} data-timestamp={line.timestamp}>
                {line.code === LineCode.Day
                    ? (
                        <div className="mx-2 px-1 h-5 text-[10px] text-center font-bold text-foreground dark:text-background bg-green-200/50 border border-muted-foreground/20 rounded shadow flex items-center justify-center">
                            {line.content}
                        </div>
                    ) : (
                        line.timestamp || ""
                    )}
            </div>

            {/* Line Number */}
            {showLineNumbers && (
                <div className={columnLineNumberClasses}>
                    {line.lineIndex + 1}
                </div>
            )}

            {/* Thread ID */}
            <div className={classNames(columnThreadIdClasses, "w-auto h-full flex px-1", isSelected ? "" : "bg-muted/40")}>
                {uniqueThreadIds.map(
                    (tid) => {
                        const color = getThreadColor(tid);
                        return (
                            <div key={tid} className="relative w-3 h-full flex justify-center items-center" title={`Thread ${tid} (0x${tid.toString(16).toUpperCase()})`}>
                                <div className="absolute w-px -top-1/2 -bottom-1/2 border-l" style={{ borderLeftColor: color, opacity: 0.5 }} />
                                {tid === line.threadId && (
                                    <div className="size-2 bg-transparent border rounded-full z-10" style={{ borderColor: color }} />
                                )}
                            </div>
                        );
                    }
                )}
            </div>

            {/* Content with Indent */}
            <div
                className={classNames("flex-1 h-full truncate flex items-center", line.textColor, getLineColor(line))}
                title={line.content}
                style={{
                    paddingLeft: `${line.indent * 12 + 8}px`, // 8px is space at the beginning of the trace line
                    backgroundColor: showThreadBackground ? getThreadColor(line.threadId, 0.1) : undefined  //0.05
                }}
            >
                {/* Jump from errors-only view */}
                {isErrorsOnlyActive && line.code === LineCode.Error && (
                    <button
                        type="button"
                        className="shrink-0 mr-1 size-5 text-[10px] bg-background/70 border border-border rounded opacity-0 transition-opacity group-hover/trace-row:opacity-100"
                        title="Show context"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onErrorJump(baseIndex, line);
                        }}
                    >
                        ↩
                    </button>
                )}
                {line.code !== LineCode.Day && formatContent(line, useIconsForEntryExit)}
            </div>
        </div>
    );
}

const formatContent = (line: TraceLine, useIconsForEntryExit: boolean) => {
    // ↳ ↲ → ← ↘ ↩
    if (useIconsForEntryExit) {
        // if (line.code === LineCode.Entry) return <span className="flex items-center gap-1"><ArrowRight className="size-2 opacity-30" /> <span className="">{line.content}</span></span>;
        // if (line.code === LineCode.Exit) return <span className="flex items-center gap-1"><ArrowLeft className="size-2 opacity-30" /> <span className="">{line.content}</span></span>;
        if (line.code === LineCode.Entry) return <><span className="mr-1 text-base opacity-30">→</span>{line.content}</>;
        if (line.code === LineCode.Exit) return <><span className="mr-1 opacity-30">↩</span>{line.content}</>;
    } else {
        if (line.code === LineCode.Entry) return `>>> ${line.content}`;
        if (line.code === LineCode.Exit) return `<<< ${line.content}`;
    }

    // if (line.code === LineCode.Error) { // TODO: Formatted by parser but here we can add custom formatting
    // }

    return line.content;
};

function getRowClasses(line: TraceLine, isSelected: boolean) {
    return classNames(
        lineClasses,
        isSelected ? lineCurrentClasses : lineNotCurrentClasses,
        line.code === LineCode.Error && !isSelected && lineErrorClasses
    );
}

function getLineColor(line: TraceLine) {
    // Priority: Override Color > LineCode Color > Default
    if (line.textColor) {
        return undefined; // Handled by inline style
    }

    switch (line.code) {
        case LineCode.Error: return 'text-red-500 dark:text-red-400 font-bold';
        case LineCode.Entry: return 'text-blue-600 dark:text-blue-400';
        case LineCode.Exit: return 'text-blue-600 dark:text-blue-400';
        case LineCode.Time: return 'text-green-600 dark:text-green-400';
        case LineCode.Day: return 'text-green-600 dark:text-green-400 font-bold bg-green-100 dark:bg-green-200/50 w-full block';
        default: return 'text-foreground';
    }
}

function getThreadColor(tid: number, alpha = 1) {
    const hue = (Math.abs(tid) * 137.508) % 360;
    return `hsla(${hue}, 75%, 50%, ${alpha})`;
}
