import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { KoddaLogo } from './KoddaLogo';
import { useCarrito } from '../context/CarritoContext';
import { useAuth } from '../context/AuthContext';

export default function ProductDetail() {
  const { productId } = useParams();
  const { user, avatarVersion } = useAuth();
  const { agregarAlCarrito, obtenerCantidadTotal } = useCarrito();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDetail() {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/api/catalog/products/${productId}`);
        setProduct(data);
      } catch (err) {
        const detail = err.response?.data?.detail;
        setError(typeof detail === 'string' ? detail : 'No se pudo cargar el detalle del producto.');
      } finally {
        setLoading(false);
      }
    }

    if (productId) {
      void loadDetail();
    }
  }, [productId]);

  const imageSrc = resolveMediaUrl(product?.main_image_url);
  const hasStock = Number(product?.stock || 0) > 0;
  const cartCount = obtenerCantidadTotal();
  const avatarSrc = resolveMediaUrl(user?.profile_image_url, avatarVersion || undefined);
  const initial = (user?.username || user?.email || '?').charAt(0).toUpperCase();

  return (
    <div className="kodda-home">
      <header className="kodda-topbar">
        <KoddaLogo compact />
        <div className="kodda-topbar-spacer" />
        <nav className="kodda-nav-actions">
          <Link to="/" className="kodda-btn-ghost">
            Volver al catálogo
          </Link>
          <Link to="/carrito" className="kodda-cart-icon-link" title="Mi carrito">
            🛒
            {cartCount > 0 ? <span className="kodda-cart-badge">{cartCount}</span> : null}
          </Link>
          <Link to="/perfil" className="kodda-user-chip" title="Mi perfil">
            {avatarSrc ? (
              <img key={avatarSrc} src={avatarSrc} alt="" className="kodda-avatar kodda-avatar-img" />
            ) : (
              <span className="kodda-avatar" aria-hidden="true">
                {initial}
              </span>
            )}
            <span>{user?.username || 'Usuario'}</span>
          </Link>
        </nav>
      </header>

      <main className="kodda-home-main">
        {loading ? <p className="kodda-auth-muted">Cargando detalle...</p> : null}
        {error ? <p className="kodda-auth-error">{error}</p> : null}

        {!loading && !error && product ? (
          <article className="kodda-product-detail">
            <section className="kodda-product-detail-media">
              {imageSrc ? (
                <img src={imageSrc} alt={product.name} className="kodda-product-detail-image" />
              ) : (
                <div className="kodda-product-detail-image-placeholder">📷 Sin imagen</div>
              )}
            </section>

            <section className="kodda-product-detail-info">
              <h1>{product.name}</h1>
              <div className="kodda-card-flags">
                {product.brand ? <span className="kodda-card-flag">{product.brand}</span> : null}
                <span className="kodda-card-flag">{product.category}</span>
              </div>

              <p className="kodda-product-detail-price">${product.price.toLocaleString('es-AR')}</p>
              <p className="kodda-card-meta">Talle: {product.size || '—'}</p>
              <p className={`kodda-product-stock${hasStock ? '' : ' kodda-product-stock--empty'}`}>
                {hasStock ? `Stock disponible: ${product.stock}` : 'No hay stock disponible'}
              </p>

              <h3>Descripción</h3>
              <p className="kodda-product-detail-description">{product.description}</p>

              <h3>Vendedor</h3>
              <p className="kodda-card-meta">
                <Link to={`/vendedores/${product.seller_id}`} className="kodda-auth-link">
                  {product.seller_username || `#${product.seller_id}`}
                </Link>
              </p>

              <button
                type="button"
                className="kodda-btn-add-to-cart"
                onClick={() => agregarAlCarrito(product)}
                disabled={!hasStock}
                title={!hasStock ? 'Sin stock disponible' : 'Agregar al carrito'}
              >
                {!hasStock ? 'Sin stock' : 'Agregar al carrito'}
              </button>
            </section>
          </article>
        ) : null}
      </main>
    </div>
  );
}
