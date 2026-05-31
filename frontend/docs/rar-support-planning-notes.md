# RAR support — planning Q&A (Trace Viewer)

Date: 2026-02-11  
Repo: `utils/trace-viewer-25`

## Q: How difficult would it be to add support (in addition to ZIP) to open RAR files?

### A (summary)
- **Overall**: **Moderate** for “basic RAR” (single `.rar`, no passwords, no multipart), **high** for “full-featured RAR**” (passwords, multipart, solid archives, RAR5 edge-cases).
- **Reason**: Your app already has a clean ZIP pipeline via a **Web Worker + client wrapper**; the complexity is mostly in getting a reliable **RAR extraction implementation** in the browser (typically WASM-based) and deciding which RAR features you will/won’t support.

### A (what exists today: ZIP)
- **ZIP extraction** happens in a dedicated worker using `fflate`:
  - Worker: `src/workers/zip.worker.ts`
  - Types: `src/workers/zip-worker-types.ts`
  - Client wrapper: `src/workers-client/zip-manager-client.ts`
- **ZIP filtering behavior**: only extracts entries ending with `.trc3` (in worker).
- **Load pipeline** splits by type:
  - Loader: `src/store/traces-store/1-1-load-files.ts` filters `isZipFile()` vs `isTrc3File()` and processes ZIPs first, then loads direct `.trc3`.
- **UI entry points**:
  - File input accepts `.trc3,.zip`: `src/components/0-all/2-top-menu.tsx`
  - Drag-and-drop logic and “unsupported file” messaging references ZIP: `src/components/ui/local-ui/6-dnd/8-dnd-atoms.tsx`
- **Type detection**:
  - `isZipFile()` / `isOurFile()` in `src/workers-client/file-utils.ts`

### A (what would be required for RAR)
Plumbing work (mechanical, low risk):
- Add `isRarFile()` and extend `isOurFile()` in `src/workers-client/file-utils.ts`
- Update file picker `accept` to include `.rar` (`src/components/0-all/2-top-menu.tsx`)
- Update drag-and-drop fallback checks and “unsupported file” message (`src/components/ui/local-ui/6-dnd/8-dnd-atoms.tsx`)
- Extend `asyncLoadAnyFiles()` to also process `.rar` similar to `.zip` (`src/store/traces-store/1-1-load-files.ts`)

Extraction work (main risk / unknowns):
- Add a parallel worker + client wrapper, mirroring ZIP structure:
  - `src/workers/rar.worker.ts`
  - `src/workers/rar-worker-types.ts`
  - `src/workers-client/rar-manager-client.ts`
- Choose a browser-capable RAR extractor library (likely **WASM**). ZIP’s `fflate` cannot extract RAR.
- Decide behavior/limits:
  - No passwords / no multipart (explicitly out of scope for “simplest RAR”)
  - What to do for unsupported RAR variants (error message, toast, etc.)

## Q: What impact will be on webpage size and loading time for the simplest RAR (no passwords, no multipart)?

### A (summary)
- If implemented **lazily** (RAR worker created only when a `.rar` is opened), **initial page load impact should be near-zero**. The added cost is paid only when opening a `.rar`.
- If implemented **eagerly** (RAR code loaded at startup), expect a **meaningful** increase in initial bytes and some extra CPU time for JS parsing / WASM init.

### A (concrete size example)
Using a common WASM-based RAR extractor like `node-unrar-js`:
- Published artifacts (example version `2.0.2`):
  - `dist/js/unrar.wasm`: **~202.73 KB**
  - `dist/js/unrar.js`: **~65.68 KB**
  - Plus small wrappers (a few KB)

Rule of thumb:
- **~250–300 KB of additional raw assets** (before gzip/brotli).
- Over the wire this is typically smaller with compression, but depends on hosting/CDN settings.

### A (runtime/loading characteristics)
Even with lazy-loading, opening a `.rar` adds:
- **One-time fetch** of the JS + WASM assets (unless cached)
- **WASM compile/instantiate cost** (device-dependent; can be noticeable on slower devices)
- **Decompression cost** proportional to archive size/structure

### A (recommended approach)
- Keep RAR support **worker-based** and **on-demand** (mirror the existing ZIP worker approach).
- Avoid “kitchen-sink” archive libs unless needed, as they can be much larger than a RAR-focused WASM module.

