import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client';
import {
  buildAreaChartCoords,
  buildSmoothAreaPath,
  buildSmoothLinePath,
  findNearestPointIndex,
} from '../../utils/chartGeometry';
import { useChartInView } from '../../hooks/useChartInView';
import {
  bucketChartPointsByWeek,
  computeBarHeightPercent,
  formatChartLabel,
  formatChartTooltip,
  formatStatsRangeLabel,
  formatWeekChartLabel,
  formatWeekChartLabelLines,
  formatWeekChartTooltip,
  shouldShowChartAxisLabels,
} from '../../utils/sellerStatsPeriod';

const AREA_VIEW_WIDTH = 1000;
const AREA_VIEW_HEIGHT = 280;

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const paymentLabels = {
  transferencia: 'Transferencia',
  mercado_pago: 'Mercado Pago',
  tarjeta_credito: 'Tarjeta de crédito',
  tarjeta_debito: 'Tarjeta de débito',
};

const PERIOD_TABS = [
  { id: 'today', label: 'Hoy', endpoint: '/api/admin/metrics/today' },
  { id: '30d', label: 'Último mes', endpoint: '/api/admin/metrics/period', days: 30 },
  { id: '90d', label: 'Últimos 90 días', endpoint: '/api/admin/metrics/period', days: 90 },
];

const KPI_CONFIG = [
  { key: 'total_sales', label: 'Facturación', format: 'currency', accent: 'teal' },
  { key: 'order_count', label: 'Órdenes', format: 'number', accent: 'amber' },
  { key: 'items_sold', label: 'Productos', format: 'number', accent: 'violet' },
  { key: 'average_ticket', label: 'Ticket promedio', format: 'currency', accent: 'rose' },
];

const PAYMENT_COLORS = ['#0f766e', '#ea580c', '#7c3aed', '#db2777', '#2563eb'];

function formatCurrency(value) {
  return currency.format(Number(value || 0));
}

function formatTime(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function formatDateTime(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed);
}

function formatKpiValue(metrics, key, format) {
  const raw = metrics?.[key] ?? 0;
  return format === 'currency' ? formatCurrency(raw) : String(raw);
}

function metricsMatchTab(activeTab, metrics) {
  if (!metrics) return false;
  if (activeTab === 'today') return Boolean(metrics.date);
  return Boolean(metrics.from_date && metrics.to_date);
}

