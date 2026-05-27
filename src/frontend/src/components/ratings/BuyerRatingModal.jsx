import { useState } from 'react';

const STAR_VALUES = [1, 2, 3, 4, 5];

export default function BuyerRatingModal({
  buyerLabel,
  onClose,
  onSubmit,
  submitting = false,
}) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [localError, setLocalError] = useState('');

  function validate() {
    if (stars < 1) {
      setLocalError('Seleccioná una calificación de 1 a 5 estrellas.');
      return false;
    }
    if (comment.trim().length < 10) {
      setLocalError('El comentario debe tener al menos 10 caracteres.');
      return false;
    }
    setLocalError('');
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ stars, comment: comment.trim() });
  }

  return (
    <div
      className="kodda-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kodda-buyer-rating-title"
      onClick={(ev) => ev.target === ev.currentTarget && !submitting && onClose()}
    >
      <div className="kodda-modal kodda-modal--rating">
        <div className="kodda-modal-head">
          <div className="kodda-modal-icon" aria-hidden="true">
            ★
          </div>
          <h2 id="kodda-buyer-rating-title" className="kodda-modal-title">
            Calificar comprador
          </h2>
          <p className="kodda-modal-sub">{buyerLabel}</p>
        </div>

        <form className="kodda-modal-body" onSubmit={handleSubmit}>
          <div className="kodda-rating-stars-block">
            <span className="kodda-modal-label">Calificación con estrellas</span>
            <div className="kodda-rating-stars" role="radiogroup" aria-label="Estrellas de 1 a 5">
              {STAR_VALUES.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`kodda-rating-star${n <= stars ? ' kodda-rating-star--on' : ''}`}
                  onClick={() => setStars(n)}
                  aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
                  aria-pressed={n <= stars}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <label className="kodda-modal-label" htmlFor="kodda-buyer-rating-comment">
            Descripción del trato
          </label>
          <textarea
            id="kodda-buyer-rating-comment"
            className="kodda-modal-textarea kodda-modal-textarea--tall"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Contanos cómo fue la experiencia con este comprador…"
            maxLength={2000}
            rows={5}
            required
          />

          {localError ? <p className="kodda-auth-error">{localError}</p> : null}

          <div className="kodda-modal-actions">
            <button type="button" className="kodda-btn-ghost" disabled={submitting} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="kodda-btn-primary" disabled={submitting}>
              {submitting ? 'Enviando…' : 'Enviar calificación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
