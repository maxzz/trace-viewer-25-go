## Chat transcript (raw)

### User
How difficult would be to add support in addition to zip files ability to open rar files as well.

### Assistant
To gauge difficulty, I’ll quickly inspect how the app currently handles `.zip` (which library, where the parsing happens, and whether it relies on browser-native APIs). Then I’ll map that to what’s required for `.rar` (WASM library, licensing/perf, worker usage) and summarize effort/risk.

### Assistant
I found the current ZIP implementation: it uses `fflate` inside a dedicated web worker (`src/workers/zip.worker.ts`) plus a “manager client” (`src/workers-client/zip-manager-client.ts`) and some UI plumbing. Next I’ll read those files to estimate how easily a parallel RAR worker could fit into the same architecture.

### Assistant
Next I’ll trace the call path from “user selects/drops a file” to “ZIP worker extracts `.trc3`”, because the amount of refactoring needed for RAR depends on whether ZIP is already handled as a pluggable “archive” type or hard-coded as a one-off.

### Assistant
### Difficulty: **moderate** for “basic RAR”, **high** for “full-featured RAR”

Your ZIP support is cleanly isolated behind a worker + client wrapper, so wiring RAR into the app is straightforward. The main difficulty is **RAR itself**: in-browser extraction typically requires a **WASM-based library**, has **format/feature gaps** (RAR4 vs RAR5, solid archives, encryption, multi-volume), and can add **non-trivial bundle size**.

### What you have today (ZIP)
- **Extraction happens in a Web Worker** using `fflate.unzipSync`, filtering only `.trc3` entries:

```1:46:c:\y\w\2-web\0-dp\utils\trace-viewer-25\src\workers\zip.worker.ts
import * as fflate from 'fflate';
import { type ExtractedFile, type ZipWorkerRequest, type ZipWorkerResponse } from './zip-worker-types';

self.onmessage = async function handleZipExtract(e: MessageEvent<ZipWorkerRequest>) {
    const { type, file } = e.data;

    if (type !== 'EXTRACT') {
        return;
    }

    try {
        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        const extractedFiles: ExtractedFile[] = [];

        // Unzip synchronously (inside worker)
        const unzipped = fflate.unzipSync(uint8Array, {
            filter: (file) => {
                // Only extract files ending with .trc3
                return file.name.toLowerCase().endsWith('.trc3');
            }
        });

        for (const [filename, fileData] of Object.entries(unzipped)) {
            // fileData is Uint8Array
            extractedFiles.push({
                name: filename.split('/').pop() || filename, // Use only the base name
                buffer: fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength) as ArrayBuffer
            });
        }

        const response: ZipWorkerResponse = {
            type: 'SUCCESS',
            files: extractedFiles
        };
        self.postMessage(response);

    } catch (error: any) {
        const response: ZipWorkerResponse = {
            type: 'ERROR',
            error: error.message || 'Unknown error during unzip'
        };
        self.postMessage(response);
    }
};
```

- **Load pipeline** explicitly splits ZIP vs `.trc3`:

```21:54:c:\y\w\2-web\0-dp\utils\trace-viewer-25\src\store\traces-store\1-1-load-files.ts
export async function asyncLoadAnyFiles(files: File[], droppedFolderName?: string, filePaths?: string[]) {
    getDefaultStore().set(isLoadingFilesAtom, true);
    allTimesStore.setAllTimes([]);
    try {
        let loadedTrc3FilesCount = 0;
        const zipFiles = files.filter(f => isZipFile(f));
        const trc3Files = files.filter(f => isTrc3File(f));

        // Extract and load files from ZIPs
        for (const file of zipFiles) {
            const result = await extractTracesFromZipInWorker(file);

            if (result.files.length > 0) {
                loadedTrc3FilesCount += result.files.length;
                await loadFilesToStore(result.files);
                setAppTitle(result.files, result.zipFileName);
            }
        }

        // Load .TRC3 files directly
        await loadFilesToStore(trc3Files);
        loadedTrc3FilesCount += trc3Files.length;
        setAppTitle(files, droppedFolderName, filePaths);
        // ...
    } finally {
        getDefaultStore().set(isLoadingFilesAtom, false);
    }
}
```

### What would change to add RAR
**Plumbing work (easy / mechanical):**
- **File-type detection**: extend `isOurFile()` and add `isRarFile()` alongside `isZipFile()` in `src/workers-client/file-utils.ts`.

```1:24:c:\y\w\2-web\0-dp\utils\trace-viewer-25\src\workers-client\file-utils.ts
export function isTrc3File(file: File): boolean {
    return file.name.toLowerCase().endsWith('.trc3');
}

export function isZipFile(file: File): boolean {
    return file.name.toLowerCase().endsWith('.zip') ||
        file.type === 'application/zip' ||
        file.type === 'application/x-zip-compressed';
}

// ...

export function isOurFile(file: File): boolean {
    const name = file.name.toLowerCase();
    return isTrc3Name(name) || isZipName(file, name);
}
```

- **UI file picker**: update `accept=".trc3,.zip"` to include `.rar` in `src/components/0-all/2-top-menu.tsx` (and adjust the drop “unsupported file” message in `src/components/ui/local-ui/6-dnd/8-dnd-atoms.tsx`).
- **Loader**: extend `asyncLoadAnyFiles()` to also filter RARs and call `extractTracesFromRarInWorker()` similarly to ZIP.