function getRangeLabel(activeTab, metrics) {
  if (!metricsMatchTab(activeTab, metrics)) return '';

  if (activeTab === 'today') {
    const parsed = new Date(`${metrics.date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return metrics.date;
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(parsed);
  }

  return formatStatsRangeLabel(metrics.from_date, metrics.to_date);
}

function buildPaymentDonut(methods) {
  const total = methods.reduce((sum, point) => sum + Number(point.value || 0), 0);
  if (!total) return { gradient: 'conic-gradient(#ebe6dc 0deg 360deg)', segments: [] };

  let angle = 0;
  const segments = methods.map((point, index) => {
    const value = Number(point.value || 0);
    const pct = (value / total) * 100;
    const start = angle;
    angle += (value / total) * 360;
    return {
      label: paymentLabels[point.label] || point.label,
      value,
      pct,
      color: PAYMENT_COLORS[index % PAYMENT_COLORS.length],
      start,
      end: angle,
    };
  });

  const stops = segments.map((seg) => `${seg.color} ${seg.start}deg ${seg.end}deg`).join(', ');
  return { gradient: `conic-gradient(${stops})`, segments, total };
}

function MetricKpiCard({ label, value, accent }) {
  return (
    <article className={`kodda-admin-kpi kodda-admin-kpi--interactive kodda-admin-kpi--${accent}`}>
      <span className="kodda-admin-kpi-glow" aria-hidden="true" />
      <span className="kodda-admin-kpi-label">{label}</span>
      <strong className="kodda-admin-kpi-value">{value}</strong>
    </article>
  );
}

function getAreaTooltipLabel(point, variant, isWeekly) {
  const valueStr = formatCurrency(point.value);
  if (variant === 'hour') return `${point.label} · ${valueStr}`;
  if (isWeekly) return formatWeekChartTooltip(point.label, valueStr);
  return formatChartTooltip(point.label, valueStr);
}

function RevenueAreaChart({ points, variant, activeTab }) {
  const svgRef = useRef(null);
  const [plotRef, isInView] = useChartInView();
  const [activeIndex, setActiveIndex] = useState(-1);

  const isWeekly = activeTab === '90d' && variant === 'day';

  const displayPoints = useMemo(() => {
    if (isWeekly) return bucketChartPointsByWeek(points);
    return points ?? [];
  }, [points, isWeekly]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [displayPoints]);

  const geometry = useMemo(
    () => buildAreaChartCoords(displayPoints, AREA_VIEW_WIDTH, AREA_VIEW_HEIGHT),
    [displayPoints]
  );

  const areaPath = useMemo(
    () => buildSmoothAreaPath(geometry.coords, geometry.baselineY),
    [geometry]
  );

  const linePath = useMemo(() => buildSmoothLinePath(geometry.coords), [geometry]);

  const activePoint = activeIndex >= 0 ? geometry.coords[activeIndex] : null;
  const totalRevenue = useMemo(
    () => displayPoints.reduce((sum, p) => sum + Number(p.value || 0), 0),
    [displayPoints]
  );

  const handlePointer = useCallback(
    (clientX) => {
      const svg = svgRef.current;
      if (!svg || !geometry.coords.length) return;

      const rect = svg.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      const viewX = Math.max(0, Math.min(AREA_VIEW_WIDTH, ratio * AREA_VIEW_WIDTH));
      setActiveIndex(findNearestPointIndex(geometry.coords, viewX));
    },
    [geometry.coords]
  );

  const clearPointer = useCallback(() => setActiveIndex(-1), []);

  if (!displayPoints.length) {
    return <EmptyState>No hay ingresos registrados en este período.</EmptyState>;
  }

  const subtitle =
    activeTab === 'today'
      ? 'Ingresos hora a hora'
      : activeTab === '90d'
        ? 'Tendencia semanal'
        : 'Tendencia diaria';

  return (
    <div className="kodda-admin-revenue-area">
      <div className="kodda-admin-revenue-area-summary">
        <div>
          <span className="kodda-admin-revenue-area-label">Acumulado del período</span>
          <strong>{formatCurrency(totalRevenue)}</strong>
        </div>
        {geometry.maxValue > 0 ? (
          <div>
            <span className="kodda-admin-revenue-area-label">Pico</span>
            <strong>{formatCurrency(geometry.maxValue)}</strong>
          </div>
        ) : null}
      </div>

      <div
        ref={plotRef}
        className={`kodda-admin-revenue-area-plot${isInView ? ' kodda-chart-in-view' : ''}`}
        onMouseLeave={clearPointer}
        onBlur={clearPointer}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${AREA_VIEW_WIDTH} ${AREA_VIEW_HEIGHT}`}
          preserveAspectRatio="none"
          overflow="visible"
          className="kodda-admin-revenue-area-svg"
          role="img"
          aria-label="Evolución de ingresos"
          onMouseMove={(e) => handlePointer(e.clientX)}
          onTouchMove={(e) => {
            if (e.touches[0]) handlePointer(e.touches[0].clientX);
          }}
        >
          <defs>
            <linearGradient id="koddaRevenueAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(15, 118, 110, 0.42)" />
              <stop offset="45%" stopColor="rgba(20, 184, 166, 0.18)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </linearGradient>
            <linearGradient id="koddaRevenueLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#0f766e" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((pct) => (
            <line
              key={pct}
              x1={0}
              x2={AREA_VIEW_WIDTH}
              y1={12 + (1 - pct) * (AREA_VIEW_HEIGHT - 20)}
              y2={12 + (1 - pct) * (AREA_VIEW_HEIGHT - 20)}
              className="kodda-admin-revenue-area-grid"
            />
          ))}

          {areaPath ? <path d={areaPath} className="kodda-admin-revenue-area-fill" /> : null}
          {linePath ? (
            <path d={linePath} className="kodda-admin-revenue-area-line" />
          ) : null}

          {geometry.coords.map((coord, index) => (
            <circle
              key={`${coord.label}-${index}`}
              cx={coord.x}
              cy={coord.y}
              r={activeIndex === index ? 9 : 5}
              className={`kodda-admin-revenue-area-dot${
                activeIndex === index ? ' kodda-admin-revenue-area-dot--active' : ''
              }`}
              style={{ '--point-i': index }}
              tabIndex={-1}
              aria-hidden="true"
            />
          ))}

          {activePoint ? (
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={12}
              y2={geometry.baselineY}
              className="kodda-admin-revenue-area-cursor"
            />
          ) : null}
        </svg>

        {activePoint ? (
          <div
            className="kodda-admin-revenue-tooltip"
            style={{ left: `${(activePoint.x / AREA_VIEW_WIDTH) * 100}%` }}
            role="tooltip"
          >
            <span className="kodda-admin-revenue-tooltip-label">
              {getAreaTooltipLabel(activePoint, variant, isWeekly)}
            </span>
            <strong>{formatCurrency(activePoint.value)}</strong>
          </div>
        ) : (
          <p className="kodda-admin-revenue-area-hint">{subtitle} · pasá el cursor sobre el gráfico</p>
        )}
      </div>
    </div>
  );
}

