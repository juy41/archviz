/**
 * Lightweight syntax tokeniser for the editor overlay.
 *
 * This is deliberately separate from the real {@link parse} grammar: it only
 * needs to be good enough to colour tokens as you type, and must be cheap to run
 * on every keystroke. It returns plain token objects; the Editor renders each as
 * a React <span>, so the user's text is escaped by React (never via innerHTML)
 * — keeping the highlight overlay XSS-safe (security requirement #1).
 */
export type TokenType =
  | 'comment'
  | 'keyword'
  | 'operator'
  | 'type'
  | 'string'
  | 'label'
  | 'node'
  | 'plain';

export interface HighlightToken {
  text: string;
  type: TokenType;
}

// Quoted string | edge operator | [type] bracket | group/direction keyword |
// trailing ": label" / "| label".
const TOKEN_RE =
  /("(?:[^"\\]|\\.)*")|(<->|-->|->)|(\[[A-Za-z]*\])|\b(group|direction)\b|([:|]\s*.*)$/g;

const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Split a plain run into identifier ("node") vs other ("plain") tokens. */
function splitPlain(text: string): HighlightToken[] {
  return text
    .split(/(\s+)/)
    .filter((part) => part !== '')
    .map((part) => ({ text: part, type: IDENTIFIER_RE.test(part) ? 'node' : 'plain' }) as const);
}

/** Tokenise a single line of DSL for highlighting. */
export function tokenizeLine(line: string): HighlightToken[] {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return [{ text: line, type: 'comment' }];
  }

  const tokens: HighlightToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;

  while ((match = TOKEN_RE.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(...splitPlain(line.slice(lastIndex, match.index)));
    }
    if (match[1]) tokens.push({ text: match[1], type: 'string' });
    else if (match[2]) tokens.push({ text: match[2], type: 'operator' });
    else if (match[3]) tokens.push({ text: match[3], type: 'type' });
    else if (match[4]) tokens.push({ text: match[0], type: 'keyword' });
    else if (match[5]) tokens.push({ text: match[5], type: 'label' });

    lastIndex = TOKEN_RE.lastIndex;
    // Guard against zero-length matches looping forever.
    if (match.index === TOKEN_RE.lastIndex) TOKEN_RE.lastIndex++;
  }

  if (lastIndex < line.length) {
    tokens.push(...splitPlain(line.slice(lastIndex)));
  }
  return tokens;
}
