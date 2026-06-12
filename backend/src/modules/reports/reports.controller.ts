
import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
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

async function sendWorkbook(
    req: Request,
    res: Response,
    workbook: ExcelJS.Workbook,
    filename: string
) {
    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
}

export class ReportsController {
    private weeksFromQuery(req: Request): number {
        return parseInt(req.query.weeks as string, 10) || 12;
    }

    public async getResourceViewReport(req: Request, res: Response) {
        try {
            const workbook = await reportsService.generateResourceViewReport(this.weeksFromQuery(req));
            await sendWorkbook(req, res, workbook, 'Resource_View.xlsx');
        } catch (error: unknown) {
            structuredLogger.error('Failed to generate resource view report', {
                ...logContextFromRequest(req, 'reports'),
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(500).json(errorPayload(req, 'Internal Server Error', error));
        }
    }

    public async getProjectViewReport(req: Request, res: Response) {
        try {
            const workbook = await reportsService.generateProjectViewReport(this.weeksFromQuery(req));
            await sendWorkbook(req, res, workbook, 'Project_View.xlsx');
        } catch (error: unknown) {
            structuredLogger.error('Failed to generate project view report', {
                ...logContextFromRequest(req, 'reports'),
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(500).json(errorPayload(req, 'Internal Server Error', error));
        }
    }

    public async getResourceAnalyticsReport(req: Request, res: Response) {
        try {
            const workbook = await reportsService.generateResourceAnalyticsReport(this.weeksFromQuery(req));
            await sendWorkbook(req, res, workbook, 'Resource_Analytics.xlsx');
        } catch (error: unknown) {
            structuredLogger.error('Failed to generate resource analytics report', {
                ...logContextFromRequest(req, 'reports'),
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(500).json(errorPayload(req, 'Internal Server Error', error));
        }
    }

    public async getConsolidatedReport(req: Request, res: Response) {
        try {
            const workbook = await reportsService.generateConsolidatedHistoryReport(this.weeksFromQuery(req));
            await sendWorkbook(req, res, workbook, 'Consolidated_History.xlsx');
        } catch (error: unknown) {
            structuredLogger.error('Failed to generate consolidated history report', {
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
            const workbook = await reportsService.generateRoleSummaryReport(
                isPercentage,
                this.weeksFromQuery(req)
            );
            await sendWorkbook(
                req,
                res,
                workbook,
                isPercentage ? 'Role_Summary_Percentage.xlsx' : 'Role_Summary_Hours.xlsx'
            );
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
            const workbook = await reportsService.generateBandwidthReport(this.weeksFromQuery(req));
            await sendWorkbook(req, res, workbook, 'Bandwidth_Report.xlsx');
        } catch (error: unknown) {
            structuredLogger.error('Failed to generate bandwidth report', {
                ...logContextFromRequest(req, 'reports'),
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(500).json(errorPayload(req, 'Internal Server Error', error));
        }
    }

    public async getOverallocatedReport(req: Request, res: Response) {
        try {
            const workbook = await reportsService.generateOverallocatedReport(this.weeksFromQuery(req));
            await sendWorkbook(req, res, workbook, 'Overallocated_Report.xlsx');
        } catch (error: unknown) {
            structuredLogger.error('Failed to generate overallocated report', {
                ...logContextFromRequest(req, 'reports'),
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(500).json(errorPayload(req, 'Internal Server Error', error));
        }
    }
}
