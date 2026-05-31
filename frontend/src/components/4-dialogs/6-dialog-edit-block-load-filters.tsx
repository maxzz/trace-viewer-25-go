import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { Reorder, useDragControls } from "motion/react";
import { GripVertical, Plus, Regex, Trash2 } from "lucide-react";
import { Button } from "../ui/shadcn/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/shadcn/dialog";
import { Input } from "../ui/shadcn/input";
import { Switch } from "../ui/shadcn/switch";
import { dialogBlockLoadFiltersOpenAtom } from "@/store/2-ui-atoms";
import { appSettings, type BlockLoadFilter } from "@/store/1-ui-settings";
import { blockLoadFilterActions } from "@/store/9-block-load-filters";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { notice } from "../ui/local-ui/7-toaster/7-toaster";

export function DialogEditBlockLoadFilters() {
    const [open, setOpen] = useAtom(dialogBlockLoadFiltersOpenAtom);
    const { blockLoadFilters } = useSnapshot(appSettings, { sync: true });
    const [invalidRuleIds, setInvalidRuleIds] = useState<{ pattern: Set<string>; }>({ pattern: new Set() });

    function handleReorder(newOrder: BlockLoadFilter[]) {
        blockLoadFilterActions.reorderRules(newOrder);
    }

    function handleOpenChange(newOpen: boolean) {
        if (newOpen) {
            setInvalidRuleIds({ pattern: new Set() });
            setOpen(true);
        } else {
            const { isValid, invalidRuleIds } = validateRules(blockLoadFilters);
            setInvalidRuleIds(invalidRuleIds);
            if (isValid) {
                setOpen(false);
            }
        }
    }

    function handleClose() {
        const { isValid, invalidRuleIds } = validateRules(blockLoadFilters);
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
                        Block Load Filters
                    </DialogTitle>
                </DialogHeader>

                <div>
                    {blockLoadFilters.length !== 0 && <Header />}

                    <div className="-mr-2 pr-2 py-1 max-h-[60vh] overflow-y-auto">
                        <Reorder.Group className="m-0 p-0" axis="y" values={blockLoadFilters as unknown as BlockLoadFilter[]} onReorder={handleReorder}>
                            {blockLoadFilters.map(
                                (rule) => (
                                    <BlockLoadFilterRow
                                        key={rule.id}
                                        rule={rule as unknown as BlockLoadFilter}
                                        onDelete={blockLoadFilterActions.deleteRule}
                                        isPatternInvalid={invalidRuleIds.pattern.has(rule.id)}
                                    />
                                )
                            )}
                        </Reorder.Group>

                        <Button className="mt-1 mx-11 h-7" variant="outline" size="xs" onClick={() => blockLoadFilterActions.addRule("")}>
                            <Plus className="size-3.5" />
                            Add Block Load Filter
                        </Button>
                    </div>

                    <div className="mx-5 mt-1 mb-1 text-xs text-muted-foreground text-balance">
                        <p className="mb-1">
                            Active rules prevent matching files from being loaded at all.
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>
                                <span className={codeClasses}>*Error*</span> wildcard to block files with names containing Error
                            </li>
                            <li>
                                <span className={codeClasses}>/Log$/</span> regex to block files ending in Log
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
        </Dialog>
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
                Active
            </div>
        </div>
    );
}

function BlockLoadFilterRow({ rule, onDelete, isPatternInvalid }: { rule: BlockLoadFilter; onDelete: (id: string) => void; isPatternInvalid?: boolean; }) {
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

            <div className="flex-1 grid grid-cols-[1fr_40px] gap-1 items-center">
                <InputPattern
                    ruleId={rule.id}
                    pattern={rule.rulePattern || ''}
                    isPatternInvalid={isPatternInvalid ?? false}
                />

                <div className="flex justify-center">
                    <Switch
                        checked={rule.ruleEnabled}
                        onCheckedChange={(checked) => blockLoadFilterActions.updateRule(rule.id, { ruleEnabled: checked })}
                        title={rule.ruleEnabled ? "Disable block filter" : "Enable block filter"}
                    />
                </div>
            </div>

            <Button className="ml-0.5 size-7 text-muted-foreground/50 rounded" variant="ghost" size="icon-sm" tabIndex={-1} onClick={() => onDelete(rule.id)}>
                <Trash2 className="size-3.5" />
            </Button>
        </Reorder.Item>
    );
}

function InputPattern({ ruleId, pattern, isPatternInvalid }: { ruleId: string; pattern: string; isPatternInvalid: boolean; }) {
    const isRegex = pattern.startsWith('/') && pattern.endsWith('/') && pattern.length > 1;
    const patternWithoutSlashes = isRegex ? pattern.slice(1, -1) : pattern;

    const [localValue, setLocalValue] = useState(patternWithoutSlashes);

    useEffect(() => setLocalValue(patternWithoutSlashes), [patternWithoutSlashes]);

    function handlePatternChange(value: string) {
        setLocalValue(value);
        if (isRegex) {
            blockLoadFilterActions.updateRule(ruleId, { rulePattern: `/${value}/` });
        } else {
            blockLoadFilterActions.updateRule(ruleId, { rulePattern: value });
        }
    }

    function handleToggleRegex() {
        if (isRegex) {
            blockLoadFilterActions.updateRule(ruleId, { rulePattern: patternWithoutSlashes });
        } else {
            blockLoadFilterActions.updateRule(ruleId, { rulePattern: `/${pattern}/` });
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

function validateRules(blockLoadFilters: readonly BlockLoadFilter[]): { isValid: boolean; invalidRuleIds: { pattern: Set<string>; } } {
    const invalidPatterns = new Set<string>();

    blockLoadFilters.forEach(
        (rule) => {
            if (!rule.rulePattern?.trim()) {
                invalidPatterns.add(rule.id);
            }
        }
    );

    const invalidRuleIds = { pattern: invalidPatterns };
    const isValid = invalidPatterns.size === 0;

    if (!isValid) {
        notice.error('Block-load pattern cannot be empty');
    }

    return { isValid, invalidRuleIds };
}