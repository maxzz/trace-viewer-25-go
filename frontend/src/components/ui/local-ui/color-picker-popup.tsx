import { type ReactNode, useState } from "react";
import { cn } from "@/utils/index";
import { Button } from "../shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../shadcn/dropdown-menu";
import { type HighlightRule } from "@/store/1-ui-settings";
import { highlightActions } from "@/store/5-highlight-rules";

export function ColorPickerButton({ rule }: { rule: HighlightRule; }) {
    const { overlayKey } = rule;
    const title = getColorLabel(overlayKey);
    const overlayClasses = getOverlayKeyClasses(overlayKey);
    return (
        <ColorPickerPopup rule={rule} overlayClasses={overlayClasses}>
            <Button className="p-0 size-8 overflow-hidden" variant="outline" title={title}>
                <div className={cn("size-full opacity-20", overlayClasses)} />
            </Button>
        </ColorPickerPopup>
    );
}

function ColorPickerPopup({ rule, overlayClasses, children }: { rule: HighlightRule; overlayClasses: string; children: ReactNode; }) {
    const [open, setOpen] = useState(false);
    const { overlayKey } = rule;

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                {children}
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-auto p-2" align="start">
                <div className="grid grid-cols-4 gap-2">
                    {COLOR_GRID_Classes.map(
                        (c: HighlightRuleStatic, index: number) => (
                            <ColorSwatch
                                key={c.kbd}
                                overlayClasses={getOverlayKeyClasses(c.overlayKey)}
                                colorLabel={getColorLabel(c.overlayKey)}
                                letter={c.kbd}
                                isSelected={overlayKey === c.overlayKey}
                                index={index}
                                onClick={() => {
                                    highlightActions.updateRule(rule.id, { overlayKey: c.overlayKey });
                                    setOpen(false);
                                }}
                            />
                        )
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function ColorSwatch({ colorLabel, overlayClasses, letter, isSelected, onClick, index }: {
    colorLabel: string;
    overlayClasses: string;
    letter: string;
    isSelected: boolean;
    onClick: () => void;
    index: number;
}) {
    return (
        <button
            className={cn(swatchClasses, isSelected && "ring ring-primary ring-offset-2 ring-offset-background", index === 1 && "col-span-3")}
            onClick={(e) => { e.currentTarget.blur(); setTimeout(() => onClick(), 50); }} // to avoid "Blocked aria-hidden on an element because its descendant retained focus."
            title={colorLabel}
        >
            {/* Background */}
            {colorLabel !== "key-none"
                ? (
                    <div className={cn("size-full opacity-20 rounded-md", overlayClasses)} />
                ) : (
                    <svg className="size-full fill-foreground/20 rounded-md">
                        <defs>
                            <pattern id="checkerboard-8x8" width="8" height="8" patternUnits="userSpaceOnUse">
                                <path d="M0 0h4v4H0zm4 4h4v4H4z" />
                            </pattern>
                        </defs>
                        <rect className="size-full" fill="url(#checkerboard-8x8)" />
                    </svg>
                )}

            {/* Letter overlay */}
            <span className={cn("absolute inset-0 px-1.5 py-1 text-[10px] font-mono text-foreground/50 pointer-events-none flex items-end justify-end")}>
                {letter}
            </span>
        </button>
    );
}

const bgClasses = {
    none:        /**/ 'bg-transparent',
    blue:        /**/ 'bg-blue-500',
    green:       /**/ 'bg-green-500',
    emerald:     /**/ 'bg-emerald-500',
    cyan:        /**/ 'bg-cyan-500',
    lime:        /**/ 'bg-lime-500',

    indigo:      /**/ 'bg-indigo-500',
    violet:      /**/ 'bg-violet-500',
    purple:      /**/ 'bg-purple-500',
    pink:        /**/ 'bg-pink-500',

    red:         /**/ 'bg-red-500',
    orange:      /**/ 'bg-orange-500',
    amber:       /**/ 'bg-amber-500',
    yellow:      /**/ 'bg-yellow-300',

    slate:       /**/ 'bg-slate-700',
    gray:        /**/ 'bg-gray-500',
    zinc:        /**/ 'bg-zinc-400',
    stone:       /**/ 'bg-stone-200',
};

const COLOR_GRID_Classes: HighlightRuleStatic[] = [
    { overlayKey: "key-none",      /**/ overlay: bgClasses.none,    /**/ kbd: "q", },
    { overlayKey: "key-blue",      /**/ overlay: bgClasses.blue,    /**/ kbd: "o", },

    { overlayKey: "key-green",     /**/ overlay: bgClasses.green,   /**/ kbd: "y", },
    { overlayKey: "key-emerald",   /**/ overlay: bgClasses.emerald, /**/ kbd: "u", },
    { overlayKey: "key-cyan",      /**/ overlay: bgClasses.cyan,    /**/ kbd: "i", },
    { overlayKey: "key-lime",      /**/ overlay: bgClasses.lime,    /**/ kbd: "f", },

    { overlayKey: "key-indigo",    /**/ overlay: bgClasses.indigo,  /**/ kbd: "p", },
    { overlayKey: "key-violet",    /**/ overlay: bgClasses.violet,  /**/ kbd: "a", },
    { overlayKey: "key-purple",    /**/ overlay: bgClasses.purple,  /**/ kbd: "s", },
    { overlayKey: "key-pink",      /**/ overlay: bgClasses.pink,    /**/ kbd: "d", },

    { overlayKey: "key-red",       /**/ overlay: bgClasses.red,     /**/ kbd: "w", },
    { overlayKey: "key-orange",    /**/ overlay: bgClasses.orange,  /**/ kbd: "e", },
    { overlayKey: "key-amber",     /**/ overlay: bgClasses.amber,   /**/ kbd: "r", },
    { overlayKey: "key-yellow",    /**/ overlay: bgClasses.yellow,  /**/ kbd: "t", },

    { overlayKey: "key-slate",     /**/ overlay: bgClasses.slate,   /**/ kbd: "g", },
    { overlayKey: "key-gray",      /**/ overlay: bgClasses.gray,    /**/ kbd: "h", },
    { overlayKey: "key-zinc",      /**/ overlay: bgClasses.zinc,    /**/ kbd: "j", },
    { overlayKey: "key-stone",     /**/ overlay: bgClasses.stone,   /**/ kbd: "k", },
] as const;

type HighlightRuleStatic = {
    overlayKey: string;
    overlay: string;
    kbd: string;
};

function getColorLabel(overlayKey: string | undefined): string {
    return overlayKey?.replace("key-", "") || "";
}

export function getOverlayKeyClasses(overlayKey: string): string {
    return COLOR_GRID_Classes.find(c => c.overlayKey === overlayKey)?.overlay || bgClasses.none;
}

const swatchClasses = "\
relative \
size-8 \
border \
border-foreground/30 \
hover:scale-110 \
focus:outline-none \
focus:ring \
focus:ring-ring \
focus:ring-offset-2 \
rounded-md \
shadow \
dark:shadow-foreground/20 \
transition-all \
flex items-center justify-center";

// DpFbView
// DpAgentOtsPlugin
// (DpAgent.exe|DpHost2)
// DpHost
// Altus
// mstsc
