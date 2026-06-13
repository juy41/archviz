/**
 * Thin wrapper around Mermaid that (a) locks down its security settings and
 * (b) returns sanitised SVG.
 *
 * Mermaid is imported lazily (`await import('mermaid')`) so its sizeable bundle
 * is split into its own chunk and only fetched when the first diagram renders —
 * keeping the initial app payload small and the editor responsive.
 */
import type { ThemeName } from '../../hooks/useTheme';
import { sanitizeSvgToString } from '../export/sanitize';

type MermaidModule = typeof import('mermaid')['default'];

let mermaidPromise: Promise<MermaidModule> | null = null;
let configuredTheme: ThemeName | null = null;
let renderSeq = 0;

/** Load Mermaid once and cache the module promise. */
async function loadMermaid(): Promise<MermaidModule> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => m.default);
  }
  return mermaidPromise;
}

/**
 * (Re)configure Mermaid for the active theme.
 *
 * SECURITY (requirement #1): `securityLevel: 'strict'` is the critical setting.
 * It disables `<script>` execution, strips event handlers, ignores `click`
 * directives (no node click handlers), and HTML-escapes all label text. We also
 * disable `htmlLabels` so labels are rendered as plain SVG <text>, never HTML.
 */
async function configure(theme: ThemeName): Promise<MermaidModule> {
  const mermaid = await loadMermaid();
  if (configuredTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: theme === 'dark' ? 'dark' : 'default',
      flowchart: {
        htmlLabels: false,
        curve: 'basis',
        useMaxWidth: true,
        padding: 16,
      },
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    });
    configuredTheme = theme;
  }
  return mermaid;
}

export interface RenderResult {
  /** Sanitised SVG markup, safe to insert into the DOM or export. */
  svg: string;
}

/**
 * Render Mermaid source to a sanitised SVG string.
 *
 * Throws if the source is not valid Mermaid — callers surface that as a
 * render error in the preview pane.
 */
export async function renderDiagram(code: string, theme: ThemeName): Promise<RenderResult> {
  const mermaid = await configure(theme);
  // Mermaid validates first so we can show a precise message instead of leaving
  // half-rendered output in the DOM.
  await mermaid.parse(code);
  const id = `archviz-svg-${renderSeq++}`;
  const { svg } = await mermaid.render(id, code);
  return { svg: sanitizeSvgToString(svg) };
}
