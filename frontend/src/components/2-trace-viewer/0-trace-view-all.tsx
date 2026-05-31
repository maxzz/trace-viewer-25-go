import React, { useRef, useState, useEffect, useCallback } from "react";
import { useAtomValue, useAtom, useSetAtom, atom, getDefaultStore, type PrimitiveAtom } from "jotai";
import { useSnapshot } from "valtio";
import { formatTimestamp } from "@/utils";
import { appSettings } from "@/store/1-ui-settings";
import { currentFileStateAtom } from "@/store/traces-store/0-1-files-current-state";
import { currentFileThreadFilterViewStateAtom } from "@/store/traces-store/0-4-thread-filter-cache";
import { type TraceLine } from "@/trace-viewer-core/9-core-types";
import { ITEM_HEIGHT } from "./9-trace-view-constants";
import { allTimesStore } from "@/store/traces-store/3-1-all-times-store";
import { TraceRowMemo } from "./1-trace-view-row";
import { handlePendingTimestampScroll, scrollToSelection } from "./2-trace-view-scroll";
import { handleKeyboardNavigation } from "./3-trace-view-keyboard";
import { SymbolArrowCircleLeft } from "../ui/icons/symbols/all-other/33-arrow-circle-left";
import { jumpFromErrorsOnlyToContextAtom } from "@/store/traces-store/4-2-errors-only-jump";
import type { FileState } from "@/store/traces-store/9-types-files-store";

export function TraceListForCurrentFile() {
    const currentFileState = useAtomValue(currentFileStateAtom);
    if (!currentFileState) return <div />;
    return <TraceList currentFileState={currentFileState} />;
}

