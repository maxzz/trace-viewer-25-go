---
name: Multi-file trace viewer
overview: Refactor the trace viewer to support multiple open files with a file list sidebar, keyboard/mouse navigation, error detection, and context menu for file management.
todos:
  - id: refactor-store
    content: Refactor TraceState to support multiple files with files array, selectedFileId, and computed getters
    status: completed
  - id: update-parser
    content: Add errorCount calculation to parseTraceFile function and ParsedTraceData interface
    status: completed
  - id: create-file-list
    content: Create file list component with ScrollArea, keyboard navigation, and file item rendering
    status: completed
    dependencies:
      - refactor-store
  - id: create-file-item
    content: Create file list item component with error indicators, selection state, and context menu
    status: completed
    dependencies:
      - refactor-store
      - update-parser
  - id: update-layout
    content: Update TraceMainView to two-column layout with file list on left and trace content on right
    status: completed
    dependencies:
      - create-file-list
  - id: update-file-loading
    content: Update file uploader and drag-drop handlers to support multiple file selection
    status: completed
    dependencies:
      - refactor-store
  - id: update-components
    content: Update all components (TraceList, TraceFooter, DialogFileHeader) to use selectedFile from store
    status: completed
    dependencies:
      - refactor-store
  - id: add-keyboard-nav
    content: Implement ArrowUp/Down/Enter/Delete keyboard navigation in file list component
    status: completed
    dependencies:
      - create-file-list
---

# Multi-File Trace Viewer Implementation

## Overview

Transform the single-file trace viewer into a multi-file viewer with a file list sidebar, keyboard/mouse navigation, error detection, and file management via context menu.

## Architecture Changes

### 1. Store Refactoring (`src/store/traces-store/0-state.ts`)

**Current State:**

- Single `TraceState` interface with file data directly in the store
- `loadTrace` replaces the current file

**New State Structure:**

```typescript
interface TraceFile {
    id: string; // Unique ID (e.g., timestamp + filename)
    fileName: string;
    rawLines: TraceLine[];
    viewLines: TraceLine[];
    uniqueThreadIds: number[];
    header: TraceHeader;
    errorCount: number; // Count of lines with code === LineCode.Error
    isLoading: boolean;
    error: string | null; // Parsing error
}

interface TraceState {
    files: TraceFile[]; // Array of open files
    selectedFileId: string | null; // Currently selected file ID
    currentLineIndex: number; // Line index in selected file
    loadTrace: (file: File) => Promise<void>; // Add file to list
    selectFile: (fileId: string) => void; // Switch to file
    closeFile: (fileId: string) => void; // Remove file from list
}
```

**Computed Properties:**

- `selectedFile: TraceFile | null` - Getter for currently selected file
- `lines`, `viewLines`, `header`, etc. - Getters that delegate to `selectedFile`

### 2. File List Component (`src/components/1-trace-viewer/3-file-list/`)

**New Component: `2-file-list.tsx`**

- Left sidebar panel (initial width ~250px) but user should be able to change it. use ResizablePanelGroup component from shadcn folder
- Uses `ScrollArea` from shadcn for scrolling
- Renders list of open files
- Shows file name, error count badge, error icon (errors are lines inside each file contents)
- Highlights selected file
- Supports keyboard navigation (ArrowUp/Down, Enter to select)
- Supports mouse click to select
- Context menu for closing files

**File Item Structure:**

- File name (truncated if too long)
- Error icon (if errorCount > 0)
- Error count badge (if errorCount > 0)
- Visual indicator for selected state

**Keyboard Navigation:**

- ArrowUp/Down: Navigate file list
- Enter: Select focused file
- Delete/Backspace: Close selected file (when focused on list)

**Mouse Navigation:**

- Click file item to select
- Right-click for context menu

### 3. Layout Updates

**`src/components/0-all/3-trace-main-view.tsx`**

- Change from single column to two-column layout:
  - Left: File list (variable width with ResizablePanelGroup, scrollable)
  - Right: Trace content (flex-1, shows selected file)

**`src/components/0-all/1-trace-viewer-app.tsx`**

- Update `hasFile` check to use `files.length > 0`
- Pass selected file data to `TraceMainView`

### 4. Error Detection

**Update `src/store/traces-store/1-parse-trace.ts`:**

- Add `errorCount` calculation in `parseTraceFile`:
  ```typescript
  const errorCount = parser.lines.filter(l => l.code === LineCode.Error).length;
  ```

- Include `errorCount` in returned `ParsedTraceData`

### 5. File Loading Updates

**`src/components/1-trace-viewer/1-trace-uploader.tsx`:**

- Update `handleFileChange` to support `multiple` attribute
- Load all selected files sequentially
- Auto-select the last loaded file

**`src/components/ui/local-ui/6-dnd/8-atoms.tsx`:**

- Update `doSetFilesFrom_Dnd_Atom` to load all dropped files
- Remove warning about "only first file"

**`src/components/0-all/2-top-menu.tsx`:**

- Update file input to allow multiple selection

### 6. Context Menu for File List

**Add to file list item:**

- Right-click shows context menu with:
  - "Close" option (destructive variant)
  - "Close Others" option (close all except this one)
  - "Close All" option

### 7. Component Updates

**`src/components/1-trace-viewer/2-trace-list/2-trace-list.tsx`:**

- Update to read from `selectedFile` instead of direct store properties
- Handle case when no file is selected

**`src/components/0-all/4-trace-footer.tsx`:**

- Update to show selected file's metadata
- Show error count if > 0

**`src/components/4-dialogs/2-dialog-file-header.tsx`:**

- Update to show selected file's header

## Implementation Steps

1. **Refactor Store** - Update `0-state.ts` to multi-file structure
2. **Update Parser** - Add error count to `ParsedTraceData` and `parseTraceFile`
3. **Create File List Component** - Build `3-file-list/2-file-list.tsx` with ScrollArea
4. **Add File List Item Component** - Create `3-file-list-item.tsx` with context menu
5. **Update Layout** - Modify `3-trace-main-view.tsx` to two-column layout
6. **Update File Loading** - Modify uploader and drag-drop to support multiple files
7. **Update Components** - Update all components to use selected file from store
8. **Add Keyboard Navigation** - Implement ArrowUp/Down/Enter/Delete in file list
9. **Test Error Detection** - Verify error counting and display works correctly

## Files to Create/Modify

**Create:**

- `src/components/1-trace-viewer/3-file-list/2-file-list.tsx`
- `src/components/1-trace-viewer/3-file-list/3-file-list-item.tsx`

**Modify:**

- `src/store/traces-store/0-state.ts` - Multi-file store structure
- `src/store/traces-store/1-parse-trace.ts` - Add error count
- `src/components/0-all/3-trace-main-view.tsx` - Two-column layout
- `src/components/0-all/1-trace-viewer-app.tsx` - Update hasFile logic
- `src/components/1-trace-viewer/2-trace-list/2-trace-list.tsx` - Use selectedFile
- `src/components/1-trace-viewer/1-trace-uploader.tsx` - Multiple file support
- `src/components/0-all/2-top-menu.tsx` - Multiple file input
- `src/components/0-all/4-trace-footer.tsx` - Selected file metadata
- `src/components/ui/local-ui/6-dnd/8-atoms.tsx` - Multiple file drag-drop
- `src/components/4-dialogs/2-dialog-file-header.tsx` - Selected file header