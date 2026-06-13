/**
 * Inline SVG icon set.
 *
 * Bundled as components (no icon-font, no icon dependency) so we ship zero extra
 * bytes beyond what's used and never make a network request for an icon.
 * Every icon is decorative by default (`aria-hidden`); accessible names live on
 * the buttons that contain them.
 */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps): JSX.Element {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const LogoMark = (props: IconProps): JSX.Element => (
  <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true" focusable="false" {...props}>
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 9 L9 23" />
      <path d="M9 9 L23 9" opacity="0.5" />
      <path d="M9 16 L20 16" />
      <path d="M9 23 L23 23" opacity="0.5" />
    </g>
    <g fill="currentColor">
      <circle cx="9" cy="9" r="3" />
      <circle cx="9" cy="23" r="3" />
      <circle cx="23" cy="9" r="2.4" opacity="0.7" />
      <circle cx="20" cy="16" r="2.4" opacity="0.7" />
      <circle cx="23" cy="23" r="2.4" opacity="0.7" />
    </g>
  </svg>
);

export const SunIcon = (props: IconProps): JSX.Element => (
  <Base {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Base>
);

export const MoonIcon = (props: IconProps): JSX.Element => (
  <Base {...props}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </Base>
);

export const TemplateIcon = (props: IconProps): JSX.Element => (
  <Base {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Base>
);

export const DownloadIcon = (props: IconProps): JSX.Element => (
  <Base {...props}>
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M5 21h14" />
  </Base>
);

export const CopyIcon = (props: IconProps): JSX.Element => (
  <Base {...props}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </Base>
);

export const LinkIcon = (props: IconProps): JSX.Element => (
  <Base {...props}>
    <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
  </Base>
);

export const GithubIcon = (props: IconProps): JSX.Element => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.8 18.3 5.1 18.3 5.1c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
  </svg>
);

export const CheckIcon = (props: IconProps): JSX.Element => (
  <Base {...props}>
    <path d="M20 6 9 17l-5-5" />
  </Base>
);

export const ImageIcon = (props: IconProps): JSX.Element => (
  <Base {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </Base>
);

export const CodeIcon = (props: IconProps): JSX.Element => (
  <Base {...props}>
    <path d="m16 18 6-6-6-6" />
    <path d="m8 6-6 6 6 6" />
  </Base>
);

export const ChevronIcon = (props: IconProps): JSX.Element => (
  <Base {...props}>
    <path d="m6 9 6 6 6-6" />
  </Base>
);

export const AlertIcon = (props: IconProps): JSX.Element => (
  <Base {...props}>
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
  </Base>
);
