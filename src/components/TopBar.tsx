import type { ReactNode } from 'react';

interface TopBarProps {
  onBack?: () => void;
  title?: string;
  right?: ReactNode;
}

export function TopBar({ onBack, title, right }: TopBarProps) {
  return (
    <div className="topbar">
      <div className="topbar__side">
        {onBack && (
          <button className="iconbtn" onClick={onBack} aria-label="Voltar">
            ‹
          </button>
        )}
      </div>
      <div className="topbar__title">{title}</div>
      <div className="topbar__side topbar__side--right">{right}</div>
    </div>
  );
}
