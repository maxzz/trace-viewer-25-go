
// Corresponds to LINECODE::type_t in atl_trace_media.h
export const LineCode = {
    Unknown: 0,
    Entry: 62,         // '>' - Function entry
    Exit: 60,          // '<' - Function exit
    Group: 71,         // 'G' - Thread group
    Data: 68,          // 'D' - Ansi text string
    Error: 69,         // 'E' - Error, as ansi text string
    Time: 84,          // 'T' - Time = HMSM
    Day: 116,          // 't' - Day = MDY
    DayRestarted: 78,  // 'N' - Day_restarted = MDY
    Utf8: 85,          // 'U' - The same as obsolete 'D', but utf8.
    Key: 75,           // 'K' - encryption key for the following lines, encrypted with out Public key.
} as const;

export type LineCode = typeof LineCode[keyof typeof LineCode];

// Corresponds to SLineHeader in Structures.h
// struct SLineHeader //HEADER_STRUCT
// {
// 	ULONG m_ThreadId;
// 	char  m_Code;
// 	WORD  m_StrLength;
// 	BYTE  m_String[1];
// };
// This is the raw header read from the file.
export interface RawLineHeader {
    threadId: number; // 4 bytes
    code: LineCode;   // 1 byte
    length: number;   // 2 bytes
    // string follows immediately
}

export interface TraceLine {
    lineIndex: number; // 0-based index in the file
    fileOffset: number; // Offset in the binary file
    threadId: number;
    code: LineCode;
    length: number;
    content: string;
    indent: number;
    // Derived/Contextual info
    timestamp?: string; // HMSM
    date?: string;      // MDY
    threadName?: string; // From Group lines
    textColor?: string; // Hex color override (e.g. "#FF0000")
}

// For internal flow tracking
export interface TraceLineDescriptor {
    headerOffset: number;
    lineFileNumber: number;
    lineIndent: number;
    threadId: number;
    code: LineCode;
    strLength: number;
}

// File Header

export interface TraceHeader {
    magic: string; // "trace3"
    compiled?: string;
    os?: string;
    servicePack?: string;
    machineName?: string;
    traceVersion?: string;
    fileVersion?: string;
    products?: string[];
    installation?: string;
    dateTime?: string;
    rawText?: string;
}

export const emptyFileHeader: TraceHeader = { magic: '' };
