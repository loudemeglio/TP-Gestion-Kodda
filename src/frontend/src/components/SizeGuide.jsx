import { Link } from 'react-router-dom';
import { KoddaLogo } from './KoddaLogo';

const TOP_ROWS = [
  { size: 'XS', chest: '82 – 86', waist: '66 – 70' },
  { size: 'S', chest: '87 – 91', waist: '71 – 75' },
  { size: 'M', chest: '92 – 97', waist: '76 – 81' },
  { size: 'L', chest: '98 – 103', waist: '82 – 87' },
  { size: 'XL', chest: '104 – 110', waist: '88 – 94' },
  { size: 'XXL', chest: '111 – 118', waist: '95 – 102' },
];

const BOTTOM_ROWS = [
  { size: '38', waist: '72 – 76', hip: '90 – 94' },
  { size: '40', waist: '77 – 81', hip: '95 – 99' },
  { size: '42', waist: '82 – 86', hip: '100 – 104' },
  { size: '44', waist: '87 – 92', hip: '105 – 110' },
  { size: '46', waist: '93 – 98', hip: '111 – 116' },
];

const SHOE_ROWS = [
  { ar: '38', cm: '24.0' },
  { ar: '39', cm: '24.7' },
  { ar: '40', cm: '25.3' },
  { ar: '41', cm: '26.0' },
  { ar: '42', cm: '26.7' },
  { ar: '43', cm: '27.3' },
  { ar: '44', cm: '28.0' },
];

export default function SizeGuide() {
  return (
    <div className="kodda-home kodda-size-guide-page">
      <header className="kodda-topbar">
        <KoddaLogo compact />
        <div className="kodda-topbar-spacer" />
        <nav className="kodda-nav-actions" aria-label="Navegación">
          <Link to="/" className="kodda-btn-ghost">
            Volver al catálogo
          </Link>
          <Link to="/perfil/editar" className="kodda-btn-accent-outline">
            Cargar mis medidas
          </Link>
        </nav>
      </header>

      <main className="kodda-size-guide-main">
        <header className="kodda-size-guide-hero">
          <p className="kodda-profile-edit-eyebrow">Guía de talles</p>
          <h1>Guía de talles genérica</h1>
          <p className="kodda-size-guide-lead">
            Medidas de referencia en centímetros. Son orientativas: el tallaje varía según marca y prenda. Para una
            recomendación personalizada, cargá tus medidas y dejá que la IA de Kodda haga el resto.
          </p>
        </header>

        <section className="kodda-size-guide-card">
          <h2>Parte superior (remeras, camperas, vestidos)</h2>
          <div className="kodda-size-guide-table-wrap">
            <table className="kodda-size-guide-table">
              <thead>
                <tr>
                  <th>Talle</th>
                  <th>Pecho (cm)</th>
                  <th>Cintura (cm)</th>
                </tr>
              </thead>
              <tbody>
                {TOP_ROWS.map((row) => (
                  <tr key={row.size}>
                    <td>{row.size}</td>
                    <td>{row.chest}</td>
                    <td>{row.waist}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="kodda-size-guide-card">
          <h2>Parte inferior (pantalones, jeans)</h2>
          <div className="kodda-size-guide-table-wrap">
            <table className="kodda-size-guide-table">
              <thead>
                <tr>
                  <th>Talle</th>
                  <th>Cintura (cm)</th>
                  <th>Cadera (cm)</th>
                </tr>
              </thead>
              <tbody>
                {BOTTOM_ROWS.map((row) => (
                  <tr key={row.size}>
                    <td>{row.size}</td>
                    <td>{row.waist}</td>
                    <td>{row.hip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="kodda-size-guide-card">
          <h2>Calzado</h2>
          <div className="kodda-size-guide-table-wrap">
            <table className="kodda-size-guide-table">
              <thead>
                <tr>
                  <th>Talle (AR)</th>
                  <th>Largo del pie (cm)</th>
                </tr>
              </thead>
              <tbody>
                {SHOE_ROWS.map((row) => (
                  <tr key={row.ar}>
                    <td>{row.ar}</td>
                    <td>{row.cm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="kodda-size-guide-cta">
          <h2>¿Querés que te lo resolvamos automáticamente?</h2>
          <p>
            Cargá tu altura, peso, talles y preferencia de calce. En cada prenda vas a ver si te queda bien, con una
            justificación clara.
          </p>
          <Link to="/perfil/editar" className="kodda-btn-primary">
            Completá tus medidas
          </Link>
        </section>
      </main>
    </div>
  );
}
