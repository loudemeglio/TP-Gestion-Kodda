/**
 * Marca Kodda.
 * @param {{ compact?: boolean }} props
 *   - compact: barra superior — solo "Kodda"
 *   - full (default): "Kodda" + tagline (login / registro)
 */
export function KoddaLogo({ compact = false }) {
  if (compact) {
    return (
      <div className="kodda-logo-wrap kodda-logo-wrap--compact kodda-logo-wrap--text-only">
        <span className="kodda-logo-word" aria-label="Kodda">
          Kodda
        </span>
      </div>
    );
  }

  return (
    <div className="kodda-logo-wrap kodda-logo-wrap--full">
      <span className="kodda-logo-word" aria-label="Kodda">
        Kodda
      </span>
      <span className="kodda-logo-tagline">Moda circular inteligente</span>
    </div>
  );
}
