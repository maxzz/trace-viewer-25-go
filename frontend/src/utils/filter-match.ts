
// Helper to check if a filename matches a pattern
export function isFileNameMatch(fileName: string, pattern: string): boolean {
    if (!pattern) return false;

    // Check if pattern is regex (starts and ends with /)
    if (pattern.startsWith('/') && pattern.endsWith('/') && pattern.length > 1) {
        try {
            const regexPattern = pattern.slice(1, -1);
            const regex = new RegExp(regexPattern, 'i');
            return regex.test(fileName);
        } catch (e) {
            return false;
        }
    }

    const patternLower = pattern.toLowerCase();
    const fileNameLower = fileName.toLowerCase();

    // Convert glob to regex if contains *
    if (patternLower.includes('*')) {
        try {
            const regexStr = "^" + patternLower.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + "$";
            const regex = new RegExp(regexStr, 'i');
            return regex.test(fileName);
        } catch (e) {
            // fallback to contains
            return fileNameLower.includes(patternLower.replace(/\*/g, ''));
        }
    }

    return fileNameLower.includes(patternLower);
}
