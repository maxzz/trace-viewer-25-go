import { atom, useSetAtom, useAtomValue } from "jotai";
import { directoryOpen, fileOpen, supported } from "browser-fs-access";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarShortcut, MenubarTrigger } from "../../../ui/shadcn/menubar";
import { currentFileStateAtom } from "@/store/traces-store/0-1-files-current-state";
import { closeAllFiles, closeFile, closeOtherFiles } from "@/store/traces-store/0-2-files-actions";
import { asyncLoadAnyFiles } from "@/store/traces-store/8-1-load-files";
import { filesCountAtom } from "@/store/6-filtered-files";
import { dialogFileHeaderOpenAtom, dialogAboutOpenAtom, dialogOptionsOpenAtom, dialogEditFiltersOpenAtom, dialogEditHighlightsOpenAtom, dialogBlockLoadFiltersOpenAtom } from "@/store/2-ui-atoms";
import { notice } from "../../../ui/local-ui/7-toaster";

export function TopMenu() {
    const setOptionsOpen = useSetAtom(dialogOptionsOpenAtom);
    const setAboutOpen = useSetAtom(dialogAboutOpenAtom);
    const setEditFiltersOpen = useSetAtom(dialogEditFiltersOpenAtom);
    const setBlockLoadFiltersOpen = useSetAtom(dialogBlockLoadFiltersOpenAtom);
    const setEditHighlightsOpen = useSetAtom(dialogEditHighlightsOpenAtom);

    return (
        <Menubar className="px-2 border-none shadow-none rounded-none bg-transparent">

            <MenubarMenu>
                <MenubarTrigger>
                    File
                </MenubarTrigger>
                <MenubarContent>
                    <MenuItemOpenFile />
                    <MenuItemOpenFolder />
                    <MenubarSeparator />
                    <MenuItemCloseOptions />

                    {/* Exit Menu Item - not implemented yet */}
                    {/* <MenubarSeparator />
                        <MenubarItem disabled>
                            Exit <MenubarShortcut>Ctrl+Q</MenubarShortcut>
                        </MenubarItem> */}
                </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
                <MenubarTrigger>
                    View
                </MenubarTrigger>
                <MenubarContent>
                    <MenubarItem onClick={() => setEditHighlightsOpen(true)}>
                        Highlight Rules...
                        <MenubarShortcut>Alt+R</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem onClick={() => setEditFiltersOpen(true)}>
                        Hidden Files...
                        <MenubarShortcut>Alt+H</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem onClick={() => setBlockLoadFiltersOpen(true)}>
                        Blocked files...
                        <MenubarShortcut>Alt+B</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem onClick={() => setOptionsOpen(true)}>
                        Options...
                        <MenubarShortcut>Ctrl+,</MenubarShortcut>
                    </MenubarItem>
                    <MenubarSeparator />
                    <MenuItemShowFileHeader />
                </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
                <MenubarTrigger>
                    Help
                </MenubarTrigger>
                <MenubarContent>
                    <MenubarItem onClick={() => setAboutOpen(true)}>
                        About
                    </MenubarItem>
                </MenubarContent>
            </MenubarMenu>

        </Menubar>
    );
}

// Menu Items

function MenuItemCloseOptions() {
    const selectedFileId = useAtomValue(currentFileStateAtom)?.id;
    const filesCount = useAtomValue(filesCountAtom);

    return (<>
        <MenubarItem disabled={!selectedFileId} onClick={() => selectedFileId && closeFile(selectedFileId)}>
            Close
        </MenubarItem>
        <MenubarItem disabled={!selectedFileId || filesCount === 1} onClick={() => selectedFileId && closeOtherFiles(selectedFileId)}>
            Close Others
        </MenubarItem>
        <MenubarItem disabled={filesCount === 0} onClick={() => closeAllFiles()}>
            Close All
        </MenubarItem>
    </>);
}

function MenuItemShowFileHeader() {
    const selectedFileId = useAtomValue(currentFileStateAtom)?.id ?? null;
    const setFileHeaderOpen = useSetAtom(dialogFileHeaderOpenAtom);

    return (
        <MenubarItem disabled={!selectedFileId} onClick={() => setFileHeaderOpen(selectedFileId)}>
            File Header...
        </MenubarItem>
    );
}

//#region file and folder open menu items

function MenuItemOpenFile() {
    const openTraceFiles = useSetAtom(openTraceFilesAtom);
    // const { isLoading } = useSnapshot(traceStore);
    return (
        <MenubarItem onClick={() => void openTraceFiles()}>
            Open Files...
            <MenubarShortcut>Ctrl+O</MenubarShortcut>
        </MenubarItem>
    );
}

function MenuItemOpenFolder() {
    const openTraceFolder = useSetAtom(openTraceFolderAtom);
    return (
        <MenubarItem onClick={() => void openTraceFolder()}>
            Open Folder...
            <MenubarShortcut>Ctrl+K Ctrl+O</MenubarShortcut>
        </MenubarItem>
    );
}

function isAbortError(error: unknown) {
    return error instanceof DOMException && error.name === 'AbortError';
}

function ensureChromiumFileAccess() {
    if (supported) {
        return true;
    }

    notice.error('File System Access API is not available in this browser.');
    return false;
}

const openTraceFilesAtom = atom(
    null,
    async () => {
        if (!ensureChromiumFileAccess()) return;

        try {
            const files = await fileOpen({
                description: 'Trace files',
                extensions: ['.trc3', '.zip'],
                multiple: true,
                excludeAcceptAllOption: true,
                id: 'trace-viewer-files',
            });

            if (!files || files.length === 0) return;

            closeAllFiles();
            void asyncLoadAnyFiles(files);
        } catch (error) {
            if (isAbortError(error)) return;
            console.error('Failed to open files', error);
            notice.error('Failed to open files.');
        }
    }
);

const openTraceFolderAtom = atom(
    null,
    async () => {
        if (!ensureChromiumFileAccess()) return;

        try {
            const files = await directoryOpen({
                recursive: false,
                id: 'trace-viewer-folder',
                mode: 'read',
            });

            if (!files || files.length === 0) return;

            closeAllFiles();
            void asyncLoadAnyFiles(files);
        } catch (error) {
            if (isAbortError(error)) return;
            console.error('Failed to open folder', error);
            notice.error('Failed to open folder.');
        }
    }
);

//#endregion file and folder open menu items
