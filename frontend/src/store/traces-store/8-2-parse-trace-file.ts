import { asyncParseTraceInWorker } from "@/workers-client/parse-trace-client";

export type { ParsedTraceData } from "@/workers/parse-trace-worker-types";

export async function asyncParseTraceFile(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    return asyncParseTraceInWorker(arrayBuffer);
}
