import './Spinner.css';

type Props = {
  label?: string;
  /** Overlay semitransparente sobre contenido ya visible, en vez de ocupar toda la pantalla. */
  overlay?: boolean;
};

export function Spinner({ label, overlay }: Props) {
  return (
    <div className={overlay ? 'spinner-overlay' : 'spinner-block'}>
      <div className="spinner-ring" role="status" aria-label={label ?? 'Cargando'} />
      {label && <span className="spinner-label">{label}</span>}
    </div>
  );
}
