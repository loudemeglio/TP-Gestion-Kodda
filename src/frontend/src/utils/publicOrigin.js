/**
 * Origen público del frontend (URL en QR / enlaces de pago).
 * En deploy suele coincidir con window.location.origin.
 * En local con celular: REACT_APP_PUBLIC_ORIGIN=http://TU_IP:3000
 */
export function getPublicOrigin() {
  const fromEnv = process.env.REACT_APP_PUBLIC_ORIGIN;
  if (fromEnv && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '');
  }
  return '';
}

export function buildPaymentPageUrl(token) {
  const base = getPublicOrigin();
  return `${base}/pagar/${token}`;
}
