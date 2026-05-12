/**
 * Marca Kodda — moda circular inteligente (visión producto).
 */
export function KoddaLogo({ compact = false }) {
  return (
    <div className={`kodda-logo-wrap ${compact ? 'kodda-logo-wrap--compact' : ''}`}>
      <span className="kodda-logo-word" aria-label="Kodda">
        Kodda
      </span>
      <span className="kodda-logo-tagline">Moda circular inteligente</span>
    </div>
  );
}
