/** Rangos de fechas para estadísticas del vendedor (ISO date YYYY-MM-DD). */

function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getPresetRange(preset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const to = toIsoDate(today);

  switch (preset) {
    case 'today': {
      return { from: to, to, preset: 'today' };
    }
    case '7d': {
      const fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - 6);
      return { from: toIsoDate(fromDate), to, preset: '7d' };
    }
    case '30d': {
      const fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - 29);
      return { from: toIsoDate(fromDate), to, preset: '30d' };
    }
    case 'month': {
      const fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: toIsoDate(fromDate), to, preset: 'month' };
    }
    default:
      return getPresetRange('30d');
  }
}

export const SELLER_STATS_PRESETS = [
  { id: 'today', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'month', label: 'Este mes' },
  { id: 'custom', label: 'Personalizado' },
];

/** Texto legible del rango aplicado (es-AR). */
export function formatStatsRangeLabel(fromIso, toIso) {
  if (!fromIso || !toIso) return '';
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  const from = new Date(`${fromIso}T12:00:00`);
  const to = new Date(`${toIso}T12:00:00`);
  const fromStr = new Intl.DateTimeFormat('es-AR', opts).format(from);
  const toStr = new Intl.DateTimeFormat('es-AR', opts).format(to);
  if (fromIso === toIso) return fromStr;
  return `${fromStr} – ${toStr}`;
}

/** A partir de este número de puntos se ocultan etiquetas del eje X (solo hover). */
export const CHART_AXIS_LABELS_MAX = 10;

export function shouldShowChartAxisLabels(pointCount) {
  return pointCount <= CHART_AXIS_LABELS_MAX;
}

/** Parsea etiqueta ISO de día (YYYY-MM-DD) del gráfico. */
function parseChartDay(label) {
  if (!label || !/^\d{4}-\d{2}-\d{2}$/.test(label)) return null;
  const d = new Date(`${label}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Texto del tooltip al pasar el mouse sobre una barra (siempre por día). */
export function formatChartTooltip(label, valueFormatted) {
  const d = parseChartDay(label);
  if (d) {
    const dateStr = new Intl.DateTimeFormat('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
    return `${dateStr} · ${valueFormatted}`;
  }
  return valueFormatted || label || '';
}

/** Etiqueta corta bajo la barra (solo si hay pocos puntos). */
export function formatChartLabel(label) {
  const d = parseChartDay(label);
  if (d) {
    return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(d);
  }
  return '';
}
