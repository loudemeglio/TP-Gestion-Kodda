import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import {
  formatChartLabel,
  formatChartTooltip,
  formatStatsRangeLabel,
  shouldShowChartAxisLabels,
} from '../../utils/sellerStatsPeriod';

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
    <article className={`kodda-admin-kpi kodda-admin-kpi--${accent}`}>
      <span className="kodda-admin-kpi-glow" aria-hidden="true" />
      <span className="kodda-admin-kpi-label">{label}</span>
      <strong className="kodda-admin-kpi-value">{value}</strong>
    </article>
  );
}

function EmptyState({ children }) {
  return <p className="kodda-metrics-empty">{children}</p>;
}

function SalesChart({ points, variant, peakLabel }) {
  const maxValue = useMemo(() => {
    if (!points?.length) return 0;
    return Math.max(...points.map((point) => Number(point.value || 0)));
  }, [points]);

  const showAxisLabels = variant === 'hour' || shouldShowChartAxisLabels(points.length);
  const chartColumnCount = Math.max(points.length, 1);

  if (!points.length) {
    return <EmptyState>No hay ventas registradas en este período.</EmptyState>;
  }

  return (
    <>
      {!showAxisLabels ? (
        <p className="kodda-admin-chart-hint">Pasá el cursor sobre cada barra para ver el detalle.</p>
      ) : null}
      <div
        className={`kodda-admin-chart${showAxisLabels ? '' : ' kodda-admin-chart--compact'}`}
        style={{ '--chart-columns': chartColumnCount }}
        role="img"
        aria-label="Gráfico de ventas"
      >
        {points.map((point, index) => {
          const value = Number(point.value || 0);
          const valueStr = formatCurrency(value);
          const height = maxValue ? Math.max(4, (value / maxValue) * 100) : 0;
          const axisLabel =
            variant === 'hour'
              ? point.label.slice(0, 2)
              : showAxisLabels
                ? formatChartLabel(point.label)
                : '';
          const tooltip =
            variant === 'hour'
              ? `${point.label} · ${valueStr}`
              : formatChartTooltip(point.label, valueStr);

          return (
            <div className="kodda-admin-chart-bar" key={`${point.label}-${index}`}>
              <div
                className="kodda-admin-chart-bar-stack"
                style={{ height: `${height}%` }}
                tabIndex={0}
                aria-label={tooltip}
              >
                <span className="kodda-admin-chart-tooltip" role="tooltip">
                  {tooltip}
                </span>
                <span className="kodda-admin-chart-bar-fill" aria-hidden="true" />
              </div>
              {axisLabel ? <span className="kodda-admin-chart-bar-label">{axisLabel}</span> : null}
            </div>
          );
        })}
      </div>
      {peakLabel ? <p className="kodda-admin-chart-peak">{peakLabel}</p> : null}
    </>
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

  return (
    <div className="kodda-admin-payment-layout">
      <div className="kodda-admin-donut-wrap" aria-hidden="true">
        <div className="kodda-admin-donut" style={{ background: donut.gradient }}>
          <div className="kodda-admin-donut-hole">
            <span>Total</span>
            <strong>{formatCurrency(donut.total)}</strong>
          </div>
        </div>
      </div>
      <div className="kodda-admin-payment-list">
        {donut.segments.map((segment) => {
          const width = maxPayment ? Math.max(8, (segment.value / maxPayment) * 100) : 0;
          return (
            <div className="kodda-admin-payment-item" key={segment.label}>
              <div className="kodda-admin-payment-item-head">
                <span className="kodda-admin-payment-dot" style={{ background: segment.color }} />
                <span>{segment.label}</span>
                <strong>{formatCurrency(segment.value)}</strong>
              </div>
              <span className="kodda-admin-payment-track">
                <span style={{ width: `${width}%`, background: segment.color }} />
              </span>
              <span className="kodda-admin-payment-pct">{segment.pct.toFixed(1)}%</span>
            </div>
          );
        })}
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
  const chartTitle = activeTab === 'today' ? 'Ventas por hora' : 'Ventas por día';
  const kpiNote =
    activeTab === 'today'
      ? 'Resumen de hoy'
      : activeTab === '30d'
        ? 'Últimos 30 días'
        : 'Últimos 90 días';

  return (
    <>
      <section className="kodda-admin-kpi-grid" aria-label="Indicadores principales">
        {KPI_CONFIG.map(({ key, label, format, accent }) => (
          <MetricKpiCard
            key={key}
            label={label}
            value={formatKpiValue(metrics, key, format)}
            accent={accent}
          />
        ))}
      </section>

      <section className="kodda-admin-dashboard-grid">
        <article className="kodda-admin-dash-panel kodda-admin-dash-panel--chart">
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
            points={chartPoints}
            variant={chartVariant}
            peakLabel={null}
          />
        </article>

        <article className="kodda-admin-dash-panel">
          <div className="kodda-admin-dash-panel-head">
            <div>
              <h2>Medios de pago</h2>
              <p>Distribución de facturación</p>
            </div>
          </div>
          <PaymentBreakdown methods={metrics.payment_methods} />
        </article>

        <article className="kodda-admin-dash-panel">
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

        <article className="kodda-admin-dash-panel kodda-admin-dash-panel--table">
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
