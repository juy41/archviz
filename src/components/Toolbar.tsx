import { useEffect, useId, useRef, useState } from 'react';
import { TEMPLATES, type Template } from '../lib/templates';
import {
  ChevronIcon,
  CodeIcon,
  CopyIcon,
  DownloadIcon,
  ImageIcon,
  LinkIcon,
  TemplateIcon,
} from './Icons';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  onSelectTemplate: (template: Template) => void;
  onCopyMermaid: () => void;
  onCopyPlantUml: () => void;
  onExportSvg: () => void;
  onExportPng: () => void;
  onCopyLink: () => void;
  /** False while there is no valid diagram to export. */
  canExport: boolean;
}

export function Toolbar({
  onSelectTemplate,
  onCopyMermaid,
  onCopyPlantUml,
  onExportSvg,
  onExportPng,
  onCopyLink,
  canExport,
}: ToolbarProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // The dropdown is rendered with `position: fixed` (anchored to the trigger)
  // so it escapes the toolbar's horizontal-scroll overflow, which would
  // otherwise clip it to nothing.
  const openMenu = (): void => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setMenuPos({ top: rect.bottom + 8, left: rect.left });
    setMenuOpen(true);
  };

  // Close the template menu on outside click, Escape, or viewport resize (a11y
  // + avoids a stale fixed position after a resize).
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const onResize = (): void => setMenuOpen(false);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [menuOpen]);

  const handlePick = (template: Template): void => {
    onSelectTemplate(template);
    setMenuOpen(false);
  };

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Diagram actions">
      <div className={styles.menuWrap} ref={menuRef}>
        <button
          ref={triggerRef}
          type="button"
          className={styles.primaryBtn}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
        >
          <TemplateIcon />
          <span>Templates</span>
          <ChevronIcon className={`${styles.chevron} ${menuOpen ? styles.chevronOpen : ''}`} />
        </button>

        {menuOpen && (
          <div
            className={styles.menu}
            id={menuId}
            role="menu"
            aria-label="Templates"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                role="menuitem"
                className={styles.menuItem}
                onClick={() => handlePick(template)}
              >
                <span className={styles.menuIcon} aria-hidden="true">
                  {template.icon}
                </span>
                <span className={styles.menuText}>
                  <span className={styles.menuName}>{template.name}</span>
                  <span className={styles.menuDesc}>{template.description}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.group}>
        <button type="button" className={styles.btn} onClick={onCopyMermaid} disabled={!canExport}>
          <CodeIcon />
          <span>Mermaid</span>
        </button>
        <button
          type="button"
          className={styles.btn}
          onClick={onCopyPlantUml}
          disabled={!canExport}
        >
          <CopyIcon />
          <span>PlantUML</span>
        </button>
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.group}>
        <button type="button" className={styles.btn} onClick={onExportSvg} disabled={!canExport}>
          <DownloadIcon />
          <span>SVG</span>
        </button>
        <button type="button" className={styles.btn} onClick={onExportPng} disabled={!canExport}>
          <ImageIcon />
          <span>PNG</span>
        </button>
      </div>

      <div className={styles.spacer} />

      <button type="button" className={styles.shareBtn} onClick={onCopyLink}>
        <LinkIcon />
        <span>Copy link</span>
      </button>
    </div>
  );
}
