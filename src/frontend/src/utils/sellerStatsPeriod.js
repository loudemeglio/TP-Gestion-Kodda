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

/**
 * Altura de barra en % del contenedor.
 * Ventas muy bajas respecto al pico se muestran con la misma altura mínima (evita “picos” falsos).
 */
export function computeBarHeightPercent(value, maxValue, options = {}) {
  const { floorPct = 4, smallRatio = 0.1 } = options;
  const v = Number(value || 0);
  const max = Number(maxValue || 0);
  if (max <= 0) return 0;

  if (v <= 0) return floorPct;

  const pct = (v / max) * 100;
  if (pct <= smallRatio * 100) return floorPct;
  return pct;
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

function startOfWeekIso(date) {
  const d = new Date(date);
  const weekday = d.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  d.setDate(d.getDate() + diff);
  return toIsoDate(d);
}

/** Agrupa ventas diarias por semana (solo visualización; mismos totales). */
export function bucketChartPointsByWeek(points) {
  if (!points?.length) {
    return [];
  }

  const buckets = new Map();
  for (const point of points) {
    const day = parseChartDay(point.label);
    if (!day) continue;
    const weekKey = startOfWeekIso(day);
    const current = buckets.get(weekKey) ?? { label: weekKey, value: 0 };
    current.value += Number(point.value || 0);
    buckets.set(weekKey, current);
  }

  return [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** Etiqueta corta en una línea: "23–29 mar" (sin cortes raros entre palabras). */
export function formatWeekChartLabel(weekStartIso) {
  const start = parseChartDay(weekStartIso);
  if (!start) return '';

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startMonth = start.getMonth();
  const endMonth = end.getMonth();
  const nbsp = '\u00a0';

  if (startMonth === endMonth) {
    const month = new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(start);
    return `${start.getDate()}–${end.getDate()}${nbsp}${month}`;
  }

  const startPart = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(start);
  const endPart = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(end);
  return `${startPart.replace(' ', nbsp)}–${endPart.replace(' ', nbsp)}`;
}

/** Dos líneas alineadas bajo cada barra (días arriba, mes abajo). */
export function formatWeekChartLabelLines(weekStartIso) {
  const start = parseChartDay(weekStartIso);
  if (!start) return { top: '', bottom: '' };

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const monthFmt = new Intl.DateTimeFormat('es-AR', { month: 'short' });

  if (start.getMonth() === end.getMonth()) {
    return {
      top: `${start.getDate()}–${end.getDate()}`,
      bottom: monthFmt.format(start),
    };
  }

  return {
    top: `${start.getDate()}–${end.getDate()}`,
    bottom: `${monthFmt.format(start)}–${monthFmt.format(end)}`,
  };
}

export function formatWeekChartTooltip(weekStartIso, valueFormatted) {
  const start = parseChartDay(weekStartIso);
  if (!start) return valueFormatted;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts = { day: 'numeric', month: 'long' };
  const startStr = new Intl.DateTimeFormat('es-AR', opts).format(start);
  const endStr = new Intl.DateTimeFormat('es-AR', { ...opts, year: 'numeric' }).format(end);
  return `Semana ${startStr} – ${endStr} · ${valueFormatted}`;
}
