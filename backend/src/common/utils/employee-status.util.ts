/** Mongo filter: active roster members (Resource sheet Availability ≠ "Not Available"). */
export function activeEmployeeMongoFilter(): Record<string, unknown> {
    return {
        is_active: { $ne: false },
        status: { $not: { $regex: /^(inactive|terminated|not available|unavailable)$/i } },
    };
}
