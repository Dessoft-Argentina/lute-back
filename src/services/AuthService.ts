import bcrypt from 'bcrypt';
import AdminUserRepo from '@src/repos/AdminUserRepo';
import { generateToken } from '@src/util/jwt';
import AuditService from '@src/services/AuditService';

export interface LoginResult {
  token: string;
  role: 'admin' | 'staff';
}

async function loginAdmin(
  email: string,
  password: string,
): Promise<LoginResult> {
  const user = await AdminUserRepo.findByEmail(email);

  if (!user || !user.isActive) {
    throw new Error('Credenciales invalidas');
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new Error('Credenciales invalidas');
  }

  const token = await generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  await AuditService.record(
    user.id,
    'login',
    'admin_user',
    String(user.id),
    { email: user.email },
  );

  return { token, role: user.role };
}

export default {
  loginAdmin,
};
