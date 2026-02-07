import { allocationService, RankingRequest } from './allocation.service';
import { Employee } from '../employees/employee.model';
import { ProjectAllocation } from './allocation.model';
import { Types } from 'mongoose';

// Mock Mongoose models
jest.mock('../employees/employee.model');
jest.mock('./allocation.model');

describe('AllocationService - Ranking Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockEmployees = [
        {
            _id: new Types.ObjectId('000000000000000000000001'),
            firstName: 'Alice',
            lastName: 'Expert',
            title: 'Senior Dev',
            roles: [{ label: 'Frontend Developer' }],
            experienceYears: 10,
            skills: [
                {
                    skillId: { name: 'React' },
                    type: 'Primary',
                    level: 'Expert'
                }
            ],
            isActive: true
        },
        {
            _id: new Types.ObjectId('000000000000000000000002'),
            firstName: 'Bob',
            lastName: 'Novice',
            title: 'Junior Dev',
            roles: [{ label: 'Frontend Developer' }],
            experienceYears: 2,
            skills: [
                {
                    skillId: { name: 'React' },
                    type: 'Primary',
                    level: 'Beginner'
                }
            ],
            isActive: true
        }
    ];

    it('should rank experts higher than beginners for matching skill', async () => {
        // Setup mocks
        (Employee.find as jest.Mock).mockReturnValue({
            populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(mockEmployees)
                })
            })
        });

        // Mock no existing allocations (100% availability)
        (ProjectAllocation.find as jest.Mock).mockReturnValue({
            lean: jest.fn().mockResolvedValue([])
        });

        const request: RankingRequest = {
            projectId: '507f1f77bcf86cd799439011',
            skillName: 'React'
        };

        const results = await allocationService.rankEmployees(request);

        expect(results).toHaveLength(2);
        expect(results[0].name).toContain('Alice'); // Expert
        expect(results[1].name).toContain('Bob');   // Novice
        expect(results[0].matchScore).toBeGreaterThan(results[1].matchScore);
    });

    it('should penalize employees with low availability', async () => {
        // Setup mocks
        (Employee.find as jest.Mock).mockReturnValue({
            populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(mockEmployees)
                })
            })
        });

        // Alice is fully booked (0% availability)
        // Bob is free (100% availability)
        (ProjectAllocation.find as jest.Mock).mockImplementation((query) => {
            if (query.employeeId === mockEmployees[0]._id) {
                return {
                    lean: jest.fn().mockResolvedValue([{ percentage: 100 }])
                };
            }
            return {
                lean: jest.fn().mockResolvedValue([])
            };
        });

        const request: RankingRequest = {
            projectId: '507f1f77bcf86cd799439011',
            skillName: 'React'
        };

        const results = await allocationService.rankEmployees(request);

        // Bob should now exceed Alice because Alice has 0 availability score
        // Alice: (40 + 0 + 10)/100 = 0.5 (Expert=25?? No exp=25)
        // Bob: (40 + 35 + 2)/100 = 0.77
        // Wait, let's check formula in service:
        // Match = (skillMatch?40:0) + (avail*35) + (exp*25)/100
        // Alice (10y exp -> score 1.0 * 25 = 25): 40 + 0 + 25 = 65 -> 0.65
        // Bob (2y exp -> score 0.2 * 25 = 5): 40 + 35 + 5 = 80 -> 0.80

        expect(results[0].name).toContain('Bob');
        expect(results[1].name).toContain('Alice');
    });
});
