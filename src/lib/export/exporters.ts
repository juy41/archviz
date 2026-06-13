/**
 * Export & clipboard helpers.
 *
 * SECURITY (requirement #8): downloads use Blob + object URLs with explicit,
 * correct MIME types and a hard-coded, sanitised filename — user input never
 * reaches the filename, so there is no header/path injection surface. Clipboard
 * actions use the standard async Clipboard API and fail soft.
 *
 * SECURITY (requirement #2): every SVG is re-sanitised at the export boundary,
 * even though it was already sanitised when rendered.
 */
import { sanitizeSvgToString } from './sanitize';

/** Strip anything that isn't a safe filename character. */
function safeFilename(name: string, extension: string): string {
  const base = name.replace(/[^a-z0-9_-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${base || 'architecture'}.${extension}`;
}

/** Trigger a browser download for a Blob, cleaning up the object URL after. */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Download the diagram as a sanitised, standalone SVG file. */
export function downloadSvg(svg: string, name = 'architecture'): void {
  const clean = sanitizeSvgToString(svg);
  const blob = new Blob([clean], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownload(blob, safeFilename(name, 'svg'));
}

/** Read intrinsic dimensions from an SVG string via its width/height or viewBox. */
function readSvgSize(svg: string): { width: number; height: number } {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  const widthAttr = parseFloat(root.getAttribute('width') ?? '');
  const heightAttr = parseFloat(root.getAttribute('height') ?? '');
  if (Number.isFinite(widthAttr) && Number.isFinite(heightAttr) && widthAttr > 0) {
    return { width: widthAttr, height: heightAttr };
  }
  const viewBox = root.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }
  return { width: 1200, height: 800 };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to rasterize SVG'));
    img.src = src;
  });
}

export interface PngOptions {
  /** Pixel-density multiplier for crisp output. */
  scale?: number;
  /** Solid background colour, or `null`/omitted for transparency. */
  background?: string | null;
}

/**
 * Download the diagram as a PNG by rasterising the sanitised SVG onto a canvas.
 *
 * The SVG is loaded from a `data:` URL containing only inline, sanitised markup
 * (no external references), so the canvas is never tainted and `toBlob` works.
 */
export async function downloadPng(
  svg: string,
  name = 'architecture',
  options: PngOptions = {},
): Promise<void> {
  const { scale = 2, background = null } = options;
  const clean = sanitizeSvgToString(svg);
  const { width, height } = readSvgSize(clean);

  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(clean)}`;
  const img = await loadImage(dataUrl);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!blob) throw new Error('PNG encoding failed');
  triggerDownload(blob, safeFilename(name, 'png'));
}

/**
 * Copy text to the clipboard using the standard async API.
 * Returns `false` (rather than throwing) when the API is blocked/unavailable.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  // Legacy fallback for non-secure contexts / older browsers.
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Wrap Mermaid source in a fenced code block ready to paste into a README. */
export function asMermaidCodeBlock(mermaid: string): string {
  return `\`\`\`mermaid\n${mermaid}\n\`\`\``;
}
