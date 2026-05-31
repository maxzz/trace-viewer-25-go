export function isTrc3File(file: File): boolean {
    return file.name.toLowerCase().endsWith('.trc3');
}

export function isZipFile(file: File): boolean {
    return file.name.toLowerCase().endsWith('.zip') ||
        file.type === 'application/zip' ||
        file.type === 'application/x-zip-compressed';
}

function isTrc3Name(name: string): boolean {
    return name.endsWith('.trc3');
}

function isZipName(file: File, name: string): boolean {
    return name.endsWith('.zip') ||
        file.type === 'application/zip' ||
        file.type === 'application/x-zip-compressed';
}

export function isOurFile(file: File): boolean {
    const name = file.name.toLowerCase();
    return isTrc3Name(name) || isZipName(file, name);
}
