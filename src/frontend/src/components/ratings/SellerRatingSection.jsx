import { useMemo, useState } from 'react';
import { api } from '../../api/client';
import { formatApiError } from '../../utils/apiError';
import SellerRatingModal from './SellerRatingModal';

const ORDER_STATUS_RATEABLE = 'confirmed';

export default function SellerRatingSection({ order, onRated }) {
  const [ratedIds, setRatedIds] = useState(() => new Set(order?.rated_seller_ids || []));
  const [modalSellerId, setModalSellerId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const sellerIds = useMemo(() => {
    const ids = new Set();
    (order?.items || []).forEach((i) => {
      if (i.seller_id) ids.add(i.seller_id);
    });
    return Array.from(ids);
  }, [order]);

  const canRate = order?.status === ORDER_STATUS_RATEABLE;

  if (!order) return null;

  async function handleSubmit(payload) {
    if (!order?.id) return;
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.post(`/api/ratings/orders/${order.id}`, {
        seller_id: payload.sellerId,
        stars: payload.stars,
        description: payload.description,
        matches_description: payload.matches_description,
        delivered_on_time: payload.delivered_on_time,
        is_scam_report: payload.is_scam_report,
      });
      setRatedIds((prev) => new Set([...prev, payload.sellerId]));
      setModalSellerId(null);
      setSuccess('Gracias. Tu calificación fue registrada.');
      onRated?.(payload.sellerId);
    } catch (err) {
      setError(formatApiError(err, 'No se pudo registrar la calificación.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="kodda-checkout-success-section">
      <h2 className="kodda-profile-edit-section-title">Calificar vendedor</h2>

      {!canRate ? (
        <p className="kodda-auth-muted">
          La calificación estará disponible cuando la orden esté confirmada.
        </p>
      ) : null}

      {error ? <p className="kodda-auth-error">{error}</p> : null}
      {success ? <p className="kodda-auth-muted">{success}</p> : null}

      {sellerIds.length === 0 ? (
        <p className="kodda-auth-muted">
          No se encontró información del vendedor para esta compra.
        </p>
      ) : (
        <ul className="kodda-checkout-items" style={{ listStyle: 'none', padding: 0 }}>
          {sellerIds.map((sellerId) => {
            const alreadyRated = ratedIds.has(sellerId);
            return (
              <li key={sellerId} className="kodda-checkout-item">
                <div>
                  <p className="kodda-checkout-item-name">Vendedor #{sellerId}</p>
                  <p className="kodda-checkout-item-meta">
                    {alreadyRated
                      ? 'Ya calificaste a este vendedor para esta compra.'
                      : 'Contanos cómo fue tu experiencia con esta venta.'}
                  </p>
                </div>
                {canRate && !alreadyRated ? (
                  <button
                    type="button"
                    className="kodda-btn-primary"
                    disabled={submitting}
                    onClick={() => setModalSellerId(sellerId)}
                  >
                    Calificar vendedor
                  </button>
                ) : alreadyRated ? (
                  <span className="kodda-rating-done-badge" aria-label="Calificado">
                    ✓ Calificado
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {modalSellerId ? (
        <SellerRatingModal
          sellerId={modalSellerId}
          sellerLabel={`Vendedor #${modalSellerId}`}
          submitting={submitting}
          onClose={() => !submitting && setModalSellerId(null)}
          onSubmit={handleSubmit}
        />
      ) : null}
    </section>
  );
}