export function TraceList({ currentFileState }: { currentFileState: FileState; }) {
    const { pendingScrollTimestamp, pendingScrollFileId } = useSnapshot(allTimesStore);
    const { useIconsForEntryExit, showLineNumbers, allTimes: { show: showOnAllTimes } } = useSnapshot(appSettings);

    // Derived from currentFileState
    const selectedFileId = currentFileState.id;
    const fileData = currentFileState.data;
    const currentLineIdxAtom = currentFileState.currentLineIdxAtom;
    const viewLines = fileData.viewLines || [];

    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollTopAtom = currentFileState.scrollTopAtom;
    const [scrollTop, setScrollTop] = useAtom(scrollTopAtom);
    const [containerHeight, setContainerHeight] = useState(800); // Default
    const [hoveredTimestamp, setHoveredTimestamp] = useAtom(hoveredTimestampAtom);
    const [, setNewLinesMarkerTick] = useState(0);
    const activeNewLinesMarker = currentFileState.newLinesMarker && currentFileState.newLinesMarker.expiresAt > Date.now()
        ? currentFileState.newLinesMarker
        : null;

    const { isErrorsOnlyActive, linesForView, threadIdsForView, displayIndexToBaseIndex, baseIndexToDisplayIndex } = useAtomValue(currentFileThreadFilterViewStateAtom);
    const onErrorJump = useSetAtom(jumpFromErrorsOnlyToContextAtom);

    const onMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            const target = e.target as HTMLElement;
            // Check if we are over the icon itself to prevent flickering
            if (target.closest('#trace-timestamp-icon')) return;

            const timestampDiv = target.closest('[data-timestamp]') as HTMLElement;
            if (timestampDiv && scrollRef.current) {
                const timestamp = timestampDiv.getAttribute('data-timestamp');
                if (timestamp) {
                    const rect = timestampDiv.getBoundingClientRect();
                    const containerRect = scrollRef.current.getBoundingClientRect();
                    setHoveredTimestamp({ timestamp, top: rect.top - containerRect.top, });
                    return;
                }
            }
            setHoveredTimestamp(null);
        },
        []);

    const onIconClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            if (hoveredTimestamp) {
                const precision = appSettings.allTimes.precision;
                const formatted = formatTimestamp(hoveredTimestamp.timestamp, precision);
                if (formatted) {
                    // Get date from the trace line if available and prepend it
                    const currentLine = viewLines.find(l => l.timestamp === hoveredTimestamp.timestamp);
                    const fullTimestamp = currentLine?.date ? `${currentLine.date} ${formatted}` : formatted;
                    
                    // Ensure panel is visible
                    if (!appSettings.allTimes.show) {
                        appSettings.allTimes.show = true;
                    }
                    
                    allTimesStore.setAllTimesSelectedTimestamp(fullTimestamp);
                }
            }
        },
        [hoveredTimestamp, viewLines]);

    useEffect( // Keyboard navigation
        () => {
            const controller = new AbortController();
            window.addEventListener('keydown', (e) => handleKeyboardNavigation(e, scrollRef, containerHeight, scrollTop), { signal: controller.signal });
            return () => controller.abort();
        },
        [containerHeight, scrollTop]);

    useEffect( // Update container height on resize
        () => {
            if (!scrollRef.current) return;

            function updateHeight() {
                scrollRef.current && setContainerHeight(scrollRef.current.clientHeight);
            }
            updateHeight();

            const controller = new AbortController();
            window.addEventListener('resize', updateHeight, { signal: controller.signal });
            return () => controller.abort();
        },
        []);

    useEffect( // Reset scroll on file change
        () => {
            if (!scrollRef.current) return;
            scrollRef.current.scrollTop = getDefaultStore().get(scrollTopAtom);
        },
        [selectedFileId, scrollTopAtom]);

    useEffect( // Handle pending timestamp scroll
        () => {
            handlePendingTimestampScroll(
                pendingScrollTimestamp,
                pendingScrollFileId,
                viewLines,
                scrollRef,
                containerHeight,
                selectedFileId,
                baseIndexToDisplayIndex ?? undefined
            );
        },
        [pendingScrollTimestamp, pendingScrollFileId, viewLines, containerHeight, selectedFileId, baseIndexToDisplayIndex]);

    useEffect( // Refresh after transient new-lines marker expires
        () => {
            if (!activeNewLinesMarker) return;

            const remainingMs = activeNewLinesMarker.expiresAt - Date.now();
            if (remainingMs <= 0) {
                setNewLinesMarkerTick((value) => value + 1);
                return;
            }

            const timeoutId = window.setTimeout(
                () => setNewLinesMarkerTick((value) => value + 1),
                remainingMs
            );

            return () => window.clearTimeout(timeoutId);
        },
        [selectedFileId, activeNewLinesMarker?.token, activeNewLinesMarker?.expiresAt]);

    const onScroll = useCallback(
        (e: React.UIEvent<HTMLDivElement>) => {
            setScrollTop(e.currentTarget.scrollTop);
        },
        [setScrollTop]);

    const { totalHeight, visibleLines, offsetY, startIndex, firstLineLength } = calculateVirtualization(linesForView, containerHeight, scrollTop);

    return (
        <div
            ref={scrollRef}
            className="group/tracelist relative size-full outline-none overflow-auto"
            onScroll={onScroll}
            onMouseMove={showOnAllTimes ? onMouseMove : undefined}
            onMouseLeave={() => setHoveredTimestamp(null)}
            tabIndex={0}
        >
            {/* Empty state for Errors-only mode */}
            {isErrorsOnlyActive && linesForView.length === 0 && (
                <div className="absolute inset-0 p-2 bg-foreground/5 pointer-events-none flex items-start justify-center">
                    <div className="px-3 py-2 max-w-120 text-center text-xs text-foreground bg-background/80 border border-border rounded-md shadow-sm">
                        <div className="font-semibold">The error-only display mode is activated.</div>
                        <div className="text-green-600">This file has no errors to show.</div>
                    </div>
                </div>
            )}

            {/* for styles debugging */}
            {/* <div className={iconContainerClasses} title="Locate in all times timeline">
                <SymbolArrowCircleLeft className={iconClasses} />
            </div> */}

            {/* Locate in Timeline icon */}
            {hoveredTimestamp && (
                <div
                    id="trace-timestamp-icon"
                    className={iconContainerClasses}
                    style={{ top: hoveredTimestamp.top + scrollTop + (ITEM_HEIGHT - 16) / 2 }}
                    title="Locate in all times timeline"
                    onClick={onIconClick}
                >
                    <SymbolArrowCircleLeft className={iconClasses} />
                </div>
            )}

            {/* Trace list */}
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {visibleLines.map(
                        (line: TraceLine, idx: number) => (
                            <TraceRowMemo
                                key={line.lineIndex}
                                line={line}
                                baseIndex={getBaseIndexForDisplayIndex(displayIndexToBaseIndex, startIndex + idx)}
                                currentLineIdxAtom={currentLineIdxAtom}
                                useIconsForEntryExit={useIconsForEntryExit}
                                showLineNumbers={showLineNumbers}
                                uniqueThreadIds={threadIdsForView}
                                firstLineLength={firstLineLength}
                                isNewlyAppended={!!activeNewLinesMarker && line.lineIndex >= activeNewLinesMarker.fromLineIndex}
                                isErrorsOnlyActive={isErrorsOnlyActive}
                                onErrorJump={(baseIndex, line) => onErrorJump({ baseIndex, lineThreadId: line.threadId })}
                            />
                        )
                    )}
                </div>
            </div>

            {/* Scroll to selection controller */}
            <TraceViewScrollController
                scrollRef={scrollRef}
                containerHeight={containerHeight}
                selectedFileId={selectedFileId}
                currentLineIdxAtom={currentLineIdxAtom}
                baseIndexToDisplayIndex={baseIndexToDisplayIndex}
            />
        </div>
    );
}

