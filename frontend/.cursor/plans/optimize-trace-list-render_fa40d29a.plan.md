---
name: optimize-trace-list-render
overview: Optimize TraceList rendering by isolating selection state to individual rows and moving scroll logic to a separate component, preventing full list re-renders on selection changes.
todos:
  - id: update-trace-row
    content: Modify TraceRow to accept atom and use selectAtom for localized updates
    status: completed
  - id: update-trace-list
    content: Extract scroll logic to TraceViewScrollController and update TraceList to pass atom
    status: completed
    dependencies:
      - update-trace-row
---

# Optimize TraceList Rendering

To prevent the entire `TraceList` from re-rendering when the selected line changes, we will:

1.  Update `TraceRow` to subscribe to the selection state individually using `selectAtom`.
2.  Isolate the scroll-to-selection logic into a separate component so the main list doesn't subscribe to the current line index value.

## Proposed Changes

### 1. Update `TraceRow` Component

[src/components/2-trace-viewer/1-trace-view-row.tsx](src/components/2-trace-viewer/1-trace-view-row.tsx)

-   Change props to accept `currentLineIdxAtom` (Atom) instead of `currentLineIndex` (number).
-   Use `selectAtom` and `useAtomValue` to determine if the specific row is selected.
    -   This ensures only the previously selected row and the new selected row re-render.
-   Update `onClick` to set the atom value directly.

### 2. Update `TraceList` Component

[src/components/2-trace-viewer/0-trace-view-all.tsx](src/components/2-trace-viewer/0-trace-view-all.tsx)

-   Remove the subscription to `currentLineIdxAtom`'s value (remove `useAtomValue`).
-   Pass the `currentLineIdxAtom` object to `TraceRowMemo`.
-   Extract the `scrollToSelection` effect into a new helper component (e.g., `TraceViewScrollController`) inside the same file.
    -   This component will subscribe to the atom and handle scrolling.
    -   This prevents the main `TraceList` from re-rendering when selection changes (unless a scroll occurs).

## Verification

-   Verify that clicking a row updates the selection highlighting.
-   Verify that using keyboard navigation updates selection and scrolls.
-   Verify that `TraceList` does not re-render unnecessarily (can be checked conceptually or with React DevTools if available, but primarily via code structure).