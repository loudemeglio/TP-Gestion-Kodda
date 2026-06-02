import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { formatApiError } from '../../utils/apiError';
import {
  formatChartLabel,
  formatChartTooltip,
  formatStatsRangeLabel,
  getPresetRange,
  shouldShowChartAxisLabels,
} from '../../utils/sellerStatsPeriod';
import SellerStatsPeriodMenu from './SellerStatsPeriodMenu';

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

function formatCurrency(value) {
  return currency.format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

const LINE_ITEMS_PAGE = 20;

const KPI_ITEMS = [
  { key: 'total_revenue', label: 'Facturación', format: 'currency' },
  { key: 'order_count', label: 'Órdenes', format: 'number' },
  { key: 'units_sold', label: 'Unidades', format: 'number' },
  { key: 'average_ticket', label: 'Ticket prom.', format: 'currency' },
];

export default function SellerSalesStats() {
  const initialRange = getPresetRange('30d');
  const [activePreset, setActivePreset] = useState(initialRange.preset);
  const [customFrom, setCustomFrom] = useState(initialRange.from);
  const [customTo, setCustomTo] = useState(initialRange.to);
  const [appliedRange, setAppliedRange] = useState({ from: initialRange.from, to: initialRange.to });

  const [summary, setSummary] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [lineTotal, setLineTotal] = useState(0);
  const [lineSkip, setLineSkip] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const rangeLabel = formatStatsRangeLabel(appliedRange.from, appliedRange.to);

  const applyPreset = useCallback((presetId) => {
    setActivePreset(presetId);
    if (presetId === 'custom') return;
    const range = getPresetRange(presetId);
    setCustomFrom(range.from);
    setCustomTo(range.to);
    setAppliedRange({ from: range.from, to: range.to });
  }, []);

  const applyCustomRange = useCallback(() => {
    if (!customFrom || !customTo) {
      setError('Indicá fecha desde y hasta.');
      return;
    }
    if (customFrom > customTo) {
      setError('La fecha desde no puede ser posterior a la fecha hasta.');
      return;
    }
    setError('');
    setAppliedRange({ from: customFrom, to: customTo });
  }, [customFrom, customTo]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setLineSkip(0);

    async function load() {
      try {
        const params = { from: appliedRange.from, to: appliedRange.to };
        const [summaryRes, itemsRes] = await Promise.all([
          api.get('/api/seller/stats/summary', { params }),
          api.get('/api/seller/stats/line-items', {
            params: { ...params, skip: 0, limit: LINE_ITEMS_PAGE },
          }),
        ]);
        if (!active) return;
        setSummary(summaryRes.data);
        setLineItems(itemsRes.data.items);
        setLineTotal(itemsRes.data.total);
        setLineSkip(itemsRes.data.items.length);
      } catch (err) {
        if (active) setError(formatApiError(err, 'No se pudieron cargar las estadísticas.'));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [appliedRange.from, appliedRange.to]);

  const maxTimeSale = useMemo(() => {
    if (!summary?.sales_over_time?.length) return 0;
    return Math.max(...summary.sales_over_time.map((p) => Number(p.value || 0)));
  }, [summary]);

  const maxCategorySale = useMemo(() => {
    if (!summary?.by_category?.length) return 0;
    return Math.max(...summary.by_category.map((p) => Number(p.value || 0)));
  }, [summary]);

  const chartPoints = summary?.sales_over_time ?? [];
  const chartColumnCount = Math.max(chartPoints.length, 1);
  const showChartAxisLabels = shouldShowChartAxisLabels(chartPoints.length);

  async function loadMoreItems() {
    setLoadingMore(true);
    try {
      const { data } = await api.get('/api/seller/stats/line-items', {
        params: {
          from: appliedRange.from,
          to: appliedRange.to,
          skip: lineSkip,
          limit: LINE_ITEMS_PAGE,
        },
      });
      setLineItems((prev) => [...prev, ...data.items]);
      setLineSkip((prev) => prev + data.items.length);
    } catch (err) {
      setError(formatApiError(err, 'No se pudo cargar más detalle.'));
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      const res = await api.get('/api/seller/stats/export', {
        params: { from: appliedRange.from, to: appliedRange.to, format: 'csv' },
        responseType: 'blob',
      });
      const disposition = res.headers['content-disposition'] || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `mis-ventas_${appliedRange.from}_${appliedRange.to}.csv`;
      const url = URL.createObjectURL(res.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(formatApiError(err, 'No se pudo exportar el archivo.'));
    } finally {
      setExporting(false);
    }
  }

  const hasSales = summary && (summary.order_count > 0 || summary.units_sold > 0);

  function kpiValue(key, format) {
    const raw = summary?.[key] ?? 0;
    return format === 'currency' ? formatCurrency(raw) : String(raw);
  }

  return (
    <div className="kodda-seller-stats">
      <div className="kodda-my-sales-panel kodda-seller-stats-panel">
        <div className="kodda-seller-stats-controls">
          <SellerStatsPeriodMenu
            activePreset={activePreset}
            customFrom={customFrom}
            customTo={customTo}
            onPresetChange={applyPreset}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
            onApplyCustom={applyCustomRange}
          />
          <div className="kodda-seller-stats-controls-actions">
            {rangeLabel ? (
              <span className="kodda-seller-stats-range-badge">{rangeLabel}</span>
            ) : null}
            <button
              type="button"
              className="kodda-btn-accent-outline kodda-btn-sm"
              onClick={handleExport}
              disabled={exporting || loading || !hasSales}
            >
              {exporting ? 'Exportando…' : 'Exportar CSV'}
            </button>
          </div>
        </div>

        {error ? <p className="kodda-auth-error kodda-seller-stats-message">{error}</p> : null}
        {loading ? <p className="kodda-my-sales-status">Cargando estadísticas…</p> : null}

        {!loading && summary && !hasSales ? (
          <p className="kodda-my-sales-status">
            No hay ventas en este período. Probá otro rango o revisá el{' '}
            <Link to="/mis-ventas" className="kodda-auth-link">
              listado de ventas
            </Link>
            .
          </p>
        ) : null}

        {!loading && summary && hasSales ? (
          <>
            <div className="kodda-seller-kpi-strip" aria-label="Resumen del período">
              {KPI_ITEMS.map(({ key, label, format }) => (
                <div key={key} className="kodda-seller-kpi">
                  <span className="kodda-seller-kpi-label">{label}</span>
                  <strong className="kodda-seller-kpi-value">{kpiValue(key, format)}</strong>
                </div>
              ))}
            </div>

            <div className="kodda-seller-stats-grid">
              <section className="kodda-seller-stats-block kodda-seller-stats-block--chart">
                <div className="kodda-seller-stats-block-head">
                  <h2>Ventas en el tiempo</h2>
                  {maxTimeSale > 0 ? (
                    <span className="kodda-seller-stats-block-meta">
                      Pico {formatCurrency(maxTimeSale)}
                    </span>
                  ) : null}
                </div>
                {chartPoints.length > 0 ? (
                  <>
                    {!showChartAxisLabels ? (
                      <p className="kodda-seller-chart-hint">
                        Pasá el cursor sobre cada barra para ver fecha e importe.
                      </p>
                    ) : null}
                    <div
                      className={`kodda-seller-chart${
                        showChartAxisLabels ? '' : ' kodda-seller-chart--compact'
                      }`}
                      style={{ '--chart-columns': chartColumnCount }}
                      role="img"
                      aria-label="Ventas en el tiempo. Detalle al pasar el cursor sobre cada barra."
                    >
                      {chartPoints.map((point, index) => {
                        const value = Number(point.value || 0);
                        const valueStr = formatCurrency(value);
                        const height = maxTimeSale ? Math.max(4, (value / maxTimeSale) * 100) : 0;
                        const axisLabel = showChartAxisLabels
                          ? formatChartLabel(point.label)
                          : '';
                        const tooltip = formatChartTooltip(point.label, valueStr);
                        return (
                          <div className="kodda-seller-chart-bar" key={`${point.label}-${index}`}>
                            <div
                              className="kodda-seller-chart-bar-stack"
                              style={{ height: `${height}%` }}
                              tabIndex={0}
                              aria-label={tooltip}
                            >
                              <span className="kodda-seller-chart-tooltip" role="tooltip">
                                {tooltip}
                              </span>
                              <span className="kodda-seller-chart-bar-fill" aria-hidden="true" />
                            </div>
                            {showChartAxisLabels ? (
                              <span className="kodda-seller-chart-bar-label">{axisLabel}</span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </section>

              <section className="kodda-seller-stats-block">
                <div className="kodda-seller-stats-block-head">
                  <h2>Por categoría</h2>
                </div>
                {summary.by_category.length > 0 ? (
                  <ul className="kodda-seller-rank-list">
                    {summary.by_category.map((point) => {
                      const value = Number(point.value || 0);
                      const width = maxCategorySale
                        ? Math.max(6, (value / maxCategorySale) * 100)
                        : 0;
                      return (
                        <li key={point.label} className="kodda-seller-rank-item">
                          <div className="kodda-seller-rank-item-head">
                            <span>{point.label}</span>
                            <strong>{formatCurrency(value)}</strong>
                          </div>
                          <span className="kodda-seller-rank-track">
                            <span style={{ width: `${width}%` }} />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </section>

              <section className="kodda-seller-stats-block">
                <div className="kodda-seller-stats-block-head">
                  <h2>Productos destacados</h2>
                </div>
                {summary.top_products.length > 0 ? (
                  <ul className="kodda-seller-rank-list kodda-seller-rank-list--plain">
                    {summary.top_products.map((product) => (
                      <li key={product.product_name} className="kodda-seller-rank-item kodda-seller-rank-item--row">
                        <div>
                          <strong>{product.product_name}</strong>
                          <span>
                            {product.units} {product.units === 1 ? 'unidad' : 'unidades'}
                          </span>
                        </div>
                        <strong>{formatCurrency(product.total)}</strong>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            </div>

            <section className="kodda-seller-stats-block kodda-seller-stats-block--table">
              <div className="kodda-seller-stats-block-head">
                <h2>Detalle de prendas vendidas</h2>
                {lineTotal > 0 ? (
                  <span className="kodda-seller-stats-block-meta">{lineTotal} líneas</span>
                ) : null}
              </div>

              {lineItems.length > 0 ? (
                <>
                  <div className="kodda-seller-table-wrap">
                    <table className="kodda-seller-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Orden</th>
                          <th>Producto</th>
                          <th>Categoría</th>
                          <th>Talle</th>
                          <th>Cant.</th>
                          <th>Total</th>
                          <th>Comprador</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((row, index) => (
                          <tr key={`${row.order_id}-${row.product_id}-${row.sold_at}-${index}`}>
                            <td data-label="Fecha">{formatDateTime(row.sold_at)}</td>
                            <td data-label="Orden">
                              <Link to={`/mis-ventas/${row.order_id}`} className="kodda-auth-link">
                                #{row.order_id}
                              </Link>
                            </td>
                            <td data-label="Producto" className="kodda-seller-table-product">
                              {row.product_name}
                            </td>
                            <td data-label="Categoría">{row.category || '—'}</td>
                            <td data-label="Talle">{row.size || '—'}</td>
                            <td data-label="Cant.">{row.quantity}</td>
                            <td data-label="Total">{formatCurrency(row.line_total)}</td>
                            <td data-label="Comprador">{row.buyer_username}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {lineSkip < lineTotal ? (
                    <button
                      type="button"
                      className="kodda-btn-ghost kodda-btn-sm kodda-seller-stats-more"
                      onClick={loadMoreItems}
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Cargando…' : `Cargar más (${lineTotal - lineSkip} restantes)`}
                    </button>
                  ) : null}
                </>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
