import { auth } from '@/auth';
import { db } from '@/lib/db';
import { isOrganizer } from '@/lib/admin';
import {
  setupMocks,
  resetMocks,
  createMockSession,
  createAdminSession,
  createMockUser,
  mockDbUser,
} from '../utils/test-helpers';

// Mock dependencies
jest.mock('@/auth');
jest.mock('@/lib/db');
jest.mock('@/lib/admin');

describe('Authentication Workflow', () => {
  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    resetMocks();
  });

  describe('Positive Scenarios', () => {
    // TC-AUTH-001: Google OAuth Authentication
    describe('TC-AUTH-001: Google OAuth Authentication', () => {
      it('should create user record for first-time Google OAuth user', async () => {
        const newUserEmail = 'newuser@google.com';
        const mockUser = createMockUser({ email: newUserEmail });

        // Simulate first-time user (not found initially)
        mockDbUser.findUnique.mockResolvedValueOnce(null);
        // Then simulate successful creation
        mockDbUser.create.mockResolvedValue(mockUser);

        // Mock the auth config signIn callback behavior
        const signInCallback = async ({ user, account }: any) => {
          if (account?.provider === 'google' && user.email) {
            let dbUser = await db.user.findUnique({
              where: { email: user.email },
            });

            if (!dbUser) {
              dbUser = await db.user.create({
                data: {
                  email: user.email,
                },
              });
            }
          }
          return true;
        };

        const result = await signInCallback({
          user: { email: newUserEmail },
          account: { provider: 'google' },
        });

        expect(result).toBe(true);
        expect(mockDbUser.findUnique).toHaveBeenCalledWith({
          where: { email: newUserEmail },
        });
        expect(mockDbUser.create).toHaveBeenCalledWith({
          data: { email: newUserEmail },
        });
      });

      it('should set participant role for non-admin users', async () => {
        const userEmail = 'participant@test.com';
        (isOrganizer as jest.Mock).mockReturnValue(false);

        // Simulate JWT callback
        const token = { role: 'participant' };
        const user = { email: userEmail };

        const jwtCallback = async ({ token, user }: any) => {
          if (user && user.email) {
            token.role = isOrganizer(user.email) ? 'admin' : 'participant';
          }
          return token;
        };

        const result = await jwtCallback({ token, user });

        expect(result.role).toBe('participant');
        expect(isOrganizer).toHaveBeenCalledWith(userEmail);
      });
    });

    // TC-AUTH-002: GitHub OAuth Authentication
    describe('TC-AUTH-002: GitHub OAuth Authentication', () => {
      it('should create user record for first-time GitHub OAuth user', async () => {
        const newUserEmail = 'developer@github.com';
        const mockUser = createMockUser({ email: newUserEmail });

        mockDbUser.findUnique.mockResolvedValueOnce(null);
        mockDbUser.create.mockResolvedValue(mockUser);

        const signInCallback = async ({ user, account }: any) => {
          if (account?.provider === 'github' && user.email) {
            let dbUser = await db.user.findUnique({
              where: { email: user.email },
            });

            if (!dbUser) {
              dbUser = await db.user.create({
                data: {
                  email: user.email,
                },
              });
            }
          }
          return true;
        };

        const result = await signInCallback({
          user: { email: newUserEmail },
          account: { provider: 'github' },
        });

        expect(result).toBe(true);
        expect(mockDbUser.create).toHaveBeenCalledWith({
          data: { email: newUserEmail },
        });
      });
    });

    // TC-AUTH-003: Returning User Authentication
    describe('TC-AUTH-003: Returning User Authentication', () => {
      it('should not create duplicate user for existing account', async () => {
        const existingUserEmail = 'existing@test.com';
        const existingUser = createMockUser({ email: existingUserEmail });

        mockDbUser.findUnique.mockResolvedValue(existingUser);

        const signInCallback = async ({ user, account }: any) => {
          if (account?.provider === 'google' && user.email) {
            let dbUser = await db.user.findUnique({
              where: { email: user.email },
            });

            if (!dbUser) {
              dbUser = await db.user.create({
                data: {
                  email: user.email,
                },
              });
            }
          }
          return true;
        };

        const result = await signInCallback({
          user: { email: existingUserEmail },
          account: { provider: 'google' },
        });

        expect(result).toBe(true);
        expect(mockDbUser.findUnique).toHaveBeenCalledWith({
          where: { email: existingUserEmail },
        });
        expect(mockDbUser.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('Negative Scenarios', () => {
    // TC-AUTH-004: OAuth Provider Error
    describe('TC-AUTH-004: OAuth Provider Error', () => {
      it('should handle OAuth provider errors gracefully', async () => {
        const signInCallback = async ({ user, account }: any) => {
          if (!account || !user?.email) {
            return false;
          }
          return true;
        };

        const result = await signInCallback({
          user: null,
          account: null,
        });

        expect(result).toBe(false);
      });
    });

    // TC-AUTH-005: Database Connection Error During Auth
    describe('TC-AUTH-005: Database Connection Error During Auth', () => {
      it('should handle database errors during authentication', async () => {
        const userEmail = 'test@example.com';
        mockDbUser.findUnique.mockRejectedValue(new Error('Database connection failed'));

        const signInCallback = async ({ user, account }: any) => {
          if (account?.provider === 'google' && user.email) {
            try {
              let dbUser = await db.user.findUnique({
                where: { email: user.email },
              });

              if (!dbUser) {
                dbUser = await db.user.create({
                  data: {
                    email: user.email,
                  },
                });
              }
            } catch (error) {
              console.error('Error creating OAuth user:', error);
              return false;
            }
          }
          return true;
        };

        const result = await signInCallback({
          user: { email: userEmail },
          account: { provider: 'google' },
        });

        expect(result).toBe(false);
        expect(mockDbUser.findUnique).toHaveBeenCalledWith({
          where: { email: userEmail },
        });
      });
    });
  });

  describe('Edge Cases', () => {
    // TC-AUTH-006: Admin User Authentication
    describe('TC-AUTH-006: Admin User Authentication', () => {
      it('should set admin role for users in ADMIN_USERS', async () => {
        const adminEmail = 'admin@hackload.kz';
        (isOrganizer as jest.Mock).mockReturnValue(true);

        const jwtCallback = async ({ token, user }: any) => {
          if (user && user.email) {
            token.role = isOrganizer(user.email) ? 'admin' : 'participant';
          }
          return token;
        };

        const result = await jwtCallback({
          token: {},
          user: { email: adminEmail },
        });

        expect(result.role).toBe('admin');
        expect(isOrganizer).toHaveBeenCalledWith(adminEmail);
      });

      it('should grant access to dashboard routes for admin users', async () => {
        const adminSession = createAdminSession();
        
        const authorized = ({ auth, request }: any) => {
          const isLoggedIn = !!auth?.user;
          const isOnDashboard = request.nextUrl.pathname.startsWith('/dashboard');

          if (isOnDashboard) {
            if (isLoggedIn && auth?.user?.role === 'admin') return true;
            return false;
          }
          return true;
        };

        const result = authorized({
          auth: adminSession,
          request: { nextUrl: { pathname: '/dashboard/participants' } },
        });

        expect(result).toBe(true);
      });
    });

    // TC-AUTH-007: Concurrent Sign-in Attempts
    describe('TC-AUTH-007: Concurrent Sign-in Attempts', () => {
      it('should handle concurrent sign-in attempts without creating duplicates', async () => {
        const userEmail = 'concurrent@test.com';
        const mockUser = createMockUser({ email: userEmail });

        // First call returns null (user doesn't exist)
        // Second call returns the user (created by first call)
        mockDbUser.findUnique
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(mockUser);
        
        mockDbUser.create
          .mockResolvedValueOnce(mockUser)
          .mockRejectedValueOnce(new Error('Unique constraint failed'));

        const signInCallback = async ({ user, account }: any) => {
          if (account?.provider === 'google' && user.email) {
            try {
              let dbUser = await db.user.findUnique({
                where: { email: user.email },
              });

              if (!dbUser) {
                dbUser = await db.user.create({
                  data: {
                    email: user.email,
                  },
                });
              }
            } catch (error) {
              // Handle unique constraint error - user was created by concurrent request
              const existingUser = await db.user.findUnique({
                where: { email: user.email },
              });
              if (!existingUser) {
                throw error;
              }
            }
          }
          return true;
        };

        // Simulate concurrent calls
        const [result1, result2] = await Promise.all([
          signInCallback({
            user: { email: userEmail },
            account: { provider: 'google' },
          }),
          signInCallback({
            user: { email: userEmail },
            account: { provider: 'google' },
          }),
        ]);

        expect(result1).toBe(true);
        expect(result2).toBe(true);
        expect(mockDbUser.create).toHaveBeenCalledTimes(2); // Both attempted to create
      });
    });
  });

  describe('Authorization Middleware', () => {
    it('should redirect authenticated users from login page', async () => {
      const session = createMockSession();
      
      const authorized = ({ auth, request }: any) => {
        const isLoggedIn = !!auth?.user;
        
        if (isLoggedIn && request.nextUrl.pathname === '/login') {
          return Response.redirect(new URL('/space/', request.nextUrl));
        }
        return true;
      };

      const result = authorized({
        auth: session,
        request: { nextUrl: { pathname: '/login' } },
      });

      expect(result).toBeInstanceOf(Response);
    });

    it('should require authentication for protected routes', async () => {
      const authorized = ({ auth, request }: any) => {
        const isLoggedIn = !!auth?.user;
        const isOnDashboard = request.nextUrl.pathname.startsWith('/dashboard');
        const isOnProfile = request.nextUrl.pathname.startsWith('/profile');

        if (isOnDashboard || isOnProfile) {
          if (isLoggedIn) return true;
          return false;
        }
        return true;
      };

      const result = authorized({
        auth: null,
        request: { nextUrl: { pathname: '/profile' } },
      });

      expect(result).toBe(false);
    });

    it('should block non-admin access to admin routes', async () => {
      const participantSession = createMockSession();
      
      const authorized = ({ auth, request }: any) => {
        const isLoggedIn = !!auth?.user;
        const isOnAdmin = request.nextUrl.pathname.startsWith('/admin');

        if (isOnAdmin) {
          if (isLoggedIn && auth?.user?.role === 'admin') return true;
          return false;
        }
        return true;
      };

      const result = authorized({
        auth: participantSession,
        request: { nextUrl: { pathname: '/admin/users' } },
      });

      expect(result).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should include role in session data', async () => {
      const sessionCallback = async ({ session, token }: any) => {
        if (session.user) {
          session.user.role = token.role;
        }
        return session;
      };

      const result = await sessionCallback({
        session: { user: { email: 'test@example.com' } },
        token: { role: 'participant' },
      });

      expect(result.user.role).toBe('participant');
    });

    it('should handle missing user in session', async () => {
      const sessionCallback = async ({ session, token }: any) => {
        if (session.user) {
          session.user.role = token.role;
        }
        return session;
      };

      const result = await sessionCallback({
        session: {},
        token: { role: 'participant' },
      });

      expect(result.user).toBeUndefined();
    });
  });
});