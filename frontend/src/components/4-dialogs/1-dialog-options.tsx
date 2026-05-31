import { useAtom } from 'jotai';
import { useSnapshot } from 'valtio';
import { appSettings } from '@/store/1-ui-settings';
import { dialogOptionsOpenAtom } from '@/store/2-ui-atoms';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { Input } from '@/components/ui/shadcn/input';
import { Button } from '@/components/ui/shadcn/button';
import { Switch } from '@/components/ui/shadcn/switch';
import { Label } from '@/components/ui/shadcn/label';
import { classNames } from '@/utils';

export function DialogOptions() {
    const [open, onOpenChange] = useAtom(dialogOptionsOpenAtom);
    const { showFooter, useIconsForEntryExit, showLineNumbers, showAllBlockedFilesNotice, extraInFooter, showErrorsNavigationWrapDialog, allTimes, historyLimit, startupFilePattern, fileUpdates } = useSnapshot(appSettings);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-110!" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle className="text-sm">
                        Options
                    </DialogTitle>
                </DialogHeader>

                <div className="py-2 text-xs grid gap-2">
                    <div className="font-semibold">
                        Trace viewer options:
                    </div>

                    <OptionCheckbox checked={useIconsForEntryExit} onCheckedChange={handleUseIconsChange} label="Use Icons for Entry/Exit lines" />

                    <OptionCheckbox checked={showLineNumbers} onCheckedChange={handleShowLineNumbersChange} label="Show line indices in the trace file view" />

                    <OptionCheckbox checked={showAllBlockedFilesNotice} onCheckedChange={handleShowAllBlockedFilesNoticeChange} label="Show notice when all .trc3 files are blocked by load filters" />

                    <OptionCheckbox checked={showErrorsNavigationWrapDialog} onCheckedChange={handleShowErrorsNavWrapDialogChange} label="Show wrap dialog when navigating errors" />

                    <div className="mt-2 font-semibold">
                        All times options:
                    </div>

                    <OptionCheckbox checked={allTimes.show} onCheckedChange={handleShowTimelineChange} label="Show all times column" />

                    <OptionCheckbox checked={allTimes.onLeft} onCheckedChange={handleCombinedOnLeftChange} label="Show all times on the left of the file list" disabled={!allTimes.show} title={!allTimes.show ? 'This option is disabled because "Show all times column" is disabled' : undefined} />

                    <OptionCheckbox checked={allTimes.showBuildDoneNotice} onCheckedChange={handleShowTimelineNotificationChange} label="Show notification when all times is built" />

                    <div className="flex items-center justify-between space-x-2">
                        <Label className="text-xs font-normal text-balance">
                            All times precision
                        </Label>
                        <Input className="w-12 h-6 text-xs p-1" value={allTimes.precision} onChange={handleTimelinePrecisionChange} min={0} max={5} type="number" />
                    </div>

                    <div className="mt-2 font-semibold">Footer options:</div>

                    <OptionCheckbox checked={showFooter} onCheckedChange={handleShowFooterChange} label="Show footer" />

                    <OptionCheckbox checked={extraInFooter} onCheckedChange={handleExtraInFooterChange} label="Show info from the file header in the footer" />

                    <div className="mt-2 font-semibold">History options:</div>

                    <Label className="text-xs font-normal flex items-center space-x-1">
                        Max history items
                        <Input className="w-12 h-6 text-xs p-1" value={historyLimit} onChange={handleHistoryLimitChange} min={1} max={100} type="number" />
                    </Label>

                    <div className="mt-2 font-semibold">Startup options:</div>

                    <Label className="text-xs font-normal flex flex-col items-start gap-1">
                        Select file pattern on start:
                        <Input
                            className="h-6 text-xs p-1"
                            value={startupFilePattern}
                            onChange={handleStartupPatternChange}
                            placeholder="e.g. *.dll.* or /regex/"
                        />
                        <span className="self-end text-muted-foreground text-[10px]">
                            Use * for wildcard or /pattern/ for regex
                        </span>
                    </Label>

                    <div className="mt-2 font-semibold">File update options:</div>

                    <OptionCheckbox checked={fileUpdates.sizeMonitorEnabled} onCheckedChange={handleSizeMonitorEnabledChange} label="Monitor files for size changes" />

                    <OptionCheckbox checked={fileUpdates.showFailureNotice} onCheckedChange={handleShowFileUpdateFailureNoticeChange} label="Show info notice when file update fails after retries" />

                    <div className="flex items-center justify-between space-x-2">
                        <Label className="text-xs font-normal text-balance">
                            Auto update interval (ms)
                        </Label>
                        <Input className="w-20 h-6 text-xs p-1" value={fileUpdates.autoUpdateIntervalMs} onChange={handleAutoUpdateIntervalChange} min={500} step={500} type="number" />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                        <Label className="text-xs font-normal text-balance">
                            Minimum size change before auto update (bytes)
                        </Label>
                        <Input className="w-20 h-6 text-xs p-1" value={fileUpdates.autoUpdateMinSizeChangeBytes} onChange={handleAutoUpdateMinSizeChangeChange} min={0} step={256} type="number" />
                    </div>
                </div>

                <DialogFooter className="justify-center!">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );
}

function OptionCheckbox({ checked, onCheckedChange, label, disabled, title }: { checked: boolean, onCheckedChange: (checked: boolean) => void, label: React.ReactNode, disabled?: boolean; title?: string; }) {
    return (
        <Label
            className={classNames("text-xs font-normal flex items-center justify-between space-x-1", disabled && "opacity-50")}
            data-disabled={disabled}
            title={title}
        >
            {label}
            <Switch className={classNames(disabled && "disabled:opacity-100")} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
        </Label>
    );
}

function handleShowFooterChange(checked: boolean) {
    appSettings.showFooter = checked;
}

function handleUseIconsChange(checked: boolean) {
    appSettings.useIconsForEntryExit = checked;
}

function handleExtraInFooterChange(checked: boolean) {
    appSettings.extraInFooter = checked;
}

function handleShowLineNumbersChange(checked: boolean) {
    appSettings.showLineNumbers = checked;
}

function handleShowAllBlockedFilesNoticeChange(checked: boolean) {
    appSettings.showAllBlockedFilesNotice = checked;
}

function handleShowErrorsNavWrapDialogChange(checked: boolean) {
    appSettings.showErrorsNavigationWrapDialog = checked;
}

function handleHistoryLimitChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0) {
        appSettings.historyLimit = val;
    }
}

function handleShowTimelineChange(checked: boolean) {
    appSettings.allTimes.show = checked;
}

function handleCombinedOnLeftChange(checked: boolean) {
    appSettings.allTimes.onLeft = checked;
}

function handleTimelinePrecisionChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 0 && val <= 5) {
        appSettings.allTimes.precision = val;
    }
}

function handleShowTimelineNotificationChange(checked: boolean) {
    appSettings.allTimes.showBuildDoneNotice = checked;
}

function handleStartupPatternChange(e: React.ChangeEvent<HTMLInputElement>) {
    appSettings.startupFilePattern = e.target.value;
}

function handleShowFileUpdateFailureNoticeChange(checked: boolean) {
    appSettings.fileUpdates.showFailureNotice = checked;
}

function handleSizeMonitorEnabledChange(checked: boolean) {
    appSettings.fileUpdates.sizeMonitorEnabled = checked;
}

function handleAutoUpdateIntervalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 500) {
        appSettings.fileUpdates.autoUpdateIntervalMs = val;
    }
}

function handleAutoUpdateMinSizeChangeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 0) {
        appSettings.fileUpdates.autoUpdateMinSizeChangeBytes = val;
    }
}
