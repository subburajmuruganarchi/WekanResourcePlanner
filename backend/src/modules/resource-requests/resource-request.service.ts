import { Types } from 'mongoose';
import { ResourceRequest, IResourceRequest, ResourceRequestStatus } from './resource-request.model';
import { Project } from '../projects/project.model';
import { Employee } from '../employees/employee.model';
import { Role } from '../roles/role.model';
import { allocationService } from '../allocations/allocation.service';
import { AppError } from '../../common/errors/app-error';
import { ROLES } from '../../common/constants/roles';
import { getManagedProjectIds } from '../../common/utils/pm-scope.util';
import { normalizeRoleName } from '../../common/utils/role-normalize.util';

export interface CreateResourceRequestInput {
    projectId: string;
    employeeId: string;
    requestedById: string;
    roleId?: string;
    allocationPercent: number;
    startDate: string;
    endDate: string;
    justification: string;
}

export interface ReviewResourceRequestInput {
    action: 'approve' | 'reject';
    reviewerId: string;
    reviewNotes?: string;
    createAllocation?: boolean;
}

export interface ResourceRequestResponse {
    id: string;
    projectId: string;
    projectName?: string;
    projectCode?: string;
    employeeId: string;
    employeeName?: string;
    requestedById: string;
    requestedByName?: string;
    roleId?: string;
    roleName?: string;
    allocationPercent: number;
    startDate: string;
    endDate: string;
    justification: string;
    status: ResourceRequestStatus;
    reviewedById?: string;
    reviewedByName?: string;
    reviewedAt?: string;
    reviewNotes?: string;
    allocationId?: string;
    createdAt?: string;
    updatedAt?: string;
}

function toIsoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function mapDoc(doc: IResourceRequest & {
    project_id?: { name?: string; code?: string };
    employee_id?: { name?: string };
    requested_by_id?: { name?: string };
    reviewed_by_id?: { name?: string };
    role_id?: { role_name?: string };
}): ResourceRequestResponse {
    const project = doc.project_id as { _id?: Types.ObjectId; name?: string; code?: string } | Types.ObjectId;
    const employee = doc.employee_id as { _id?: Types.ObjectId; name?: string } | Types.ObjectId;
    const requester = doc.requested_by_id as { _id?: Types.ObjectId; name?: string } | Types.ObjectId;
    const reviewer = doc.reviewed_by_id as { _id?: Types.ObjectId; name?: string } | Types.ObjectId | undefined;
    const role = doc.role_id as { _id?: Types.ObjectId; role_name?: string } | Types.ObjectId | undefined;

    return {
        id: String(doc._id),
        projectId: String((project as { _id?: Types.ObjectId })._id ?? project),
        projectName: typeof project === 'object' && 'name' in project ? project.name : undefined,
        projectCode: typeof project === 'object' && 'code' in project ? project.code : undefined,
        employeeId: String((employee as { _id?: Types.ObjectId })._id ?? employee),
        employeeName: typeof employee === 'object' && 'name' in employee ? employee.name : undefined,
        requestedById: String((requester as { _id?: Types.ObjectId })._id ?? requester),
        requestedByName: typeof requester === 'object' && 'name' in requester ? requester.name : undefined,
        roleId: role ? String((role as { _id?: Types.ObjectId })._id ?? role) : undefined,
        roleName: typeof role === 'object' && 'role_name' in role ? role.role_name : undefined,
        allocationPercent: doc.allocation_percent,
        startDate: toIsoDate(doc.start_date),
        endDate: toIsoDate(doc.end_date),
        justification: doc.justification,
        status: doc.status,
        reviewedById: reviewer ? String((reviewer as { _id?: Types.ObjectId })._id ?? reviewer) : undefined,
        reviewedByName: typeof reviewer === 'object' && reviewer && 'name' in reviewer ? reviewer.name : undefined,
        reviewedAt: doc.reviewed_at?.toISOString(),
        reviewNotes: doc.review_notes,
        allocationId: doc.allocation_id ? String(doc.allocation_id) : undefined,
        createdAt: doc.created_at?.toISOString(),
        updatedAt: doc.updated_at?.toISOString(),
    };
}

const populateFields = [
    { path: 'project_id', select: 'name code' },
    { path: 'employee_id', select: 'name' },
    { path: 'requested_by_id', select: 'name' },
    { path: 'reviewed_by_id', select: 'name' },
    { path: 'role_id', select: 'role_name' },
];

