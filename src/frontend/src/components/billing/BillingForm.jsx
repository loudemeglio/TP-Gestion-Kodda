import { TAX_CONDITIONS } from './billingUtils';

export default function BillingForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  saving,
  error,
  userEmail,
  submitLabel = 'Guardar datos',
  description = 'Completá los campos obligatorios para poder recibir tu factura al comprar en Kodda.',
  compact = false,
}) {
  return (
    <form
      className={compact ? 'kodda-checkout-billing-form' : 'kodda-profile-edit-card'}
      onSubmit={onSubmit}
    >
      {error ? <p className="kodda-auth-error">{error}</p> : null}

      <section className="kodda-profile-edit-section">
        <h2 className="kodda-profile-edit-section-title">Información fiscal</h2>
        <p className="kodda-profile-edit-section-desc">{description}</p>
        <label className="kodda-field">
          <span>Nombre o razón social *</span>
          <input
            className="kodda-input"
            type="text"
            name="legal_name"
            value={form.legal_name}
            onChange={onChange}
            required
            maxLength={200}
            placeholder="Como figura en tu documento o constancia fiscal"
          />
        </label>
        <label className="kodda-field">
          <span>CUIT/CUIL *</span>
          <input
            className="kodda-input"
            type="text"
            name="tax_id"
            value={form.tax_id}
            onChange={onChange}
            required
            inputMode="numeric"
            maxLength={13}
            placeholder="20-12345678-6"
            title="Formato: XX-XXXXXXXX-X (11 dígitos)"
          />
        </label>
        <label className="kodda-field">
          <span>Condición ante IVA *</span>
          <select
            className="kodda-input"
            name="tax_condition"
            value={form.tax_condition}
            onChange={onChange}
            required
          >
            {TAX_CONDITIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="kodda-field">
          <span>Domicilio fiscal *</span>
          <input
            className="kodda-input"
            type="text"
            name="billing_address"
            value={form.billing_address}
            onChange={onChange}
            required
            maxLength={300}
            placeholder="Calle, número, piso/depto"
          />
        </label>
        <div className="kodda-profile-edit-grid">
          <label className="kodda-field">
            <span>Ciudad</span>
            <input
              className="kodda-input"
              type="text"
              name="city"
              value={form.city}
              onChange={onChange}
              maxLength={100}
              placeholder="Buenos Aires"
            />
          </label>
          <label className="kodda-field">
            <span>Provincia</span>
            <input
              className="kodda-input"
              type="text"
              name="province"
              value={form.province}
              onChange={onChange}
              maxLength={100}
              placeholder="CABA"
            />
          </label>
          <label className="kodda-field">
            <span>Código postal</span>
            <input
              className="kodda-input"
              type="text"
              name="postal_code"
              value={form.postal_code}
              onChange={onChange}
              maxLength={20}
              placeholder="1043"
            />
          </label>
          <label className="kodda-field kodda-profile-edit-grid-full">
            <span>Email para factura</span>
            <input
              className="kodda-input"
              type="email"
              name="billing_email"
              value={form.billing_email}
              onChange={onChange}
              placeholder={userEmail || 'Se usará el email de tu cuenta si lo dejás vacío'}
            />
          </label>
        </div>
      </section>

      <footer className="kodda-profile-edit-footer">
        {onCancel ? (
          <button type="button" className="kodda-btn-ghost" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
        ) : null}
        <button type="submit" className="kodda-btn-primary kodda-profile-edit-submit" disabled={saving}>
          {saving ? 'Guardando…' : submitLabel}
        </button>
      </footer>
    </form>
  );
}
