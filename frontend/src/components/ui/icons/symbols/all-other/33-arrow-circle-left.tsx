import { type HTMLAttributes, type SVGAttributes } from "react";
import { classNames } from "@/utils";

export function SvgSymbolArrowCircleLeft() {
    return (<>
        <symbol id="icon-arrow-circle-left" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8l-4 4 4 4" />
            <path d="M16 12H8" />
        </symbol>
    </>);
}

export function SymbolArrowCircleLeft({ className, children, title, ...rest }: SVGAttributes<SVGSVGElement> & HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current stroke-[1.5]", className)} strokeLinecap="round" strokeLinejoin="round" {...rest}>
            {title && <title>{title}</title>}
            {children}
            <use xlinkHref="#icon-arrow-circle-left" />
        </svg>
    );
}
