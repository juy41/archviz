import { useEffect, useRef, useState } from 'react';
import type { ThemeName } from '../hooks/useTheme';
import { renderDiagram } from '../lib/mermaid/render';
import { sanitizeSvgToFragment } from '../lib/export/sanitize';
import { LogoMark } from './Icons';
import styles from './DiagramPreview.module.css';

interface DiagramPreviewProps {
  /** Generated Mermaid source. */
  code: string;
  /** False when the diagram has no nodes yet (nothing to render). */
  hasContent: boolean;
  theme: ThemeName;
  /** Lifts the sanitised SVG string up so the toolbar can export it. */
  onRendered: (svg: string | null) => void;
}

type Status = 'empty' | 'loading' | 'ready' | 'error';

export function DiagramPreview({
  code,
  hasContent,
  theme,
  onRendered,
}: DiagramPreviewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>('empty');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!hasContent) {
      setStatus('empty');
      containerRef.current?.replaceChildren();
      onRendered(null);
      return;
    }

    // Guard against out-of-order async renders: only the latest effect run is
    // allowed to commit its result to the DOM.
    let active = true;
    setStatus('loading');

    renderDiagram(code, theme)
      .then(({ svg }) => {
        if (!active) return;
        const host = containerRef.current;
        if (host) {
          // Append a sanitised DOM fragment instead of assigning innerHTML, so
          // untrusted Mermaid output never flows through an innerHTML sink.
          host.replaceChildren(sanitizeSvgToFragment(svg));
        }
        onRendered(svg);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        onRendered(null);
        setErrorMessage(error instanceof Error ? error.message : 'Could not render diagram');
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [code, hasContent, theme, onRendered]);

  return (
    <div className={styles.preview}>
      <div
        className={styles.canvas}
        data-status={status}
        ref={containerRef}
        role="img"
        aria-label="Rendered architecture diagram"
      />

      {status === 'loading' && (
        <div className={styles.overlay}>
          <span className={styles.spinner} aria-hidden="true" />
          <span className={styles.overlayText}>Rendering…</span>
        </div>
      )}

      {status === 'empty' && (
        <div className={styles.overlay}>
          <span className={styles.emptyLogo} aria-hidden="true">
            <LogoMark />
          </span>
          <p className={styles.emptyText}>Your diagram will appear here</p>
          <p className={styles.emptyHint}>Type a connection like “Web -&gt; API” to begin</p>
        </div>
      )}

      {status === 'error' && (
        <div className={`${styles.overlay} ${styles.errorOverlay}`} role="alert">
          <p className={styles.errorTitle}>Couldn’t render this diagram</p>
          <p className={styles.errorDetail}>{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
