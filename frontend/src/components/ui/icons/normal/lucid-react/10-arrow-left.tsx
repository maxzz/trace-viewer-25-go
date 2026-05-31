import { type HTMLAttributes } from "react"; //https://lucide.dev/icons/arrow-left
import { classNames } from "@/utils";

export function IconL_ArrowLeft({ className, title, ...rest }: HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current stroke-2", className)} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <path d="m12 19-7-7 7-7"/>
            <path d="M19 12H5"/>
        </svg>
    );
}
//lucide-arrow-left
