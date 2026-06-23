/** Mongo filter: active roster members for dashboard team-size counts. */
export function activeEmployeeMongoFilter(): Record<string, unknown> {
    return {
        is_active: { $ne: false },
        $or: [
            { status: 'Active' },
            { status: { $regex: /^active$/i } },
            { status: 'On Probation' },
            { status: 'On Notice Period' },
        ],
    };
}
