import * as React from "react"; //01.19.26
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/utils/index";

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
    return (
        <SwitchPrimitive.Root data-slot="switch" className={cn(switchClasses, className)} {...props} >
            <SwitchPrimitive.Thumb data-slot="switch-thumb" className={cn(switchThumbClasses,)} />
        </SwitchPrimitive.Root>
    );
}

const switchClasses = "\
shrink-0 \
peer \
w-8 \
h-[1.15rem] \
\
data-[state=checked]:bg-primary \
data-[state=unchecked]:bg-input \
\
focus-visible:border-ring \
focus-visible:ring-ring/50 \
\
dark:data-[state=unchecked]:bg-input/80 \
focus-visible:ring-[3px] \
disabled:cursor-not-allowed \
disabled:opacity-50 \
\
rounded-full \
border \
border-transparent \
shadow-xs \
transition-all \
outline-none \
\
inline-flex items-center";

const switchThumbClasses = "\
block \
size-4 \
bg-background \
dark:data-[state=unchecked]:bg-foreground \
dark:data-[state=checked]:bg-primary-foreground \
ring-0 \
rounded-full \
transition-transform \
pointer-events-none \
data-[state=checked]:translate-x-[calc(100%-2px)] \
data-[state=unchecked]:translate-x-0 \
";
