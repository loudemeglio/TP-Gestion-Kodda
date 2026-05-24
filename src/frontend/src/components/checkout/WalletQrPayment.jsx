import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../api/client';
import { buildPaymentPageUrl } from '../../utils/publicOrigin';

const STEPS = [
  { id: 1, label: 'Escaneá el QR' },
  { id: 2, label: 'Confirmá en tu celular' },
  { id: 3, label: 'Finalizá la compra acá' },
];

const POLL_MS = 2000;

export default function WalletQrPayment({
  total,
  walletPaid,
  onWalletPaidChange,
  disabled = false,
}) {
  const [paymentUrl, setPaymentUrl] = useState('');
  const [intentToken, setIntentToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const pollRef = useRef(null);
  const onPaidRef = useRef(onWalletPaidChange);
  onPaidRef.current = onWalletPaidChange;

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (token) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const { data } = await api.get(`/api/payments/intents/${token}/status`);
          if (data.status === 'approved') {
            stopPolling();
            onPaidRef.current(true);
          } else if (data.status === 'expired') {
            stopPolling();
            setError('El código de pago expiró. Generá uno nuevo.');
            onPaidRef.current(false);
          }
        } catch {
          /* ignorar errores transitorios de red */
        }
      }, POLL_MS);
    },
    [stopPolling],
  );

  const createIntent = useCallback(async () => {
    setLoading(true);
    setError('');
    onPaidRef.current(false);
    stopPolling();
    try {
      const { data } = await api.post('/api/payments/intents');
      const url =
        data.payment_url ||
        (data.token ? buildPaymentPageUrl(data.token) : '');
      setIntentToken(data.token);
      setPaymentUrl(url);
      startPolling(data.token);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'No se pudo iniciar el pago.');
      setPaymentUrl('');
      setIntentToken('');
    } finally {
      setLoading(false);
    }
  }, [startPolling, stopPolling]);

  useEffect(() => {
    createIntent();
    return () => stopPolling();
  }, [total, createIntent, stopPolling]);

  useEffect(() => {
    if (walletPaid) stopPolling();
  }, [walletPaid, stopPolling]);

  const formattedTotal = useMemo(
    () => total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
    [total],
  );

  const activeStep = walletPaid ? 3 : 1;

  async function handleCopyLink() {
    if (!paymentUrl) return;
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopyFeedback('Enlace copiado');
      setTimeout(() => setCopyFeedback(''), 2500);
    } catch {
      setCopyFeedback('No se pudo copiar');
      setTimeout(() => setCopyFeedback(''), 2500);
    }
  }

  return (
    <div className="kodda-wallet-qr">
      <ol className="kodda-wallet-qr-steps" aria-label="Pasos de pago">
        {STEPS.map((step) => {
          const done = step.id < activeStep || (walletPaid && step.id <= 2);
          const current = step.id === activeStep && !walletPaid;
          const completed = walletPaid && step.id === 3;

          return (
            <li
              key={step.id}
              className={[
                'kodda-wallet-qr-step',
                done ? 'kodda-wallet-qr-step--done' : '',
                current ? 'kodda-wallet-qr-step--current' : '',
                completed ? 'kodda-wallet-qr-step--done' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="kodda-wallet-qr-step-num" aria-hidden>
                {done || completed ? '✓' : step.id}
              </span>
              <span className="kodda-wallet-qr-step-label">{step.label}</span>
            </li>
          );
        })}
      </ol>

      <div
        className={`kodda-wallet-qr-card${walletPaid ? ' kodda-wallet-qr-card--paid' : ''}`}
      >
        <span
          className={`kodda-wallet-qr-badge${
            walletPaid ? ' kodda-wallet-qr-badge--paid' : ' kodda-wallet-qr-badge--pending'
          }`}
        >
          {walletPaid ? 'Pago confirmado' : loading ? 'Generando código…' : 'Esperando pago'}
        </span>

        <p className="kodda-wallet-qr-amount">{formattedTotal}</p>
        <p className="kodda-payment-details-lead kodda-wallet-qr-lead">
          Escaneá con la cámara de tu celular o copiá el enlace de pago.
        </p>

        {error ? <p className="kodda-auth-error kodda-wallet-qr-error">{error}</p> : null}

        {loading ? (
          <p className="kodda-auth-muted">Preparando tu código QR…</p>
        ) : null}

        {!loading && paymentUrl ? (
          <>
            <div className="kodda-wallet-qr-frame" aria-hidden={walletPaid}>
              <QRCodeSVG
                value={paymentUrl}
                size={200}
                level="M"
                includeMargin
                className="kodda-wallet-qr-code"
              />
            </div>

            <div className="kodda-wallet-qr-link-actions">
              <button
                type="button"
                className="kodda-btn-ghost kodda-wallet-qr-copy"
                onClick={handleCopyLink}
                disabled={disabled || walletPaid}
              >
                Copiar enlace de pago
              </button>
              {copyFeedback ? (
                <span className="kodda-wallet-qr-copy-feedback" role="status">
                  {copyFeedback}
                </span>
              ) : null}
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="kodda-auth-link kodda-wallet-qr-open"
              >
                Abrir página de pago
              </a>
            </div>
          </>
        ) : null}

        {walletPaid ? (
          <div className="kodda-wallet-qr-success" role="status">
            <span className="kodda-wallet-qr-success-icon" aria-hidden>
              ✓
            </span>
            <p>Recibimos tu pago. Podés confirmar la compra.</p>
          </div>
        ) : null}

        <div className="kodda-wallet-qr-actions">
          {!walletPaid && !loading ? (
            <button
              type="button"
              className="kodda-btn-ghost kodda-wallet-qr-reset"
              onClick={createIntent}
              disabled={disabled}
            >
              Generar nuevo código
            </button>
          ) : null}
          {walletPaid ? (
            <button
              type="button"
              className="kodda-btn-ghost kodda-wallet-qr-reset"
              onClick={createIntent}
              disabled={disabled}
            >
              Volver a escanear
            </button>
          ) : null}
        </div>

        {intentToken && !walletPaid && !loading ? (
          <p className="kodda-auth-muted kodda-wallet-qr-hint">
            Esperando confirmación en el celular…
          </p>
        ) : null}
      </div>
    </div>
  );
}
