---
name: Trace Timeline Navigation
overview: Implement a "Locate in Timeline" feature that allows users to jump from a specific trace line to its position in the global "All Times" view. This involves adding a hover interaction in the Trace List and auto-scrolling in the All Times panel using Jotai atoms.
todos:
  - id: create-util
    content: Create src/utils/format-timestamp.ts with formatTimestamp function
    status: completed
  - id: update-row
    content: Add data-timestamp to TraceViewRow timestamp column
    status: completed
  - id: update-list
    content: Implement hover icon and click logic in TraceList using Jotai atom
    status: completed
  - id: scroll-effect
    content: Create atomEffect for AllTimesPanel auto-scroll
    status: completed
  - id: update-panel
    content: Wire up scroll effect in AllTimesPanel
    status: completed
---

# Implementation Plan - Trace Timeline Navigation

## 1. Timestamp Utility

Extract the timestamp formatting logic from the worker to be available in the main thread.

- Create [`src/utils/format-timestamp.ts`](src/utils/format-timestamp.ts)
- Implement `formatTimestamp(timestamp, precision)` matching the worker logic (precision 0-5)

## 2. Trace Row Enhancement

Add data attribute for timestamp identification.

- Modify [`src/components/2-trace-viewer/1-trace-view-row.tsx`](src/components/2-trace-viewer/1-trace-view-row.tsx)
- Add `data-timestamp={line.timestamp}` to the timestamp column div (line 38)

## 3. TraceList Hover Icon

Implement hover detection and icon rendering at the TraceList level using Jotai.

- Modify [`src/components/2-trace-viewer/0-trace-view-all.tsx`](src/components/2-trace-viewer/0-trace-view-all.tsx)
- Create a Jotai atom `hoveredTimestampAtom` to store `{ timestamp: string; top: number } | null`
- Add `onMouseMove` handler to detect hover over `[data-timestamp]` elements
- Render ArrowLeft icon positioned absolutely at the hovered row's Y position
- On click:
- Format timestamp using `appSettings.allTimes.precision`
- Call `allTimesStore.setAllTimesSelectedTimestamp(formatted)`

## 4. AllTimesPanel Auto-Scroll (Jotai atomEffect)

Use atomEffect instead of useEffect for scroll behavior.

- Create [`src/store/traces-store/9-all-times-scroll-effect.ts`](src/store/traces-store/9-all-times-scroll-effect.ts)
- Define `allTimesPanelRefAtom` as a primitive atom to store the scroll viewport HTMLElement
- Define `allTimesScrollEffectAtom` using `atomEffect`:
- Subscribe to `allTimesSelectedTimestamp` changes via valtio's `subscribeKey`
- When changed: get ref from `allTimesPanelRefAtom`, find element by `data-timestamp`, check visibility, scroll if needed
- Modify [`src/components/1-file-list/2-all-times-list.tsx`](src/components/1-file-list/2-all-times-list.tsx):
- Add `data-timestamp={item.timestamp}` to each row
- Use `useSetAtom(allTimesPanelRefAtom)` to store ref on mount
- Use `useAtomValue(allTimesScrollEffectAtom)` to activate the effect