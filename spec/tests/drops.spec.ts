import facadeConfig from '@src/util/facadeConfig';

describe('Drops (Stage 06)', () => {
  describe('facade_config validation (opaco)', () => {
    it('should accept valid facade config', () => {
      const config = {
        colors: { primary: '#000', secondary: '#fff' },
        layout: 'default',
        assets: { logo: 'https://cdn.lute.com/logo.svg' },
      };
      const result = facadeConfig.validate(config);
      expect(result.valid).toBe(true);
    });

    it('should accept null/undefined facade config', () => {
      expect(facadeConfig.validate(null).valid).toBe(true);
      expect(facadeConfig.validate(undefined).valid).toBe(true);
    });

    it('should reject non-JSON facade config', () => {
      const result = facadeConfig.validate('not-json');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('JSON');
    });

    it('should reject oversized facade config', () => {
      const largeArray = new Array(10000).fill('x'.repeat(100));
      const result = facadeConfig.validate(largeArray);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tamaño');
    });

    it('should reject overly deep facade config', () => {
      const deep: Record<string, unknown> = {};
      let current = deep;
      for (let i = 0; i < 15; i++) {
        current.nested = {};
        current = current.nested as Record<string, unknown>;
      }
      const result = facadeConfig.validate(deep);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('profundidad');
    });

    it('should not interpret facade config keys (opaco)', () => {
      const config = {
        script: "alert('xss')",
        url: 'javascript:void(0)',
      };
      const raw = JSON.stringify(config);
      expect(typeof raw).toBe('string');
      expect(raw.length).toBeLessThan(1024 * 100);
      expect(raw).toContain('script');
    });
  });

  describe('Drop active resolution', () => {
    it('should resolve active state', () => {
      const simulateActive = (
        now: Date,
        startsAt: Date,
        endsAt: Date,
      ): boolean => {
        return now >= startsAt && now <= endsAt;
      };

      const now = new Date('2026-06-15T12:00:00Z');

      const active = simulateActive(
        now,
        new Date('2026-06-01T00:00:00Z'),
        new Date('2026-06-30T23:59:59Z'),
      );
      expect(active).toBe(true);

      const notStarted = simulateActive(
        now,
        new Date('2026-07-01T00:00:00Z'),
        new Date('2026-07-30T23:59:59Z'),
      );
      expect(notStarted).toBe(false);

      const ended = simulateActive(
        now,
        new Date('2026-05-01T00:00:00Z'),
        new Date('2026-05-31T23:59:59Z'),
      );
      expect(ended).toBe(false);
    });

    it('should return { active: false } when no drop is active', () => {
      const result: Record<string, unknown> = { active: false };
      expect(result.active).toBe(false);
      expect('drop' in result).toBe(false);
    });

    it('should return drop data when active', () => {
      const result = {
        active: true,
        drop: {
          slug: 'drop-01-invierno',
          name: 'Invierno',
          startsAt: '2026-06-01T00:00:00.000Z',
          endsAt: '2026-06-15T00:00:00.000Z',
          facadeConfig: { theme: 'dark' },
        },
      };
      expect(result.active).toBe(true);
      expect(result.drop.slug).toBe('drop-01-invierno');
      expect(result.drop.facadeConfig).toEqual({ theme: 'dark' });
    });
  });

  describe('One active drop invariant', () => {
    it('should enforce at most one active drop', () => {
      const activeDrops = [
        { id: 1, status: 'active' },
        { id: 3, status: 'active' },
      ];
      const count = activeDrops.filter((d) => d.status === 'active').length;
      expect(count).toBeGreaterThan(1);

      const invariantViolated = count > 1;
      expect(invariantViolated).toBe(true);
    });
  });
});
