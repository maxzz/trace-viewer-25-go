import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { Reorder, useDragControls } from "motion/react";
import { Button } from "../ui/shadcn/button";
import { Input } from "../ui/shadcn/input";
import { Checkbox } from "../ui/shadcn/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/shadcn/dialog";
import { GripVertical, Trash2, Plus, Regex } from "lucide-react";
import { appSettings, type HighlightRule } from "../../store/1-ui-settings";
import { dialogEditHighlightsOpenAtom } from "../../store/2-ui-atoms";
import { highlightActions } from "../../store/5-highlight-rules";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { notice } from "../ui/local-ui/7-toaster/7-toaster";
import { ColorPickerButton } from "../ui/local-ui/color-picker-popup";

export function DialogEditHighlightRules() {
    const [open, setOpen] = useAtom(dialogEditHighlightsOpenAtom);
    const { highlightRules } = useSnapshot(appSettings, { sync: true });
    const [invalidRuleIds, setInvalidRuleIds] = useState<{ pattern: Set<string>; }>({ pattern: new Set() });

    function handleReorder(newOrder: HighlightRule[]) {
        highlightActions.reorderRules(newOrder);
    }

    function handleOpenChange(newOpen: boolean) {
        if (newOpen) {
            setInvalidRuleIds({ pattern: new Set() });
            setOpen(true);
        } else {
            const { isValid, invalidRuleIds } = validateRules(highlightRules);
            setInvalidRuleIds(invalidRuleIds);
            if (isValid) {
                setOpen(false);
            }
        }
    }

    function handleClose() {
        const { isValid, invalidRuleIds } = validateRules(highlightRules);
        setInvalidRuleIds(invalidRuleIds);
        if (isValid) {
            setOpen(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-125!" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="select-none">
                        Highlights
                    </DialogTitle>
                </DialogHeader>

                <div>
                    {highlightRules.length !== 0 && <Header />}

                    <div className="-mr-2 pr-2 py-1 max-h-[60vh] overflow-y-auto">
                        <Reorder.Group className="m-0 p-0" axis="y" values={highlightRules as unknown as HighlightRule[]} onReorder={handleReorder}>
                            {highlightRules.map(
                                (rule) => (
                                    <HighlightRow
                                        key={rule.id}
                                        rule={rule as unknown as HighlightRule}
                                        onDelete={highlightActions.deleteRule}
                                        isPatternInvalid={invalidRuleIds.pattern.has(rule.id)}
                                    />
                                )
                            )}
                        </Reorder.Group>

                        <Button className="mt-1 mx-11 h-7" variant="outline" size="xs" onClick={() => highlightActions.addRule("")}>
                            <Plus className="size-3.5" />
                            Add Highlight Rule
                        </Button>
                    </div>

                    <div className="mx-5 mt-1 mb-1 text-xs text-muted-foreground text-balance">
                        <p className="mb-1">
                            Patterns support wildcards or regex. First matching rule determines color.
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>
                                <span className={codeClasses}>*Error*</span> wildcard to color files with name containing Error
                            </li>
                            <li>
                                <span className={codeClasses}>/Log$/</span> regex to color files ending in Log
                            </li>
                        </ul>
                    </div>
                </div>

                <DialogFooter className="justify-center!">
                    <Button variant="outline" onClick={handleClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}

const codeClasses = "px-1 bg-muted outline rounded";

function Header() {
    return (
        <div className="mt-4 pl-12 pr-5 grid grid-cols-[1fr_52px] gap-1 select-none">
            <div className="text-xs font-semibold">
                Pattern
            </div>
            <div className="text-xs font-semibold text-center">
                Overlay
            </div>
        </div>
    );
}

function HighlightRow({ rule, onDelete, isPatternInvalid }: { rule: HighlightRule, onDelete: (id: string) => void, isPatternInvalid?: boolean; }) {
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            className="mb-1 bg-background flex items-center select-none"
            id={rule.id}
            value={rule}
            dragListener={false}
            dragControls={dragControls}
        >
            <div className="py-2 px-1 hover:bg-muted cursor-grab touch-none rounded" onPointerDown={(e) => dragControls.start(e)}>
                <GripVertical className="size-3 text-muted-foreground" />
            </div>

            <Checkbox
                className="mr-2"
                checked={rule.ruleEnabled}
                onCheckedChange={(checked) => highlightActions.updateRule(rule.id, { ruleEnabled: !!checked })}
            />

            <div className="flex-1 grid grid-cols-[1fr_36px] gap-1">
                {/* Pattern */}
                <InputPattern
                    ruleId={rule.id}
                    pattern={rule.rulePattern || ''}
                    isPatternInvalid={isPatternInvalid ?? false}
                />
                {/* Color */}
                <div className="flex justify-center items-center">
                    <ColorPickerButton rule={rule} />
                </div>
            </div>

            <Button className="ml-0.5 size-7 text-muted-foreground/50 rounded" variant="ghost" size="icon-sm" tabIndex={-1} onClick={() => onDelete(rule.id)}>
                <Trash2 className="size-3.5" />
            </Button>
        </Reorder.Item>
    );
}

function InputPattern({ ruleId, pattern, isPatternInvalid }: { ruleId: string, pattern: string, isPatternInvalid: boolean; }) {
    const isRegex = pattern.startsWith('/') && pattern.endsWith('/') && pattern.length > 1;
    const patternWithoutSlashes = isRegex ? pattern.slice(1, -1) : pattern;

    const [localValue, setLocalValue] = useState(patternWithoutSlashes);

    useEffect(() => setLocalValue(patternWithoutSlashes), [patternWithoutSlashes]);

    function onUpdate(id: string, data: Partial<HighlightRule>) {
        highlightActions.updateRule(id, data);
    }

    function handlePatternChange(value: string) {
        setLocalValue(value);
        if (isRegex) {
            onUpdate(ruleId, { rulePattern: `/${value}/` });
        } else {
            onUpdate(ruleId, { rulePattern: value });
        }
    }

    function handleToggleRegex() {
        if (isRegex) {
            onUpdate(ruleId, { rulePattern: patternWithoutSlashes });
        } else {
            onUpdate(ruleId, { rulePattern: `/${pattern}/` });
        }
    }

    return (
        <div className="relative">
            <Input
                className={`h-8 pr-8 ${isPatternInvalid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                placeholder={isRegex ? "Regex pattern" : "Pattern (e.g. *.log)"}
                value={localValue}
                onChange={(e) => handlePatternChange(e.target.value)}
                {...turnOffAutoComplete}
            />
            <div className="absolute right-0 top-0">
                <Button
                    className={`border-0 border-l border-l-border rounded-r-[3px] rounded-l-none ${isRegex ? 'text-primary bg-primary/10' : 'hover:bg-primary/5'} ${isPatternInvalid ? 'border-l-red-500' : ''}`}
                    variant={isRegex ? "outline" : "ghost"}
                    size="icon-sm"
                    onClick={handleToggleRegex}
                    title="Use regex pattern"
                    type="button"
                    tabIndex={-1}
                >
                    <Regex className={`size-3 ${isRegex ? 'text-primary' : 'text-muted-foreground/50'}`} />
                </Button>
            </div>
        </div>
    );
}

function validateRules(highlightRules: readonly HighlightRule[]): { isValid: boolean; invalidRuleIds: { pattern: Set<string> } } {
    const invalidPatterns = new Set<string>();

    highlightRules.forEach(
        (rule) => {
            if (!rule.rulePattern?.trim()) {
                invalidPatterns.add(rule.id);
            }
        }
    );

    const invalidRuleIds = { pattern: invalidPatterns };
    const isValid = invalidPatterns.size === 0;

    if (!isValid) {
        notice.error('Highlight pattern cannot be empty');
    }

    return { isValid, invalidRuleIds };
}
