import { useRef, useEffect, Fragment } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { motion, AnimatePresence } from "motion/react";
import { appSettings } from "@/store/1-ui-settings";
import { ScrollArea2 } from "../ui/shadcn/scroll-area";
import { allTimesStore } from "@/store/traces-store/3-1-all-times-store";
import { allTimesPanelRefAtom, allTimesScrollEffectAtom } from "@/store/traces-store/3-3-all-times-scroll-effect";

export function AllTimesPanel() {
    const { show, onLeft } = useSnapshot(appSettings).allTimes;
    const { allTimes } = useSnapshot(allTimesStore);
    const shouldShow = show && allTimes.length > 0;

    return (
        <AnimatePresence initial={false}>
            {shouldShow && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={classNames("h-full bg-green-100/20 dark:bg-green-950/20 select-none flex flex-col overflow-hidden", onLeft ? "border-r" : "border-l")}
                >
                    <div className="w-max h-full flex flex-col">
                        <AllTimesListContent />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function AllTimesListContent() {
    const { allTimes, allTimesSelectedTimestamp } = useSnapshot(allTimesStore);

    const viewportRef = useRef<HTMLDivElement>(null);
    const setAllTimesPanelRef = useSetAtom(allTimesPanelRefAtom);

    // Activate the scroll effect
    useAtomValue(allTimesScrollEffectAtom);

    // Store viewport ref in atom on mount
    useEffect(
        () => {
            setAllTimesPanelRef(viewportRef.current);
            return () => setAllTimesPanelRef(null);
        },
        [setAllTimesPanelRef]);

    let lastDate = "";

    return (
        <ScrollArea2 className="flex-1" ref={viewportRef}>
            <div className="flex flex-col">
                {allTimes.map(
                    (item, idx) => {
                        const isSelected = item.timestamp === allTimesSelectedTimestamp;
                        const { displayTime, currentDate } = splitTimestampIntoDateAndTime(item.timestamp);

                        const showDateHeader = currentDate && currentDate !== lastDate;
                        if (currentDate) lastDate = currentDate;

                        return (
                            <Fragment key={idx}>
                                {showDateHeader && (
                                    <div className={dateHeaderClasses} key={`date-header-${item.timestamp}`}>
                                        {currentDate}
                                    </div>
                                )}
                                <div
                                    className={classNames(rowClasses, isSelected && "bg-primary text-primary-foreground hover:bg-primary/90")}
                                    onClick={() => allTimesStore.setAllTimesSelectedTimestamp(isSelected ? null : item.timestamp)}
                                    title={item.timestamp}
                                    data-timestamp={item.timestamp}
                                    key={item.timestamp}
                                >
                                    {displayTime}
                                </div>
                            </Fragment>
                        );
                    }
                )}
            </div>
        </ScrollArea2>
    );
}

const dateHeaderClasses = "mx-2 px-0.5 h-5 text-[10px] text-center font-bold text-foreground dark:text-background bg-green-200 border border-muted-foreground/20 rounded shadow flex items-center justify-center";

const rowClasses = "h-5 text-[0.6rem] px-2.5 py-0.5 cursor-pointer text-gray-500 hover:bg-muted/50 truncate font-mono text-center flex items-center justify-center";

function splitTimestampIntoDateAndTime(timestamp: string): { displayTime: string; currentDate: string; } {
    // Parse timestamp to separate date and time. Expected format: "MM/DD/YYYY HH:MM:SS.mmm" or "HH:MM:SS.mmm"

    let displayTime = timestamp;
    let currentDate = "";

    if (timestamp.includes(' ')) {
        const parts = timestamp.split(' ');
        // Assuming format "Date Time"
        if (parts.length >= 2) {
            currentDate = parts.slice(0, parts.length - 1).join(' ');
            displayTime = parts[parts.length - 1];
        }
    }

    return { displayTime, currentDate };
}
