# ZIP Archive Support for Trace Viewer

## ZIP Library Comparison

| Library | Bundle Size | Performance | TypeScript | Web Worker Support | Notes |
|---------|-------------|-------------|------------|-------------------|-------|
| **fflate** | ~30KB | Fastest | Native | Excellent | Modern, streaming support |
| JSZip | ~100KB | Good | DefinitelyTyped | Yes | Most popular, mature |
| zip.js | ~150KB | Good | Native | Built-in | Full-featured, encryption |
| pako | ~25KB | Fast | DefinitelyTyped | Yes | Low-level, no ZIP parsing |

**Recommendation: `fflate`** - Offers the best balance of performance (uses WASM where available), small bundle size, native TypeScript types, and excellent Web Worker compatibility. Its modern API makes it ideal for async operations in workers.

## Architecture

```mermaid
flowchart TD
subgraph UI [UI Layer]
DnD[Drag and Drop]
FileDialog[File Open Dialog]
LoadingIndicator[Delayed Loading Spinner]
end

subgraph MainThread [Main Thread]
ZipHandler[ZIP File Handler]
TraceStore[Trace Store]
AppTitle[App Title Manager]
end

subgraph Worker [Web Worker]
ZipWorker[zip-worker.ts]
FFLate[fflate decompress]
end

DnD --> ZipHandler
FileDialog --> ZipHandler
ZipHandler -->|"postMessage(zipArrayBuffer)"| ZipWorker
ZipWorker --> FFLate
FFLate -->|".trc3 files as ArrayBuffers"| ZipWorker
ZipWorker -->|"postMessage(result)"| ZipHandler
ZipHandler --> TraceStore
ZipHandler --> AppTitle
ZipHandler -->|"show after 2s"| LoadingIndicator