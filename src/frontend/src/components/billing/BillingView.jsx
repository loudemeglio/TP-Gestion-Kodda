import {
  TAX_CONDITION_LABELS,
  formatTaxIdDisplay,
} from './billingUtils';

export default function BillingView({
  billing,
  onEdit,
  title = 'Datos registrados',
  showEditButton = true,
  compact = false,
}) {
  return (
    <div className={compact ? 'kodda-checkout-billing-view' : 'kodda-profile-edit-card'}>
      <section className="kodda-profile-view-section">
        <h2 className="kodda-profile-edit-section-title">{title}</h2>
        <div className="kodda-profile-stat-grid kodda-profile-stat-grid--billing">
          <div className="kodda-profile-stat kodda-profile-stat--wide">
            <span className="kodda-profile-stat-icon" aria-hidden="true">
              👤
            </span>
            <span className="kodda-profile-stat-label">Nombre o razón social</span>
            <span className="kodda-profile-stat-value">{billing.legal_name}</span>
          </div>
          <div className="kodda-profile-stat kodda-profile-stat--cuit">
            <span className="kodda-profile-stat-icon" aria-hidden="true">
              🆔
            </span>
            <span className="kodda-profile-stat-label">CUIT/CUIL</span>
            <span className="kodda-profile-stat-value kodda-profile-stat-value--cuit">
              {formatTaxIdDisplay(billing.tax_id)}
            </span>
          </div>
          <div className="kodda-profile-stat">
            <span className="kodda-profile-stat-icon" aria-hidden="true">
              📋
            </span>
            <span className="kodda-profile-stat-label">Condición ante IVA</span>
            <span className="kodda-profile-stat-value">
              {TAX_CONDITION_LABELS[billing.tax_condition] || billing.tax_condition}
            </span>
          </div>
          <div className="kodda-profile-stat kodda-profile-stat--wide">
            <span className="kodda-profile-stat-icon" aria-hidden="true">
              📍
            </span>
            <span className="kodda-profile-stat-label">Domicilio fiscal</span>
            <span className="kodda-profile-stat-value">{billing.billing_address}</span>
          </div>
          {billing.city ? (
            <div className="kodda-profile-stat">
              <span className="kodda-profile-stat-icon" aria-hidden="true">
                🏙️
              </span>
              <span className="kodda-profile-stat-label">Ciudad</span>
              <span className="kodda-profile-stat-value">{billing.city}</span>
            </div>
          ) : null}
          {billing.province ? (
            <div className="kodda-profile-stat">
              <span className="kodda-profile-stat-icon" aria-hidden="true">
                🗺️
              </span>
              <span className="kodda-profile-stat-label">Provincia</span>
              <span className="kodda-profile-stat-value">{billing.province}</span>
            </div>
          ) : null}
          {billing.postal_code ? (
            <div className="kodda-profile-stat">
              <span className="kodda-profile-stat-icon" aria-hidden="true">
                📮
              </span>
              <span className="kodda-profile-stat-label">Código postal</span>
              <span className="kodda-profile-stat-value">{billing.postal_code}</span>
            </div>
          ) : null}
          <div className="kodda-profile-stat kodda-profile-stat--wide">
            <span className="kodda-profile-stat-icon" aria-hidden="true">
              ✉️
            </span>
            <span className="kodda-profile-stat-label">Email para factura</span>
            <span className="kodda-profile-stat-value">{billing.billing_email}</span>
          </div>
        </div>
      </section>
      {showEditButton && onEdit ? (
        <footer className="kodda-profile-edit-footer">
          <button type="button" className="kodda-btn-accent-outline" onClick={onEdit}>
            Editar datos
          </button>
        </footer>
      ) : null}
    </div>
  );
}
