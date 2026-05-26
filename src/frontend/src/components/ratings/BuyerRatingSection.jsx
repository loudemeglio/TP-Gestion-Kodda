import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { formatApiError } from '../../utils/apiError';
import BuyerRatingModal from './BuyerRatingModal';

const ORDER_STATUS_RATEABLE = 'confirmed';

export default function BuyerRatingSection({ sale, onRated }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [rated, setRated] = useState(() => Boolean(sale?.buyer_rated));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canRate = sale?.status === ORDER_STATUS_RATEABLE && !rated;

  async function handleSubmit(payload) {
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/api/buyer-reviews/orders/${sale.id}`, payload);
      setRated(true);
      setModalOpen(false);
      onRated?.();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!sale) return null;

  return (
    <section className="kodda-checkout-success-section">
      <h2 className="kodda-profile-edit-section-title">Comprador</h2>
      <p className="kodda-auth-muted">
        {sale.buyer_username}{' '}
        <Link to={`/compradores/${sale.buyer_id}`} className="kodda-auth-link">
          Ver reputación
        </Link>
      </p>

      {rated ? (
        <p className="kodda-auth-muted">Ya calificaste al comprador en esta venta.</p>
      ) : canRate ? (
        <>
          <button
            type="button"
            className="kodda-btn-primary"
            onClick={() => setModalOpen(true)}
          >
            Calificar comprador
          </button>
          {error ? <p className="kodda-auth-error">{error}</p> : null}
        </>
      ) : (
        <p className="kodda-auth-muted">La calificación estará disponible cuando la orden esté confirmada.</p>
      )}

      {modalOpen ? (
        <BuyerRatingModal
          buyerLabel={sale.buyer_username}
          onClose={() => !submitting && setModalOpen(false)}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      ) : null}
    </section>
  );
}
