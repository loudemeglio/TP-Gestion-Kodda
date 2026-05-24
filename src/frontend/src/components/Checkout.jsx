import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import BillingForm from './billing/BillingForm';
import BillingView from './billing/BillingView';
import PaymentMethodSelector from './checkout/PaymentMethodSelector';
import {
  EMPTY_PAYMENT_DETAILS,
  isPaymentDetailsComplete,
} from './checkout/paymentMethods';
import { KoddaLogo } from './KoddaLogo';
import { useAuth } from '../context/AuthContext';
import { useCarrito } from '../context/CarritoContext';
import { useBilling } from '../hooks/useBilling';
import '../styles/checkout.css';

function formatCheckoutError(err) {
  const detail = err.response?.data?.detail;
  if (!detail) return 'No se pudo confirmar la compra.';
  if (typeof detail === 'string') return detail;
  return 'No se pudo confirmar la compra.';
}

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, obtenerTotal, vaciarCarrito } = useCarrito();
  const {
    billing,
    form,
    mode,
    loading: billingLoading,
    saving,
    saveError,
    billingReady,
    handleChange,
    startEditing,
    cancelEditing,
    saveBilling,
  } = useBilling();

  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDetails, setPaymentDetails] = useState(EMPTY_PAYMENT_DETAILS);
  const [checkoutError, setCheckoutError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const total = obtenerTotal();
  const paymentDetailsReady = isPaymentDetailsComplete(paymentMethod, paymentDetails);

  function handlePaymentDetailsChange(method, field, fieldValue) {
    setPaymentDetails((prev) => ({
      ...prev,
      [method]: {
        ...prev[method],
        [field]: fieldValue,
      },
    }));
  }

  if (!items.length) {
    return (
      <div className="kodda-home">
        <header className="kodda-topbar">
          <KoddaLogo compact />
          <div className="kodda-topbar-spacer" />
          <Link to="/carrito" className="kodda-btn-ghost">
            Volver al carrito
          </Link>
        </header>
        <main className="kodda-checkout-main">
          <p className="kodda-auth-muted">Tu carrito está vacío.</p>
          <Link to="/" className="kodda-btn-primary">
            Explorar productos
          </Link>
        </main>
      </div>
    );
  }

  async function handleSaveBilling(e) {
    e.preventDefault();
    try {
      await saveBilling();
    } catch {
      /* saveError en hook */
    }
  }

  async function handleConfirmPurchase() {
    if (!billingReady || !paymentMethod || !paymentDetailsReady) return;
    setCheckoutError('');
    setConfirming(true);
    try {
      const { data } = await api.post('/api/orders/checkout', {
        payment_method: paymentMethod,
      });
      await vaciarCarrito();
      navigate(`/checkout/exito/${data.id}`, { state: { order: data } });
    } catch (err) {
      setCheckoutError(formatCheckoutError(err));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="kodda-home">
      <header className="kodda-topbar">
        <KoddaLogo compact />
        <div className="kodda-topbar-spacer" />
        <nav className="kodda-nav-actions" aria-label="Checkout">
          <Link to="/carrito" className="kodda-btn-ghost">
            Volver al carrito
          </Link>
        </nav>
      </header>

      <main className="kodda-checkout-main">
        <header className="kodda-checkout-header">
          <h1>Checkout</h1>
          <p>Revisá tu pedido y los datos de facturación antes de confirmar.</p>
        </header>

        <div className="kodda-checkout-grid">
          <div className="kodda-checkout-column">
            <section className="kodda-checkout-panel" aria-labelledby="checkout-order-title">
              <h2 id="checkout-order-title" className="kodda-checkout-panel-title">
                Resumen del pedido
              </h2>
              <div className="kodda-checkout-items">
                {items.map((item) => (
                  <div key={item.id} className="kodda-checkout-item">
                    <div>
                      <p className="kodda-checkout-item-name">{item.name}</p>
                      <p className="kodda-checkout-item-meta">
                        {item.category} · Cantidad: {item.cantidad}
                      </p>
                    </div>
                    <span className="kodda-checkout-item-price">
                      ${(item.price * item.cantidad).toLocaleString('es-AR')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="kodda-checkout-total">
                <span>Total</span>
                <span>${total.toLocaleString('es-AR')}</span>
              </div>
            </section>

            <section className="kodda-checkout-panel kodda-checkout-panel--payment">
              <PaymentMethodSelector
                value={paymentMethod}
                onChange={setPaymentMethod}
                paymentDetails={paymentDetails}
                onPaymentDetailsChange={handlePaymentDetailsChange}
                disabled={confirming}
              />
            </section>
          </div>

          <section className="kodda-checkout-panel" aria-labelledby="checkout-billing-title">
            <h2 id="checkout-billing-title" className="kodda-checkout-panel-title">
              Datos de facturación
            </h2>

            {billingLoading ? (
              <p className="kodda-auth-muted">Cargando datos de facturación…</p>
            ) : null}

            {!billingLoading && mode === 'empty' ? (
              <div className="kodda-checkout-billing-empty">
                <p>Necesitamos tus datos fiscales para emitir la factura.</p>
                <BillingForm
                  form={form}
                  onChange={handleChange}
                  onSubmit={handleSaveBilling}
                  saving={saving}
                  error={saveError}
                  userEmail={user?.email}
                  submitLabel="Guardar y continuar"
                  description="Completá los campos obligatorios. Podés editarlos después desde tu perfil."
                  compact
                />
              </div>
            ) : null}

            {!billingLoading && mode === 'view' && billing ? (
              <>
                <BillingView
                  billing={billing}
                  onEdit={startEditing}
                  title="Facturar a"
                  compact
                />
                <Link to="/datos-facturacion" className="kodda-auth-link kodda-checkout-profile-link">
                  Gestionar en mi perfil
                </Link>
              </>
            ) : null}

            {!billingLoading && mode === 'edit' ? (
              <BillingForm
                form={form}
                onChange={handleChange}
                onSubmit={handleSaveBilling}
                onCancel={cancelEditing}
                saving={saving}
                error={saveError}
                userEmail={user?.email}
                submitLabel="Guardar cambios"
                compact
              />
            ) : null}
          </section>
        </div>

        {checkoutError ? <p className="kodda-auth-error">{checkoutError}</p> : null}

        <div className="kodda-checkout-actions">
          <button
            type="button"
            className="kodda-btn-checkout"
            disabled={!billingReady || !paymentMethod || !paymentDetailsReady || confirming}
            onClick={handleConfirmPurchase}
          >
            {confirming ? 'Confirmando…' : 'Confirmar compra'}
          </button>
          {!billingReady && !billingLoading && mode !== 'edit' && mode !== 'empty' ? (
            <p className="kodda-auth-muted">Guardá tus datos de facturación para continuar.</p>
          ) : null}
          {billingReady && !paymentMethod ? (
            <p className="kodda-auth-muted">Seleccioná un medio de pago para continuar.</p>
          ) : null}
          {billingReady && paymentMethod && !paymentDetailsReady ? (
            <p className="kodda-auth-muted">Completá los datos del medio de pago elegido.</p>
          ) : null}
        </div>
      </main>

      <footer className="kodda-home-footer">Kodda — checkout</footer>
    </div>
  );
}
