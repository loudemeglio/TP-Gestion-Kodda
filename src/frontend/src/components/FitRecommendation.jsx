import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const VERDICT_META = {
  small: { label: 'Chico', tone: 'alert', pos: 0 },
  tight: { label: 'Ajustado', tone: 'warn', pos: 1 },
  ideal: { label: 'Ideal', tone: 'ideal', pos: 2 },
  loose: { label: 'Holgado', tone: 'warn', pos: 3 },
  large: { label: 'Grande', tone: 'alert', pos: 4 },
};

const SCALE_STOPS = ['Chico', 'Ajustado', 'Ideal', 'Holgado', 'Grande'];

const CONFIDENCE_META = {
  alta: { label: 'Confianza alta', dots: 3 },
  media: { label: 'Confianza media', dots: 2 },
  baja: { label: 'Confianza baja', dots: 1 },
};

function FactorIcon({ text }) {
  const t = text.toLowerCase();
  let icon = '✨';
  if (t.includes('marca')) icon = '🏷️';
  else if (t.includes('holgado') || t.includes('ajustado') || t.includes('regular') || t.includes('calce')) icon = '🧍';
  else if (t.includes('altura') || t.includes('peso') || t.includes('estimamos')) icon = '📐';
  else if (t.includes('talle') || t.includes('calzado') || t.includes('partimos')) icon = '📏';
  return (
    <span className="kodda-fit-factor-icon" aria-hidden="true">
      {icon}
    </span>
  );
}

export default function FitRecommendation({ productId }) {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, data: null, error: '' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState({ loading: true, data: null, error: '' });
      try {
        const { data } = await api.get(`/api/catalog/products/${productId}/fit`);
        if (!cancelled) setState({ loading: false, data, error: '' });
      } catch (err) {
        if (!cancelled) {
          const detail = err.response?.data?.detail;
          setState({
            loading: false,
            data: null,
            error: typeof detail === 'string' ? detail : 'No se pudo calcular la recomendación de talle.',
          });
        }
      }
    }
    if (productId) void load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const { loading, data, error } = state;
  const firstName = (user?.username || '').trim().split(' ')[0];

  if (loading) {
    return (
      <section className="kodda-fit-card kodda-fit-card--loading" aria-live="polite">
        <div className="kodda-fit-orb" aria-hidden="true">
          <span className="kodda-fit-orb-core" />
        </div>
        <div className="kodda-fit-loading-copy">
          <strong>Calculando tu calce ideal…</strong>
          <span>Cruzando tus medidas con esta prenda</span>
        </div>
      </section>
    );
  }

  if (error) return null;
  if (!data) return null;

  // Caso atípico 1: el comprador no tiene medidas cargadas.
  if (data.status === 'missing_measures') {
    return (
      <section className="kodda-fit-card kodda-fit-card--invite">
        <div className="kodda-fit-glow" aria-hidden="true" />
        <div className="kodda-fit-topline">
          <span className="kodda-fit-badge">
            <span className="kodda-fit-badge-spark" aria-hidden="true">✦</span> Fit IA
          </span>
        </div>
        <div className="kodda-fit-invite-body">
          <span className="kodda-fit-invite-emoji" aria-hidden="true">📏</span>
          <div>
            <strong className="kodda-fit-invite-title">
              {firstName ? `${firstName}, ¿te va a quedar bien?` : '¿Te va a quedar bien?'}
            </strong>
            <p className="kodda-fit-invite-text">
              Completá tus medidas y la IA de Kodda te dice, en cada prenda, si es tu talle.
            </p>
          </div>
        </div>
        <Link to="/perfil/editar" className="kodda-btn-primary kodda-fit-cta">
          Completá tus medidas
        </Link>
      </section>
    );
  }

  // Caso atípico 2: no hay datos suficientes de la prenda.
  if (data.status === 'insufficient_product_data') {
    return (
      <section className="kodda-fit-card kodda-fit-card--fallback">
        <div className="kodda-fit-topline">
          <span className="kodda-fit-badge kodda-fit-badge--muted">Talles</span>
        </div>
        <p className="kodda-fit-invite-text">
          No tenemos datos suficientes de esta prenda para una recomendación personalizada.
        </p>
        <Link to="/guia-de-talles" className="kodda-fit-guide-link">
          Ver guía de talles genérica →
        </Link>
      </section>
    );
  }

  // Caso OK: recomendación con justificación.
  const meta = VERDICT_META[data.verdict] || VERDICT_META.ideal;
  const confidence = CONFIDENCE_META[data.confidence] || CONFIDENCE_META.media;
  const factors = Array.isArray(data.factors) && data.factors.length
    ? data.factors
    : data.explanation
      ? [data.explanation]
      : [];

  return (
    <section className={`kodda-fit-card kodda-fit-card--result kodda-fit-card--${meta.tone}`}>
      <div className="kodda-fit-glow" aria-hidden="true" />

      <div className="kodda-fit-topline">
        <span className="kodda-fit-badge">
          <span className="kodda-fit-badge-spark" aria-hidden="true">✦</span> Fit IA
        </span>
        <span className="kodda-fit-personal">
          {firstName ? `Personalizado para ${firstName}` : 'Personalizado para vos'}
        </span>
      </div>

      <div className="kodda-fit-hero">
        <div className="kodda-fit-size-badge" aria-hidden="true">
          <span className="kodda-fit-size-badge-label">Tu talle</span>
          <strong className="kodda-fit-size-badge-value">{data.recommended_size}</strong>
        </div>
        <div className="kodda-fit-hero-copy">
          <strong className="kodda-fit-headline">{data.headline}</strong>
          <div className={`kodda-fit-confidence kodda-fit-confidence--${data.confidence}`}>
            <span className="kodda-fit-confidence-dots" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`kodda-fit-dot${i < confidence.dots ? ' kodda-fit-dot--on' : ''}`}
                />
              ))}
            </span>
            {confidence.label}
          </div>
        </div>
      </div>

      <div className="kodda-fit-scale" role="img" aria-label={`Calce: ${meta.label}`}>
        <div className="kodda-fit-scale-track">
          <span
            className={`kodda-fit-scale-marker kodda-fit-scale-marker--${meta.tone}`}
            style={{ left: `${(meta.pos / (SCALE_STOPS.length - 1)) * 100}%` }}
          >
            <span className="kodda-fit-scale-marker-dot" />
          </span>
        </div>
        <div className="kodda-fit-scale-stops">
          {SCALE_STOPS.map((stop, i) => (
            <span
              key={stop}
              className={`kodda-fit-scale-stop${i === meta.pos ? ' kodda-fit-scale-stop--active' : ''}`}
            >
              {stop}
            </span>
          ))}
        </div>
      </div>

      {factors.length ? (
        <ul className="kodda-fit-factors">
          {factors.map((factor, i) => (
            <li key={i} className="kodda-fit-factor">
              <FactorIcon text={factor} />
              <span>{factor}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <Link to="/guia-de-talles" className="kodda-fit-guide-link kodda-fit-guide-link--small">
        ¿Dudas con el talle? Ver guía genérica →
      </Link>
    </section>
  );
}
