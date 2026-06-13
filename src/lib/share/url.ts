/**
 * Stateless share-by-URL: the whole editor state is encoded into the URL hash,
 * with no backend and no storage involved.
 *
 * Pipeline: JSON → UTF-8 bytes → gzip (native CompressionStream) → base64url,
 * prefixed with a one-char codec flag. Decoding reverses it inside a guarded
 * block that validates size and structure before trusting anything.
 *
 * SECURITY (requirement #3): a shared link is fully untrusted input. We:
 *   - cap the encoded token length BEFORE any decoding (cheap DoS guard),
 *   - cap the decoded/decompressed byte length (zip-bomb guard),
 *   - parse JSON inside try/catch and validate every field against a schema,
 *   - return `null` (→ caller falls back to the default doc) on any mismatch,
 *   - NEVER eval or otherwise execute decoded content.
 */
import { DIRECTIONS, type Direction } from '../types';

/** Schema version, so old links can be migrated or rejected later. */
const SCHEMA_VERSION = 1 as const;

/** Hard limits. 50 KB of source comfortably covers very large diagrams. */
const MAX_TOKEN_CHARS = 50 * 1024;
const MAX_DECODED_BYTES = 50 * 1024;
const MAX_CODE_CHARS = 40 * 1024;

const HASH_KEY = 'd';

export interface ShareState {
  v: typeof SCHEMA_VERSION;
  /** The DSL source. Layout direction lives inside the source itself. */
  code: string;
}

/* --------------------------------- base64url -------------------------------- */

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/* ------------------------------- (de)compress ------------------------------- */

const hasCompression = typeof CompressionStream !== 'undefined';

async function pipeThrough(transform: TransformStream, input: Uint8Array): Promise<Uint8Array> {
  // `input` is always backed by a plain ArrayBuffer here; the cast satisfies
  // TS's typed-array generics (which allow a SharedArrayBuffer backing in general).
  const stream = new Blob([input as BlobPart]).stream().pipeThrough(transform);
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

/* --------------------------------- validate -------------------------------- */

/** Validate untrusted parsed JSON against the ShareState schema. */
function validate(value: unknown): ShareState | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record.v !== SCHEMA_VERSION) return null;
  if (typeof record.code !== 'string') return null;
  if (record.code.length > MAX_CODE_CHARS) return null;
  return { v: SCHEMA_VERSION, code: record.code };
}

/** Best-effort structural check helper, exported for unit testing. */
export function isValidShareState(value: unknown): value is ShareState {
  return validate(value) !== null;
}

/** Whitelist of layout directions, exposed for reuse/testing. */
export function isDirection(value: string): value is Direction {
  return (DIRECTIONS as readonly string[]).includes(value);
}

/* --------------------------------- encode ---------------------------------- */

/** Encode editor state into a compact, URL-safe token. */
export async function encodeState(state: ShareState): Promise<string> {
  const json = JSON.stringify(state);
  const raw = new TextEncoder().encode(json);
  if (hasCompression) {
    const compressed = await pipeThrough(new CompressionStream('gzip'), raw);
    return `c${bytesToBase64Url(compressed)}`;
  }
  // Fallback for the rare environment without CompressionStream: store raw.
  return `u${bytesToBase64Url(raw)}`;
}

/** Decode a token back into validated state, or `null` if anything is off. */
export async function decodeState(token: string): Promise<ShareState | null> {
  try {
    if (!token || token.length > MAX_TOKEN_CHARS) return null;
    const flag = token[0];
    const bytes = base64UrlToBytes(token.slice(1));
    if (bytes.length > MAX_DECODED_BYTES) return null;

    let jsonBytes: Uint8Array;
    if (flag === 'c') {
      if (typeof DecompressionStream === 'undefined') return null;
      jsonBytes = await pipeThrough(new DecompressionStream('gzip'), bytes);
      if (jsonBytes.length > MAX_DECODED_BYTES) return null; // decompressed-size guard
    } else if (flag === 'u') {
      jsonBytes = bytes;
    } else {
      return null;
    }

    const parsed: unknown = JSON.parse(new TextDecoder().decode(jsonBytes));
    return validate(parsed);
  } catch {
    // Malformed base64, bad gzip, invalid JSON — fall back to the default doc.
    return null;
  }
}

/* ------------------------------- URL helpers ------------------------------- */

/** Build a shareable absolute URL for the given editor source. */
export async function buildShareUrl(code: string): Promise<string> {
  const token = await encodeState({ v: SCHEMA_VERSION, code });
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${HASH_KEY}=${token}`;
}

/** Read + decode editor state from the current URL hash, if present. */
export async function readStateFromUrl(): Promise<ShareState | null> {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const token = params.get(HASH_KEY);
  if (!token) return null;
  return decodeState(token);
}

/** Remove the share token from the address bar without reloading. */
export function clearUrlState(): void {
  const { origin, pathname } = window.location;
  window.history.replaceState(null, '', `${origin}${pathname}`);
}
