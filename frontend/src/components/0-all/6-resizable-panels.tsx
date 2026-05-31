import { useCallback } from "react";
import { appSettings } from "../../store/1-ui-settings";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../ui/shadcn/resizable";
import { FileList } from "../1-file-list/0-file-list-all";
import { TraceListForCurrentFile } from "../2-trace-viewer";

export function TraceMainView() {
    const savedSizes = appSettings.panelSizes;
    const defaultFilePanelSize = savedSizes?.[0] ?? 20;
    const defaultTracePanelSize = savedSizes?.[1] ?? 80;

    const handleLayout = useCallback(
        (layout: { [key: string]: number }) => {
            const sizes = [
                layout["file-list"],
                layout["trace-view"]
            ];
            appSettings.panelSizes = sizes;
        }, []
    );

    return (
        <ResizablePanelGroup className="h-full border-t" orientation="horizontal" onLayoutChange={handleLayout}>
            <ResizablePanel
                id="file-list"
                defaultSize={`${defaultFilePanelSize}`}
                minSize="132px" // width of full timeline list (68px) + min file list width (64px) = 132px
                maxSize="90%"
                //className="min-w-[200px]"
            >
                <FileList />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel
                id="trace-view"
                defaultSize={`${defaultTracePanelSize}`}
            >
                <div className="h-full overflow-hidden flex flex-col">
                    <TraceListForCurrentFile />
                </div>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}