const hoveredTimestampAtom = atom<{ timestamp: string; top: number; } | null>(null); // Atom to track hovered timestamp info

function TraceViewScrollController({ scrollRef, containerHeight, selectedFileId, currentLineIdxAtom, baseIndexToDisplayIndex }: {
    currentLineIdxAtom: PrimitiveAtom<number>;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    containerHeight: number;
    selectedFileId: string | null;
    baseIndexToDisplayIndex: number[] | undefined;
}) {
    const currentLineIndex = useAtomValue(currentLineIdxAtom);

    useEffect( // Scroll to selection
        () => {
            const displayIndex = baseIndexToDisplayIndex
                ? (baseIndexToDisplayIndex[currentLineIndex] ?? -1)
                : currentLineIndex;
            scrollToSelection(displayIndex, scrollRef, containerHeight);
        },
        [currentLineIndex, containerHeight, selectedFileId, scrollRef, baseIndexToDisplayIndex]);

    return null;
}

function calculateVirtualization(viewLines: TraceLine[], containerHeight: number, scrollTop: number) {
    // Virtualization logic
    const totalHeight = viewLines.length * ITEM_HEIGHT;
    // Calculate buffer based on visible items (50% of visible, minimum 20)
    // 01.08.2026: Increased buffer to avoid empty screen on fast scroll
    const BUFFER = Math.max(50, Math.floor(containerHeight / ITEM_HEIGHT * 2));
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
    const endIndex = Math.min(viewLines.length, Math.floor((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER);

    const visibleLines = viewLines.slice(startIndex, endIndex);
    const offsetY = startIndex * ITEM_HEIGHT;

    // determine firstLineLength from the first line that has a timestamp
    const firstLineLength = viewLines.find(l => !!l.timestamp)?.timestamp?.length ?? 12; // 12 is for 'HH:MM:SS.MSS' as oposite to higher precision 'HH:MM:SS.MSSSS'

    return { totalHeight, visibleLines, offsetY, startIndex, firstLineLength };
}

function getBaseIndexForDisplayIndex(displayIndexToBaseIndex: number[] | undefined, displayIndex: number) {
    if (!displayIndexToBaseIndex) return displayIndex;
    return displayIndexToBaseIndex[displayIndex] ?? displayIndex;
}

const iconContainerClasses = "\
absolute left-1.25 size-4 z-20 \
hover:scale-125 \
\
rounded-full \
1shadow-sm \
border-border \
transition-transform \
cursor-pointer \
flex items-center justify-center";

const iconClasses = "\
size-full \
stroke-foreground/80 dark:stroke-foreground/80 \
hover:stroke-foreground dark:hover:stroke-foreground \
fill-background! \
";
