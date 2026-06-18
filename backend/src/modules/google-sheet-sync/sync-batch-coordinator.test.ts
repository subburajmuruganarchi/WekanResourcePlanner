import { AppError } from '../../common/errors/app-error';
import { waitForSheetPrerequisites } from './sync-batch-coordinator';
import { SyncBatch } from './sync-batch.model';
import { SyncRun } from './sync-run.model';
import { Employee } from '../employees/employee.model';
import { Project } from '../projects/project.model';

jest.mock('./sync-batch.model');
jest.mock('./sync-run.model');
jest.mock('../employees/employee.model');
jest.mock('../projects/project.model');

describe('waitForSheetPrerequisites', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (SyncBatch.updateOne as jest.Mock).mockResolvedValue({ upsertedCount: 0 });
    });

    it('waits for projectCompleted before allocation when batchId is set', async () => {
        let projectDone = false;

        (SyncBatch.findOne as jest.Mock).mockImplementation((query: { batchId?: string }) => {
            if (query?.batchId === 'BATCH-1') {
                return {
                    select: () => ({
                        lean: async () => ({ status: 'RUNNING' }),
                    }),
                };
            }
            return {
                select: (field: string) => ({
                    lean: async () => {
                        if (field === 'resourceCompleted') return { resourceCompleted: true };
                        if (field === 'projectCompleted') {
                            return { projectCompleted: projectDone };
                        }
                        return {};
                    },
                }),
            };
        });

        (SyncRun.findOne as jest.Mock).mockImplementation(
            (query: { sheet?: string; status?: string }) => ({
                lean: async () => {
                    if (query.sheet === 'Resource' && query.status === 'SUCCESS') {
                        return { sheet: 'Resource', status: 'SUCCESS' };
                    }
                    if (query.sheet === 'Project' && query.status === 'SUCCESS' && projectDone) {
                        return { sheet: 'Project', status: 'SUCCESS' };
                    }
                    return null;
                },
            })
        );

        (Employee.countDocuments as jest.Mock).mockResolvedValue(5);
        (Project.countDocuments as jest.Mock).mockResolvedValue(3);

        const waitPromise = waitForSheetPrerequisites(
            'Project_Allocation',
            'BATCH-1',
            'REQ-1'
        );

        setTimeout(() => {
            projectDone = true;
        }, 2500);

        await expect(waitPromise).resolves.toBeUndefined();
        expect(Project.countDocuments).toHaveBeenCalled();
    });

    it('fails immediately for manual allocation without batch when projects missing', async () => {
        (Employee.countDocuments as jest.Mock).mockResolvedValue(1);
        (Project.countDocuments as jest.Mock).mockResolvedValue(0);

        await expect(
            waitForSheetPrerequisites('Project_Allocation', undefined, 'REQ-2')
        ).rejects.toThrow(AppError);
    });

    it('does not wait for Resource sheet', async () => {
        await expect(
            waitForSheetPrerequisites('Resource', 'BATCH-2', 'REQ-3')
        ).resolves.toBeUndefined();
        expect(SyncBatch.findOne).not.toHaveBeenCalled();
    });
});
