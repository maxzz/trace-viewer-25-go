import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/shadcn/dialog";
import { notice } from "@/components/ui/local-ui/7-toaster";
import { cancelAllTimesBuild } from "@/workers-client";
import { allTimesStore } from "@/store/traces-store/3-1-all-times-store";
import { isLoadingFilesAtom } from "@/store/traces-store/8-1-load-files";
import { dialogTimelineCancelOpenAtom } from "@/store/2-ui-atoms";

export function ParsingFilesProgress() {
    const isLoadingFiles = useAtomValue(isLoadingFilesAtom);

    if (!isLoadingFiles) {
        return null;
    }

    return (
        <Button className="mr-2 px-2 h-6 text-xs text-foreground" variant="ghost" size="sm" disabled>
            <Loader2 className="size-3 animate-spin" />
            Parsing files...
        </Button>
    );
}

export function TimelineBuildProgress() {
    const setTimelineCancelOpen = useSetAtom(dialogTimelineCancelOpenAtom);
    const { allTimesIsLoading } = useSnapshot(allTimesStore);

    if (!allTimesIsLoading) {
        return null;
    }

    return (<>
        <Button className="mr-2 px-2 h-6 text-xs text-foreground/60 cursor-pointer" variant="outline" size="sm" onClick={() => setTimelineCancelOpen(true)} title="Building timeline... Click to cancel.">
            <Loader2 className="size-3 animate-spin" />
            Building timeline...
        </Button>

        <TimelineCancelBuildDialog />
    </>);
}

function TimelineCancelBuildDialog() {
    const [open, setOpen] = useAtom(dialogTimelineCancelOpenAtom);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-80!">
                <DialogHeader>
                    <DialogTitle>
                        Cancel Timeline Build?
                    </DialogTitle>
                    <DialogDescription className="py-2">
                        Are you sure you want to stop the timeline generation? The current progress will be discarded.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button variant="secondary" onClick={() => setOpen(false)}>Continue</Button>
                    <Button
                        variant="destructive"
                        onClick={
                            () => {
                                cancelAllTimesBuild();
                                allTimesStore.setAllTimesLoading(false);
                                allTimesStore.setAllTimes([]);
                                notice.info("Timeline build cancelled");
                                setOpen(false);
                            }
                        }
                    >
                        Stop Build
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
