import type { ReactNode } from 'react';
import './caption.css';

/** An old-OS window: grey chrome, navy title bar, white body with black text. */
export function Win({ title, label, children, className }: { title: string; label?: string; children: ReactNode; className?: string }) {
  return (
    <section className={className ? `win ${className}` : 'win'} aria-label={label ?? title}>
      <div className="win-bar">
        <span>{title}</span>
        <span className="win-buttons" aria-hidden="true">
          <i />
          <i />
        </span>
      </div>
      <div className="win-body">{children}</div>
    </section>
  );
}
