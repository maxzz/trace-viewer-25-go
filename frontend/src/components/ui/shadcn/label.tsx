import * as React from "react"; // 01.03.26
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/utils/index";

export function Label({ className, ...rest }: React.ComponentProps<typeof LabelPrimitive.Root>) {
    return (
        <LabelPrimitive.Root
            data-slot="label"
            className={cn(labelClasses, className)}
            {...rest}
        />
    );
}

const labelClasses = "\
text-xs \
font-medium \
leading-none \
select-none \
\
group-data-[disabled=true]:pointer-events-none \
group-data-[disabled=true]:opacity-50 \
\
peer-disabled:cursor-not-allowed \
peer-disabled:opacity-50 \
flex items-center gap-2 \
";
