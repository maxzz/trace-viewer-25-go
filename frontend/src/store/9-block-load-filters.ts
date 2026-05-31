import { type BlockLoadFilter, appSettings } from './1-ui-settings';
import { isFileNameMatch } from '@/utils/filter-match';

export const blockLoadFilterActions = {
    addRule: (rulePattern: string) => {
        const id = generateRuleId();
        appSettings.blockLoadFilters.push({ id, rulePattern, ruleEnabled: true });
    },

    deleteRule: (id: string) => {
        const index = appSettings.blockLoadFilters.findIndex(rule => rule.id === id);
        if (index !== -1) {
            appSettings.blockLoadFilters.splice(index, 1);
        }
    },

    updateRule: (id: string, updates: Partial<Omit<BlockLoadFilter, 'id'>>) => {
        const rule = appSettings.blockLoadFilters.find(item => item.id === id);
        if (rule) {
            Object.assign(rule, updates);
        }
    },

    reorderRules: (newOrder: BlockLoadFilter[]) => {
        const idMap = new Map(appSettings.blockLoadFilters.map(rule => [rule.id, rule]));
        appSettings.blockLoadFilters = newOrder.map(rule => idMap.get(rule.id) || { ...rule });
    },
};

export function getActiveBlockLoadPatterns(): string[] {
    return appSettings.blockLoadFilters
        .filter(rule => rule.ruleEnabled && !!rule.rulePattern.trim())
        .map(rule => rule.rulePattern);
}

export function shouldBlockFileLoad(fileName: string): boolean {
    return getActiveBlockLoadPatterns().some(pattern => isFileNameMatch(fileName, pattern));
}

function generateRuleId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}