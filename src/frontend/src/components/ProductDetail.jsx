import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { KoddaLogo } from './KoddaLogo';
import ProductImageViewer from './ProductImageViewer';
import FitRecommendation from './FitRecommendation';
import { useCarrito } from '../context/CarritoContext';
import { useAuth } from '../context/AuthContext';
import '../styles/likeButton.css';

export default function ProductDetail() {
  const { productId } = useParams();
  const { user, avatarVersion } = useAuth();
  const { agregarAlCarrito, obtenerCantidadTotal } = useCarrito();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

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

  function handleAddToCart() {
    if (product && hasStock) {
      agregarAlCarrito(product);
    }
  }

  async function handleToggleLike() {
    try {
      setLikeLoading(true);
      const { data } = await api.post(`/api/likes/toggle/${productId}`);
      setIsLiked(data.liked);
    } catch (err) {
      console.error('Error al actualizar like:', err);
    } finally {
      setLikeLoading(false);
    }
  }

  return (
    <div className="kodda-home kodda-product-detail-page">
      <header className="kodda-topbar">
        <KoddaLogo compact />
        <div className="kodda-topbar-spacer" />

        <button
          className="kodda-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <nav className={`kodda-nav-actions-collapsible ${menuOpen ? 'open' : ''}`} aria-label="Acciones principales">
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

      <main className="kodda-home-main kodda-product-detail-main">
        {loading ? <p className="kodda-auth-muted">Cargando detalle...</p> : null}
        {error ? <p className="kodda-auth-error">{error}</p> : null}

        {!loading && !error && product ? (
          <article className="kodda-product-detail">
            <section className="kodda-product-detail-media">
              {imageSrc ? (
                <ProductImageViewer src={imageSrc} alt={product.name} className="kodda-product-detail-image" />
              ) : (
                <div className="kodda-product-detail-image-placeholder">📷 Sin imagen</div>
              )}
            </section>

            <section className="kodda-product-detail-info">
              <p className="kodda-product-detail-eyebrow">Detalle de prenda</p>
              <h1>{product.name}</h1>
              <div className="kodda-card-flags">
                {product.brand ? <span className="kodda-card-flag">{product.brand}</span> : null}
                <span className="kodda-card-flag">{product.category}</span>
                {product.size ? <span className="kodda-card-flag kodda-card-flag--size">{product.size}</span> : null}
              </div>

              <p className="kodda-product-detail-price">${product.price.toLocaleString('es-AR')}</p>
              <p className={`kodda-product-stock${hasStock ? '' : ' kodda-product-stock--empty'}`}>
                {hasStock ? `${product.stock} disponibles · stock en tiempo real` : 'No hay stock disponible'}
              </p>

              <div className="kodda-product-detail-specs">
                <div>
                  <span>Talle</span>
                  <strong>{product.size || '—'}</strong>
                </div>
                <div>
                  <span>Categoría</span>
                  <strong>{product.category}</strong>
                </div>
                {product.brand ? (
                  <div>
                    <span>Marca</span>
                    <strong>{product.brand}</strong>
                  </div>
                ) : null}
              </div>

              <FitRecommendation productId={product.id} />

              <h3>Descripción</h3>
              <p className="kodda-product-detail-description">{product.description}</p>

              <h3>Vendedor</h3>
              <p className="kodda-card-meta">
                <Link to={`/vendedores/${product.seller_id}`} className="kodda-auth-link">
                  {product.seller_username || `#${product.seller_id}`}
                </Link>
              </p>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch' }}>
                <button
                  type="button"
                  className={`kodda-btn-like ${isLiked ? 'kodda-btn-like--liked' : 'kodda-btn-like--not-liked'}`}
                  onClick={handleToggleLike}
                  disabled={likeLoading}
                  title={isLiked ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  aria-label={isLiked ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  style={{ flex: '0 0 auto', width: '50px', height: 'auto' }}
                >
                  {isLiked ? '❤️' : '♡'}
                </button>
                <button
                  type="button"
                  className="kodda-btn-add-to-cart kodda-product-detail-cta"
                  onClick={handleAddToCart}
                  disabled={!hasStock}
                  title={!hasStock ? 'Sin stock disponible' : 'Agregar al carrito'}
                  style={{ flex: 1 }}
                >
                  {!hasStock ? 'Sin stock' : 'Agregar al carrito'}
                </button>
              </div>
            </section>
          </article>
        ) : null}
      </main>

      {!loading && !error && product ? (
        <div className="kodda-product-sticky-bar" aria-label="Acción de compra">
          <div className="kodda-product-sticky-bar-copy">
            <strong>{product.name}</strong>
            <span>${product.price.toLocaleString('es-AR')}</span>
          </div>
          <button
            type="button"
            className="kodda-btn-add-to-cart"
            onClick={handleAddToCart}
            disabled={!hasStock}
          >
            {!hasStock ? 'Sin stock' : 'Agregar'}
          </button>
        </div>
      ) : null}

      <nav className="kodda-mobile-bottom-nav" aria-label="Accesos rápidos">
        <Link to="/" className="kodda-mobile-bottom-nav-item">
          <span aria-hidden="true">🏠</span>
          Inicio
        </Link>
        <Link to="/carrito" className="kodda-mobile-bottom-nav-item">
          <span aria-hidden="true">🛒</span>
          Carrito
          {cartCount > 0 ? <span className="kodda-mobile-bottom-nav-badge">{cartCount}</span> : null}
        </Link>
        <Link to="/publicar" className="kodda-mobile-bottom-nav-item">
          <span aria-hidden="true">➕</span>
          Vender
        </Link>
        <Link to="/perfil" className="kodda-mobile-bottom-nav-item">
          <span aria-hidden="true">👤</span>
          Perfil
        </Link>
      </nav>
    </div>
  );
}
