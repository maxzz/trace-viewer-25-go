import * as React from "react"; // 01.03.26
import { cn } from "@/utils/index";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(inputClasses, className)}
            {...props}
        />
    );
}

const inputClasses = "\
px-3 py-1 w-full min-w-0 h-8 \
text-xs \
md:text-xs \
placeholder:text-muted-foreground \
selection:bg-primary \
selection:text-primary-foreground \
dark:bg-input/30 \
bg-transparent \
border-input \
border \
outline-none \
rounded \
shadow-xs \
transition-[color,box-shadow] \
\
file:inline-flex \
file:h-7 \
file:text-foreground \
file:bg-transparent \
file:text-xs \
file:border-0 \
file:font-medium \
\
disabled:pointer-events-none \
disabled:cursor-not-allowed \
disabled:opacity-50 \
\
focus-visible:ring-[1px] \
focus-visible:ring-ring \
focus-visible:border-transparent \
\
aria-invalid:ring-destructive/20 \
dark:aria-invalid:ring-destructive/40 \
aria-invalid:border-destructive \
";