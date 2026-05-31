import { type HTMLAttributes, type SVGAttributes } from "react";
import { classNames } from "@/utils";

export function SvgSymbolSpinner() {
    // 3/4 circle arc (270 degrees) using SVG arc path
    // Circle center at 12,12 with radius 10
    // Start at top (12,2), sweep 270 degrees clockwise
    return (
        <symbol id="spinner" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M12 2 A10 10 0 1 1 2 12" />
        </symbol>
    );
}

export function SymbolSpinner({ className, title, children, ...rest }: SVGAttributes<SVGSVGElement> & HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} {...rest}>
            {title && <title>{title}</title>}
            {children}
            <use xlinkHref="#spinner" />
        </svg>
    );
}
