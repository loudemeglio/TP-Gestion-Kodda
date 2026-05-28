import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const paymentLabels = {
  transferencia: 'Transferencia',
  mercado_pago: 'Mercado Pago',
  tarjeta_credito: 'Tarjeta de credito',
  tarjeta_debito: 'Tarjeta de debito',
};

function formatCurrency(value) {
  return currency.format(Number(value || 0));
}

function formatTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function MetricCard({ label, value, note }) {
  return (
    <article className="kodda-metric-card">
      <span className="kodda-metric-card-label">{label}</span>
      <strong>{value}</strong>
      {note ? <span className="kodda-metric-card-note">{note}</span> : null}
    </article>
  );
}

function EmptyState({ children }) {
  return <p className="kodda-metrics-empty">{children}</p>;
}

export default function AdminMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadMetrics() {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/api/admin/metrics/today');
        if (active) setMetrics(data);
      } catch (err) {
        if (active) setError(err.response?.data?.detail || 'No se pudieron cargar las metricas.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadMetrics();
    return () => {
      active = false;
    };
  }, []);

  const maxHourlySale = useMemo(() => {
    if (!metrics?.sales_by_hour?.length) return 0;
    return Math.max(...metrics.sales_by_hour.map((point) => Number(point.value || 0)));
  }, [metrics]);

  const maxPaymentSale = useMemo(() => {
    if (!metrics?.payment_methods?.length) return 0;
    return Math.max(...metrics.payment_methods.map((point) => Number(point.value || 0)));
  }, [metrics]);

  return (
    <div className="kodda-admin-page kodda-metrics-page">
      <header className="kodda-admin-page-head kodda-metrics-head">
        <div>
          <h1 className="kodda-admin-page-title">Metricas del dia</h1>
          <p className="kodda-admin-page-lead">
            Ventas confirmadas, volumen vendido y comportamiento comercial de hoy.
          </p>
        </div>
        {metrics?.date ? <span className="kodda-metrics-date">{metrics.date}</span> : null}
      </header>

      {error ? <p className="kodda-auth-error">{error}</p> : null}
      {loading ? <p className="kodda-auth-muted">Cargando metricas...</p> : null}

      {!loading && metrics ? (
        <>
          <section className="kodda-metrics-grid" aria-label="Resumen de ventas del dia">
            <MetricCard label="Facturacion" value={formatCurrency(metrics.total_sales)} note="Total vendido hoy" />
            <MetricCard label="Ordenes" value={metrics.order_count} note="Compras confirmadas" />
            <MetricCard label="Productos" value={metrics.items_sold} note="Unidades vendidas" />
            <MetricCard label="Ticket promedio" value={formatCurrency(metrics.average_ticket)} note="Por orden" />
          </section>

          <section className="kodda-metrics-panels">
            <article className="kodda-metrics-panel kodda-metrics-panel--wide">
              <div className="kodda-metrics-panel-head">
                <h2>Ventas por hora</h2>
                <span>{formatCurrency(maxHourlySale)} pico</span>
              </div>
              <div className="kodda-hour-chart" aria-label="Grafico de ventas por hora">
                {metrics.sales_by_hour.map((point) => {
                  const value = Number(point.value || 0);
                  const height = maxHourlySale ? Math.max(5, (value / maxHourlySale) * 100) : 0;
                  return (
                    <div className="kodda-hour-bar" key={point.label} title={`${point.label}: ${formatCurrency(value)}`}>
                      <span className="kodda-hour-bar-fill" style={{ height: `${height}%` }} />
                      <span className="kodda-hour-label">{point.label.slice(0, 2)}</span>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="kodda-metrics-panel">
              <div className="kodda-metrics-panel-head">
                <h2>Medios de pago</h2>
              </div>
              {metrics.payment_methods.length ? (
                <div className="kodda-payment-chart">
                  {metrics.payment_methods.map((point) => {
                    const value = Number(point.value || 0);
                    const width = maxPaymentSale ? Math.max(8, (value / maxPaymentSale) * 100) : 0;
                    return (
                      <div className="kodda-payment-row" key={point.label}>
                        <div>
                          <span>{paymentLabels[point.label] || point.label}</span>
                          <strong>{formatCurrency(value)}</strong>
                        </div>
                        <span className="kodda-payment-track">
                          <span style={{ width: `${width}%` }} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState>No hay ventas por medio de pago todavia.</EmptyState>
              )}
            </article>
          </section>

          <section className="kodda-metrics-panels">
            <article className="kodda-metrics-panel">
              <div className="kodda-metrics-panel-head">
                <h2>Productos destacados</h2>
              </div>
              {metrics.top_products.length ? (
                <div className="kodda-top-products">
                  {metrics.top_products.map((product) => (
                    <div className="kodda-top-product" key={product.product_name}>
                      <div>
                        <strong>{product.product_name}</strong>
                        <span>{product.units} unidades</span>
                      </div>
                      <b>{formatCurrency(product.total)}</b>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState>No hay productos vendidos hoy.</EmptyState>
              )}
            </article>

            <article className="kodda-metrics-panel kodda-metrics-panel--wide">
              <div className="kodda-metrics-panel-head">
                <h2>Ventas recientes</h2>
              </div>
              {metrics.recent_sales.length ? (
                <div className="kodda-metrics-table-wrap">
                  <table className="kodda-metrics-table">
                    <thead>
                      <tr>
                        <th>Orden</th>
                        <th>Comprador</th>
                        <th>Pago</th>
                        <th>Hora</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.recent_sales.map((sale) => (
                        <tr key={sale.id}>
                          <td>#{sale.id}</td>
                          <td>{sale.buyer}</td>
                          <td>{paymentLabels[sale.payment_method] || sale.payment_method}</td>
                          <td>{formatTime(sale.created_at)}</td>
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
      ) : null}
    </div>
  );
}
