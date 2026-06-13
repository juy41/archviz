import { describe, expect, it } from 'vitest';
import { decodeState, encodeState, isValidShareState } from './url';

describe('share URL — state validation (security)', () => {
  it('accepts a well-formed state', () => {
    expect(isValidShareState({ v: 1, code: 'A -> B' })).toBe(true);
  });

  it('rejects non-objects and null', () => {
    expect(isValidShareState(null)).toBe(false);
    expect(isValidShareState('A -> B')).toBe(false);
    expect(isValidShareState(42)).toBe(false);
  });

  it('rejects a wrong/missing schema version', () => {
    expect(isValidShareState({ v: 2, code: 'A -> B' })).toBe(false);
    expect(isValidShareState({ code: 'A -> B' })).toBe(false);
  });

  it('rejects a missing or non-string code field', () => {
    expect(isValidShareState({ v: 1 })).toBe(false);
    expect(isValidShareState({ v: 1, code: 123 })).toBe(false);
  });

  it('rejects an oversized code payload', () => {
    expect(isValidShareState({ v: 1, code: 'x'.repeat(40 * 1024 + 1) })).toBe(false);
  });
});

describe('share URL — encode/decode round trip', () => {
  it('round-trips arbitrary DSL source', async () => {
    const code = 'direction LR\n"Load Balancer" -> API : HTTPS\nAPI [service]';
    const token = await encodeState({ v: 1, code });
    const decoded = await decodeState(token);
    expect(decoded).toEqual({ v: 1, code });
  });

  it('produces a URL-safe token (no +, /, = or whitespace)', async () => {
    const token = await encodeState({ v: 1, code: 'A -> B'.repeat(50) });
    expect(token).toMatch(/^[cu][A-Za-z0-9_-]+$/);
  });

  it('returns null for a garbage token instead of throwing', async () => {
    expect(await decodeState('c!!!not-base64!!!')).toBeNull();
    expect(await decodeState('')).toBeNull();
    expect(await decodeState('zxxxx')).toBeNull(); // unknown codec flag
  });

  it('returns null for an over-long token before doing any work', async () => {
    expect(await decodeState('c' + 'a'.repeat(60 * 1024))).toBeNull();
  });
});
