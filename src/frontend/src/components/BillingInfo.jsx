import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BillingForm from './billing/BillingForm';
import BillingView from './billing/BillingView';
import AppTopbar from './AppTopbar';
import { useAuth } from '../context/AuthContext';
import { useBilling } from '../hooks/useBilling';

export default function BillingInfo() {
  const { user } = useAuth();
  const {
    billing,
    form,
    mode,
    loading,
    saving,
    error,
    saveError,
    handleChange,
    startEditing,
    cancelEditing,
    saveBilling,
  } = useBilling();
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!successMessage) return undefined;
    const t = window.setTimeout(() => setSuccessMessage(''), 5000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await saveBilling();
      setSuccessMessage('Datos de facturación guardados correctamente.');
    } catch {
      /* saveError ya seteado */
    }
  }

  return (
    <div className="kodda-home kodda-profile-edit-page">
      <AppTopbar />

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
                onCancel={billing ? cancelEditing : null}
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
