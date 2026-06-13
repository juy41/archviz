import type { ThemeName } from '../hooks/useTheme';
import { GithubIcon, LogoMark, MoonIcon, SunIcon } from './Icons';
import styles from './Header.module.css';

interface HeaderProps {
  theme: ThemeName;
  onToggleTheme: () => void;
  repoUrl: string;
}

export function Header({ theme, onToggleTheme, repoUrl }: HeaderProps): JSX.Element {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden="true">
          <LogoMark />
        </span>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>
            Arch<span className={styles.accent}>Viz</span>
          </h1>
          <p className={styles.tagline}>Text → architecture diagrams</p>
        </div>
      </div>

      <div className={styles.actions}>
        <span className={styles.privacy} title="No servers, no tracking, no uploads">
          <span className={styles.dot} aria-hidden="true" />
          100% local
        </span>

        <a
          className={styles.ghLink}
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Star ArchViz on GitHub"
        >
          <GithubIcon />
          <span className={styles.ghText}>Star</span>
        </a>

        <button
          type="button"
          className={styles.themeToggle}
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          aria-pressed={theme === 'dark'}
          title="Toggle theme"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}