function EmptyState({ children }) {
  return <p className="kodda-metrics-empty">{children}</p>;
}

function getBarTooltipAlign(index, total) {
  if (total <= 1) return 'center';
  if (index === 0) return 'start';
  if (index >= total - 1) return 'end';
  if (index === 1 && total > 3) return 'start';
  if (index === total - 2 && total > 3) return 'end';
  return 'center';
}

function SalesChart({ points, variant, activeTab, peakLabel }) {
  const [stageRef, isInView] = useChartInView();
  const isWeekly = activeTab === '90d' && variant === 'day';

  const displayPoints = useMemo(() => {
    if (isWeekly) {
      return bucketChartPointsByWeek(points);
    }
    return points ?? [];
  }, [points, isWeekly]);

  const maxValue = useMemo(() => {
    if (!displayPoints.length) return 0;
    return Math.max(...displayPoints.map((point) => Number(point.value || 0)));
  }, [displayPoints]);

  const showAxisLabels =
    variant === 'hour' || isWeekly || shouldShowChartAxisLabels(displayPoints.length);
  const chartColumnCount = Math.max(displayPoints.length, 1);

  if (!displayPoints.length) {
    return <EmptyState>No hay ventas registradas en este período.</EmptyState>;
  }

  return (
    <>
      {isWeekly ? (
        <p className="kodda-admin-chart-hint">
          Vista por semana (90 días). Pasá el cursor sobre cada barra para ver el detalle.
        </p>
      ) : !showAxisLabels ? (
        <p className="kodda-admin-chart-hint">Pasá el cursor sobre cada barra para ver el detalle.</p>
      ) : null}
      <div
        ref={stageRef}
        className={`kodda-admin-chart-stage${isInView ? ' kodda-chart-in-view' : ''}`}
      >
      <div
        className={`kodda-admin-chart${showAxisLabels ? '' : ' kodda-admin-chart--compact'}${
          isWeekly ? ' kodda-admin-chart--weekly' : ''
        }`}
        style={{ '--chart-columns': chartColumnCount }}
        role="img"
        aria-label="Gráfico de ventas"
      >
        {displayPoints.map((point, index) => {
          const value = Number(point.value || 0);
          const valueStr = formatCurrency(value);
          const height = computeBarHeightPercent(value, maxValue, {
            floorPct: 4,
            smallRatio: isWeekly ? 0.1 : 0.06,
          });
          const weekLabelLines = isWeekly ? formatWeekChartLabelLines(point.label) : null;
          const axisLabel =
            variant === 'hour'
              ? point.label.slice(0, 2)
              : isWeekly
                ? formatWeekChartLabel(point.label)
                : showAxisLabels
                  ? formatChartLabel(point.label)
                  : '';
          const tooltip =
            variant === 'hour'
              ? `${point.label} · ${valueStr}`
              : isWeekly
                ? formatWeekChartTooltip(point.label, valueStr)
                : formatChartTooltip(point.label, valueStr);

          const tooltipAlign = getBarTooltipAlign(index, displayPoints.length);

          return (
            <div
              className="kodda-admin-chart-bar"
              key={`${point.label}-${index}`}
              style={{ '--bar-i': index }}
            >
              <div
                className="kodda-admin-chart-bar-stack"
                style={{ height: `${height}%`, '--bar-i': index }}
                tabIndex={0}
                aria-label={tooltip}
              >
                <span
                  className={`kodda-admin-chart-tooltip kodda-admin-chart-tooltip--${tooltipAlign}`}
                  role="tooltip"
                >
                  <span className="kodda-admin-chart-tooltip-value">{valueStr}</span>
                  {tooltip !== valueStr ? (
                    <span className="kodda-admin-chart-tooltip-detail">{tooltip}</span>
                  ) : null}
                </span>
                <span className="kodda-admin-chart-bar-fill" aria-hidden="true" />
              </div>
              {isWeekly && weekLabelLines?.top ? (
                <span className="kodda-admin-chart-bar-label kodda-admin-chart-bar-label--week">
                  <span className="kodda-admin-chart-bar-label-line">{weekLabelLines.top}</span>
                  <span className="kodda-admin-chart-bar-label-line kodda-admin-chart-bar-label-line--muted">
                    {weekLabelLines.bottom}
                  </span>
                </span>
              ) : axisLabel ? (
                <span className="kodda-admin-chart-bar-label">{axisLabel}</span>
              ) : null}
            </div>
          );
        })}
      </div>
      </div>
      {peakLabel ? <p className="kodda-admin-chart-peak">{peakLabel}</p> : null}
    </>
  );
}

