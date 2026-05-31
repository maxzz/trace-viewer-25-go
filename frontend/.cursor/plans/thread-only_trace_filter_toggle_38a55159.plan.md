---
name: Thread-only trace filter toggle
overview: Add a per-file toggle in the top toolbar to filter the trace list to only the currently selected thread. The toggle is disabled until a line is selected and its state is preserved per file across back/forward history navigation.
todos:
  - id: fileState-thread-toggle-atom
    content: Add `showOnlySelectedThreadAtom` to `FileState` and initialize it on file creation.
    status: completed
  - id: toolbar-toggle-ui
    content: Add a disabled-when-no-selection `Switch` in `TopMenuToolbar` to toggle per-file thread-only mode.
    status: completed
  - id: traceList-filtering-mapping
    content: Update `TraceList` to build filtered `displayLines` with baseIndex mapping, and adjust virtualization + scroll-to-selection accordingly.
    status: completed
  - id: row-selection-by-baseIndex
    content: Update `TraceRow` to select/click using base index so filtered rows still select the correct underlying line.
    status: completed
  - id: keyboard-nav-filter-aware
    content: Update keyboard navigation to operate over the filtered index set when thread-only mode is enabled.
    status: completed
isProject: false
---

# Thread-only trace filter toggle

## What we’ll change

- Add a **per-file** boolean state (stored on each `FileState`) that enables/disables “show only selected thread”. This naturally persists when selecting files via history because `historyActions.goBack/goForward` re-selects the existing `FileState` object.
- Add a toggle UI in the top toolbar (`TopMenuToolbar`) and disable it when there’s **no selected line**.
- Update `TraceList` rendering + selection/scroll/keyboard navigation so filtering works without breaking existing logic that currently assumes the selection index is based on the *unfiltered* `viewLines` array.

## Key existing code we’ll leverage

- Toolbar location to insert the toggle:

```42:56:c:\y\w\2-web\0-dp\utils\trace-viewer-25\src\components\0-all\1-trace-viewer-app.tsx
function TopMenuToolbar() {
    return (
        <div className="flex-1 px-2 flex items-center justify-between gap-2">
            <div className="flex items-center">
                <ButtonHistoryBack />
                <ButtonHistoryForward />
                <TimelineProgress />
            </div>
            <div className="px-2 flex items-center gap-2">
                <ButtonHighlightToggle />
                <FileFilterDropdown />
                <ButtonThemeToggle />
            </div>
        </div>
    );
}
```

- `TraceList` currently uses `fileData.viewLines` directly and stores selection as an index into that array:

```15:26:c:\y\w\2-web\0-dp\utils\trace-viewer-25\src\components\2-trace-viewer\0-trace-view-all.tsx
export function TraceList() {
    const currentFileState = useAtomValue(currentFileStateAtom);

    // Derived from currentFileState
    const selectedFileId = currentFileState?.id ?? null;
    const fileData = currentFileState?.data;
    const currentLineIdxAtom = currentFileState?.currentLineIdxAtom ?? fallbackLineIndexAtom;
    const viewLines = fileData?.viewLines || [];
    const threadIds = fileData?.uniqueThreadIds || [];
```

- `FileState` is created in the loader; we’ll add a new per-file atom here:

```128:136:c:\y\w\2-web\0-dp\utils\trace-viewer-25\src\store\traces-store\1-1-load-files.ts
function createNewFileState(id: string, data: FileData): FileState {
    return {
        id,
        data, // Placeholder, will update after adding to store
        currentLineIdxAtom: atom(-1),
        matchedFilterIds: [],
        matchedHighlightIds: []
    };
}
```

## Implementation approach (keeps current selection storage)

Because selection is currently stored as a **base index into `fileData.viewLines**`, we’ll avoid changing that representation. Instead we’ll:

- Build a `displayLines` array in `TraceList` that is either:
  - **unfiltered** (all lines), or
  - **filtered** to the selected thread (plus date marker lines per your choice).
- Keep a mapping `baseIndex -> displayIndex` so scrolling can still target the correct position when filtering is enabled.
- Update row rendering so clicks set the **base index**, even when the user clicks a row in the filtered list.
- Update keyboard navigation to navigate over the displayed list but still write the resulting **base index** back to `currentLineIdxAtom`.

## Files we’ll edit

- `[src/store/traces-store/9-types-files-store.ts](c:\y\w\2-web\0-dp\utils\trace-viewer-25\src\store\traces-store\9-types-files-store.ts)`
  - Add `showOnlySelectedThreadAtom: PrimitiveAtom<boolean>` to `FileState`.
- `[src/store/traces-store/1-1-load-files.ts](c:\y\w\2-web\0-dp\utils\trace-viewer-25\src\store\traces-store\1-1-load-files.ts)`
  - Initialize `showOnlySelectedThreadAtom: atom(false)` when creating a new file state.
- `[src/components/0-all/1-trace-viewer-app.tsx](c:\y\w\2-web\0-dp\utils\trace-viewer-25\src\components\0-all\1-trace-viewer-app.tsx)`
  - Add a `Switch`-based toggle component into `TopMenuToolbar`.
  - Disable it when there is no selection (`currentLineIdxAtom === -1`).
- `[src/components/2-trace-viewer/0-trace-view-all.tsx](c:\y\w\2-web\0-dp\utils\trace-viewer-25\src\components\2-trace-viewer\0-trace-view-all.tsx)`
  - Compute `selectedThreadId` from the currently selected base index.
  - Build `displayLines: Array<{ line: TraceLine; baseIndex: number }>`.
  - Use `displayLines` for virtualization + rendering; use `baseIndex` for selection + click.
  - Map base index to display index for `scrollToSelection`.
  - When filtering is enabled, pass `uniqueThreadIds={[selectedThreadId]}` to `TraceRow` so the thread column shows just the active thread.
- `[src/components/2-trace-viewer/1-trace-view-row.tsx](c:\y\w\2-web\0-dp\utils\trace-viewer-25\src\components\2-trace-viewer\1-trace-view-row.tsx)`
  - Change the row’s “selected” check and click handler to use a passed-in `baseIndex` (instead of assuming “display index == base index”).
- `[src/components/2-trace-viewer/3-trace-view-keyboard.ts](c:\y\w\2-web\0-dp\utils\trace-viewer-25\src\components\2-trace-viewer\3-trace-view-keyboard.ts)`
  - If the per-file toggle is enabled and there is a selected line, build the list of allowed base indices (matching thread + date markers) and navigate within that list.

## Filtering rule (per your selection)

- When enabled, show:
  - Lines where `line.threadId === selectedThreadId`
  - Plus date markers (`LineCode.Day` and `LineCode.DayRestarted`) for context

## Test plan

- Load a trace with multiple threads.
- Select a line, enable the toggle → list reduces to that thread (date markers remain).
- Use arrow keys / page up/down → selection moves within filtered lines only.
- Use back/forward history → toggle state is preserved per file.
- Switch to another file → it keeps its own independent toggle state.
- No selection (fresh file) → toggle is disabled.

