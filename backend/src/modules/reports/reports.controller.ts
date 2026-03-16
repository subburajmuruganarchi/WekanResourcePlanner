
import { Request, Response } from 'express';
import { ReportsService } from './reports.service';

const reportsService = new ReportsService();

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
        } catch (error: any) {
            console.error('Failed to generate consolidated report:', error);
            res.status(500).json({ message: 'Internal Server Error', error: error.message });
        }
    }

    public async getRoleSummaryReport(req: Request, res: Response) {
        // ... (existing code)
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
        } catch (error: any) {
            console.error('Failed to generate bandwidth report:', error);
            res.status(500).json({ message: 'Internal Server Error', error: error.message });
        }
    }
}
