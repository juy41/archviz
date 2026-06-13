/**
 * SVG sanitisation (security requirement #2).
 *
 * Everything Mermaid produces is treated as untrusted output and scrubbed with
 * DOMPurify before it ever touches the live DOM or gets written to a file.
 * DOMPurify's SVG profile keeps legitimate vector markup while stripping:
 *   - <script> elements,
 *   - inline event handlers (onclick, onload, …),
 *   - `javascript:` and other dangerous URLs,
 *   - <foreignObject> (the usual vector for smuggling HTML/script into an SVG).
 *
 * This is defense-in-depth: Mermaid's `securityLevel: 'strict'` already sanitises
 * internally, but we never rely on a single layer for DOM safety.
 */
import DOMPurify from 'dompurify';

/** Shared hardening config applied to every sanitise call. */
const SVG_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },
  // foreignObject can embed arbitrary HTML; we render Mermaid with htmlLabels
  // disabled, so we never need it and explicitly forbid it.
  FORBID_TAGS: ['script', 'foreignObject'],
  FORBID_ATTR: ['xlink:href'],
  ADD_ATTR: ['viewBox', 'preserveAspectRatio'],
};

/**
 * Sanitise an SVG string and return a clean string.
 * Used by the SVG/PNG exporters and the "Copy as Mermaid" pipeline.
 */
export function sanitizeSvgToString(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ...SVG_CONFIG, RETURN_DOM: false }) as unknown as string;
}

/**
 * Sanitise an SVG string and return a detached DOM fragment.
 *
 * The live preview appends THIS rather than assigning innerHTML, so untrusted
 * Mermaid output never flows through an `innerHTML =` sink (security
 * requirement #1).
 */
export function sanitizeSvgToFragment(dirty: string): DocumentFragment {
  return DOMPurify.sanitize(dirty, {
    ...SVG_CONFIG,
    RETURN_DOM_FRAGMENT: true,
  }) as unknown as DocumentFragment;
}
