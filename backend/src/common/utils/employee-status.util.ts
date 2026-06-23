/** Mongo filter: active roster members (Availability = Available on Resource sheet). */
export function activeEmployeeMongoFilter(): Record<string, unknown> {
    return {
        is_active: { $ne: false },
        status: { $not: { $regex: /^(inactive|terminated|not available|unavailable)$/i } },
    };
}
