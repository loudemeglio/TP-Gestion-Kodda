/** Geometría SVG para gráficos de área con curva suave (estilo monotone). */

const CHART_PAD = { top: 12, right: 8, bottom: 8, left: 8 };

export function getAreaChartLayout(viewWidth, viewHeight, pointCount) {
  const innerW = viewWidth - CHART_PAD.left - CHART_PAD.right;
  const innerH = viewHeight - CHART_PAD.top - CHART_PAD.bottom;
  const baselineY = viewHeight - CHART_PAD.bottom;

  return { innerW, innerH, baselineY, pad: CHART_PAD };
}

export function buildAreaChartCoords(displayPoints, viewWidth, viewHeight) {
  if (!displayPoints?.length) {
    return { coords: [], maxValue: 0, baselineY: viewHeight - CHART_PAD.bottom };
  }

  const values = displayPoints.map((p) => Number(p.value || 0));
  const maxValue = Math.max(...values, 0);
  const scaleMax = maxValue > 0 ? maxValue : 1;
  const { innerW, innerH, baselineY, pad } = getAreaChartLayout(viewWidth, viewHeight, displayPoints.length);
  const count = displayPoints.length;

  const coords = displayPoints.map((point, index) => {
    const x =
      count === 1
        ? pad.left + innerW / 2
        : pad.left + (index / (count - 1)) * innerW;
    const y = pad.top + (1 - values[index] / scaleMax) * innerH;
    return {
      x,
      y,
      label: point.label,
      value: values[index],
    };
  });

  return { coords, maxValue, baselineY };
}

/** Curva monotone X (misma idea que d3.curveMonotoneX). */
function buildMonotoneLinePath(coords) {
  if (!coords.length) return '';
  if (coords.length === 1) {
    const p = coords[0];
    return `M ${p.x} ${p.y}`;
  }

  const n = coords.length;
  const slopes = [];

  for (let i = 0; i < n - 1; i += 1) {
    const dx = coords[i + 1].x - coords[i].x || 1;
    slopes.push((coords[i + 1].y - coords[i].y) / dx);
  }

  const tangents = new Array(n);
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];

  for (let i = 1; i < n - 1; i += 1) {
    const s0 = slopes[i - 1];
    const s1 = slopes[i];
    if (s0 * s1 <= 0) {
      tangents[i] = 0;
    } else {
      tangents[i] = (s0 + s1) / 2;
    }
  }

  let path = `M ${coords[0].x} ${coords[0].y}`;

  for (let i = 0; i < n - 1; i += 1) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const dx = (p1.x - p0.x) / 3;
    const cp1x = p0.x + dx;
    const cp1y = p0.y + tangents[i] * dx;
    const cp2x = p1.x - dx;
    const cp2y = p1.y - tangents[i + 1] * dx;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }

  return path;
}

export function buildSmoothAreaPath(coords, baselineY) {
  if (!coords.length) return '';

  if (coords.length === 1) {
    const p = coords[0];
    return `M ${p.x} ${baselineY} L ${p.x} ${p.y} L ${p.x} ${baselineY} Z`;
  }

  const linePath = buildMonotoneLinePath(coords);
  const first = coords[0];
  const last = coords[coords.length - 1];
  return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

export function buildSmoothLinePath(coords) {
  if (!coords.length) return '';
  if (coords.length === 1) {
    const p = coords[0];
    return `M ${p.x} ${p.y}`;
  }
  return buildMonotoneLinePath(coords);
}

/** Índice del punto más cercano al cursor (coordenada x en viewBox). */
export function findNearestPointIndex(coords, pointerX) {
  if (!coords.length) return -1;
  let nearest = 0;
  let minDist = Math.abs(coords[0].x - pointerX);

  for (let i = 1; i < coords.length; i += 1) {
    const dist = Math.abs(coords[i].x - pointerX);
    if (dist < minDist) {
      minDist = dist;
      nearest = i;
    }
  }

  return nearest;
}