const DONUT_SIZE = 280;
const DONUT_RADIUS = 96;
const DONUT_STROKE = 42;
const DONUT_GAP_DEG = 3;

function PaymentDonutRing({ segments, total }) {
  const center = DONUT_SIZE / 2;
  const circumference = 2 * Math.PI * DONUT_RADIUS;
  const gapLength = (DONUT_GAP_DEG / 360) * circumference;

  let cumulativePct = 0;

  return (
    <div className="kodda-admin-donut-stage" aria-hidden="true">
      <span className="kodda-admin-donut-pulse" />
      <span className="kodda-admin-donut-pulse kodda-admin-donut-pulse--delay" />
      <svg
        viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
        className="kodda-admin-donut-svg"
        role="img"
        aria-label="Distribución por medio de pago"
      >
        <defs>
          {segments.map((segment, index) => (
            <filter
              key={`glow-${segment.label}`}
              id={`koddaDonutGlow${index}`}
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
            >
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>
        <circle
          cx={center}
          cy={center}
          r={DONUT_RADIUS}
          className="kodda-admin-donut-track-ring"
          fill="none"
          strokeWidth={DONUT_STROKE}
        />
        <g transform={`rotate(-90 ${center} ${center})`}>
          {segments.map((segment, index) => {
            const rawLength = (segment.pct / 100) * circumference;
            const segmentLength = Math.max(rawLength - gapLength, 0);
            const offset = circumference - (cumulativePct / 100) * circumference;
            cumulativePct += segment.pct;

            return (
              <circle
                key={segment.label}
                cx={center}
                cy={center}
                r={DONUT_RADIUS}
                fill="none"
                stroke={segment.color}
                strokeWidth={DONUT_STROKE}
                strokeLinecap="round"
                strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                strokeDashoffset={offset}
                filter={`url(#koddaDonutGlow${index})`}
                className="kodda-admin-donut-segment"
                style={{ '--segment-delay': `${index * 0.12}s` }}
              />
            );
          })}
        </g>
      </svg>
      <div className="kodda-admin-donut-hole">
        <span>Total facturado</span>
        <strong>{formatCurrency(total)}</strong>
        <em>{segments.length} medios</em>
      </div>
    </div>
  );
}

function PaymentBreakdown({ methods }) {
  const maxPayment = useMemo(() => {
    if (!methods?.length) return 0;
    return Math.max(...methods.map((point) => Number(point.value || 0)));
  }, [methods]);

  const donut = useMemo(() => buildPaymentDonut(methods), [methods]);

  if (!methods.length) {
    return <EmptyState>No hay ventas por medio de pago todavía.</EmptyState>;
  }

  const topSegment = donut.segments.reduce(
    (best, seg) => (seg.pct > (best?.pct ?? 0) ? seg : best),
    donut.segments[0]
  );

  return (
    <div className="kodda-admin-payment-layout">
      <PaymentDonutRing segments={donut.segments} total={donut.total} />
      <div className="kodda-admin-payment-legend">
        {topSegment ? (
          <p className="kodda-admin-payment-highlight">
            <span className="kodda-admin-payment-highlight-dot" style={{ background: topSegment.color }} />
            Principal: <strong>{topSegment.label}</strong> ({topSegment.pct.toFixed(1)}%)
          </p>
        ) : null}
        <div className="kodda-admin-payment-list">
          {donut.segments.map((segment, index) => {
            const width = maxPayment ? Math.max(10, (segment.value / maxPayment) * 100) : 0;
            return (
              <div
                className="kodda-admin-payment-item"
                key={segment.label}
                style={{ '--payment-color': segment.color, '--payment-delay': `${index * 0.08}s` }}
              >
                <div className="kodda-admin-payment-item-head">
                  <span
                    className="kodda-admin-payment-dot"
                    style={{ background: segment.color, '--payment-color': segment.color }}
                  />
                  <span className="kodda-admin-payment-label">{segment.label}</span>
                  <span className="kodda-admin-payment-pct-badge">{segment.pct.toFixed(1)}%</span>
                </div>
                <span className="kodda-admin-payment-track">
                  <span className="kodda-admin-payment-bar" style={{ width: `${width}%` }} />
                </span>
                <div className="kodda-admin-payment-item-foot">
                  <span>{formatCurrency(segment.value)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MetricsDashboard({ metrics, activeTab }) {
  const chartPoints =
    activeTab === 'today' ? metrics.sales_by_hour : metrics.sales_over_time ?? [];
  const chartVariant = activeTab === 'today' ? 'hour' : 'day';
  const maxChartValue = chartPoints.length
    ? Math.max(...chartPoints.map((point) => Number(point.value || 0)))
    : 0;
  const chartTitle =
    activeTab === 'today'
      ? 'Ventas por hora'
      : activeTab === '90d'
        ? 'Ventas por semana'
        : 'Ventas por día';
  const kpiNote =
    activeTab === 'today'
      ? 'Resumen de hoy'
      : activeTab === '30d'
        ? 'Últimos 30 días'
        : 'Últimos 90 días';

  const areaSubtitle =
    activeTab === 'today'
      ? 'Ingresos por hora en el día'
      : activeTab === '90d'
        ? 'Ingresos agrupados por semana'
        : 'Ingresos día a día';

  return (
    <>
      <section
        className="kodda-admin-kpi-grid kodda-metrics-animate kodda-metrics-animate--1"
        aria-label="Indicadores principales"
      >
        {KPI_CONFIG.map(({ key, label, format, accent }) => (
          <MetricKpiCard
            key={key}
            label={label}
            value={formatKpiValue(metrics, key, format)}
            accent={accent}
          />
        ))}
      </section>

      <section className="kodda-metrics-animate kodda-metrics-animate--2">
        <article className="kodda-admin-dash-panel kodda-admin-dash-panel--chart kodda-admin-dash-panel--premium">
          <div className="kodda-admin-dash-panel-head">
            <div>
              <h2>{chartTitle}</h2>
              <p>{kpiNote}</p>
            </div>
            {maxChartValue > 0 ? (
              <span className="kodda-admin-dash-badge">Pico {formatCurrency(maxChartValue)}</span>
            ) : null}
          </div>
          <SalesChart
            key={`sales-bars-${activeTab}`}
            points={chartPoints}
            variant={chartVariant}
            activeTab={activeTab}
            peakLabel={null}
          />
        </article>
      </section>

      <section className="kodda-metrics-animate kodda-metrics-animate--3">
        <article className="kodda-admin-dash-panel kodda-admin-dash-panel--area kodda-admin-dash-panel--premium">
          <div className="kodda-admin-dash-panel-head">
            <div>
              <h2>Evolución de ingresos</h2>
              <p>{areaSubtitle}</p>
            </div>
            {metrics.total_sales > 0 ? (
              <span className="kodda-admin-dash-badge">
                Total {formatCurrency(metrics.total_sales)}
              </span>
            ) : null}
          </div>
          <RevenueAreaChart
            key={`sales-area-${activeTab}`}
            points={chartPoints}
            variant={chartVariant}
            activeTab={activeTab}
          />
        </article>
      </section>

      <section className="kodda-admin-dashboard-grid kodda-metrics-animate kodda-metrics-animate--4">
        <article className="kodda-admin-dash-panel kodda-admin-dash-panel--payment kodda-admin-dash-panel--premium">
          <div className="kodda-admin-dash-panel-head">
            <div>
              <h2>Medios de pago</h2>
              <p>Distribución de facturación</p>
            </div>
          </div>
          <PaymentBreakdown methods={metrics.payment_methods} />
        </article>

        <article className="kodda-admin-dash-panel kodda-admin-dash-panel--premium">
          <div className="kodda-admin-dash-panel-head">
            <div>
              <h2>Productos destacados</h2>
              <p>Top por unidades vendidas</p>
            </div>

          </div>
          {metrics.top_products.length ? (
            <ol className="kodda-admin-rank-list">
              {metrics.top_products.map((product, index) => (
                <li className="kodda-admin-rank-item" key={product.product_name}>
                  <span className="kodda-admin-rank-index">{index + 1}</span>
                  <div className="kodda-admin-rank-copy">
                    <strong>{product.product_name}</strong>
                    <span>{product.units} unidades</span>
                  </div>
                  <b>{formatCurrency(product.total)}</b>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState>No hay productos vendidos en este período.</EmptyState>
          )}
        </article>

        <article className="kodda-admin-dash-panel kodda-admin-dash-panel--table kodda-admin-dash-panel--premium">
          <div className="kodda-admin-dash-panel-head">
            <div>
              <h2>Ventas recientes</h2>
              <p>Últimas transacciones confirmadas</p>
            </div>
          </div>
          {metrics.recent_sales.length ? (
            <div className="kodda-admin-table-wrap">
              <table className="kodda-admin-table">
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Comprador</th>
                    <th>Pago</th>
                    <th>{activeTab === 'today' ? 'Hora' : 'Fecha'}</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recent_sales.map((sale) => (
                    <tr key={sale.id}>
                      <td>#{sale.id}</td>
                      <td>{sale.buyer}</td>
                      <td>{paymentLabels[sale.payment_method] || sale.payment_method}</td>
                      <td>
                        {activeTab === 'today'
                          ? formatTime(sale.created_at)
                          : formatDateTime(sale.created_at)}
                      </td>
                      <td>{formatCurrency(sale.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState>No hay ventas recientes para mostrar.</EmptyState>
          )}
        </article>
      </section>
    </>
  );
}

export default function AdminMetrics() {
  const [activeTab, setActiveTab] = useState('today');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMetrics = useCallback(async (tabId) => {
    const tab = PERIOD_TABS.find((item) => item.id === tabId) ?? PERIOD_TABS[0];
    setLoading(true);
    setError('');
    setMetrics(null);
    try {
      const params = tab.days ? { days: tab.days } : undefined;
      const { data } = await api.get(tab.endpoint, { params });
      setMetrics(data);
    } catch (err) {
      setMetrics(null);
      setError(err.response?.data?.detail || 'No se pudieron cargar las métricas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMetrics(activeTab);
  }, [activeTab, loadMetrics]);

  const rangeLabel = !loading ? getRangeLabel(activeTab, metrics) : '';
  const activeTabMeta = PERIOD_TABS.find((tab) => tab.id === activeTab);
  const showDashboard = !loading && metricsMatchTab(activeTab, metrics);

  return (
    <div className="kodda-admin-page kodda-metrics-page">
      <header className="kodda-admin-metrics-hero">
        <div className="kodda-admin-metrics-hero-copy">
          <p className="kodda-admin-metrics-eyebrow">Panel administrativo</p>
          <h1 className="kodda-admin-page-title">Métricas de ventas</h1>
          <p className="kodda-admin-page-lead">
            Panorama comercial del marketplace: hoy, último mes y últimos 90 días.
          </p>
        </div>
        {rangeLabel ? <span className="kodda-admin-metrics-range">{rangeLabel}</span> : null}
      </header>

      <div className="kodda-admin-metrics-toolbar">
        <div className="kodda-admin-period-pills" role="tablist" aria-label="Período de métricas">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`kodda-admin-period-pill${
                activeTab === tab.id ? ' kodda-admin-period-pill--active' : ''
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTabMeta ? (
          <span className="kodda-admin-metrics-context">
            {activeTabMeta.id === 'today'
              ? 'Detalle hora a hora'
              : activeTabMeta.id === '30d'
                ? 'Tendencia mensual'
                : 'Visión trimestral'}
          </span>
        ) : null}
      </div>

      {error ? <p className="kodda-auth-error">{error}</p> : null}
      {loading ? <p className="kodda-auth-muted kodda-admin-metrics-loading">Cargando métricas…</p> : null}

      {showDashboard ? <MetricsDashboard metrics={metrics} activeTab={activeTab} /> : null}
    </div>
  );
}
