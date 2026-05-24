export const PAYMENT_METHODS = [
  { value: 'mercado_pago', label: 'Mercado Pago' },
  { value: 'tarjeta_credito', label: 'Tarjeta de crédito' },
  { value: 'tarjeta_debito', label: 'Tarjeta de débito' },
];

export const PAYMENT_METHOD_LABELS = {
  ...Object.fromEntries(PAYMENT_METHODS.map(({ value, label }) => [value, label])),
  transferencia: 'Transferencia bancaria',
};

export const EMPTY_PAYMENT_DETAILS = {
  mercado_pago: {
    account_email: '',
  },
  tarjeta_credito: {
    card_holder: '',
    card_number: '',
    expiry: '',
    cvv: '',
  },
  tarjeta_debito: {
    card_holder: '',
    card_number: '',
    expiry: '',
    cvv: '',
  },
};

function digitsOnly(value, maxLen) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, maxLen);
}

export function isPaymentDetailsComplete(method, details) {
  if (!method || !details) return false;

  switch (method) {
    case 'mercado_pago': {
      const email = details.mercado_pago?.account_email?.trim() || '';
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    case 'tarjeta_credito':
    case 'tarjeta_debito': {
      const d = details[method] || {};
      const number = digitsOnly(d.card_number, 19);
      const expiry = (d.expiry || '').trim();
      const cvv = digitsOnly(d.cvv, 4);
      return (
        d.card_holder?.trim().length >= 2 &&
        number.length >= 15 &&
        /^\d{2}\/\d{2}$/.test(expiry) &&
        cvv.length >= 3
      );
    }
    default:
      return false;
  }
}

export function formatCardNumber(value) {
  const digits = digitsOnly(value, 19);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function formatExpiry(value) {
  const digits = digitsOnly(value, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}