export class ResourceRequestService {
    async list(opts: {
        role: string;
        employeeId?: string;
        status?: ResourceRequestStatus;
    }): Promise<ResourceRequestResponse[]> {
        const filter: Record<string, unknown> = {};
        if (opts.status) filter.status = opts.status;

        const canonical = normalizeRoleName(opts.role);
        if (canonical === ROLES.EMPLOYEE || canonical === ROLES.USER) {
            if (!opts.employeeId) return [];
            filter.$or = [
                { employee_id: new Types.ObjectId(opts.employeeId) },
                { requested_by_id: new Types.ObjectId(opts.employeeId) },
            ];
        } else if (canonical === ROLES.PROJECT_MANAGER) {
            if (!opts.employeeId) return [];
            const projectIds = await getManagedProjectIds(opts.employeeId);
            filter.$or = [
                { project_id: { $in: projectIds.map((id) => new Types.ObjectId(id)) } },
                { requested_by_id: new Types.ObjectId(opts.employeeId) },
            ];
        }

        const docs = await ResourceRequest.find(filter)
            .sort({ created_at: -1 })
            .limit(200)
            .populate(populateFields)
            .lean();

        return docs.map((d) => mapDoc(d as unknown as IResourceRequest));
    }

    async create(input: CreateResourceRequestInput): Promise<ResourceRequestResponse> {
        if (!Types.ObjectId.isValid(input.projectId)) {
            throw new AppError('Invalid projectId', 400);
        }
        if (!Types.ObjectId.isValid(input.employeeId)) {
            throw new AppError('Invalid employeeId', 400);
        }
        if (input.justification.trim().length < 10) {
            throw new AppError('Justification must be at least 10 characters', 400);
        }

        const start = new Date(input.startDate);
        const end = new Date(input.endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
            throw new AppError('Invalid start or end date', 400);
        }

        const project = await Project.findById(input.projectId);
        if (!project) throw new AppError('Project not found', 404);

        const employee = await Employee.findById(input.employeeId);
        if (!employee) throw new AppError('Employee not found', 404);

        if (input.roleId) {
            const role = await Role.findById(input.roleId);
            if (!role) throw new AppError('Role not found', 404);
        }

        const doc = await ResourceRequest.create({
            project_id: new Types.ObjectId(input.projectId),
            employee_id: new Types.ObjectId(input.employeeId),
            requested_by_id: new Types.ObjectId(input.requestedById),
            role_id: input.roleId ? new Types.ObjectId(input.roleId) : undefined,
            allocation_percent: input.allocationPercent,
            start_date: start,
            end_date: end,
            justification: input.justification.trim(),
            status: 'Pending',
        });

        const populated = await ResourceRequest.findById(doc._id).populate(populateFields).lean();
        return mapDoc(populated as unknown as IResourceRequest);
    }

    async review(id: string, input: ReviewResourceRequestInput): Promise<ResourceRequestResponse> {
        const doc = await ResourceRequest.findById(id);
        if (!doc) throw new AppError('Resource request not found', 404);
        if (doc.status !== 'Pending') {
            throw new AppError(`Request is already ${doc.status}`, 400);
        }

        if (input.action === 'reject') {
            doc.status = 'Rejected';
            doc.reviewed_by_id = new Types.ObjectId(input.reviewerId);
            doc.reviewed_at = new Date();
            doc.review_notes = input.reviewNotes?.trim();
            await doc.save();
        } else {
            let allocationId: Types.ObjectId | undefined;
            if (input.createAllocation !== false && doc.role_id) {
                try {
                    const allocation = await allocationService.createAllocation({
                        projectId: String(doc.project_id),
                        employeeId: String(doc.employee_id),
                        roleId: String(doc.role_id),
                        startDate: toIsoDate(doc.start_date),
                        endDate: toIsoDate(doc.end_date),
                        percentage: doc.allocation_percent,
                    });
                    allocationId = new Types.ObjectId(allocation.id);
                } catch (err) {
                    const message = err instanceof Error ? err.message : 'Allocation failed';
                    throw new AppError(`Approved but allocation failed: ${message}`, 400);
                }
            }

            doc.status = 'Approved';
            doc.reviewed_by_id = new Types.ObjectId(input.reviewerId);
            doc.reviewed_at = new Date();
            doc.review_notes = input.reviewNotes?.trim();
            if (allocationId) doc.allocation_id = allocationId;
            await doc.save();
        }

        const populated = await ResourceRequest.findById(doc._id).populate(populateFields).lean();
        return mapDoc(populated as unknown as IResourceRequest);
    }

    async cancel(id: string, requesterId: string, role: string): Promise<ResourceRequestResponse> {
        const doc = await ResourceRequest.findById(id);
        if (!doc) throw new AppError('Resource request not found', 404);
        if (doc.status !== 'Pending') {
            throw new AppError(`Cannot cancel a ${doc.status} request`, 400);
        }

        const canonical = normalizeRoleName(role);
        const isOwner =
            String(doc.requested_by_id) === requesterId ||
            String(doc.employee_id) === requesterId;
        if (canonical !== ROLES.ADMIN && !isOwner) {
            throw new AppError('Access denied', 403);
        }

        doc.status = 'Cancelled';
        await doc.save();

        const populated = await ResourceRequest.findById(doc._id).populate(populateFields).lean();
        return mapDoc(populated as unknown as IResourceRequest);
    }
}

export const resourceRequestService = new ResourceRequestService();