**Actual extraction (the hard part):**
- ZIP uses `fflate`; **RAR is not supported by `fflate`**, so you need a **new dependency** (almost certainly **WASM**).
- You’d likely mirror the ZIP structure:
  - `src/workers/rar.worker.ts` (RAR extraction in worker)
  - `src/workers/rar-worker-types.ts`
  - `src/workers-client/rar-manager-client.ts`
  - optional UI atom/overlay (or reuse the ZIP overlay with generalized text)

### Why “basic RAR” is moderate, but “full RAR” gets hard
- **Library choice + licensing**: RAR support is commonly tied to `unrar` implementations with licensing constraints; some JS/WASM libraries support only subsets.
- **Feature gaps** you need to decide on up front:
  - **Password-protected RARs**: you currently have no password prompt flow.
  - **Multi-volume RARs** (`part1.rar`, `part2.rar`): your current worker API takes a single `File`.
  - **RAR5 / solid archives**: may or may not be supported depending on library; solid archives can be slow/memory-heavy.
- **Perf/memory**: most browser RAR libs decompress into memory; large archives could spike RAM (even though you filter to `.trc3`, many extract APIs still need to scan or decompress more than just metadata).

### Rough effort estimate (based on your current structure)
- **Basic support** (single `.rar`, not encrypted, not multi-volume, extract only `.trc3`): **~0.5–2 days**
  - Most time goes to picking a RAR WASM library and making it bundle cleanly with Vite + worker.
- **Robust support** (RAR5 + encrypted + multi-volume + better progress/errors): **~1–2+ weeks** depending on UX requirements and library limitations.

If you tell me what scope you want (e.g., “only simple `.rar` without passwords is fine” vs “must support password + multi-part”), I can recommend the safest library approach and outline exactly where each change lands in this repo.

### User
What impact will be on the webpage size and loading time. We are talking about simplest rar file, i.e. without passwords and without multiparts support.

### Assistant
I’ll look up typical in-browser RAR (WASM) library sizes and then map that to how your Vite + worker setup would affect **initial bundle size** vs **on-demand load** when a user actually opens a `.rar`.

### Assistant
Next I’ll pull the actual published artifact list for a common “simple RAR” WASM library (like `node-unrar-js`) so we can talk in concrete KB/MB numbers, not guesses.

### Assistant
### Expected size impact (for “simple RAR”, no passwords, no multi-part)
Using a common in-browser RAR WASM extractor like `node-unrar-js`, the added artifacts are roughly:

- **`unrar.wasm`**: ~**203 KB** (uncompressed as published)
- **`unrar.js`** core glue: ~**66 KB** (+ a few small wrapper modules)

So you’re typically looking at **~250–300 KB extra raw assets**. With **Brotli/Gzip** on your host/CDN, the **transfer size is usually materially smaller** (WASM compresses reasonably well), but the exact savings depend on your hosting.

### Expected load-time impact
It depends almost entirely on *when* you load it.

- **Best case (recommended): on-demand only when a `.rar` is opened**
  - **Initial page size/LCP**: **near-zero impact** (RAR code isn’t fetched)
  - When user opens a `.rar`: you pay an extra fetch + WASM compile/instantiate cost.
  - **Typical user-perceived cost**: small, but on slower devices the WASM instantiate/compile can be noticeable (think tens to a couple hundred ms), *plus* the decompression work itself (which scales with archive size).

- **Worst case: bundled into the initial app load**
  - **Initial download**: +~**250–300 KB** raw assets (less over the wire with compression)
  - **Main-thread cost**: additional JS parsing + module init; if the WASM is eagerly instantiated, that can also add noticeable CPU time up front.

### How this maps to your current architecture
Your ZIP extraction is already **lazy** (worker created only when needed) via `extractTracesFromZipInWorker()` in `src/workers-client/zip-manager-client.ts`. If RAR is implemented the same way (RAR worker created only when a `.rar` is detected), then **normal page loads don’t get heavier**—only “open RAR” does.

### Practical takeaway
- **If you keep RAR support fully lazy + in a worker**, expect **minimal/no change to initial page loading time**, with an **extra ~1–2 network requests** and **some WASM init time** only when a `.rar` is opened.
- **If you choose a broader library (e.g., `libarchive-wasm`)** instead of a RAR-focused one, size can jump from **hundreds of KB to multiple MB**, which *will* start to affect initial load if not carefully lazy-loaded.

If you tell me how you deploy (GitHub Pages? custom server? do you serve Brotli?), I can translate the ~250–300 KB raw into a more realistic “over-the-wire” impact for your setup.

### User
Save this chat as md file in folder @docs with questions and answers as it can be used later for planing.

### Assistant
I’ll check whether `docs/` exists in the repo, then I’ll write a single Markdown note capturing the questions + the concrete answers (including the key code locations and size numbers) so you can reuse it for planning.

### Assistant
Now I’ll add a Markdown file under `docs/` summarizing the Q&A with the concrete findings (current ZIP architecture, what changes RAR needs, and the realistic size/load impact for a simple WASM-based RAR extractor).

### Assistant
### Saved
- **File**: `docs/rar-support-planning-notes.md`
- **Contents**: The full Q&A from this chat (difficulty/architecture + page-size & load-time impact for simplest RAR), with relevant repo file paths and concrete example size numbers.

### User
Can you save this chat as md file as it is to detailed motivations that lead to answers?

### Assistant
I’ll save a second Markdown file under `docs/` that captures the chat in a near-verbatim transcript style (questions, answers, and the investigation “why” behind them, including which repo files and web sources were consulted).

### Assistant
### Saved
- **Transcript file**: `docs/rar-support-chat-transcript.md`  
- **(Earlier) summary file**: `docs/rar-support-planning-notes.md`

