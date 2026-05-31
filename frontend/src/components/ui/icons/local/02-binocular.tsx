import { type HTMLAttributes, type SVGAttributes } from "react"; //match-streamline-ultimate-color--file-copyright-equal.svg
import { classNames } from "@/utils";

export function IconBinocular({ className, title, ...rest }: SVGAttributes<SVGSVGElement> & HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("stroke-none fill-current", className)} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 129.5 79.8" {...rest}>
            {title && <title>{title}</title>}
            <defs>
                <style>
                    {
                        ".cls-1{fill:#dd8a17}.cls-2{fill:#78c2e5}.cls-3{fill:#faa021}.cls-4{fill:#464a5c}.cls-5{fill:#fdfdfd}.cls-6{fill:#87dafd}"
                    }
                </style>
            </defs>
            <g id="released_traces" data-name="released traces">
                <path
                    d="M75 16c1.7 4.2 1.8 12.5-.8 16.4-5.9-.6-11.8-2-17.1 1.4l-1.6-1.2L55 18l1.3-1.4c6.5-3.4 12-2 18.7-.7Z"
                    className="cls-4"
                />
                <path
                    d="m32.4 4.8.8-1c2.3-1.6 16.8 1.7 19.4 4 1.9 1.7 3.4 3.4 3.7 9 .6 4.6.5 11.9.8 17v9c-.3-2.5-5.6-10.7-6.7-10.8.3-4.7 1.6-17.3-1.9-20.5-3-3-19.6-5.3-23.5-2.2 1.8-1.6 5-4.3 7.4-4.5Z"
                    className="cls-1"
                />
                <path
                    d="M50.5 32.4c-9.9-11.5-27.6-11.7-39.7-4.5 4.5-7 7.4-12.8 14.2-18.6 4.3-3.5 8.8-3.1 14-2.4 10 1.4 12.5 3 13.6 13.2.4 3.2.4 10.4-2.1 12.3"
                    className="cls-3"
                />
                <path
                    d="M51.1 31.6c1.6 2 4.8 5 6 11.2 9 36.1-41.3 51.6-54.4 19.6-6.8-16.4.6-27.5 8-34.5s20.8-6.2 29.6-3.5c4.5 1.4 9.2 5.3 10.8 7.2m1.5-23.8A24 24 0 0 0 44.8 5c-5.8-1-10.5-.4-12.4-.2.3-2.1 3-4 5.4-4.6C44-.4 49.6.6 51.5 2.6c1.6 1.7.6 4 1 5.2"
                    className="cls-4"
                />
                <path
                    d="M51.4 38.9a28 28 0 0 1-30.3 36.3A25.5 25.5 0 1 1 51.4 39"
                    className="cls-6"
                />
                <path
                    d="M21.1 75.2c21-1 33-15.4 30.3-36.3a25.4 25.4 0 0 1-30.3 36.3"
                    className="cls-2"
                />
                <path
                    d="M34.7 29.4c-17.3 3.6-28.2 18-21 35.3l-1.4.4C-.1 47.8 13 24.5 34.7 29.4"
                    className="cls-5"
                />
                <path
                    d="M97.1 4.8q-.2-.6-.8-1C94 2.3 79.5 5.6 77 7.9c-1.9 1.7-3.4 3.4-3.7 9-.6 4.6-.5 11.9-.7 17q-.1 4.5 0 9C72.8 40.3 78 32 79 32c-.2-4.7-1.5-17.3 2-20.5 3-3 19.5-5.3 23.5-2.2-1.8-1.6-5-4.3-7.5-4.5Z"
                    className="cls-1"
                />
                <path
                    d="M79 32.4c9.9-11.5 27.6-11.7 39.8-4.5-4.6-7-7.5-12.8-14.2-18.6-4.4-3.5-8.8-3.1-14-2.4-10 1.4-12.5 3-13.7 13.2-.3 3.2-.4 10.4 2.1 12.3"
                    className="cls-3"
                />
                <path
                    d="M78.4 31.6c-1.6 2-4.8 5-6 11.2-9 36.1 41.3 51.6 54.5 19.6 6.7-16.4-.6-27.5-8.1-34.5S98 21.7 89.2 24.4a28 28 0 0 0-10.8 7.2M77 7.8A24 24 0 0 1 84.8 5c5.8-1 10.5-.4 12.3-.2-.3-2.1-3-4-5.3-4.6C85.5-.4 79.9.6 78 2.6c-1.7 1.7-.7 4-1.1 5.2"
                    className="cls-4"
                />
                <path
                    d="M78.1 38.9a28 28 0 0 0 30.3 36.3A25.5 25.5 0 1 0 78.1 39"
                    className="cls-6"
                />
                <path
                    d="M108.4 75.2c-21-1-33-15.4-30.3-36.3a25.4 25.4 0 0 0 30.3 36.3Z"
                    className="cls-2"
                />
                <path
                    d="M94.9 29.4c17.2 3.6 28.2 18 20.9 35.3l1.5.4c12.4-17.3-.8-40.6-22.4-35.7"
                    className="cls-5"
                />
            </g>
        </svg>
    );
}
