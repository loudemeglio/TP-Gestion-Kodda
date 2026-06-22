import { Link } from 'react-router-dom';

/**
 * Marca Kodda.
 * @param {{ compact?: boolean, to?: string | null }} props
 *   - compact: barra superior — solo "Kodda"
 *   - full (default): "Kodda" + tagline (login / registro)
 *   - to: ruta al hacer clic (por defecto "/" en modo compact; null desactiva el enlace)
 */
export function KoddaLogo({ compact = false, to = compact ? '/' : null }) {
  const content = compact ? (
    <div className="kodda-logo-wrap kodda-logo-wrap--compact kodda-logo-wrap--text-only">
      <span className="kodda-logo-word" aria-label="Kodda">
        Kodda
      </span>
    </div>
  ) : (
    <div className="kodda-logo-wrap kodda-logo-wrap--full">
      <span className="kodda-logo-word" aria-label="Kodda">
        Kodda
      </span>
      <span className="kodda-logo-tagline">Moda circular inteligente</span>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="kodda-logo-link" title="Ir al inicio">
        {content}
      </Link>
    );
  }

  return content;
}
