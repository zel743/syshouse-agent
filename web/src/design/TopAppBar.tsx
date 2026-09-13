import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import './TopAppBar.css';

type Props = {
  title: string;
  onBack?: () => void;
  /** Slot de logo neutro a la derecha — nunca un logotipo de banco real. */
  logoSlot?: ReactNode;
};

export function TopAppBar({ title, onBack, logoSlot }: Props) {
  return (
    <header className="top-app-bar">
      {onBack ? (
        <button className="top-app-bar-back" onClick={onBack} aria-label="Regresar">
          <ArrowLeft size={20} />
        </button>
      ) : (
        <span className="top-app-bar-spacer" />
      )}
      <h1 className="top-app-bar-title">{title}</h1>
      <span className="top-app-bar-logo">{logoSlot ?? <span className="top-app-bar-logo-placeholder" />}</span>
    </header>
  );
}
