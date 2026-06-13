<div align="center">

# 🧭 ArchViz

### Turn plain text into clean architecture diagrams — right in your browser.

Write a few lines of a tiny, readable DSL. Watch a polished diagram appear live.
Export it, embed it, or share it with a link. **No sign-up. No servers. Nothing
ever leaves your browser.**

[**🚀 Try it live**](https://juy41.github.io/archviz/) · [Quick start](#-quick-start) · [How it works](#-how-it-works) · [Security](#-security)

![demo](docs/demo.gif)

<sub>↑ Replace this with a short screen recording (see <code>docs/README.md</code>).</sub>

</div>

---

## ✨ Why ArchViz

Most diagram tools make you drag boxes around. ArchViz lets you **describe** a
system the way you'd explain it to a colleague —

```text
Web -> API : HTTPS
API -> Cache : read / write
API -> DB : SQL
API --> Queue : enqueue job
Queue --> Worker : dispatch
```

— and renders a clean, consistent diagram instantly. Because it's just text,
your architecture lives in your repo, diffs in code review, and updates in
seconds.

## 🎯 Features

- 📝 **Tiny, readable DSL** — nodes, connections, labels, groups and component
  types (`service`, `database`, `queue`, `cache`, `external`).
- ⚡ **Live preview** — the diagram re-renders as you type (debounced, never
  blocks input).
- 🎨 **Typed components** — each node type gets a distinct shape + colour that
  stays legible in both themes.
- 🧯 **Friendly errors** — parse problems are reported with the exact line and
  column; click an error to jump to it.
- 🌗 **Light & dark themes** — one click, no flash.
- 🖼️ **Export anywhere** — download **SVG** or **PNG**, or copy a ready-to-paste
  **Mermaid** block (for GitHub READMEs) or **PlantUML** source.
- 🔗 **Share by link** — the entire editor state is compressed into the URL.
  No backend, no database, no accounts.
- 🧩 **One-click templates** — microservices, classic MVC, event-driven and
  client–server starting points.
- 📱 **Responsive** — side-by-side on desktop, tabbed on mobile.
- 🔒 **Private by design** — the app makes **zero** network requests with your
  data. It's enforced by a strict Content-Security-Policy (`connect-src 'none'`).

## 🚀 Quick start

```bash
git clone https://github.com/juy41/archviz.git
cd archviz
npm install
npm run dev      # → http://localhost:5173
```

That's it — the editor opens with an example already loaded.

```bash
npm run build    # production build into dist/
npm run preview  # preview the production build
npm test         # run the parser/generator unit tests
npm run lint     # ESLint
npm run format   # Prettier
```

## ✍️ The DSL

```text
# Comments start with # or //

direction LR                 # TD | TB | LR | RL | BT  (default: TD)

# Declare a node and give it a type + optional display label
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
API  ->  DB  : SQL     # add a label with ":"  (or "|")
```

| Syntax              | Meaning                                            |
| ------------------- | -------------------------------------------------- |
| `A -> B`            | solid connection                                   |
| `A --> B`           | dashed connection                                  |
| `A <-> B`           | bidirectional connection                           |
| `A -> B : label`    | labelled connection (`\|` also works)              |
| `Name [type]`       | set a node's type                                  |
| `Name [type] "Lbl"` | set type **and** display label                     |
| `"Two words"`       | quote any name/label containing spaces             |
| `group X { … }`     | a subgraph (nestable)                              |
| `direction LR`      | layout direction                                   |

**Component types:** `service` · `database` · `queue` · `cache` · `external` · `default`

## 🛠️ How it works

```
DSL text ──► parser ──► Diagram IR ──► Mermaid generator ──► Mermaid.js ──► SVG
                │                  └──► PlantUML generator ─► copyable source
                └──► parse errors (line + column)
```

1. **Parser** (`src/lib/parser`) — a small, forgiving, line-oriented parser
   turns the DSL into a strongly-typed `Diagram` intermediate representation. It
   never throws: bad lines are reported as errors while everything valid still
   renders.
2. **Generators** (`src/lib/mermaid`, `src/lib/plantuml`) — pure functions map
   the IR to Mermaid flowchart source and PlantUML component-diagram source.
3. **Renderer** — Mermaid.js (loaded lazily in its own chunk) draws the SVG with
   `securityLevel: 'strict'`.
4. **Sanitiser** (`src/lib/export`) — every SVG is run through DOMPurify before
   it touches the DOM or gets exported.
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

## 🔒 Security

ArchViz renders **untrusted user input** as a diagram, so DOM- and input-safety
were designed in from the start. Each measure is implemented and commented in
the code:

| # | Measure | Where |
| - | ------- | ----- |
| 1 | **No XSS via input.** Mermaid runs with `securityLevel: 'strict'` (no script execution, no click handlers, escaped labels) and `htmlLabels: false`. The syntax-highlight overlay renders user text as React text nodes — never via `innerHTML`. | `lib/mermaid/render.ts`, `components/Editor.tsx` |
| 2 | **SVG sanitisation.** Every rendered SVG is passed through DOMPurify (SVG profile) — stripping `<script>`, `on*` handlers, `javascript:` URLs and `<foreignObject>` — before it's shown or exported. | `lib/export/sanitize.ts` |
| 3 | **Safe URL state.** Shared-link data is untrusted: decoded in `try/catch`, size-capped **before** decoding (50 KB) and after decompression (zip-bomb guard), then validated against a schema. Anything off → fall back to the default. Never `eval`'d. | `lib/share/url.ts` |
| 4 | **Strict CSP.** `default-src 'self'`, `script-src 'self'` (no inline JS, no eval), `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `connect-src 'none'`. Injected into the static build and set as a real header on Vercel. | `vite.config.ts`, `vercel.json` |
| 5 | **Hardening headers.** `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, plus a locked-down `Permissions-Policy`. | `vercel.json` |
| 6 | **Minimal dependencies.** Three runtime deps (`react`, `react-dom`, `mermaid`) + `dompurify`. Run `npm audit` to verify; see below. | `package.json` |
| 7 | **No data exfiltration.** The app sends your input **nowhere** — no analytics, no telemetry, no remote fonts, no network calls. `connect-src 'none'` makes that browser-enforced. | everywhere |
| 8 | **Safe clipboard & downloads.** Standard async Clipboard API; downloads use Blobs with correct MIME types and a sanitised, hard-coded filename (no injection). | `lib/export/exporters.ts` |

### `npm audit`

```bash
npm audit            # check for known vulnerabilities
npm audit fix        # apply safe fixes
npm outdated         # see what's behind
```

Dependencies are pinned to current, audited versions. CI (the GitHub Pages
workflow) runs lint + tests on every push, so regressions surface early.

## ☁️ Deploy

ArchViz is a fully static SPA — host it anywhere.

### Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Vite**. The included [`vercel.json`](vercel.json) wires up
   the build and all security headers automatically.

```bash
npm i -g vercel && vercel
```

### GitHub Pages

A workflow is included at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. Push to `main`.
2. In **Settings → Pages**, set **Source → GitHub Actions**.
3. Every push lints, tests, builds and deploys. (The build uses a relative
   `base`, so the project sub-path just works. The strict CSP is injected into
   `index.html` at build time, since Pages can't set headers.)

### Any static host (Netlify, Cloudflare Pages, S3, …)

```bash
npm run build   # output in dist/
```

Serve `dist/`. To match Vercel's protections, set the same response headers from
[`vercel.json`](vercel.json) on your host (Netlify: a `_headers` file; Nginx:
`add_header` directives).

## 🤝 Contributing

Contributions are very welcome!

1. Fork and create a branch: `git checkout -b feat/my-thing`.
2. `npm install`, then make your change.
3. Keep it green: `npm run lint && npm test && npm run build`.
4. Add tests for parser/generator changes (`src/**/*.test.ts`).
5. Open a PR describing the change.

Good first issues: new node types, more templates, a PNG-scale picker,
import-from-Mermaid.

## 📄 License

[MIT](LICENSE) © ArchViz contributors. Use it, fork it, ship it.

<div align="center"><sub>Built with React, TypeScript, Vite and Mermaid. If ArchViz is useful, a ⭐ helps a lot.</sub></div>
