---
name: Add Dark/Light Mode Toggle
overview: Add a moon/sun toggle button in the top menu toolbar to switch between dark and light modes. Store the theme preference in appSettings and persist it to localStorage. Apply the theme on app load and when it changes.
todos: []
---

# Add Dark/Light Mode Toggle

## Overview

Add dark/light mode support with a toggle button in the top menu toolbar. The theme preference will be stored in `appSettings` and persisted to localStorage. The implementation follows the pattern from the referenced `win-mon-copy` project.

## Implementation Steps

### 1. Update AppSettings interface and state

- **File**: [`src/store/ui-settings.ts`](src/store/ui-settings.ts)
- Add `theme: ThemeMode` to `AppSettings` interface
- Import `ThemeMode` from `@/utils/theme-apply`
- Add `theme: 'light'` to `DEFAULT_SETTINGS`
- Apply theme on initial load: call `themeApplyMode(appSettings.theme)` after creating the proxy
- Subscribe to theme changes: add a `subscribe` listener for `appSettings.theme` that calls `themeApplyMode`

### 2. Create theme utility functions

- **File**: [`src/utils/theme-utils.ts`](src/utils/theme-utils.ts) (new file)
- Create `isThemeDark(theme: ThemeMode): boolean` - returns true if theme is dark or system prefers dark
- Create `toggleTheme(theme: ThemeMode): void` - toggles between dark/light (if system, switches to opposite of system preference)
- Create `getIsSystemDark(): boolean` - checks system preference
- Export these functions

### 3. Create moon and sun icon components

- **File**: [`src/components/ui/icons/normal/30-1-theme-moon.tsx`](src/components/ui/icons/normal/30-1-theme-moon.tsx) (new file)
- Create `IconThemeMoon` component with moon SVG (from referenced project)
- **File**: [`src/components/ui/icons/normal/30-2-theme-sun.tsx`](src/components/ui/icons/normal/30-2-theme-sun.tsx) (new file)
- Create `IconThemeSun` component with sun SVG (from referenced project)
- **File**: [`src/components/ui/icons/normal/index.tsx`](src/components/ui/icons/normal/index.tsx)
- Export the new icon components

### 4. Create theme toggle button component

- **File**: [`src/components/0-all/3-btn-theme-toggle.tsx`](src/components/0-all/3-btn-theme-toggle.tsx) (new file)
- Create `ButtonThemeToggle` component
- Use `useSnapshot` to read `appSettings.theme`
- Use `isThemeDark` to determine current state
- Use `toggleTheme` on click
- Show moon icon when dark, sun icon when light
- Use Button component from shadcn with ghost variant and icon size

### 5. Add toggle button to toolbar

- **File**: [`src/components/0-all/2-top-menu-toolbar.tsx`](src/components/0-all/2-top-menu-toolbar.tsx)
- Import `ButtonThemeToggle`
- Replace placeholder with the button component
- Add appropriate styling/layout

### 6. Export theme utilities

- **File**: [`src/utils/index.ts`](src/utils/index.ts)
- Add export for `theme-utils` module

## Key Implementation Details

- Theme state is stored in `appSettings.theme` (not a separate ThemeProvider)
- Theme is automatically persisted to localStorage via existing valtio `subscribe` mechanism
- Theme is applied using `themeApplyMode` which adds/removes the `dark` class on `document.documentElement`
- The toggle button switches between dark and light modes (no system mode toggle in the button, just dark/light)
- Icons match the style from the referenced project (lucide-style SVG icons)