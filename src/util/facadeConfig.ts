const MAX_SIZE_BYTES = 1024 * 100;
const MAX_DEPTH = 10;

interface ValidationResult {
  valid: boolean;
  error?: string;
}

function getDepth(value: unknown, currentDepth: number = 0): number {
  if (currentDepth > MAX_DEPTH) return currentDepth;
  if (Array.isArray(value)) {
    return Math.max(
      currentDepth,
      ...value.map((v) => getDepth(v, currentDepth + 1)),
    );
  }
  if (value !== null && typeof value === 'object') {
    return Math.max(
      currentDepth,
      ...Object.values(value).map((v) => getDepth(v, currentDepth + 1)),
    );
  }
  return currentDepth;
}

function validate(blob: unknown): ValidationResult {
  if (blob === null || blob === undefined) {
    return { valid: true };
  }

  const raw = typeof blob === 'string' ? blob : JSON.stringify(blob);

  if (raw.length > MAX_SIZE_BYTES) {
    return { valid: false, error: `facade_config excede el tamaño máximo (${MAX_SIZE_BYTES} bytes)` };
  }

  let parsed: unknown;
  try {
    parsed = typeof blob === 'string' ? JSON.parse(blob) : blob;
  } catch (_e) {
    return { valid: false, error: 'facade_config no es JSON válido' };
  }

  const depth = getDepth(parsed);
  if (depth > MAX_DEPTH) {
    return { valid: false, error: `facade_config excede la profundidad máxima (${MAX_DEPTH})` };
  }

  return { valid: true };
}

export default {
  validate,
};
