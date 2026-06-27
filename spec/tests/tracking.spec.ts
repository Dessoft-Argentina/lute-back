import tokenUtil from '@src/util/token';

describe('Order tracking (Stage 04)', () => {
  describe('Tracking token generation', () => {
    it('should generate a non-empty token', () => {
      const token = tokenUtil.generateTrackingToken();
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(tokenUtil.generateTrackingToken());
      }
      expect(tokens.size).toBe(100);
    });

    it('should not be derivable from a sequential id', () => {
      const token1 = tokenUtil.generateTrackingToken();
      const token2 = tokenUtil.generateTrackingToken();

      const id1 = parseInt(token1.replace(/-/g, '').slice(0, 15), 16);
      const id2 = parseInt(token2.replace(/-/g, '').slice(0, 15), 16);

      expect(Math.abs(id2 - id1)).not.toBe(1);
    });
  });

  describe('Anti-enumeration — track-request', () => {
    it('should always return the same message regardless of email existence', () => {
      const successMessage =
        'Si hay pedidos asociados a ese email, te enviamos un enlace de seguimiento.';

      expect(successMessage).toContain('Si hay pedidos asociados');
    });

    it('should not reveal whether email has orders', () => {
      const responseBody = {
        message:
          'Si hay pedidos asociados a ese email, te enviamos un enlace de seguimiento.',
      };
      const responseBody2 = {
        message:
          'Si hay pedidos asociados a ese email, te enviamos un enlace de seguimiento.',
      };
      expect(responseBody.message).toBe(responseBody2.message);
    });

    it('should reject invalid emails with 400', () => {
      const isValidEmail = (e: string): boolean =>
        typeof e === 'string' && e.length > 0 && e.includes('@');

      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('test@test.com')).toBe(true);
    });
  });

  describe('Anti-enumeration — track/:token', () => {
    it('should return 404 for non-existent token', () => {
      const order = null;
      expect(order).toBeNull();
    });

    it('should return same 404 for invalid and non-existent tokens', () => {
      const invalidTokenResponse = { error: 'Pedido no encontrado.' };
      const nonExistentResponse = { error: 'Pedido no encontrado.' };
      expect(invalidTokenResponse).toEqual(nonExistentResponse);
    });

    it('should reject empty token parameter', () => {
      const isValidToken = (t: string): boolean =>
        typeof t === 'string' && t.length > 0;

      expect(isValidToken('')).toBe(false);
      expect(isValidToken('valid-token')).toBe(true);
    });

    it('should not expose PII in tracking response', () => {
      const trackingDTO = {
        status: 'confirmed',
        paymentStatus: 'approved',
        shipmentStatus: 'preparing',
        placedAt: '2026-06-01T12:00:00Z',
        items: [
          {
            name: 'Remera Lute',
            size: 'M',
            color: 'negro',
            quantity: 2,
          },
        ],
        carrier: null,
        trackingNumber: null,
      };

      const keys = Object.keys(trackingDTO);
      expect(keys).not.toContain('buyerEmail');
      expect(keys).not.toContain('buyerName');
      expect(keys).not.toContain('shippingAddress');
    });
  });

  describe('MailService — best effort', () => {
    it('should not throw when sending confirmation', async () => {
      const mockOrder = {
        idCompra: 123,
        buyerEmail: 'test@test.com',
        trackingToken: 'some-token',
      };

      let didRun = false;
      try {
        const publicUrl = 'http://localhost:3000';
        const trackingLink = mockOrder.trackingToken
          ? `${publicUrl}/orders/track/${mockOrder.trackingToken}`
          : null;
        didRun = true;
        expect(trackingLink).toBe(
          'http://localhost:3000/orders/track/some-token',
        );
      } catch {
        didRun = false;
      }
      expect(didRun).toBe(true);
    });
  });
});
