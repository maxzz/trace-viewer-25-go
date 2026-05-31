---
name: File Navigation History
overview: Implement file navigation history with back/forward buttons, using jotai atoms for state management, with configurable history limit and proper cleanup on file close operations.
todos:
  - id: create-history-store
    content: Create `src/store/traces-store/0-files-history.ts` with atoms and navigation actions
    status: completed
  - id: add-settings
    content: Add `historyLimit` to `AppSettings` in `1-ui-settings.ts` with default 100
    status: completed
  - id: modify-file-actions
    content: Update `0-files-actions.ts` to integrate with history (add on select, remove on close)
    status: completed
  - id: add-toolbar-buttons
    content: Add back/forward buttons to `TopMenuToolbar` in `1-trace-viewer-app.tsx`
    status: completed
  - id: add-options-ui
    content: Add history limit input to options dialog
    status: completed
---

# File Navigation History Implementation

## Architecture Overview

The navigation history will track file selections as a stack with a current position pointer, similar to browser history.

```mermaid
flowchart LR
    subgraph History["Navigation History State"]
        items["items: string[]"]
        currentIndex["currentIndex: number"]
    end
    
    FileSelection["selectFile()"] -->|"adds to history"| History
    BackBtn["Back Button"] -->|"decrements index"| History
    ForwardBtn["Forward Button"] -->|"increments index"| History
    History -->|"sets current file"| CurrentFile["currentFileStateAtom"]
```

## Files to Modify/Create

### 1. Create History Store: `src/store/traces-store/0-files-history.ts`

New jotai atoms and actions:

- `fileHistoryAtom` - stores `{ items: string[], currentIndex: number }`
- `canGoBackAtom` - derived atom checking if `currentIndex > 0`
- `canGoForwardAtom` - derived atom checking if `currentIndex < items.length - 1`
- `addToHistory(fileId)` - adds file ID, respecting limit
- `goBack()` / `goForward()` - navigation actions
- `removeFromHistory(fileId)` - removes file from history items
- `clearHistory()` - resets history

### 2. Modify Settings: [`src/store/1-ui-settings.ts`](src/store/1-ui-settings.ts)

Add to `AppSettings` interface:

```typescript
historyLimit: number; // Default: 100
```

### 3. Modify File Actions: [`src/store/traces-store/0-files-actions.ts`](src/store/traces-store/0-files-actions.ts)

- In `selectFile()`: call `addToHistory(fileId)` when a file is selected
- In `closeFile()`: call `removeFromHistory(fileId)`
- In `closeOtherFiles()`: remove closed files from history
- In `closeAllFiles()`: call `clearHistory()`

### 4. Add Navigation Buttons: [`src/components/0-all/1-trace-viewer-app.tsx`](src/components/0-all/1-trace-viewer-app.tsx)

Add to `TopMenuToolbar`:

- Back button using `IconChevronLeft` with `rotate-0`
- Forward button using `IconChevronLeft` with `rotate-180`
- Both styled similar to existing toolbar buttons (`ButtonThemeToggle` pattern)
- Disabled state based on `canGoBackAtom`/`canGoForwardAtom`

### 5. Add Settings UI: [`src/components/4-dialogs/1-dialog-options.tsx`](src/components/4-dialogs/1-dialog-options.tsx)

Add input field for history limit under "All times options" or as new section:

```
Navigation options:
[ ] History limit: [100]
```

## Key Implementation Details

- History is a linear array with a position pointer
- When navigating back then selecting a new file, forward history is discarded (browser-like behavior)
- Use a flag to distinguish user selection vs navigation to prevent double-adding during back/forward
- History limit is read from `appSettings.historyLimit` when adding items