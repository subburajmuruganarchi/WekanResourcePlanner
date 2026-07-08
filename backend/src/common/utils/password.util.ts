import crypto from 'crypto';

const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/** Generate a readable temporary password for admin resets. */
export function generateTempPassword(length = 12): string {
    const bytes = crypto.randomBytes(length);
    let out = '';
    for (let i = 0; i < length; i++) {
        out += TEMP_PASSWORD_CHARS[bytes[i] % TEMP_PASSWORD_CHARS.length];
    }
    return out;
}
