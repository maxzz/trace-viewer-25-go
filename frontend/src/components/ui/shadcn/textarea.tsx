import * as React from "react"; // 01.03.26
import { cn } from "@/utils/index";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(textareaClasses, className)}
            {...props}
        />
    );
}

const textareaClasses = "\
px-3 \
py-2 \
w-full \
min-h-16 \
text-xs \
md:text-xs \
field-sizing-content \
bg-transparent \
dark:bg-input/30 \
placeholder:text-muted-foreground \
border-input \
rounded \
border \
shadow-xs \
outline-none \
transition-[color,box-shadow] \
\
focus-visible:ring-[1px] \
focus-visible:ring-ring \
focus-visible:border-ring \
disabled:cursor-not-allowed \
disabled:opacity-50 \
aria-invalid:ring-destructive/20 \
dark:aria-invalid:ring-destructive/40 \
aria-invalid:border-destructive \
flex \
";
