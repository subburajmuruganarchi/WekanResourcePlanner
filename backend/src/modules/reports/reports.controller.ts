
import { Request, Response } from 'express';
import { ReportsService } from './reports.service';
import { structuredLogger } from '../../common/logger';
import { logContextFromRequest } from '../../common/logger/request-context';

const reportsService = new ReportsService();

function errorPayload(req: Request, message: string, error?: unknown) {
    const body: Record<string, unknown> = {
        status: 'error',
        message,
    };
    if (req.requestId) body.requestId = req.requestId;
    if (error instanceof Error) body.detail = error.message;
    return body;
}

export class ReportsController {
    public async getConsolidatedReport(req: Request, res: Response) {
        try {
            const numWeeks = parseInt(req.query.weeks as string) || 12;
            const workbook = await reportsService.generateConsolidatedReport(numWeeks);

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                'attachment; filename=' + 'Consolidated_Report.xlsx'
            );

            await workbook.xlsx.write(res);
            res.end();
        } catch (error: unknown) {
            structuredLogger.error('Failed to generate consolidated report', {
                ...logContextFromRequest(req, 'reports'),
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(500).json(errorPayload(req, 'Internal Server Error', error));
        }
    }

    public async getRoleSummaryReport(req: Request, res: Response) {
        try {
            const type = (req.query.type as string) || 'hours';
            const isPercentage = type === 'percentage';
            const workbook = await reportsService.generateRoleSummaryReport(isPercentage);

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                'attachment; filename=' +
                    (isPercentage ? 'Role_Summary_Percentage.xlsx' : 'Role_Summary_Hours.xlsx')
            );

            await workbook.xlsx.write(res);
            res.end();
        } catch (error: unknown) {
            structuredLogger.error('Failed to generate role summary report', {
                ...logContextFromRequest(req, 'reports'),
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(500).json(errorPayload(req, 'Internal Server Error', error));
        }
    }

    public async getBandwidthReport(req: Request, res: Response) {
        try {
            const workbook = await reportsService.generateBandwidthReport();

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                'attachment; filename=Bandwidth_Report.xlsx'
            );

            await workbook.xlsx.write(res);
            res.end();
        } catch (error: unknown) {
            structuredLogger.error('Failed to generate bandwidth report', {
                ...logContextFromRequest(req, 'reports'),
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(500).json(errorPayload(req, 'Internal Server Error', error));
        }
    }
}
