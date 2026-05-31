import { type HTMLAttributes, type SVGAttributes } from "react";

export function SvgSymbolCheckerboard() {
    return (<>
        <symbol id="icon-checkerboard" viewBox="0 0 24 24">
            <defs>
                <pattern id="pattern-checkerboard" width="8" height="8" patternUnits="userSpaceOnUse">
                    <path d="M0 0h4v4H0zm4 4h4v4H4z" />
                </pattern>
            </defs>
            <rect width="24" height="24" fill="url(#pattern-checkerboard)" />
        </symbol>
    </>);
}

export function SymbolCheckerboard({ title, children, ...rest }: SVGAttributes<SVGSVGElement> & HTMLAttributes<SVGSVGElement>) {
    return (
        <svg fill="currentColor" {...rest}>
            {title && <title>{title}</title>}
            {children}
            <use xlinkHref="#icon-checkerboard" />
        </svg>
    );
}
