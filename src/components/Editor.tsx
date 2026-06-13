import { useCallback, useMemo, useRef } from 'react';
import { tokenizeLine } from '../lib/parser/highlight';
import type { ParseError } from '../lib/types';
import { AlertIcon } from './Icons';
import styles from './Editor.module.css';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  errors: ParseError[];
}

/**
 * The DSL editor: a transparent <textarea> layered over a syntax-highlighted
 * <pre>, with a line-number gutter and an error list.
 *
 * The highlight layer renders each token as a React <span>; because React
 * escapes text content, untrusted user input is NEVER written through innerHTML
 * (security requirement #1). The actual editing surface remains a plain
 * textarea, so caret behaviour, IME, and accessibility all "just work".
 */
export function Editor({ value, onChange, errors }: EditorProps): JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => value.split('\n'), [value]);
  const errorLines = useMemo(() => new Set(errors.map((e) => e.line)), [errors]);

  // Keep the highlight overlay and gutter perfectly aligned with the textarea
  // as it scrolls in either direction.
  const handleScroll = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = ta.scrollTop;
      highlightRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = ta.scrollTop;
    }
  }, []);

  // Insert two spaces on Tab so indentation works inside the textarea.
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== 'Tab') return;
      event.preventDefault();
      const ta = event.currentTarget;
      const { selectionStart, selectionEnd } = ta;
      const next = `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`;
      onChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = selectionStart + 2;
      });
    },
    [value, onChange],
  );

  // Move the caret to the start of a given (1-based) line and focus the editor.
  const focusLine = useCallback(
    (line: number) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const offset = lines.slice(0, line - 1).reduce((sum, l) => sum + l.length + 1, 0);
      ta.focus();
      ta.setSelectionRange(offset, offset + (lines[line - 1]?.length ?? 0));
    },
    [lines],
  );

  return (
    <div className={styles.editor}>
      <div className={styles.surface}>
        <div className={styles.gutter} ref={gutterRef} aria-hidden="true">
          {lines.map((_, index) => (
            <div
              key={index}
              className={errorLines.has(index + 1) ? styles.gutterError : undefined}
            >
              {index + 1}
            </div>
          ))}
        </div>

        <div className={styles.codeWrap}>
          {/* Highlight overlay — purely presentational, mirrors the textarea text. */}
          <pre className={styles.highlight} ref={highlightRef} aria-hidden="true">
            <code>
              {lines.map((line, index) => (
                <span className={styles.line} key={index}>
                  {tokenizeLine(line).map((token, tIndex) => (
                    <span key={tIndex} className={styles[token.type]}>
                      {token.text}
                    </span>
                  ))}
                  {index < lines.length - 1 ? '\n' : ''}
                </span>
              ))}
            </code>
          </pre>

          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            wrap="off"
            aria-label="Architecture diagram source code"
            aria-describedby={errors.length > 0 ? 'editor-errors' : undefined}
            placeholder="Describe your system, e.g.  Web -> API : HTTPS"
          />
        </div>
      </div>

      <div
        className={styles.statusBar}
        id="editor-errors"
        role="status"
        aria-live="polite"
        data-state={errors.length > 0 ? 'error' : 'ok'}
      >
        {errors.length === 0 ? (
          <span className={styles.statusOk}>
            {lines.filter((l) => l.trim()).length > 0
              ? 'No syntax errors'
              : 'Start typing to draw your diagram'}
          </span>
        ) : (
          <ul className={styles.errorList}>
            {errors.map((error, index) => (
              <li key={index}>
                <button
                  type="button"
                  className={styles.errorItem}
                  onClick={() => focusLine(error.line)}
                >
                  <AlertIcon className={styles.errorIcon} />
                  <span className={styles.errorLine}>
                    Line {error.line}:{error.column}
                  </span>
                  <span className={styles.errorMsg}>{error.message}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
