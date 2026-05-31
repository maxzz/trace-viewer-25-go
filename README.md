# Trace Viewer 25 with Go/Wails Wrapper

A high-performance diagnostic trace visualizer combining a modern, interactive React frontend (`trace-viewer-25`) with a native Go/Wails wrapper (`to-diag-trace-go`) for OS-level integration and features.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development and Debugging](#development-and-debugging)
  - [Standalone Frontend (Web Browser)](#1-standalone-frontend-web-browser)
  - [Full Go Wrapper Application](#2-full-go-wrapper-application)
- [Building for Production](#building-for-production)
  - [Standalone Frontend](#1-standalone-frontend)
  - [Full Go Desktop Application](#2-full-go-desktop-application)
- [Script Utilities](#script-utilities)
- [Safe Mock Bindings (Browser Independence)](#safe-mock-bindings-browser-independence)

---

## Project Structure

```text
trace-viewer-25-go/
├── .gitignore
├── package.json             # Root package script coordinator
├── README.md                # This documentation
├── frontend/                # Trace Viewer React application
│   ├── src/
│   │   ├── wailsjs/         # Generated Wails JS bindings (with browser-safe mocks)
│   │   └── ...
│   └── package.json
├── wrapper/                 # Wails Go project application (backend)
│   ├── main.go
│   ├── app.go
│   ├── wails.json           # Wails configuration
│   └── frontend/
│       └── dist/            # Assets folder copied from frontend/dist and embedded in Go
└── scripts/                 # Consolidated build and helper utility scripts
    ├── copy-dist.js         # Copies built assets from frontend to wrapper
    ├── build.sh             # Builds the full application
    ├── build-windows.sh     # Cross-compiles for Windows AMD64
    └── ...
```

---

## Prerequisites

Ensure you have the following tools installed:

* **Node.js** (v18+) & **pnpm** (v9+)
* **Go** (v1.22+)
* **Wails CLI** (v2+)
  * Install via: `go install github.com/wailsapp/wails/v2/cmd/wails@latest` (or run `./scripts/install-wails-cli.sh`)

---

## Installation

Install all node dependencies for the root, frontend, and wrapper directories in one command:

```bash
pnpm run install:all
```

---

## Development and Debugging

### 1. Standalone Frontend (Web Browser)
To run the React frontend alone in a local web browser with Hot Module Replacement (Vite):
```bash
pnpm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Since safe JS/TS mock files are implemented, the application will not crash in standard browser environments.

### 2. Full Go Wrapper Application
To run the complete application inside the native OS window with full Go integration and real-time backend updates:
```bash
pnpm run dev:go
```

---

## Building for Production

### 1. Standalone Frontend
Builds the standalone React application to `frontend/dist/`:
```bash
pnpm run build
```

### 2. Full Go Desktop Application
To build the fully native executable (this automatically builds the React frontend first, copies production assets into Go's embedding folder, and compiles the Go code):

```bash
# Build for your current platform
pnpm run build:go

# Specifically cross-compile for Windows AMD64
pnpm run build:go:windows

# Compile for all configured target platforms
pnpm run build:go:all
```

Compiled executables will be output to `wrapper/build/bin/`.

---

## Script Utilities

All scripts are located in the top-level `scripts/` directory:

* `scripts/copy-dist.js`: Automatically called during the `postbuild` phase of the frontend to copy static assets into `wrapper/frontend/dist/` for embedding.
* `scripts/build.sh`: Runs a default `wails build --clean` in the wrapper.
* `scripts/build-windows.sh`: Builds for Windows AMD64.
* `scripts/build-macos.sh`: Builds a macOS universal app.
* `scripts/build-macos-intel.sh` / `scripts/build-macos-arm.sh`: Target specific Apple architectures.
* `scripts/install-wails-cli.sh`: Installs or updates the Wails CLI command line tool.

---

## Safe Mock Bindings (Browser Independence)

Wails generates JavaScript bindings for Go functions on-demand. To ensure that importing these bindings in `frontend/` does not break the standalone browser development mode, the bindings inside `frontend/src/wailsjs/go/main/App.js` utilize runtime checks:

```javascript
export function ToggleDevTools() {
  if (window && window["go"] && window["go"]["main"] && window["go"]["main"]["App"]) {
    return window["go"]["main"]["App"]["ToggleDevTools"]();
  }
  return Promise.resolve();
}
```

This guarantees seamless execution both as a browser tab and as a desktop wrapper!
