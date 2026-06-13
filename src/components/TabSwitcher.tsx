import styles from './TabSwitcher.module.css';

export type PanelTab = 'editor' | 'diagram';

interface TabSwitcherProps {
  active: PanelTab;
  onChange: (tab: PanelTab) => void;
}

const TABS: { id: PanelTab; label: string }[] = [
  { id: 'editor', label: 'Editor' },
  { id: 'diagram', label: 'Diagram' },
];

/** Mobile-only segmented control to switch between the two panels. */
export function TabSwitcher({ active, onChange }: TabSwitcherProps): JSX.Element {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Panel">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={active === tab.id}
          aria-controls={`panel-${tab.id}`}
          tabIndex={active === tab.id ? 0 : -1}
          className={`${styles.tab} ${active === tab.id ? styles.active : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
