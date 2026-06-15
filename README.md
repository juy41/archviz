<div align="center">

# ArchViz

**Turn plain text into clean architecture diagrams — right in your browser.**

Write a few lines of a small, readable DSL and watch a polished diagram appear
live. Export it, embed it, or share it with a link. No sign-up, no servers,
nothing ever leaves your browser.

[Live demo](https://juy41.github.io/archviz/) ·
[Quick start](#quick-start) ·
[The DSL](#the-dsl) ·
[Security](#security)

[![Build](https://github.com/juy41/archviz/actions/workflows/deploy.yml/badge.svg)](https://github.com/juy41/archviz/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

---

## Overview

Most diagram tools make you drag boxes around. ArchViz lets you *describe* a
system the way you would explain it to a colleague:

```text
Web -> API : HTTPS
API -> Cache : read / write
API -> DB : SQL
API --> Queue : enqueue job
Queue --> Worker : dispatch
```

It renders a clean, consistent diagram instantly. Because the source is just
text, your architecture lives in your repo, diffs in code review, and updates in
seconds.

## Features

- **Small, readable DSL** — nodes, connections, labels, nested groups, and
  component types (`service`, `database`, `queue`, `cache`, `external`).
- **Live preview** — the diagram re-renders as you type (debounced, never blocks
  input).
- **Typed components** — each node type gets a distinct shape and colour that
  stays legible in both themes.
- **Inline errors** — parse problems are reported with the exact line and column;
  click an error to jump to it.
- **Light and dark themes.**
- **Export** — download SVG or PNG, or copy a ready-to-paste Mermaid block (for
  GitHub READMEs) or PlantUML source.
- **Share by link** — the entire editor state is compressed into the URL. No
  backend, no database, no accounts.
- **Built-in templates** — microservices, classic MVC, event-driven, and
  client–server starting points.
- **Responsive** — side-by-side on desktop, tabbed on mobile.
- **Private by design** — the app makes zero network requests with your data,
  enforced by a strict Content-Security-Policy (`connect-src 'none'`).

## Quick start

```bash
git clone https://github.com/juy41/archviz.git
cd archviz
npm install
npm run dev      # http://localhost:5173
```

The editor opens with an example already loaded.

```bash
npm run build    # production build into dist/
npm run preview  # preview the production build
npm test         # run the parser/generator unit tests
npm run lint     # ESLint
npm run format   # Prettier
```

## The DSL

```text
# Comments start with # or //

direction LR                 # TD | TB | LR | RL | BT  (default: TD)

# Declare a node with a type and an optional display label
API   [service]  "API Server"
DB    [database] "PostgreSQL"
Cache [cache]    "Redis"
Bus   [queue]    "Event Bus"
CDN   [external]

# Group nodes into a subgraph (groups can nest)
group "App Tier" {
  App1 [service] "App Server 1"
  App2 [service] "App Server 2"
}

# Connect them
Web  ->  API           # solid arrow
API  --> Bus           # dashed arrow
Web  <-> CDN           # bidirectional
API  ->  DB  : SQL     # label a connection with ":"  (or "|")
```

| Syntax                | Meaning                                       |
| --------------------- | --------------------------------------------- |
| `A -> B`              | solid connection                              |
| `A --> B`             | dashed connection                             |
| `A <-> B`             | bidirectional connection                      |
| `A -> B : label`      | labelled connection (`\|` also works)         |
| `Name [type]`         | set a node's type                             |
| `Name [type] "Label"` | set type and display label                    |
| `"Two words"`         | quote any name or label containing spaces     |
| `group X { ... }`     | a subgraph (nestable)                         |
| `direction LR`        | layout direction                              |

Component types: `service`, `database`, `queue`, `cache`, `external`, `default`.

## How it works

```
DSL text ──► parser ──► Diagram IR ──► Mermaid generator ──► Mermaid.js ──► SVG
                │                  └──► PlantUML generator ─► copyable source
                └──► parse errors (line + column)
```

1. **Parser** (`src/lib/parser`) — a small, forgiving, line-oriented parser turns
   the DSL into a strongly-typed `Diagram` intermediate representation. It never
   throws: bad lines are reported as errors while everything valid still renders.
2. **Generators** (`src/lib/mermaid`, `src/lib/plantuml`) — pure functions map the
   IR to Mermaid flowchart source and PlantUML component-diagram source.
3. **Renderer** — Mermaid.js (loaded lazily in its own chunk) draws the SVG with
   `securityLevel: 'strict'`.
4. **Sanitiser** (`src/lib/export`) — every SVG passes through DOMPurify before it
   touches the DOM or gets exported.
5. **Share** (`src/lib/share`) — state is JSON → gzip (native `CompressionStream`)
   → base64url, packed into the URL hash, with strict validation on the way back.

### Project structure

```
src/
├─ components/          UI: Header, Toolbar, Editor, DiagramPreview, TabSwitcher, Toast, Icons
├─ hooks/               useDebounce, useTheme, useMediaQuery
├─ lib/
│  ├─ parser/           DSL parser + highlight tokenizer (+ tests)
│  ├─ mermaid/          IR → Mermaid generator (+ tests) and the render wrapper
│  ├─ plantuml/         IR → PlantUML generator
│  ├─ export/           SVG sanitiser, SVG/PNG export, clipboard
│  ├─ share/            URL encode/decode (+ tests)
│  ├─ templates.ts      built-in templates + onboarding doc
│  └─ types.ts          the Diagram IR
├─ App.tsx              composition + state
└─ index.css            design tokens + theming
```

## Security

ArchViz renders untrusted user input as a diagram, so DOM and input safety were
designed in from the start. Each measure is implemented and commented in the
code.

| # | Measure | Where |
| - | ------- | ----- |
| 1 | **No XSS via input.** Mermaid runs with `securityLevel: 'strict'` (no script execution, no click handlers, escaped labels) and `htmlLabels: false`. The syntax-highlight overlay renders user text as React text nodes, never via `innerHTML`. | `lib/mermaid/render.ts`, `components/Editor.tsx` |
| 2 | **SVG sanitisation.** Every rendered SVG passes through DOMPurify (SVG profile), stripping `<script>`, `on*` handlers, `javascript:` URLs and `<foreignObject>`, before it is shown or exported. | `lib/export/sanitize.ts` |
| 3 | **Safe URL state.** Shared-link data is untrusted: decoded in `try/catch`, size-capped before decoding (50 KB) and after decompression (zip-bomb guard), then validated against a schema. Anything off falls back to the default. Never `eval`'d. | `lib/share/url.ts` |
| 4 | **Strict CSP.** `default-src 'self'`, `script-src 'self'` (no inline JS, no eval), `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `connect-src 'none'`. Injected into the static build and set as a real header on Vercel. | `vite.config.ts`, `vercel.json` |
| 5 | **Hardening headers.** `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, a locked-down `Permissions-Policy`, and `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy: same-origin`. | `vercel.json` |
| 6 | **Minimal dependencies.** Four runtime dependencies: `react`, `react-dom`, `mermaid`, and `dompurify`. | `package.json` |
| 7 | **No data exfiltration.** The app sends your input nowhere — no analytics, no telemetry, no remote fonts, no network calls. `connect-src 'none'` makes that browser-enforced. | everywhere |
| 8 | **Safe clipboard and downloads.** Standard async Clipboard API; downloads use Blobs with correct MIME types and a sanitised, hard-coded filename. | `lib/export/exporters.ts` |

### Dependency auditing

```bash
npm audit            # check for known vulnerabilities
npm audit fix        # apply safe fixes
npm outdated         # see what is behind
```

CI runs ESLint, the unit tests, and `npm audit --audit-level=high` on every
push, so a high- or critical-severity dependency vulnerability fails the build
before anything is deployed.

## Deploy

ArchViz is a fully static SPA — host it anywhere.

### Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Framework preset: Vite. The included [`vercel.json`](vercel.json) wires up the
   build and all security headers automatically.

```bash
npm i -g vercel && vercel
```

### GitHub Pages

A workflow is included at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. Push to `main`.
2. In Settings → Pages, set Source → GitHub Actions.
3. Every push lints, tests, audits, builds, and deploys. The build uses a
   relative `base`, so the project sub-path just works, and the strict CSP is
   injected into `index.html` at build time since Pages cannot set headers.

### Any static host (Netlify, Cloudflare Pages, S3, …)

```bash
npm run build   # output in dist/
```

Serve `dist/`. To match Vercel's protections, set the same response headers from
[`vercel.json`](vercel.json) on your host (Netlify: a `_headers` file; Nginx:
`add_header` directives).

## Contributing

Contributions are welcome.

1. Fork and create a branch: `git checkout -b feat/my-thing`.
2. `npm install`, then make your change.
3. Keep it green: `npm run lint && npm test && npm run build`.
4. Add tests for parser or generator changes (`src/**/*.test.ts`).
5. Open a PR describing the change.

Good first issues: new node types, more templates, a PNG-scale picker,
import-from-Mermaid.

## License

[MIT](LICENSE) © ArchViz contributors.
