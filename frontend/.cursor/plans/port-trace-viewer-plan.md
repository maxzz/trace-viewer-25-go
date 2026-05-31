# Trace Viewer Porting Plan

## 1. Core Business Logic (`src/trace-viewer-core`)
Create a dedicated folder for the porting of C++ logic to TypeScript. This will handle binary file parsing and decryption without UI dependencies.

-   **Types & Constants (`types.ts`)**:
    -   Define `LINECODE` enum (Entry, Exit, Data, Time, etc.).
    -   Define interfaces for `TraceLine`, `TraceHeader`.
    -   Define `FileHeader` structure.

-   **Cryptography (`crypto.ts`)**:
    -   **Variant B**: Port the custom symmetric encryption algorithm from `Utilities.cpp` (`CCryptKeys::Decrypt` / `encrypt` loop).
    -   Implement `CCryptKeys` class to manage the key stack (default key + keys found in `LINECODE::key` records).
    -   *Note*: The RSA private key logic (`AddCryptKey` using `CryptDecrypt`) might be complex to port 1:1 if it relies on Windows CAPI blobs.
        -   *Strategy*: Start with the symmetric decryption logic used for line content. If `LINECODE::key` records are encountered which are encrypted with the public key, we will need to implement the RSA decryption of that session key. The private key is hardcoded in `Utilities.cpp`. I will extract it.

-   **Parsing Logic (`parser.ts`)**:
    -   Implement `TraceParser` class (equivalent to `CAllData` / `GetNextLine`).
    -   Use `DataView` / `Uint8Array` for binary reading.
    -   Implement `SLineHeader` parsing (packed struct: 4 byte ThreadId, 1 byte Code, 2 byte Length).
    -   Implement Resync logic (simplified version of `ResyncFromGetNextLine`).
    -   Build the "Flows" structures: `TimeFlow` (linear time index), `ThreadFlow` (per-thread stack/indentation).

## 2. State Management (`src/store`)
-   Create `trace-store.ts` (using `valtio` or `jotai`).
    -   Actions: `loadFile(file: File)`, `setFilter`, `setSearch`.
    -   State: `lines: TraceLine[]`, `threadFlows`, `metadata` (OS, Version, etc.), `loadingProgress`.

## 3. UI Implementation (`src/components/trace-viewer`)
-   **Main Container (`TraceViewerApp.tsx`)**:
    -   Layout with Sidebar (Thread list/Stats) and Main View.
-   **File Upload**:
    -   Drag & drop zone to load `.trace` files.
-   **Trace List (`TraceList.tsx`)**:
    -   Virtual scroll list (e.g., `react-window` or custom) to handle large trace files efficiently.
    -   Columns: Line #, Time, Thread, Duration, Content (indented).
    -   Rendering of different `LINECODE` types (Entry/Exit brackets, colored errors).
-   **Details/Sidebar**:
    -   File Metadata display (from parsing header).
    -   Filter controls.

## 4. Implementation Steps
1.  **Setup**: Create directories and basic type definitions.
2.  **Crypto**: Implement `decryptBuffer` function (direct port of C++ loop).
3.  **Parser**: Implement binary parser logic (reading headers, iterating lines).
4.  **Store**: Wire up parsing to state.
5.  **UI**: Build the visual components.

