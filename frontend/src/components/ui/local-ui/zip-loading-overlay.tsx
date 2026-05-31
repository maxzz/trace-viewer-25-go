import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { isZipProcessingAtom } from '@/store/2-ui-atoms';
import { Spinner } from '../icons/animated/wait-v1';

export function ZipLoadingOverlay() {
    const [isProcessing] = useAtom(isZipProcessingAtom);
    const [showOverlay, setShowOverlay] = useState(false);

    useEffect(() => {
        let timeoutId: number;

        if (isProcessing) {
            // Wait 2 seconds before showing the overlay
            timeoutId = setTimeout(() => setShowOverlay(true), 2000);
        } else {
            setShowOverlay(false);
        }

        return () => {
            timeoutId && clearTimeout(timeoutId);
        };
    }, [isProcessing]);

    if (!showOverlay) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center z-50">
            <div className="text-sky-900 flex flex-col items-center space-y-1">
                <Spinner className="size-10" blockClasses="bg-sky-900" />

                <p className="text-sm font-medium">
                    Processing ZIP file...
                </p>
            </div>
        </div>
    );
}
