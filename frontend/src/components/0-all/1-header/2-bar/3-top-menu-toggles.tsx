import { atom, useAtomValue, useSetAtom } from "jotai";
import { classNames } from "@/utils";
import { Label } from "@/components/ui/shadcn/label";
import { Switch } from "@/components/ui/shadcn/switch";
import { currentFileStateAtom } from "@/store/traces-store/0-1-files-current-state";
import { setCurrentFileShowOnlySelectedThreadAtom } from "@/store/traces-store/0-4-thread-filter-cache";
import { setShowOnlyErrorsInSelectedFileAtom, showOnlyErrorsInSelectedFileAtom } from "@/store/7-errors-only-setting";
import { excludeNoiseErrorsInSelectedFileAtom, setExcludeNoiseErrorsInSelectedFileAtom } from "@/store/8-errors-noise-setting";
import { currentFileErrorsCountAtom } from "@/store/traces-store/4-3-errors-count";
import { allFilesErrorsTotalsAtom } from "@/store/traces-store/4-4-errors-totals";

export function ToggleErrorsOnly() {
    const currentFileState = useAtomValue(currentFileStateAtom);
    const showOnlyErrors = useAtomValue(showOnlyErrorsInSelectedFileAtom);
    const setShowOnlyErrorsInSelectedFile = useSetAtom(setShowOnlyErrorsInSelectedFileAtom);
    
    const disabled = !currentFileState;
    const errorsCount = useAtomValue(currentFileErrorsCountAtom);

    return (
        <ToggleLabelSwitch
            label="Errors"
            checked={showOnlyErrors}
            disabled={disabled}
            title={disabled ? "Select a file to enable errors-only view" : `Show only error lines (${errorsCount} errors)`}
            onCheckedChange={setShowOnlyErrorsInSelectedFile}
        />
    );
}

export function ToggleErrorsWithoutNoise() {
    const currentFileState = useAtomValue(currentFileStateAtom);
    const excludeNoiseErrors = useAtomValue(excludeNoiseErrorsInSelectedFileAtom);
    const setExcludeNoiseErrors = useSetAtom(setExcludeNoiseErrorsInSelectedFileAtom);

    const disabled = !currentFileState;
    const errorsCount = useAtomValue(currentFileErrorsCountAtom);
    const allFilesErrorsTotals = useAtomValue(allFilesErrorsTotalsAtom);

    return (
        <ToggleLabelSwitch
            label="Noiseless"
            checked={excludeNoiseErrors}
            disabled={disabled}
            title={disabled
                ? "Select a file to configure error filtering"
                : (excludeNoiseErrors
                    ? `Noise errors are hidden (file: ${errorsCount}, all: ${allFilesErrorsTotals.errorsCountWithoutNoise}/${allFilesErrorsTotals.errorsCount})`
                    : `Noise errors are shown (all: ${allFilesErrorsTotals.errorsCountWithoutNoise}/${allFilesErrorsTotals.errorsCount}, includes 0x80070002)`)
            }
            onCheckedChange={setExcludeNoiseErrors}
        />
    );
}

export function ToggleThreadOnly() {
    const currentFileState = useAtomValue(currentFileStateAtom);
    const showOnlySelectedThread = useAtomValue(currentFileState?.showOnlySelectedThreadAtom ?? fallbackShowOnlySelectedThreadAtom);
    const currentLineIndex = useAtomValue(currentFileState?.currentLineIdxAtom ?? fallbackLineIndexAtom);
    const setShowOnlySelectedThread = useSetAtom(setCurrentFileShowOnlySelectedThreadAtom);

    const disabled = !currentFileState || currentLineIndex < 0;

    return (
        <ToggleLabelSwitch
            label="Thread"
            checked={showOnlySelectedThread}
            disabled={disabled}
            title={disabled ? "Select a line to enable thread-only view" : "Show only lines from the selected thread"}
            onCheckedChange={setShowOnlySelectedThread}
        />
    );
}

const fallbackShowOnlySelectedThreadAtom = atom(false);
const fallbackLineIndexAtom = atom(-1);

type ToggleLabelSwitchProps = {
    label: string;
    checked: boolean;
    disabled: boolean;
    title: string;
    onCheckedChange: (checked: boolean) => void;
};

function ToggleLabelSwitch({ label, checked, disabled, title, onCheckedChange }: ToggleLabelSwitchProps) {
    return (
        <Label
            className={classNames("px-1 h-6 font-normal border-border rounded border select-none gap-1", disabled && "opacity-50")}
            data-disabled={disabled}
            title={title}
        >
            {label}
            <Switch
                className={classNames("border border-foreground/10", disabled && "disabled:opacity-100")}
                checked={checked}
                onCheckedChange={onCheckedChange}
                disabled={disabled}
            />
        </Label>
    );
}
