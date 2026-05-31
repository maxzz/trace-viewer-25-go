---
name: Add Color Highlighting to File Filters
overview: Add color-based highlighting to file list items based on regex filters. Each filter can have an associated Tailwind color, and matched files will be highlighted with that color. Includes a color picker popup, filter matching logic with caching, and a toggle button to enable/disable highlighting.
todos: []
---

# Add Color Highlighting to File Filters

## Overview

Implement color-based highlighting for file list items based on regex filters. Each filter can have an associated Tailwind color, and files matching a filter will be highlighted with that color. The system will cache filter matches for performance.

## Implementation Plan

### 1. Update Data Models

**File: [src/store/1-ui-settings.ts](src/store/1-ui-settings.ts)**

- Add `color?: string` property to `FileFilter` interface (stores Tailwind color name like "red-500", "blue-500")
- Add `highlightEnabled: boolean` to `AppSettings` interface (default: true)
- Update `DEFAULT_SETTINGS` to include `highlightEnabled: true`

**File: [src/store/traces-store/0-state.ts](src/store/traces-store/0-state.ts)**

- Add `matchedFilterIds: string[]` property to `TraceFile` interface (caches which filter IDs match this file)

### 2. Create Color Picker Popup Component

**New File: [src/components/ui/color-picker-popup.tsx](src/components/ui/color-picker-popup.tsx)**

- Create a popup component similar to the screenshot
- Display a grid of 12 color swatches (3 rows × 4 columns)
- Use contrasting Tailwind colors: `red-500`, `blue-500`, `green-500`, `yellow-500`, `purple-500`, `pink-500`, `orange-500`, `cyan-500`, `indigo-500`, `emerald-500`, `violet-500`, `amber-500`
- Include a "transparent" option (no color) as the first swatch
- Each swatch shows a letter indicator (q, w, e, r, t, y, u, i, o, p, a, s)
- Selected color shows a blue border
- Use Popover or similar component for positioning
- Return selected Tailwind color name (e.g., "red-500") or null for transparent

### 3. Update Filter Dialog

**File: [src/components/4-dialogs/4-dialog-edit-filters.tsx](src/components/4-dialogs/4-dialog-edit-filters.tsx)**

- Add a color column to the filter row grid (change from 2 columns to 3: Name, Pattern, Color)
- Add color swatch button next to each filter that opens the color picker popup
- Display selected color as a colored square/indicator
- Update `FilterRow` component to include color selection UI
- Update `Header` component to include "Color" column header
- Update `filterActions.updateFilter` calls to include color updates

### 4. Implement Filter Matching Logic

**File: [src/store/4-file-filters.ts](src/store/4-file-filters.ts)**

- Add `matchFiltersToFiles()` function that:
  - Iterates through all files in `traceStore.files`
  - For each file, tests all filters against `file.fileName`
  - Stores matching filter IDs in `file.matchedFilterIds` array
  - Uses same regex/wildcard logic as `FileList` component
- Add `recomputeFilterMatches()` function that calls `matchFiltersToFiles()`
- Call `recomputeFilterMatches()` when:
  - Filters are added/updated/deleted/reordered
  - Files are added (in `traceStore.loadTrace`)

**File: [src/store/traces-store/0-state.ts](src/store/traces-store/0-state.ts)**

- Import and call `recomputeFilterMatches()` after file is loaded in `loadTrace`
- Initialize `matchedFilterIds: []` in new file creation

### 5. Update File List Row Display

**File: [src/components/1-file-list/1-file-list-row.tsx](src/components/1-file-list/1-file-list-row.tsx)**

- Read `highlightEnabled` from `appSettings`
- Read `matchedFilterIds` from file
- Find the first matching filter with a color from `appSettings.fileFilters`
- Apply background color using Tailwind classes: `bg-{color}` (e.g., `bg-red-500`)
- Only apply highlight if `highlightEnabled` is true
- Ensure highlight works with existing selected/error states (use opacity or border instead of background if needed)

### 6. Add Highlight Toggle Button

**File: [src/components/0-all/3-btn-filters-select.tsx](src/components/0-all/3-btn-filters-select.tsx)**

- Add a new button next to the filter dropdown
- Button shows highlight on/off state (icon or visual indicator)
- Toggles `appSettings.highlightEnabled`
- Use appropriate icon (e.g., highlighter, palette, or eye icon)

### 7. Initialize Filter Matching on App Start

**File: [src/main.tsx](src/main.tsx)** or **File: [src/components/0-all/0-app.tsx](src/components/0-all/0-app.tsx)**

- Call `recomputeFilterMatches()` on app initialization if files exist
- Subscribe to `appSettings.fileFilters` changes to recompute matches

## Data Flow

```
App Start / Filter Change
  ↓
recomputeFilterMatches()
  ↓
For each file: Test all filters → Store matchedFilterIds
  ↓
FileListRow reads matchedFilterIds + highlightEnabled
  ↓
Apply color highlight if enabled
```

## Color Picker Design

- Popup appears on click of color swatch button
- Grid layout: 3 rows × 4 columns (12 colors + transparent = 13 total)
- Each swatch: ~32px × 32px, rounded corners
- Selected state: blue border (2px)
- Transparent option: checkered pattern background
- Position popup relative to trigger button

## Notes

- Filter matching is cached in `matchedFilterIds` for performance
- Only the first matching filter's color is used (filters are tested in order)
- Color names stored as Tailwind class names (e.g., "red-500")
- Highlight can be toggled on/off without recomputing matches