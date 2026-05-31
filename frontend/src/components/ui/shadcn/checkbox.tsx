import * as React from "react"; // 01.04.26
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "@/utils/index";

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
    return (
        <CheckboxPrimitive.Root
            data-slot="checkbox"
            className={cn(checkboxClasses, className)}
            {...props}
        >
            <CheckboxPrimitive.Indicator
                data-slot="checkbox-indicator"
                className="text-current transition-none grid place-content-center"
            >
                <CheckIcon className="size-3" />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    );
}

const checkboxClasses = "\
peer \
shrink-0 \
size-4 \
border-input \
dark:bg-input/30 \
\
data-[state=checked]:bg-primary \
data-[state=checked]:text-primary-foreground \
dark:data-[state=checked]:bg-primary \
data-[state=checked]:border-primary \
\
focus-visible:ring-[1px] \
focus-visible:ring-ring \
focus-visible:border-ring \
disabled:cursor-not-allowed \
disabled:opacity-50 \
\
aria-invalid:ring-destructive/20 \
dark:aria-invalid:ring-destructive/40 \
aria-invalid:border-destructive \
\
outline-none \
rounded-sm \
border \
shadow-xs \
transition-shadow \
";
