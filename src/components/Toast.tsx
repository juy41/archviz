import { useEffect } from 'react';
import { CheckIcon, AlertIcon } from './Icons';
import styles from './Toast.module.css';

export interface ToastState {
  id: number;
  message: string;
  tone: 'success' | 'error';
}

interface ToastProps {
  toast: ToastState | null;
  onDismiss: () => void;
}

/**
 * Transient feedback ("Copied!", "Export failed"). Auto-dismisses and exposes a
 * polite live region so screen readers announce the message.
 */
export function Toast({ toast, onDismiss }: ToastProps): JSX.Element {
  useEffect(() => {
    if (!toast) return;
    const handle = window.setTimeout(onDismiss, 2600);
    return () => window.clearTimeout(handle);
  }, [toast, onDismiss]);

  return (
    <div className={styles.region} role="status" aria-live="polite">
      {toast && (
        <div className={`${styles.toast} ${styles[toast.tone]}`} key={toast.id}>
          <span className={styles.icon} aria-hidden="true">
            {toast.tone === 'success' ? <CheckIcon /> : <AlertIcon />}
          </span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
