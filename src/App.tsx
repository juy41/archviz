import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DiagramPreview } from './components/DiagramPreview';
import { Editor } from './components/Editor';
import { Header } from './components/Header';
import { TabSwitcher, type PanelTab } from './components/TabSwitcher';
import { Toast, type ToastState } from './components/Toast';
import { Toolbar } from './components/Toolbar';
import { useDebounce } from './hooks/useDebounce';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useTheme } from './hooks/useTheme';
import {
  asMermaidCodeBlock,
  copyToClipboard,
  downloadPng,
  downloadSvg,
} from './lib/export/exporters';
import { generateMermaid } from './lib/mermaid/generator';
import { parse } from './lib/parser/parser';
import { generatePlantUml } from './lib/plantuml/generator';
import { buildShareUrl, readStateFromUrl } from './lib/share/url';
import { WELCOME_DOC, type Template } from './lib/templates';
import styles from './App.module.css';

/** Update this to your fork's URL — it powers the header "Star" link + share base. */
const REPO_URL = 'https://github.com/juy41/archviz';

/** PNG export background, matched to the active theme's canvas. */
const PNG_BACKGROUND: Record<'light' | 'dark', string> = {
  light: '#ffffff',
  dark: '#0f1726',
};

export default function App(): JSX.Element {
  const { theme, toggleTheme } = useTheme('dark');
  const isMobile = useMediaQuery('(max-width: 860px)');

  const [code, setCode] = useState<string>(WELCOME_DOC);
  const [activeTab, setActiveTab] = useState<PanelTab>('editor');
  const [toast, setToast] = useState<ToastState | null>(null);

  // Latest sanitised SVG, kept in a ref so re-renders aren't tied to it.
  const latestSvg = useRef<string | null>(null);
  const toastSeq = useRef(0);

  const notify = useCallback((message: string, tone: ToastState['tone'] = 'success') => {
    setToast({ id: ++toastSeq.current, message, tone });
  }, []);

  // Hydrate from a shared URL on first load. Untrusted input is validated inside
  // readStateFromUrl(); on any problem it returns null and we keep the welcome doc.
  useEffect(() => {
    let active = true;
    void readStateFromUrl().then((state) => {
      if (active && state) setCode(state.code);
    });
    return () => {
      active = false;
    };
  }, []);

  // Heavy work (parse → generate → render) is kept off the keystroke path: the
  // editor updates instantly, while the diagram pipeline runs on a debounce.
  const debouncedCode = useDebounce(code, 300);
  const { diagram, errors } = useMemo(() => parse(debouncedCode), [debouncedCode]);
  const mermaidCode = useMemo(() => generateMermaid(diagram), [diagram]);
  const hasContent = diagram.nodes.length > 0;

  const handleRendered = useCallback((svg: string | null) => {
    latestSvg.current = svg;
  }, []);

  const handleSelectTemplate = useCallback(
    (template: Template) => {
      setCode(template.code);
      if (isMobile) setActiveTab('editor');
      notify(`Loaded “${template.name}” template`);
    },
    [isMobile, notify],
  );

  const handleCopyMermaid = useCallback(async () => {
    const ok = await copyToClipboard(asMermaidCodeBlock(mermaidCode));
    notify(ok ? 'Mermaid copied to clipboard' : 'Copy failed', ok ? 'success' : 'error');
  }, [mermaidCode, notify]);

  const handleCopyPlantUml = useCallback(async () => {
    const ok = await copyToClipboard(generatePlantUml(diagram));
    notify(ok ? 'PlantUML copied to clipboard' : 'Copy failed', ok ? 'success' : 'error');
  }, [diagram, notify]);

  const handleExportSvg = useCallback(() => {
    if (!latestSvg.current) {
      notify('Diagram is still rendering…', 'error');
      return;
    }
    downloadSvg(latestSvg.current);
    notify('Downloaded architecture.svg');
  }, [notify]);

  const handleExportPng = useCallback(async () => {
    if (!latestSvg.current) {
      notify('Diagram is still rendering…', 'error');
      return;
    }
    try {
      await downloadPng(latestSvg.current, 'architecture', {
        scale: 2,
        background: PNG_BACKGROUND[theme],
      });
      notify('Downloaded architecture.png');
    } catch {
      notify('PNG export failed', 'error');
    }
  }, [theme, notify]);

  const handleCopyLink = useCallback(async () => {
    const url = await buildShareUrl(code);
    const ok = await copyToClipboard(url);
    notify(ok ? 'Share link copied — paste it anywhere' : 'Copy failed', ok ? 'success' : 'error');
  }, [code, notify]);

  return (
    <div className={styles.app}>
      <Header theme={theme} onToggleTheme={toggleTheme} repoUrl={REPO_URL} />

      <Toolbar
        onSelectTemplate={handleSelectTemplate}
        onCopyMermaid={handleCopyMermaid}
        onCopyPlantUml={handleCopyPlantUml}
        onExportSvg={handleExportSvg}
        onExportPng={handleExportPng}
        onCopyLink={handleCopyLink}
        canExport={hasContent}
      />

      {isMobile && <TabSwitcher active={activeTab} onChange={setActiveTab} />}

      <main className={styles.main}>
        <section
          id="panel-editor"
          className={`${styles.panel} ${styles.editorPanel}`}
          role={isMobile ? 'tabpanel' : 'region'}
          aria-label="Diagram source editor"
          aria-labelledby={isMobile ? 'tab-editor' : undefined}
          hidden={isMobile && activeTab !== 'editor'}
        >
          <Editor value={code} onChange={setCode} errors={errors} />
        </section>

        <section
          id="panel-diagram"
          className={`${styles.panel} ${styles.previewPanel}`}
          role={isMobile ? 'tabpanel' : 'region'}
          aria-label="Diagram preview"
          aria-labelledby={isMobile ? 'tab-diagram' : undefined}
          hidden={isMobile && activeTab !== 'diagram'}
        >
          <DiagramPreview
            code={mermaidCode}
            hasContent={hasContent}
            theme={theme}
            onRendered={handleRendered}
          />
        </section>
      </main>

      <footer className={styles.footer}>
        <span className={styles.footerPrivacy}>
          <span className={styles.lock} aria-hidden="true">
            🔒
          </span>
          Your diagrams never leave your browser
        </span>
        <span className={styles.footerMeta}>
          Built with Mermaid · <a href={`${REPO_URL}/blob/main/LICENSE`}>MIT</a>
        </span>
      </footer>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
