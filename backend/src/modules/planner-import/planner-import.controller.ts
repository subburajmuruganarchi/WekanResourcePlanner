import { Request, Response, NextFunction } from 'express';
import { runPlannerImport } from '../../services/planner-import/planner-import.service';

function fileBuffer(
    files: Express.Multer.File[] | undefined
): Buffer | undefined {
    return files?.[0]?.buffer;
}

export const plannerImportController = {
    async import(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const files = req.files as
                | {
                      resource?: Express.Multer.File[];
                      project?: Express.Multer.File[];
                      projectAllocation?: Express.Multer.File[];
                  }
                | undefined;

            const resourceBuffer = fileBuffer(files?.resource);
            const projectBuffer = fileBuffer(files?.project);
            const allocationBuffer = fileBuffer(files?.projectAllocation);
            const resourceOnly = req.body?.resourceOnly === 'true';

            if (!resourceBuffer && !projectBuffer && !allocationBuffer) {
                res.status(400).json({
                    status: 'error',
                    message: 'Upload at least one Excel file (Resource.xlsx, Project.xlsx, or Project_Allocation.xlsx).',
                });
                return;
            }

            if (resourceOnly && !resourceBuffer) {
                res.status(400).json({
                    status: 'error',
                    message: 'Resource-only import requires Resource.xlsx.',
                });
                return;
            }

            const result = await runPlannerImport({
                resourceBuffer,
                projectBuffer,
                allocationBuffer,
                resourceOnly,
                persistToDisk: true,
            });

            res.status(200).json({
                status: 'success',
                data: result,
                message: result.message,
            });
        } catch (error) {
            next(error);
        }
    },
};
