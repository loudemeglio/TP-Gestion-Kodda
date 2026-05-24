export const TAX_CONDITIONS = [
  { value: 'consumidor_final', label: 'Consumidor final' },
  { value: 'monotributo', label: 'Monotributo' },
  { value: 'responsable_inscripto', label: 'Responsable inscripto' },
  { value: 'exento', label: 'Exento' },
];

export const TAX_CONDITION_LABELS = Object.fromEntries(
  TAX_CONDITIONS.map(({ value, label }) => [value, label])
);

export const EMPTY_BILLING_FORM = {
  legal_name: '',
  tax_id: '',
  tax_condition: 'consumidor_final',
  billing_address: '',
  city: '',
  province: '',
  postal_code: '',
  billing_email: '',
};

export function billingToForm(data) {
  return {
    legal_name: data.legal_name || '',
    tax_id: data.tax_id || '',
    tax_condition: data.tax_condition || 'consumidor_final',
    billing_address: data.billing_address || '',
    city: data.city || '',
    province: data.province || '',
    postal_code: data.postal_code || '',
    billing_email: data.billing_email || '',
  };
}

/** Formato habitual en Argentina: XX-XXXXXXXX-X */
export function formatTaxIdDisplay(taxId) {
  const digits = String(taxId || '').replace(/\D/g, '');
  if (digits.length !== 11) return taxId || '';
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

export function formatBillingApiError(err, fallback = 'No se pudieron guardar los datos de facturación.') {
  const detail = err.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    return first.msg || String(first);
  }
  return fallback;
}

export function buildBillingPayload(form) {
  const payload = {
    legal_name: form.legal_name.trim(),
    tax_id: form.tax_id.trim(),
    tax_condition: form.tax_condition,
    billing_address: form.billing_address.trim(),
    city: form.city.trim() || null,
    province: form.province.trim() || null,
    postal_code: form.postal_code.trim() || null,
  };
  if (form.billing_email.trim()) {
    payload.billing_email = form.billing_email.trim();
  }
  return payload;
}
