import { Types } from 'mongoose';
import { features } from '../../config/features';

/** Weekly planned vs actual by employee-week. */
export function pipelineWeeklyPlannedVsActual(
    weekStartFrom: Date,
    weekStartTo: Date,
    filters?: { employeeIds?: Types.ObjectId[]; projectIds?: Types.ObjectId[] }
): Record<string, unknown>[] {
    const match: Record<string, unknown> = {
        week_start: { $gte: weekStartFrom, $lte: weekStartTo },
    };
    if (filters?.employeeIds?.length) match.employee_id = { $in: filters.employeeIds };
    if (filters?.projectIds?.length) match.project_id = { $in: filters.projectIds };

    return [
        { $match: match },
        {
            $group: {
                _id: { employeeId: '$employee_id', weekStart: '$week_start' },
                plannedHours: { $sum: '$planned_hours' },
                actualHours: { $sum: '$actual_hours' },
                forecastHours: { $sum: '$forecast_hours' },
                varianceHours: { $sum: '$variance_hours' },
            },
        },
        {
            $addFields: {
                deltaHours: { $subtract: ['$actualHours', '$plannedHours'] },
                capacityHours: features.weeklyCapacityHours,
            },
        },
        {
            $lookup: {
                from: 'employees',
                localField: '_id.employeeId',
                foreignField: '_id',
                as: 'employee',
            },
        },
        { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                employeeId: '$_id.employeeId',
                weekStart: '$_id.weekStart',
                employeeName: {
                    $concat: ['$employee.first_name', ' ', '$employee.last_name'],
                },
                plannedHours: 1,
                actualHours: 1,
                forecastHours: 1,
                varianceHours: 1,
                deltaHours: 1,
                capacityHours: 1,
            },
        },
        { $sort: { weekStart: 1, plannedHours: -1 } },
    ];
}

/** Utilization variance at project-week level. */
export function pipelineUtilizationVarianceByProject(
    weekStartFrom: Date,
    weekStartTo: Date
): Record<string, unknown>[] {
    return [
        {
            $match: {
                week_start: { $gte: weekStartFrom, $lte: weekStartTo },
            },
        },
        {
            $group: {
                _id: { projectId: '$project_id', weekStart: '$week_start' },
                plannedHours: { $sum: '$planned_hours' },
                actualHours: { $sum: '$actual_hours' },
                varianceHours: { $sum: '$variance_hours' },
                headcount: { $addToSet: '$employee_id' },
            },
        },
        {
            $addFields: {
                deltaHours: { $subtract: ['$actualHours', '$plannedHours'] },
                overrunHours: {
                    $max: [0, { $subtract: ['$actualHours', '$plannedHours'] }],
                },
            },
        },
        {
            $lookup: {
                from: 'projects',
                localField: '_id.projectId',
                foreignField: '_id',
                as: 'project',
            },
        },
        { $unwind: '$project' },
        {
            $project: {
                projectId: '$_id.projectId',
                weekStart: '$_id.weekStart',
                projectName: '$project.project_name',
                projectCode: '$project.project_code',
                plannedHours: 1,
                actualHours: 1,
                varianceHours: 1,
                deltaHours: 1,
                overrunHours: 1,
                headcount: { $size: '$headcount' },
            },
        },
        { $sort: { overrunHours: -1 } },
    ];
}

/** Employees underutilized vs plan (planned >> actual). */
export function pipelineUnderutilizedEmployees(
    weekStart: Date,
    minPlanVarianceHours = 8
): Record<string, unknown>[] {
    return [
        { $match: { week_start: weekStart } },
        {
            $group: {
                _id: '$employee_id',
                plannedHours: { $sum: '$planned_hours' },
                actualHours: { $sum: '$actual_hours' },
                varianceHours: { $sum: '$variance_hours' },
            },
        },
        {
            $match: {
                varianceHours: { $gte: minPlanVarianceHours },
                actualHours: { $gt: 0 },
            },
        },
        {
            $lookup: {
                from: 'employees',
                localField: '_id',
                foreignField: '_id',
                as: 'employee',
            },
        },
        { $unwind: '$employee' },
        {
            $project: {
                employeeId: '$_id',
                employeeName: {
                    $concat: ['$employee.first_name', ' ', '$employee.last_name'],
                },
                plannedHours: 1,
                actualHours: 1,
                varianceHours: 1,
                benchHours: {
                    $max: [
                        0,
                        { $subtract: [features.weeklyCapacityHours, '$actualHours'] },
                    ],
                },
            },
        },
        { $sort: { varianceHours: -1 } },
    ];
}

/** Projects where actual exceeded planned in the week. */
export function pipelineOverrunProjects(weekStart: Date): Record<string, unknown>[] {
    return [
        { $match: { week_start: weekStart } },
        {
            $group: {
                _id: '$project_id',
                plannedHours: { $sum: '$planned_hours' },
                actualHours: { $sum: '$actual_hours' },
            },
        },
        {
            $match: {
                $expr: { $gt: ['$actualHours', '$plannedHours'] },
            },
        },
        {
            $addFields: {
                overrunHours: { $subtract: ['$actualHours', '$plannedHours'] },
            },
        },
        {
            $lookup: {
                from: 'projects',
                localField: '_id',
                foreignField: '_id',
                as: 'project',
            },
        },
        { $unwind: '$project' },
        {
            $project: {
                projectId: '$_id',
                projectName: '$project.project_name',
                projectCode: '$project.project_code',
                plannedHours: 1,
                actualHours: 1,
                overrunHours: 1,
            },
        },
        { $sort: { overrunHours: -1 } },
    ];
}
