import { Op } from 'sequelize';
import { Drop, IDrop } from '@src/models/Drop';

async function findActiveWindow(now: Date): Promise<IDrop | null> {
  const drop = await Drop.findOne({
    where: {
      status: 'active',
      startsAt: { [Op.lte]: now },
      endsAt: { [Op.gte]: now },
    },
    order: [['startsAt', 'DESC']],
  });
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return drop ? (drop.toJSON() as IDrop) : null;
}

async function findById(id: number): Promise<IDrop | null> {
  const drop = await Drop.findByPk(id);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return drop ? (drop.toJSON() as IDrop) : null;
}

async function updateStatus(id: number, status: string): Promise<void> {
  await Drop.update({ status }, { where: { id } });
}

async function deactivateAllActive(): Promise<void> {
  await Drop.update({ status: 'ended' }, { where: { status: 'active' } });
}

export default {
  findActiveWindow,
  findById,
  updateStatus,
  deactivateAllActive,
};
