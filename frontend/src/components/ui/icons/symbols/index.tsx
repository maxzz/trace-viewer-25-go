// import { UISymbolDefsInject } from "pm-manifest-icons";
// import { DefFieldTypes } from "pm-manifest-icons/src/symbols/fields";
import { DefAppTypes } from "./app";
import { DefAllOtherTypes } from "./all-other";

// export * from "pm-manifest-icons/src/symbols/fields";
export * from "./app";
export * from "./all-other";

export function UISymbolDefs() {
    return (
        <UISymbolDefsInject>
            {/* {DefFieldTypes()} */}
            {DefAppTypes()}
            {DefAllOtherTypes()}
        </UISymbolDefsInject>
    );
}

import { type ReactNode } from "react";

export function UISymbolDefsInject({ children }: { children: ReactNode; }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" version="1.1"
            id="svgfont" aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
        >
            <defs>
                {children}
            </defs>
        </svg>
    );
}
