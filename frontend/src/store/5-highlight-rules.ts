import { type HighlightRule, appSettings } from './1-ui-settings';
import { type FileState, filesStore } from './traces-store/9-types-files-store';
import { isFileNameMatch } from '@/utils/filter-match';

export const highlightActions = {
    addRule: (rulePattern: string) => {
        const id = generateRuleId();
        appSettings.highlightRules.push({ id, rulePattern, overlayKey: 'bg-transparent', ruleEnabled: true });
        recomputeHighlightMatches();
    },

    deleteRule: (id: string) => {
        const index = appSettings.highlightRules.findIndex(f => f.id === id);
        if (index !== -1) {
            appSettings.highlightRules.splice(index, 1);
        }
        recomputeHighlightMatches();
    },

    updateRule: (id: string, updates: Partial<Omit<HighlightRule, 'id'>>) => {
        const rule = appSettings.highlightRules.find(f => f.id === id);
        if (rule) {
            Object.assign(rule, updates);
            // Recompute if pattern changed
            if (updates.rulePattern || updates.ruleEnabled) {
                recomputeHighlightMatches();
            }
        }
    },

    reorderRules: (newOrder: HighlightRule[]) => {
        const idMap = new Map(appSettings.highlightRules.map(r => [r.id, r]));
        appSettings.highlightRules = newOrder.map(r => idMap.get(r.id) || { ...r });
        // The order of rules matters for which color takes precedence if we implement "first match wins"
        // But for matchedHighlightIds, it's just a list. The UI logic handles precedence.
    },

    toggleHighlight: () => {
        appSettings.highlightEnabled = !appSettings.highlightEnabled;
    }
};

export function recomputeHighlightMatches() {
    const rules = appSettings.highlightRules;
    const fileStates = filesStore.states;
    
    fileStates.forEach(
        (fileState: FileState) => {
            const matchedIds: string[] = [];
            
            rules.forEach(
                (rule: HighlightRule) => {
                    if (rule.ruleEnabled && isFileNameMatch(fileState.data.fileName, rule.rulePattern)) {
                        matchedIds.push(rule.id);
                    }
                }
            );

            // Update only if changed to avoid unnecessary renders
            if (JSON.stringify(fileState.matchedHighlightIds) !== JSON.stringify(matchedIds)) {
                fileState.matchedHighlightIds = matchedIds;
            }
        }
    );
}

function generateRuleId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}
