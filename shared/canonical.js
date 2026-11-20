// Exact verimark-v1 bytes, shared by Node and browser. No Unicode normalization.
export function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isSafeInteger(value) && !Object.is(value, -0)) return String(value);
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) if (!Object.hasOwn(value, i)) throw new Error('Sparse arrays are not JSON');
    return '[' + value.map(canonical).join(',') + ']';
  }
  if (value && Object.getPrototypeOf(value) === Object.prototype) return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  throw new Error('Unsupported canonical value: use JSON with safe integers');
}
export const protocolBytes = (domain, value) => new TextEncoder().encode(`VERIMARK/v1/${domain}\0${canonical(value)}`);
export function compareDisplayedResult(verification, displayed) {
  if (!['VALID_CURRENT', 'VALID_HISTORICAL'].includes(verification.status) || !verification.result) return { status: 'INCOMPLETE', failures: [{ code: 'NO_VERIFIED_RESULT' }] };
  try {
    if (canonical(verification.result) === canonical(displayed)) return verification;
  } catch { /* A malformed display claim is not authenticated. */ }
  return { status: 'INVALID', failures: [{ code: 'DISPLAYED_RESULT_MISMATCH' }] };
}
