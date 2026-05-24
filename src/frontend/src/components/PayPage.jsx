import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { KoddaLogo } from './KoddaLogo';
import { getBaseURL } from '../api/client';
import '../styles/checkout.css';

const publicApi = axios.create({ baseURL: getBaseURL() });

export default function PayPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [intent, setIntent] = useState(null);

  const loadStatus = useCallback(async () => {
    setError('');
    try {
      const { data } = await publicApi.get(`/api/payments/intents/${token}/status`);
      setIntent(data);
      if (data.status === 'approved') setDone(true);
      if (data.status === 'expired') {
        setError('Este código de pago expiró.');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 404) {
        setError('Pago no encontrado.');
      } else {
        setError(typeof detail === 'string' ? detail : 'No se pudo cargar el pago.');
      }
      setIntent(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function handleConfirm() {
    setSubmitting(true);
    setError('');
    try {
      await publicApi.post(`/api/payments/intents/${token}/approve`);
      setDone(true);
      await loadStatus();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 410) {
        setError(typeof detail === 'string' ? detail : 'Este código de pago expiró.');
      } else if (err.response?.status === 404) {
        setError('Pago no encontrado.');
      } else {
        setError(typeof detail === 'string' ? detail : 'No se pudo confirmar el pago.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const formattedAmount =
    intent?.amount != null
      ? intent.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
      : '';

  return (
    <div className="kodda-home kodda-pay-page">
      <header className="kodda-topbar">
        <KoddaLogo compact />
      </header>

      <main className="kodda-pay-page-main">
        <div className="kodda-wallet-qr-card kodda-pay-page-card">
          <h1 className="kodda-pay-page-title">Pago con billetera</h1>

          {loading ? <p className="kodda-auth-muted">Cargando…</p> : null}

          {!loading && intent ? (
            <>
              <p className="kodda-wallet-qr-amount">{formattedAmount}</p>
              <span
                className={`kodda-wallet-qr-badge${
                  done || intent.status === 'approved'
                    ? ' kodda-wallet-qr-badge--paid'
                    : intent.status === 'expired'
                      ? ' kodda-wallet-qr-badge--expired'
                      : ' kodda-wallet-qr-badge--pending'
                }`}
              >
                {done || intent.status === 'approved'
                  ? 'Pago confirmado'
                  : intent.status === 'expired'
                    ? 'Pago expirado'
                    : 'Pendiente de confirmación'}
              </span>
            </>
          ) : null}

          {error ? <p className="kodda-auth-error">{error}</p> : null}

          {done ? (
            <div className="kodda-wallet-qr-success kodda-pay-page-success" role="status">
              <span className="kodda-wallet-qr-success-icon" aria-hidden>
                ✓
              </span>
              <p>
                Pago confirmado. Volvé a la computadora para finalizar tu compra en Kodda.
              </p>
            </div>
          ) : null}

          {!loading && intent && intent.status === 'pending' && !done ? (
            <button
              type="button"
              className="kodda-btn-checkout kodda-pay-page-confirm"
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting ? 'Confirmando…' : 'Confirmar pago'}
            </button>
          ) : null}

          <p className="kodda-auth-muted kodda-pay-page-footer">
            <Link to="/">Ir al inicio de Kodda</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
