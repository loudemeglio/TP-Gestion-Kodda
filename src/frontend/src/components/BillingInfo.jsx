import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { KoddaLogo } from './KoddaLogo';

const TAX_CONDITIONS = [
  { value: 'consumidor_final', label: 'Consumidor final' },
  { value: 'monotributo', label: 'Monotributo' },
  { value: 'responsable_inscripto', label: 'Responsable inscripto' },
  { value: 'exento', label: 'Exento' },
];

const TAX_CONDITION_LABELS = Object.fromEntries(
  TAX_CONDITIONS.map(({ value, label }) => [value, label])
);

const EMPTY_FORM = {
  legal_name: '',
  tax_id: '',
  tax_condition: 'consumidor_final',
  billing_address: '',
  city: '',
  province: '',
  postal_code: '',
  billing_email: '',
};

function billingToForm(data) {
  return {
    legal_name: data.legal_name || '',
    tax_id: data.tax_id || '',
    tax_condition: data.tax_condition || 'consumidor_final',
    billing_address: data.billing_address || '',
    city: data.city || '',
    province: data.province || '',
    postal_code: data.postal_code || '',
    billing_email: data.billing_email || '',
  };
}

/** Formato habitual en Argentina: XX-XXXXXXXX-X (11 dígitos). */
function formatTaxIdDisplay(taxId) {
  const digits = String(taxId || '').replace(/\D/g, '');
  if (digits.length !== 11) return taxId || '';
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

function formatApiError(err) {
  const detail = err.response?.data?.detail;
  if (!detail) return 'No se pudieron guardar los datos de facturación.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    return first.msg || String(first);
  }
  return 'No se pudieron guardar los datos de facturación.';
}

function BillingView({ billing, onEdit }) {
  return (
    <div className="kodda-profile-edit-card">
      <section className="kodda-profile-view-section">
        <h2 className="kodda-profile-edit-section-title">Datos registrados</h2>
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
      <footer className="kodda-profile-edit-footer">
        <button type="button" className="kodda-btn-primary kodda-profile-edit-submit" onClick={onEdit}>
          Editar datos
        </button>
      </footer>
    </div>
  );
}

function BillingForm({ form, onChange, onSubmit, onCancel, saving, error, userEmail }) {
  return (
    <form className="kodda-profile-edit-card" onSubmit={onSubmit}>
      {error ? <p className="kodda-auth-error">{error}</p> : null}

      <section className="kodda-profile-edit-section">
        <h2 className="kodda-profile-edit-section-title">Información fiscal</h2>
        <p className="kodda-profile-edit-section-desc">
          Completá los campos obligatorios para poder recibir tu factura al comprar en Kodda.
        </p>
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
          {saving ? 'Guardando…' : 'Guardar datos'}
        </button>
      </footer>
    </form>
  );
}

export default function BillingInfo() {
  const { user } = useAuth();
  const [billing, setBilling] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [mode, setMode] = useState('view');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/users/me/billing');
        if (!cancelled) {
          setBilling(data);
          setForm(billingToForm(data));
          setMode('view');
        }
      } catch (err) {
        if (!cancelled) {
          if (err.response?.status === 404) {
            setBilling(null);
            setForm(EMPTY_FORM);
            setMode('empty');
          } else {
            setError(err.response?.data?.detail || 'No se pudieron cargar los datos de facturación.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!successMessage) return undefined;
    const t = window.setTimeout(() => setSuccessMessage(''), 5000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function startEditing() {
    setForm(billing ? billingToForm(billing) : EMPTY_FORM);
    setSaveError('');
    setMode('edit');
  }

  function cancelEditing() {
    setSaveError('');
    if (billing) {
      setForm(billingToForm(billing));
      setMode('view');
    } else {
      setMode('empty');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      const payload = {
        legal_name: form.legal_name.trim(),
        tax_id: form.tax_id.trim(),
        tax_condition: form.tax_condition,
        billing_address: form.billing_address.trim(),
        city: form.city.trim() || null,
        province: form.province.trim() || null,
        postal_code: form.postal_code.trim() || null,
      };
      if (form.billing_email.trim()) {
        payload.billing_email = form.billing_email.trim();
      }

      const { data } = await api.put('/api/users/me/billing', payload);
      setBilling(data);
      setForm(billingToForm(data));
      setMode('view');
      setSuccessMessage('Datos de facturación guardados correctamente.');
    } catch (err) {
      setSaveError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="kodda-home kodda-profile-edit-page">
      <header className="kodda-topbar">
        <KoddaLogo compact />
        <div className="kodda-topbar-spacer" />
        <nav className="kodda-nav-actions" aria-label="Navegación">
          <Link to="/perfil" className="kodda-btn-ghost">
            Mi perfil
          </Link>
        </nav>
      </header>

      <main className="kodda-profile-edit-layout">
        <header className="kodda-profile-edit-hero">
          <p className="kodda-profile-edit-eyebrow">Tu cuenta</p>
          <h1 className="kodda-profile-edit-title">Datos de facturación</h1>
          <p className="kodda-profile-edit-lead">
            Información fiscal para recibir tu factura al comprar en Kodda.
          </p>
        </header>

        {loading ? (
          <p className="kodda-auth-muted kodda-profile-edit-loading">Cargando datos de facturación…</p>
        ) : null}

        {error && !loading ? <p className="kodda-auth-error">{error}</p> : null}

        {successMessage ? (
          <p className="kodda-auth-success kodda-profile-view-flash" role="status">
            {successMessage}
          </p>
        ) : null}

        {!loading && !error ? (
          <>
            {mode === 'empty' ? (
              <div className="kodda-profile-view-empty kodda-profile-edit-card">
                <p>Todavía no registraste datos de facturación.</p>
                <button type="button" className="kodda-btn-primary" onClick={startEditing}>
                  Agregar datos de facturación
                </button>
              </div>
            ) : null}

            {mode === 'view' && billing ? (
              <BillingView billing={billing} onEdit={startEditing} />
            ) : null}

            {mode === 'edit' ? (
              <BillingForm
                form={form}
                onChange={handleChange}
                onSubmit={handleSubmit}
                onCancel={billing || mode === 'edit' ? cancelEditing : null}
                saving={saving}
                error={saveError}
                userEmail={user?.email}
              />
            ) : null}
          </>
        ) : null}
      </main>

      <footer className="kodda-home-footer">Kodda — datos de facturación</footer>
    </div>
  );
}
