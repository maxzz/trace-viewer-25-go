import React from "react";
import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/shadcn/dialog";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { ScrollArea } from "@/components/ui/shadcn/scroll-area";
import { dialogFileHeaderOpenAtom } from "@/store/2-ui-atoms";
import { filesStore } from "@/store/traces-store/9-types-files-store";

export function DialogFileHeader() {
    const [fileId, setFileId] = useAtom(dialogFileHeaderOpenAtom);
    const { states: filesState } = useSnapshot(filesStore);
    
    const file = fileId ? filesState.find(f => f.id === fileId) : null;
    const header = file?.data.header;
    const fileName = file?.data.fileName;

    return (
        <Dialog open={!!fileId} onOpenChange={(open) => !open && setFileId(null)}>
            <DialogContent className="max-w-125" aria-describedby={undefined}>

                <DialogHeader>
                    <DialogTitle>
                        Trace File Header
                    </DialogTitle>
                </DialogHeader>

                <div className="pt-4 pb-1 grid gap-3">
                    <Input className="bg-muted" value={fileName || ''} readOnly tabIndex={-1} />

                    <ScrollArea className="px-3 py-2 min-h-65 bg-muted rounded border border-input">
                        <div className="space-y-0">
                            {formatHeaderText(header?.rawText || '')}
                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter className="justify-center!">
                    <Button variant="outline" onClick={() => setFileId(null)}>Close</Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );
}

function formatHeaderText(text: string): React.ReactElement[] {
    if (!text) return [];

    const lines = text.split('\n');
    return lines.map(
        (line, index) => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0 && colonIndex < line.length - 1) {
                const prefixText = line.substring(0, colonIndex);
                const capitalizedPrefix = prefixText.charAt(0).toUpperCase() + prefixText.slice(1);
                const prefix = capitalizedPrefix + ':';
                const rest = line.substring(colonIndex + 1);
                // If prefix contains a slash, render entire line with normal font
                if (prefix.includes('/')) {
                    return (
                        <div key={index} className="text-xs font-mono">
                            {line}
                        </div>
                    );
                }
                return (
                    <div key={index} className="text-xs font-mono">
                        <span className="font-bold">{prefix}</span>
                        <span>{rest}</span>
                    </div>
                );
            }
            return (
                <div key={index} className="text-xs font-mono">
                    {line}
                </div>
            );
        }
    );
}
