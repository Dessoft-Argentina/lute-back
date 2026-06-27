import { AdminUser, IAdminUser } from '@src/models/AdminUser';

async function findByEmail(email: string): Promise<IAdminUser | null> {
  const user = await AdminUser.findOne({ where: { email } });
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return user ? (user.toJSON() as IAdminUser) : null;
}

async function findById(id: number): Promise<IAdminUser | null> {
  const user = await AdminUser.findByPk(id);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return user ? (user.toJSON() as IAdminUser) : null;
}

export default {
  findByEmail,
  findById,
};
