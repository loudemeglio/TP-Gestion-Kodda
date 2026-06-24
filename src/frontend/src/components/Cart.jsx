import { Link } from 'react-router-dom';
import { useCarrito } from '../context/CarritoContext';
import { resolveMediaUrl } from '../utils/mediaUrl';
import AppTopbar from './AppTopbar';
import '../styles/cart.css';

export default function Cart() {
  const { items, eliminarDelCarrito, incrementarCantidad, decrementarCantidad, obtenerTotal, vaciarCarrito } = useCarrito();

  const total = obtenerTotal();

  return (
    <div className="kodda-home">
      <AppTopbar collapsible>
        <Link to="/explorador" className="kodda-btn-accent-outline">
          Volver al feed
        </Link>
        <Link to="/publicar" className="kodda-btn-sell">
          <span className="kodda-btn-sell-icon" aria-hidden="true">+</span>
          Vender prenda
        </Link>
        <Link
          to="/login?cambiar=1"
          className="kodda-link-cuenta"
          title="Para demo con dos cuentas: esta ventana + otra en modo privado (misma URL)"
        >
          Cambiar de cuenta
        </Link>
      </AppTopbar>

      <main className="kodda-cart-main">
        <div className="kodda-cart-container">
          <div className="kodda-cart-title-section">
            <h2>Mi Carrito</h2>
            {items.length > 0 && (
              <button type="button" className="kodda-btn-danger-light" onClick={vaciarCarrito}>
                Vaciar carrito
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="kodda-cart-empty">
              <p>Tu carrito está vacío</p>
              <Link to="/" className="kodda-btn-accent">
                Seguir explorando
              </Link>
            </div>
          ) : (
            <div className="kodda-cart-content">
              <div className="kodda-cart-items">
                {items.map((item) => {
                  const imageSrc = resolveMediaUrl(item.main_image_url);
                  return (
                    <article key={item.id} className="kodda-cart-item">
                      <div className="kodda-cart-item-visual">
                        {imageSrc ? (
                          <img src={imageSrc} alt={item.name} />
                        ) : null}
                      </div>
                      <div className="kodda-cart-item-body">
                      <h3>{item.name}</h3>
                      <p className="kodda-cart-item-meta">{item.category}</p>
                      <div className="kodda-cart-item-price">${item.price.toLocaleString('es-AR')}</div>
                    </div>
                    <div className="kodda-cart-item-controls">
                      <div className="kodda-quantity-selector">
                        <button
                          type="button"
                          className="kodda-qty-btn"
                          onClick={() => decrementarCantidad(item.id)}
                          title="Disminuir cantidad"
                        >
                          −
                        </button>
                        <span className="kodda-qty-display">{item.cantidad}</span>
                        <button
                          type="button"
                          className="kodda-qty-btn"
                          onClick={() => incrementarCantidad(item.id)}
                          title="Aumentar cantidad"
                        >
                          +
                        </button>
                      </div>
                      <div className="kodda-cart-item-total">
                        ${(item.price * item.cantidad).toLocaleString('es-AR')}
                      </div>
                      <button
                        type="button"
                        className="kodda-btn-remove"
                        onClick={() => eliminarDelCarrito(item.id)}
                        title="Eliminar del carrito"
                      >
                        ✕
                      </button>
                    </div>
                  </article>
                  );
                })}
              </div>

              <div className="kodda-cart-summary">
                <div className="kodda-cart-summary-line">
                  <span>Subtotal:</span>
                  <span>${total.toLocaleString('es-AR')}</span>
                </div>
                <div className="kodda-cart-summary-line kodda-cart-summary-shipping">
                  <span>Envío:</span>
                  <span className="kodda-shipping-info">Calcular al checkout</span>
                </div>
                <div className="kodda-cart-summary-total">
                  <span>Total:</span>
                  <span>${total.toLocaleString('es-AR')}</span>
                </div>
                <Link to="/checkout" className="kodda-btn-checkout kodda-btn-checkout--link">
                  Proceder al pago
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
