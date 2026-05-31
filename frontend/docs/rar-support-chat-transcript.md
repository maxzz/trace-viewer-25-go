# Chat transcript — RAR support discussion (verbatim-style)

Date: 2026-02-11  
Repo: `utils/trace-viewer-25`

> Goal of this note: preserve the original Q&A *including the motivations and investigation steps* that led to the conclusions, so it can be reused for planning later.

---

## User
How difficult would be to add support in addition to zip files ability to open rar files as well.

## Assistant
To gauge difficulty, I’ll quickly inspect how the app currently handles `.zip` (which library, where the parsing happens, and whether it relies on browser-native APIs). Then I’ll map that to what’s required for `.rar` (WASM library, licensing/perf, worker usage) and summarize effort/risk.

### Motivation / evidence gathered
- Searched repo for ZIP/RAR mentions and found:
  - `fflate` dependency in `package.json`
  - ZIP worker and client wrapper:
    - `src/workers/zip.worker.ts`
    - `src/workers-client/zip-manager-client.ts`
    - `src/workers/zip-worker-types.ts`
  - UI accepts `.trc3,.zip` in `src/components/0-all/2-top-menu.tsx`
  - File-type helpers in `src/workers-client/file-utils.ts`
  - ZIP overlay in `src/components/ui/local-ui/zip-loading-overlay.tsx`
  - Loader path in `src/store/traces-store/1-1-load-files.ts`

### What I saw in code (key points)
- ZIP extraction is isolated in a worker using `fflate.unzipSync` and filters entries to `.trc3`:
  - `src/workers/zip.worker.ts`
- The main-thread client creates/reuses the worker instance and toggles a loading atom:
  - `src/workers-client/zip-manager-client.ts`
- The loader splits files by `isZipFile` vs `isTrc3File` and processes ZIPs first:
  - `src/store/traces-store/1-1-load-files.ts`
- File type gating is centralized:
  - `src/workers-client/file-utils.ts` has `isZipFile()` and `isOurFile()`

### Answer (difficulty estimate)
- **Moderate** for “basic RAR”: single `.rar`, no password, no multipart.
  - Because the app already has a clear “archive extraction in worker → list of `.trc3` files → load pipeline” architecture; adding a parallel RAR worker/client is mechanically similar to the ZIP path.
- **High** for “full RAR”:
  - The difficulty is not the UI plumbing; it’s RAR’s constraints in the browser:
    - in practice you need a **WASM-based extractor**
    - support varies across RAR4/RAR5, “solid” archives, encryption, and multi-volume sets

---

## User
What impact will be on the webpage size and loading time. We are talking about simplest rar file, i.e. without passwords and without multiparts support.

## Assistant
I’ll look up typical in-browser RAR (WASM) library sizes and then map that to how your Vite + worker setup would affect **initial bundle size** vs **on-demand load** when a user actually opens a `.rar`.

### Motivation / evidence gathered
I used web lookups to avoid guessing sizes:
- Looked for common browser-capable RAR extractors and checked published artifacts.
- Used `node-unrar-js` as a concrete example (RAR extractor compiled via Emscripten, includes `unrar.wasm`).

Concrete artifact listing for `node-unrar-js@2.0.2`:
- jsDelivr directory listing for `dist/js/` shows:
  - `unrar.wasm` ≈ **202.73 KB**
  - `unrar.js` ≈ **65.68 KB**
  - plus small wrappers/typings

Sources (directory listings):
- `https://cdn.jsdelivr.net/npm/node-unrar-js@2.0.2/dist/js/`
- `https://app.unpkg.com/node-unrar-js@2.0.2`

Also checked Vite behavior at a high level:
- Vite generally bundles workers separately; code sharing between main and worker bundles can be limited, and worker dependencies may be duplicated rather than shared.

### Answer (impact on size/loading)
- **Raw additional assets** for simple RAR support (example library): ~**250–300 KB** (WASM + JS glue) before compression.
- **Initial page load impact depends on loading strategy**:
  - **Recommended (lazy / on-demand in a worker)**:
    - Near-zero impact on initial page load: RAR code isn’t fetched until a `.rar` is opened.
    - When opening a `.rar`, you pay:
      - extra network fetch(es) for WASM/JS (then cached)
      - WASM instantiate/compile time (device-dependent)
      - decompression time (depends on archive size/structure)
  - **Not recommended (eager / bundled into initial load)**:
    - Increased initial download + extra startup CPU cost.

### Why “simple RAR” is still not “trivial”
Even with passwords/multipart out of scope:
- RAR extraction in-browser still typically means WASM.
- You need to handle:
  - unsupported RAR variants gracefully
  - potentially large memory usage during decompression (even if you filter to `.trc3`)

---

## User
Save this chat as md file in folder @docs with questions and answers as it can be used later for planing.

## Assistant
Created `docs/` at repo root and saved a planning summary:
- `docs/rar-support-planning-notes.md`

---

## User
Can you save this chat as md file as it is to detailed motivations that lead to answers?

## Assistant
Saved this transcript-style note (this file):
- `docs/rar-support-chat-transcript.md`

