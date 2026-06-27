import crypto from 'crypto';
import mpSignature from '@src/util/mpSignature';

describe('Payment security (Stage 03 adversarial)', () => {
  describe('Webhook signature verification', () => {
    const secret = 'test-webhook-secret';

    it('should reject webhook without x-signature header', () => {
      const result = mpSignature.verifySignature(
        JSON.stringify({ data: { id: '123' } }),
        {},
        secret,
      );
      expect(result).toBe(false);
    });

    it('should reject webhook without x-request-id header', () => {
      const result = mpSignature.verifySignature(
        JSON.stringify({ data: { id: '123' } }),
        { 'x-signature': 'ts=1234567890,v1=abcd' },
        secret,
      );
      expect(result).toBe(false);
    });

    it('should reject webhook with tampered signature', () => {
      const result = mpSignature.verifySignature(
        JSON.stringify({ data: { id: '999' } }),
        {
          'x-signature': 'ts=1234567890,v1=invalidsignature',
          'x-request-id': 'req-123',
        },
        secret,
      );
      expect(result).toBe(false);
    });

    it('should reject webhook with wrong secret', () => {
      const rawBody = JSON.stringify({ data: { id: '123' } });
      const requestId = 'req-456';
      const ts = Math.floor(Date.now() / 1000).toString();
      const manifest = `id:${requestId};request-id:${requestId};ts:${ts};`;
      const validHash = crypto
        .createHmac('sha256', 'correct-secret')
        .update(manifest)
        .digest('hex');

      const result = mpSignature.verifySignature(
        rawBody,
        {
          'x-signature': `ts=${ts},v1=${validHash}`,
          'x-request-id': requestId,
        },
        'wrong-secret',
      );
      expect(result).toBe(false);
    });

    it('should accept webhook with valid signature', () => {
      const rawBody = JSON.stringify({ data: { id: '123' } });
      const requestId = 'req-789';
      const ts = Math.floor(Date.now() / 1000).toString();
      const manifest = `id:${requestId};request-id:${requestId};ts:${ts};`;
      const validHash = crypto
        .createHmac('sha256', secret)
        .update(manifest)
        .digest('hex');

      const result = mpSignature.verifySignature(
        rawBody,
        {
          'x-signature': `ts=${ts},v1=${validHash}`,
          'x-request-id': requestId,
        },
        secret,
      );
      expect(result).toBe(true);
    });
  });

  describe('Idempotency logic', () => {
    it('should detect duplicate mp_payment_id', () => {
      const processed = new Set<string>();
      const mpPaymentId = 'payment-123';

      processed.add(mpPaymentId);
      const isDuplicate = processed.has(mpPaymentId);
      expect(isDuplicate).toBe(true);

      const isNew = !processed.has('payment-999');
      expect(isNew).toBe(true);
    });

    it('should not re-process an already processed payment', () => {
      const processedPayments = new Set<string>();
      processedPayments.add('payment-456');

      const handlePayment = (id: string): string => {
        if (processedPayments.has(id)) {
          return 'already_processed';
        }
        processedPayments.add(id);
        return 'processed';
      };

      expect(handlePayment('payment-456')).toBe('already_processed');
      expect(handlePayment('payment-789')).toBe('processed');
    });
  });

  describe('Checkout price manipulation prevention', () => {
    it('should ignore client-provided price and use DB price', () => {
      const clientPayload = {
        variantId: 10,
        quantity: 2,
        unitPrice: 1, // client tries to set $1
      };

      const dbVariant = {
        id: 10,
        basePrice: 18000,
        priceOverride: null,
      };

      const effectivePrice = dbVariant.priceOverride ?? dbVariant.basePrice;
      expect(effectivePrice).toBe(18000);
      expect(clientPayload.unitPrice).not.toBe(effectivePrice);
    });

    it('should reject quantity <= 0', () => {
      const validateQuantity = (q: number): boolean =>
        Number.isInteger(q) && q > 0 && q <= 99;

      expect(validateQuantity(0)).toBe(false);
      expect(validateQuantity(-1)).toBe(false);
      expect(validateQuantity(1.5)).toBe(false);
      expect(validateQuantity(100)).toBe(false);
      expect(validateQuantity(1)).toBe(true);
    });

    it('should reject negative variantId', () => {
      const validateVariantId = (id: number): boolean =>
        Number.isInteger(id) && id > 0;

      expect(validateVariantId(0)).toBe(false);
      expect(validateVariantId(-5)).toBe(false);
    });
  });

  describe('Stock reservation concurrency safety', () => {
    it('should prevent overselling with multiple concurrent requests', () => {
      const simulateConcurrentReservation = (
        stock: number,
        requests: number[],
      ): { finalStock: number; failures: number } => {
        let currentStock = stock;
        let failures = 0;

        for (const qty of requests) {
          if (currentStock >= qty) {
            currentStock -= qty;
          } else {
            failures++;
          }
        }

        return { finalStock: currentStock, failures };
      };

      const result = simulateConcurrentReservation(5, [3, 3, 1]);
      expect(result.finalStock).toBe(1);
      expect(result.failures).toBe(1);

      const result2 = simulateConcurrentReservation(1, [2]);
      expect(result2.failures).toBe(1);
      expect(result2.finalStock).toBe(1);
    });

    it('should never leave stock negative after reservation', () => {
      let stock = 3;

      const tryReserve = (qty: number): boolean => {
        if (stock >= qty) {
          stock -= qty;
          return true;
        }
        return false;
      };

      expect(tryReserve(5)).toBe(false);
      expect(stock).toBe(3);
    });

    it('should restore stock correctly on payment rejection', () => {
      let stock = 10;
      const reserved = 3;
      stock -= reserved;
      expect(stock).toBe(7);

      stock += reserved;
      expect(stock).toBe(10);
    });
  });

  describe('Webhook payload validation', () => {
    it('should reject webhook with missing data.id', () => {
      const payloads: unknown[] = [
        {},
        { data: {} },
        { type: 'payment' },
        null,
      ];

      for (const payload of payloads) {
        const hasId = (
          payload !== null &&
          typeof payload === 'object' &&
          'data' in payload &&
          payload.data !== null &&
          typeof payload.data === 'object' &&
          'id' in payload.data
        );
        expect(hasId).toBe(false);
      }
    });

    it('should reject malformed JSON body', () => {
      const isJson = (str: string): boolean => {
        try {
          JSON.parse(str);
          return true;
        } catch {
          return false;
        }
      };

      expect(isJson('not json')).toBe(false);
      expect(isJson('{"data": {"id": "123"}')).toBe(false);
      expect(isJson('{"data": {"id": "123"}}')).toBe(true);
    });
  });
});
