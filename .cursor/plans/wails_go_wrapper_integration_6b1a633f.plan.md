---
name: Wails Go Wrapper Integration
overview: Reorganize the repository by separating the Wails Go application (wrapper) and the Trace Viewer React application (frontend). Configure Wails to use the top-level frontend directory, enable safe DevTools toggling, and create root package.json and .gitignore files.
todos:
  - id: create-dirs
    content: Create wrapper and frontend directories
    status: completed
  - id: copy-frontend
    content: Copy trace-viewer-25 contents to frontend/ directory
    status: completed
  - id: copy-wrapper
    content: Copy to-diag-trace-go contents to wrapper/ directory
    status: completed
  - id: create-placeholder-html
    content: Create placeholder index.html in wrapper/frontend/dist/
    status: completed
  - id: configure-wails-json
    content: Configure wrapper/wails.json with custom frontend path and wailsjsdir
    status: completed
  - id: create-wails-mock
    content: Create safe Wails JS mock files in frontend/src/wailsjs
    status: completed
  - id: integrate-devtools-shortcut
    content: Integrate DevTools toggle key listener in frontend global shortcuts
    status: completed
  - id: create-root-files
    content: Create root package.json and .gitignore files
    status: completed
isProject: false
---

# Wails Go Wrapper with Trace Viewer Frontend Integration

We will restructure the project into two distinct subdirectories: `frontend` (containing the Trace Viewer React application) and `wrapper` (containing the Go/Wails backend). We will then configure Wails to build and watch the top-level `frontend` directory, ensure the frontend can run independently in standard web browsers, and write root-level scripts for ease of orchestration.

## Reorganization and Directory Structure

We will create two main directories in the root:
- `frontend`: Contains the source code of the `trace-viewer-25` React web application.
- `wrapper`: Contains the Go/Wails files from `to-diag-trace-go` (excluding its inner `frontend` directory).

```
trace-viewer-25-go/
├── .gitignore
   ├── package.json
   ├── frontend/            <-- Contains trace-viewer-25 React application
   │   ├── src/
   │   │   ├── wailsjs/     <-- Generated Wails JS bindings (safe dummy files initially)
   │   │   └── ...
   │   └── package.json
   └── wrapper/             <-- Contains Go / Wails code
       ├── main.go
       ├── app.go
       ├── wails.json
       ├── frontend/
       │   └── dist/        <-- Embedded folder with build output / placeholder
       └── ...
```

## Step-by-Step Action Plan

### 1. Copy Trace Viewer to Frontend
We will copy all files and folders from `C:\y\w\2-web\0-dp\trace-viewer-25` to the `frontend/` directory, excluding `node_modules/` and `.git/`.

### 2. Copy Wails Go Backend to Wrapper
We will copy files and folders from `C:\y\w\2-web\0-dp\utils\to-diag-trace-go` to the `wrapper/` directory, excluding `frontend/`, `node_modules/`, and `.git/`.

### 3. Setup Go Embed Compatibility
Go's `//go:embed` directive cannot reference parent directories (i.e. `../frontend/dist` is not allowed). To satisfy this constraint, we will keep the `//go:embed all:frontend/dist` directive in `[wrapper/main.go](wrapper/main.go)`.
- We will create `wrapper/frontend/dist` as a local subdirectory of the Go code.
- We will place a dummy `index.html` inside `wrapper/frontend/dist/` so that Go successfully compiles even before the first frontend build runs.
- During `wails build` and `wails dev`, Wails automatically copies the built frontend files from the custom frontend directory to `wrapper/frontend/dist` before compiling Go.

### 4. Configure Wails Config
We will update `[wrapper/wails.json](wrapper/wails.json)` to point to the top-level frontend folder and configure the target folder for generated JS bindings:
- `"frontend:dir": "../frontend"`
- `"wailsjsdir": "../frontend/src/wailsjs"`
- `"frontend:install": "pnpm install"`
- `"frontend:build": "pnpm run build"`
- `"frontend:dev:watcher": "pnpm run dev"`

### 5. Create Safe Wails Bindings Mock for Browser Independence
To allow the frontend to compile and run independently of Go in a standard web browser (without missing imports or runtime crashes), we will create safe, placeholder mock files:
- `[frontend/src/wailsjs/go/main/App.d.ts](frontend/src/wailsjs/go/main/App.d.ts)`:
  ```typescript
  export function ToggleDevTools(): Promise<void>;
  ```
- `[frontend/src/wailsjs/go/main/App.js](frontend/src/wailsjs/go/main/App.js)`:
  ```javascript
  export function ToggleDevTools() {
      if (window && window["go"] && window["go"]["main"] && window["go"]["main"]["App"]) {
          return window["go"]["main"]["App"]["ToggleDevTools"]();
      }
      return Promise.resolve();
  }
  ```

### 6. Integrate DevTools Toggling into Frontend Shortcuts
We will update `[frontend/src/components/4-dialogs/0-global-shortcuts.tsx](frontend/src/components/4-dialogs/0-global-shortcuts.tsx)` to handle F12 and Ctrl+Shift+I globally:
- We will import `ToggleDevTools` from `@/wailsjs/go/main/App`.
- Under the global keydown event handler, we will detect if F12 or Ctrl+Shift+I is pressed, and call `ToggleDevTools().catch(console.error)`. Because of the mock, this will execute safely in both browser and Wails environments.

### 7. Create Root Orchestration Files
- **package.json**: Contains scripts to easily run or build either project:
  - `"dev"`: Runs the React frontend standalone (`pnpm --prefix frontend dev`)
  - `"dev:go"`: Runs the full Go/Wails development environment (`pnpm --prefix wrapper run dev`)
  - `"build"`: Compiles the React frontend standalone (`pnpm --prefix frontend build`)
  - `"build:go"`: Compiles the Go application (`pnpm --prefix wrapper run build`)
- **.gitignore**: Ignores dependencies, standalone build outputs, and Go executables:
  ```
  node_modules/
  dist/
  /frontend/dist/
  /frontend/src/wailsjs/
  /wrapper/frontend/dist/
  /wrapper/build/bin/
  /wrapper/to-diag-trace-go
  /wrapper/to-diag-trace-go.exe
  /wrapper/to-diag-trace-go-*.exe
  *.test
  *.exe
  .DS_Store
  ```
