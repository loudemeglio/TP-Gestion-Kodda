const FIELD_MESSAGES = {
  description: 'La descripción debe tener al menos 10 caracteres.',
  stars: 'Seleccioná una calificación de 1 a 5 estrellas.',
  matches_description: 'Indicá si la prenda coincidió con la descripción.',
  delivered_on_time: 'Indicá si el vendedor cumplió con los tiempos acordados.',
  seller_id: 'Vendedor inválido.',
};

function formatValidationItem(item) {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return '';

  const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : '';
  if (field && FIELD_MESSAGES[field]) return FIELD_MESSAGES[field];
  if (item.msg) return item.msg;
  return '';
}

/**
 * Convierte `detail` de FastAPI (string | array de validación) en texto para mostrar en UI.
 */
export function formatApiError(err, fallback = 'Ocurrió un error.') {
  if (!err?.response) {
    return 'No hay conexión con el servidor.';
  }

  const detail = err.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    const messages = detail.map(formatValidationItem).filter(Boolean);
    return messages.length > 0 ? messages.join(' ') : fallback;
  }

  return fallback;
}
