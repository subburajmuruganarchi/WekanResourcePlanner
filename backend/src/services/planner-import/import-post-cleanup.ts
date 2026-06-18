import { ImportWriteOptions } from './types/import-write.options';
import { deactivateStaleEmployees } from './resource-import.service';
import { deactivateStaleProjects } from './project-import.service';
import { deactivateStaleAllocations } from './allocation-import.service';
import { cleanupJunkSkills } from './planner-import.utils';

export type ImportSheetKind = 'Resource' | 'Project' | 'Project_Allocation' | 'multi';

export async function runPostTransactionCleanup(params: {
    sheet: ImportSheetKind;
    syncId?: string;
    syncBatchId?: string;
    resourceOnly?: boolean;
}): Promise<void> {
    const writeOpts: ImportWriteOptions = {};

    if (params.sheet === 'Resource' || params.sheet === 'multi') {
        if (params.syncId) {
            await deactivateStaleEmployees(params.syncId, writeOpts);
        }
    }

    if (params.sheet === 'Project' || params.sheet === 'multi') {
        if (params.syncId) {
            await deactivateStaleProjects(params.syncId, writeOpts);
        }
    }

    if (params.sheet === 'Project_Allocation' || params.sheet === 'multi') {
        if (params.syncBatchId) {
            await deactivateStaleAllocations(params.syncBatchId, writeOpts);
        }
    }

    if (!params.resourceOnly && params.sheet !== 'Resource') {
        await cleanupJunkSkills(writeOpts);
    }
}

export function inferImportSheet(params: {
    resourceRows?: unknown[];
    projectRows?: unknown[];
    allocationRows?: unknown[];
    resourceOnly?: boolean;
}): ImportSheetKind {
    if (params.resourceOnly) return 'Resource';
    const hasR = !!params.resourceRows?.length;
    const hasP = !!params.projectRows?.length;
    const hasA = !!params.allocationRows?.length;
    if (hasA && !hasR && !hasP) return 'Project_Allocation';
    if (hasP && !hasR && !hasA) return 'Project';
    if (hasR && !hasP && !hasA) return 'Resource';
    return 'multi';
}
