---
name: zip_file_support
overview: Add support for opening .trc3 files contained within ZIP archives via drag-and-drop or file dialog, processed in a Web Worker using `fflate`.
todos:
  - id: install-dep
    content: Install fflate dependency
    status: completed
  - id: create-worker
    content: Create Web Worker types and implementation
    status: completed
    dependencies:
      - install-dep
  - id: create-manager
    content: Create Zip Manager and State Atom
    status: completed
    dependencies:
      - create-worker
  - id: create-overlay
    content: Implement Loading Overlay with delay logic
    status: completed
    dependencies:
      - create-manager
  - id: update-menu
    content: Update Top Menu file input to accept ZIPs
    status: completed
    dependencies:
      - create-manager
  - id: update-dnd
    content: Update Drag and Drop logic to handle ZIPs
    status: completed
    dependencies:
      - create-manager
  - id: integrate-overlay
    content: Integrate Overlay into App component
    status: completed
    dependencies:
      - create-overlay
---

# ZIP File Support with Web Worker

We will integrate ZIP file processing to allow users to open `.trc3` files directly from archives without manual extraction. This will be handled in a background Web Worker using the `fflate` library for performance.

## Architecture

1.  **Web Worker (`src/workers/zip.worker.ts`)**: Handles the CPU-intensive task of decompressing ZIP files. It accepts a `File` object and returns extracted file contents (as ArrayBuffers) for any `.trc3` files found.
2.  **Manager (`src/utils/zip-manager.ts`)**: Interfaces with the worker, manages the "processing" state, and converts the raw buffers back into `File` objects that the existing `traceStore` can consume.
3.  **UI Components**:

    -   Updates `TraceLoadInput` and Drag-and-Drop handlers to accept `.zip` files.
    -   Adds a `ZipLoadingOverlay` that displays an animated icon if processing takes longer than 2 seconds.
    -   Updates the App Title to reflect the ZIP filename.

## Implementation Steps

1.  **Dependencies**: Install `fflate`.
2.  **Type Definitions**: Create `src/workers/zip-worker-types.ts` to define the contract between the main thread and the worker.
3.  **Worker Implementation**:

    -   Create `src/workers/zip.worker.ts`.
    -   Implement unzip logic using `fflate.unzip`.
    -   Filter for `.trc3` files.

4.  **Zip Manager**:

    -   Create `src/utils/zip-manager.ts`.
    -   Implement `extractTracesFromZip(file)` which spawns/reuses the worker.
    -   Manage `isZipProcessing` state.

5.  **State Management**:

    -   Add `isZipProcessingAtom` to `src/store/2-ui-atoms.ts`.

6.  **UI Updates**:

    -   Create `src/components/ui/zip-loading-overlay.tsx` (implements the 2s delay logic).
    -   Add the overlay to `src/components/0-all/0-app.tsx`.
    -   Update `src/components/0-all/2-top-menu.tsx` to accept `.zip` files.
    -   Update `src/components/ui/local-ui/6-dnd/8-atoms.tsx` to handle `.zip` drops, invoke the manager, and set the app title using the ZIP filename.

7.  **Shared Utils**:

    -   Create `src/utils/file-utils.ts` to centralize `isTrc3File` and add `isZipFile`.

## Types for Web Worker

```typescript:src/workers/zip-worker-types.ts
export type ZipWorkerRequest = {
    type: 'EXTRACT';
    file: File;
};

export type ExtractedFile = {
    name: string;
    buffer: ArrayBuffer;
};

export type ZipWorkerResponse =
    | { type: 'SUCCESS'; files: ExtractedFile[] }
    | { type: 'ERROR'; error: string };
```