import DropRepo from '@src/repos/DropRepo';

export interface ActiveDropResult {
  active: boolean;
  drop?: {
    slug: string;
    name: string;
    startsAt: string;
    endsAt: string;
    facadeConfig: Record<string, unknown> | null;
  };
}

async function getActive(): Promise<ActiveDropResult> {
  const drop = await DropRepo.findActiveWindow(new Date());

  if (!drop) {
    return { active: false };
  }

  return {
    active: true,
    drop: {
      slug: drop.slug,
      name: drop.name,
      startsAt: drop.startsAt.toISOString(),
      endsAt: drop.endsAt.toISOString(),
      facadeConfig: drop.facadeConfig,
    },
  };
}

async function getActiveDropId(): Promise<number | null> {
  const drop = await DropRepo.findActiveWindow(new Date());
  return drop ? drop.id : null;
}

export default {
  getActive,
  getActiveDropId,
};
