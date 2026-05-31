import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { appMainTitle, defaultTitle } from "@/store/3-ui-app-title";

export function WindowsAppTitleCaption() {
    const { title } = useSnapshot(appMainTitle);

    useEffect(
        () => {
            document.title = title || defaultTitle;
        }, [title]
    );

    return null;
}
