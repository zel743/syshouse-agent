import './DecorativeWave.css';

// Firma visual heredada de los mockups (ver .context/sistema-diseno-app-bancaria,
// sección 2.4): fija al fondo, detrás del contenido, no interactiva.
export function DecorativeWave() {
  return (
    <svg className="decorative-wave" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="wave-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-red-soft)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--brand-white)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,40 C100,90 300,0 400,50 L400,100 L0,100 Z"
        fill="url(#wave-gradient)"
      />
    </svg>
  );
}
