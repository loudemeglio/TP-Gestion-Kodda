import { useState } from 'react';

const STAR_VALUES = [1, 2, 3, 4, 5];

function YesNoToggle({ label, value, onChange, name }) {
  return (
    <div className="kodda-rating-yesno">
      <span className="kodda-modal-label">{label}</span>
      <div className="kodda-rating-yesno-btns" role="group" aria-label={label}>
        <button
          type="button"
          className={value === true ? 'kodda-btn-primary kodda-rating-yesno-btn' : 'kodda-btn-ghost kodda-rating-yesno-btn'}
          onClick={() => onChange(true)}
          aria-pressed={value === true}
          name={`${name}-yes`}
        >
          Sí
        </button>
        <button
          type="button"
          className={value === false ? 'kodda-btn-primary kodda-rating-yesno-btn' : 'kodda-btn-ghost kodda-rating-yesno-btn'}
          onClick={() => onChange(false)}
          aria-pressed={value === false}
          name={`${name}-no`}
        >
          No
        </button>
      </div>
    </div>
  );
}

export default function SellerRatingModal({
  sellerId,
  sellerLabel,
  onClose,
  onSubmit,
  submitting = false,
}) {
  const [stars, setStars] = useState(0);
  const [description, setDescription] = useState('');
  const [matchesDescription, setMatchesDescription] = useState(null);
  const [deliveredOnTime, setDeliveredOnTime] = useState(null);
  const [isScamReport, setIsScamReport] = useState(false);
  const [localError, setLocalError] = useState('');

  function validate() {
    if (stars < 1) {
      setLocalError('Seleccioná una calificación de 1 a 5 estrellas.');
      return false;
    }
    if (description.trim().length < 10) {
      setLocalError('La descripción debe tener al menos 10 caracteres.');
      return false;
    }
    if (matchesDescription === null) {
      setLocalError('Indicá si la prenda coincidió con la descripción.');
      return false;
    }
    if (deliveredOnTime === null) {
      setLocalError('Indicá si el vendedor cumplió con los tiempos acordados.');
      return false;
    }
    setLocalError('');
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      sellerId,
      stars,
      description: description.trim(),
      matches_description: matchesDescription,
      delivered_on_time: deliveredOnTime,
      is_scam_report: isScamReport,
    });
  }

  return (
    <div
      className="kodda-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kodda-rating-title"
      onClick={(ev) => ev.target === ev.currentTarget && !submitting && onClose()}
    >
      <div className="kodda-modal kodda-modal--rating">
        <div className="kodda-modal-head">
          <div className="kodda-modal-icon" aria-hidden="true">
            ★
          </div>
          <h2 id="kodda-rating-title" className="kodda-modal-title">
            Calificar vendedor
          </h2>
          <p className="kodda-modal-sub">{sellerLabel || `Vendedor #${sellerId}`}</p>
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

          <label className="kodda-modal-label" htmlFor="kodda-rating-description">
            Descripción de la venta
          </label>
          <textarea
            id="kodda-rating-description"
            className="kodda-modal-textarea kodda-modal-textarea--tall"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contanos cómo fue la experiencia de compra…"
            maxLength={2000}
            rows={5}
            required
          />

          <YesNoToggle
            label="¿Coincidió con la descripción de la prenda?"
            value={matchesDescription}
            onChange={setMatchesDescription}
            name="matches"
          />
          <YesNoToggle
            label="¿Cumplió con los tiempos acordados?"
            value={deliveredOnTime}
            onChange={setDeliveredOnTime}
            name="delivery"
          />

          <label className="kodda-rating-scam-check">
            <input
              type="checkbox"
              checked={isScamReport}
              onChange={(e) => setIsScamReport(e.target.checked)}
            />
            <span>Reportar conducta sospechosa / Posible estafa</span>
          </label>

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
