import { proxy } from 'valtio';

// App title

export const defaultTitle = 'Trace Viewer';
export const defaultTitleShort = 'TV';

export const appMainTitle = proxy<{ title: string; openFolderName?: string; }>({
    title: defaultTitle,
    openFolderName: '',
});

export function setAppTitle(files: File[], droppedFolderName?: string, filePaths?: string[]) {
    let folderName = '';

    if (droppedFolderName) {
        folderName = droppedFolderName;
    }
    else if (filePaths && filePaths.length > 0 && filePaths.every(p => p)) {
        // Use paths from FileSystemEntry.fullPath (available in DnD)
        folderName = getCommonPath(filePaths);
    }
    else if (files.length > 0) {
        // Check for common path in webkitRelativePath (available in folder picker dialog)
        const paths = files.map(f => f.webkitRelativePath).filter(p => p);
        if (paths.length === files.length) {
            folderName = getCommonPath(paths);
        }
    }

    let title = defaultTitle;
    if (folderName) {
        title = `${defaultTitleShort} - ${folderName}`;
    }
    else if (files.length === 1) {
        title = `${defaultTitleShort} - ${files[0].name}`;
    }
    else if (files.length > 1) {
        title = `${defaultTitleShort} - ${files.length} files`;
    }

    appMainTitle.title = title;
    appMainTitle.openFolderName = folderName;
}

function getCommonPath(paths: string[]): string {
    if (paths.length === 0) return '';
    if (paths.length === 1) {
        // For single file, return parent directory
        const parts = paths[0].split('/').filter(p => p);
        return parts.slice(0, -1).join('/');
    }

    const splitPaths = paths.map(p => p.split('/').filter(part => part));
    const commonParts: string[] = [];

    if (splitPaths.length > 0) {
        const refPath = splitPaths[0];
        // Check segments up to the second to last (exclude filename)
        for (let i = 0; i < refPath.length - 1; i++) {
            const part = refPath[i];
            if (splitPaths.every(p => p.length > i && p[i] === part)) {
                commonParts.push(part);
            } else {
                break;
            }
        }
    }

    return commonParts.join('/');
}
