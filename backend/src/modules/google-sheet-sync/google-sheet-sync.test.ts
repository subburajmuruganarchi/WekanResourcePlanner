import { Request, Response, NextFunction } from 'express';

jest.mock('../../config/env', () => ({
    env: {
        GOOGLE_SHEET_SYNC_SECRET: 'test-sync-secret-key-32chars',
    },
}));

import { requireSyncKey } from '../../common/middleware/sync-auth.middleware';

function mockReqRes(key?: string) {
    const req = {
        headers: key ? { 'x-r360-sync-key': key } : {},
    } as unknown as Request;
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;
    return { req, res, next };
}

describe('requireSyncKey middleware', () => {
    it('rejects missing sync key', () => {
        const { req, res, next } = mockReqRes();
        requireSyncKey(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects invalid sync key', () => {
        const { req, res, next } = mockReqRes('wrong-key');
        requireSyncKey(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('accepts valid sync key', () => {
        const { req, res, next } = mockReqRes('test-sync-secret-key-32chars');
        requireSyncKey(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});

describe('password preservation contract', () => {
    it('documents $setOnInsert for password on employee upsert', () => {
        const updateDoc = {
            $set: { first_name: 'John', email: 'john@test.com' },
            $setOnInsert: { password: 'hashed' },
        };
        expect(updateDoc.$set).not.toHaveProperty('password');
        expect(updateDoc.$setOnInsert).toHaveProperty('password');
    });
});
