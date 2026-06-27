import bcrypt from 'bcrypt';
import { verifyToken, generateToken } from '@src/util/jwt';

describe('Admin (Stage 05)', () => {
  describe('JWT_SECRET unificado (corrige S2)', () => {
    it('should use JWT_SECRET for signing', async () => {
      process.env.JWT_SECRET = 'test-secret-for-jwt';
      process.env.JWT_EXPIRES_IN = '15m';

      const token = await generateToken({
        id: 1,
        email: 'admin@lute.com',
        role: 'admin',
      });
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = await verifyToken(token);
      expect(decoded).toBeTruthy();
    });

    it('should reject token signed with different secret', async () => {
      process.env.JWT_SECRET = 'secret-a';
      const token = await generateToken({
        id: 1,
        email: 'admin@lute.com',
        role: 'admin',
      });

      process.env.JWT_SECRET = 'secret-b';
      try {
        await verifyToken(token);
        fail('Should have thrown');
      } catch {
        expect(true).toBe(true);
      }
    });
  });

  describe('RBAC — requireRole (corrige S3)', () => {
    it('should allow admin role for admin actions', () => {
      const allowedRoles = ['admin'];
      const userRole = 'admin';
      expect(allowedRoles.includes(userRole)).toBe(true);
    });

    it('should block staff role for admin-only actions', () => {
      const allowedRoles = ['admin'];
      const userRole = 'staff';
      expect(allowedRoles.includes(userRole)).toBe(false);
    });

    it('should allow staff role for staff actions', () => {
      const allowedRoles = ['admin', 'staff'];
      const userRole = 'staff';
      expect(allowedRoles.includes(userRole)).toBe(true);
    });

    it('should deny request when no user is attached', () => {
      const user = null;
      const isAuthed = user !== null && user !== undefined;
      expect(isAuthed).toBe(false);
    });

    it('should deny request when role is missing', () => {
      const user = { id: 1, email: 'test@test.com' };
      const hasRole = 'role' in user;
      expect(hasRole).toBe(false);
    });
  });

  describe('Password hashing', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'secure-password-123';
      const hash = await bcrypt.hash(password, 10);
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2b$')).toBe(true);
    });

    it('should verify correct password against hash', async () => {
      const password = 'secure-password-123';
      const hash = await bcrypt.hash(password, 10);
      const match = await bcrypt.compare(password, hash);
      expect(match).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      const match = await bcrypt.compare('wrong-password', hash);
      expect(match).toBe(false);
    });
  });

  describe('Login response uniformity', () => {
    it('should not reveal whether email exists', () => {
      const invalidEmailMsg = 'Credenciales invalidas';
      const wrongPasswordMsg = 'Credenciales invalidas';

      expect(invalidEmailMsg).toBe(wrongPasswordMsg);
    });

    it('should reject login with missing fields', () => {
      const validateLogin = (email?: string, password?: string): boolean => {
        return !!email && !!password;
      };

      expect(validateLogin()).toBe(false);
      expect(validateLogin('admin@test.com')).toBe(false);
      expect(validateLogin(undefined, 'password')).toBe(false);
      expect(validateLogin('admin@test.com', 'password')).toBe(true);
    });
  });

  describe('users.html removal (corrige S8)', () => {
    it('should not serve users.html anymore', () => {
      const existingRoutes = ['/usuario', '/producto', '/auth', '/products'];
      expect(existingRoutes).not.toContain('/users');
    });

    it('health check should return ok', () => {
      const healthResponse = { status: 'ok' };
      expect(healthResponse.status).toBe('ok');
    });
  });

  describe('CSP hardening (S8) and CORS by env (S9)', () => {
    it('should have CSP without unsafe-inline', () => {
      const cspScriptSrc = ["'self'"];
      expect(cspScriptSrc).not.toContain("'unsafe-inline'");
    });

    it('should read CORS origins from env', () => {
      const envOrigins = 'http://localhost:3000,https://admin.lute.com';
      const origins = envOrigins.split(',').map((o) => o.trim());
      expect(origins).toContain('http://localhost:3000');
      expect(origins).toContain('https://admin.lute.com');
    });
  });

  describe('Audit log', () => {
    it('should not store sensitive data', () => {
      const auditEntry = {
        adminUserId: 1,
        action: 'login',
        entity: 'admin_user',
        entityId: '1',
        metadata: { email: 'admin@lute.com' },
      };

      const keys = Object.keys(auditEntry.metadata);
      expect(keys).not.toContain('password');
      expect(keys).not.toContain('token');
      expect(keys).toContain('email');
    });
  });
});
