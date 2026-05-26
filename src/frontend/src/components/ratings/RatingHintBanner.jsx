import { Link } from 'react-router-dom';

/**
 * CTA en pantalla de compra confirmada: redirige a Mis compras para calificar.
 */
export default function RatingHintBanner({ orderId }) {
  return (
    <section className="kodda-order-section kodda-rating-hint" aria-labelledby="kodda-rating-hint-title">
      <div className="kodda-rating-hint-icon" aria-hidden="true">
        ★
      </div>
      <div className="kodda-rating-hint-body">
        <h2 id="kodda-rating-hint-title" className="kodda-rating-hint-title">
          Calificá tu experiencia
        </h2>
        <p className="kodda-rating-hint-text">
          Cuando quieras podés dejar estrellas, un comentario y —si hace falta— reportar al vendedor desde
          el detalle de esta compra.
        </p>
        <Link to={`/mis-compras/${orderId}`} className="kodda-btn-primary kodda-rating-hint-cta">
          Ir a calificar en Mis compras
        </Link>
      </div>
    </section>
  );
}
