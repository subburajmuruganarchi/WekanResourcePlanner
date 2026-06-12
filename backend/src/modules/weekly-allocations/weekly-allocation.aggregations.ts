import { Types } from 'mongoose';
import { features } from '../../config/features';

/**
 * Reference aggregation pipelines for analytics workloads.
 * Use in reporting services, dashboards, or MongoDB Atlas charts.
 */

export function pipelineEmployeeWeeklyCapacity(
    weekStart: Date,
    employeeIds?: Types.ObjectId[]
): Record<string, unknown>[] {
    const match: Record<string, unknown> = { week_start: weekStart };
    if (employeeIds?.length) {
        match.employee_id = { $in: employeeIds };
    }

    return [
        { $match: match },
        {
            $group: {
                _id: '$employee_id',
                plannedHours: { $sum: '$planned_hours' },
                actualHours: { $sum: '$actual_hours' },
                forecastHours: { $sum: '$forecast_hours' },
                projectCount: { $sum: 1 },
            },
        },
        {
            $addFields: {
                capacityHours: features.weeklyCapacityHours,
                committedHours: '$plannedHours',
                availableHours: {
                    $max: [0, { $subtract: [features.weeklyCapacityHours, '$plannedHours'] }],
                },
                utilizationPercent: {
                    $min: [
                        100,
                        {
                            $multiply: [
                                { $divide: ['$plannedHours', features.weeklyCapacityHours] },
                                100,
                            ],
                        },
                    ],
                },
                benchPercent: {
                    $multiply: [
                        {
                            $divide: [
                                {
                                    $max: [
                                        0,
                                        { $subtract: [features.weeklyCapacityHours, '$plannedHours'] },
                                    ],
                                },
                                features.weeklyCapacityHours,
                            ],
                        },
                        100,
                    ],
                },
                isOverAllocated: { $gt: ['$plannedHours', features.weeklyCapacityHours] },
                varianceHours: { $subtract: ['$actualHours', '$plannedHours'] },
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
        { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                employeeId: '$_id',
                employeeName: {
                    $concat: ['$employee.first_name', ' ', '$employee.last_name'],
                },
                weekStart,
                capacityHours: 1,
                committedHours: 1,
                availableHours: 1,
                utilizationPercent: { $round: ['$utilizationPercent', 2] },
                benchPercent: { $round: ['$benchPercent', 2] },
                isOverAllocated: 1,
                plannedHours: 1,
                actualHours: 1,
                forecastHours: 1,
                varianceHours: 1,
                projectCount: 1,
            },
        },
        { $sort: { committedHours: -1 } },
    ];
}

export function pipelineProjectStaffingByWeek(
    weekStart: Date,
    projectIds?: Types.ObjectId[]
): Record<string, unknown>[] {
    const match: Record<string, unknown> = { week_start: weekStart };
    if (projectIds?.length) {
        match.project_id = { $in: projectIds };
    }

    return [
        { $match: match },
        {
            $group: {
                _id: {
                    projectId: '$project_id',
                    roleBucket: '$source',
                },
                headcount: { $addToSet: '$employee_id' },
                plannedHours: { $sum: '$planned_hours' },
                actualHours: { $sum: '$actual_hours' },
            },
        },
        {
            $group: {
                _id: '$_id.projectId',
                bySource: {
                    $push: {
                        source: '$_id.roleBucket',
                        headcount: { $size: '$headcount' },
                        plannedHours: '$plannedHours',
                        actualHours: '$actualHours',
                    },
                },
                totalPlannedHours: { $sum: '$plannedHours' },
                totalActualHours: { $sum: '$actualHours' },
                distinctEmployees: { $addToSet: '$headcount' },
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
                weekStart,
                totalPlannedHours: 1,
                totalActualHours: 1,
                bySource: 1,
            },
        },
        { $sort: { totalPlannedHours: -1 } },
    ];
}

export function pipelineOverallocatedEmployees(weekStart: Date): Record<string, unknown>[] {
    return [
        { $match: { week_start: weekStart } },
        {
            $group: {
                _id: '$employee_id',
                plannedHours: { $sum: '$planned_hours' },
            },
        },
        { $match: { plannedHours: { $gt: features.weeklyCapacityHours } } },
        {
            $addFields: {
                overHours: { $subtract: ['$plannedHours', features.weeklyCapacityHours] },
                utilizationPercent: {
                    $multiply: [
                        { $divide: ['$plannedHours', features.weeklyCapacityHours] },
                        100,
                    ],
                },
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
                weekStart,
                plannedHours: 1,
                overHours: 1,
                utilizationPercent: { $round: ['$utilizationPercent', 2] },
            },
        },
        { $sort: { overHours: -1 } },
    ];
}

export function pipelineBenchAnalytics(
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
                _id: { employeeId: '$employee_id', weekStart: '$week_start' },
                plannedHours: { $sum: '$planned_hours' },
            },
        },
        {
            $addFields: {
                benchHours: {
                    $max: [0, { $subtract: [features.weeklyCapacityHours, '$plannedHours'] }],
                },
                benchPercent: {
                    $multiply: [
                        {
                            $divide: [
                                {
                                    $max: [
                                        0,
                                        { $subtract: [features.weeklyCapacityHours, '$plannedHours'] },
                                    ],
                                },
                                features.weeklyCapacityHours,
                            ],
                        },
                        100,
                    ],
                },
                isOverAllocated: { $gt: ['$plannedHours', features.weeklyCapacityHours] },
            },
        },
        {
            $group: {
                _id: '$_id.weekStart',
                avgBenchPercent: { $avg: '$benchPercent' },
                employeesOnBench: {
                    $sum: { $cond: [{ $gt: ['$benchHours', 0] }, 1, 0] },
                },
                overAllocatedCount: {
                    $sum: { $cond: ['$isOverAllocated', 1, 0] },
                },
                employeeCount: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ];
}
