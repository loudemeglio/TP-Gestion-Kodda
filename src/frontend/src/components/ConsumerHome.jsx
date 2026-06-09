import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCarrito } from '../context/CarritoContext';
import { resolveMediaUrl } from '../utils/mediaUrl';
import {
  buildCatalogQueryParams,
  clearCatalogFilter,
  hasActiveCatalogFilters,
} from '../utils/productFilters';
import { KoddaLogo } from './KoddaLogo';
import NotificationBell from './notifications/NotificationBell';
import ProductFilters, { EMPTY_CATALOG_FILTERS } from './ProductFilters';
import { useActiveCatalog } from '../hooks/useActiveCatalog';
import ChatBot from './ChatBot';
import { api } from '../api/client';
import { useCallback, useEffect, useState } from 'react';

function CatalogSkeleton() {
  return (
    <div className="kodda-grid kodda-grid--skeleton" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="kodda-card-skeleton">
          <div className="kodda-card-skeleton-visual" />
          <div className="kodda-card-skeleton-body">
            <span />
            <span />
            <span />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Vista de inicio tipo usuario (feed prototipo + cuenta).
 * @param {{ allowAdminPreview?: boolean }} props — si es true y el usuario es admin, muestra aviso y acceso al panel.
 */
export default function ConsumerHome({ allowAdminPreview = false }) {
  const navigate = useNavigate();
  const { user, logout, avatarVersion } = useAuth();
  const { agregarAlCarrito, obtenerCantidadTotal } = useCarrito();
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterDraft, setFilterDraft] = useState(EMPTY_CATALOG_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_CATALOG_FILTERS);
  const initial = (user?.username || user?.email || '?').charAt(0).toUpperCase();
  const avatarSrc = resolveMediaUrl(user?.profile_image_url, avatarVersion || undefined);
  const showAdminPreviewBar = allowAdminPreview && user?.role === 'admin';
  const cantidadCarrito = obtenerCantidadTotal();
  const { categories: activeCategories, brands: activeBrands } = useActiveCatalog();

  const cargarProductos = useCallback(async (filters) => {
    try {
      setLoading(true);
      const params = buildCatalogQueryParams(filters);
      const { data } = await api.get(`/api/catalog/products?${params.toString()}`);
      setProductos(data);
      setError(null);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      const detail = err.response?.data?.detail;
      const msg =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((d) => d.msg || d).join(', ')
            : 'Error al cargar los productos';
      setError(msg);
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarProductos(appliedFilters);
  }, [appliedFilters, cargarProductos]);

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filterDraft });
  };

  const handleClearFilters = () => {
    setFilterDraft(EMPTY_CATALOG_FILTERS);
    setAppliedFilters(EMPTY_CATALOG_FILTERS);
  };

  const handleRemoveFilter = (chipKey) => {
    const nextApplied = clearCatalogFilter(appliedFilters, chipKey);
    const nextDraft = clearCatalogFilter(filterDraft, chipKey);
    setAppliedFilters(nextApplied);
    setFilterDraft(nextDraft);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    handleApplyFilters();
  };

  const handleSearchChange = (value) => {
    setFilterDraft((prev) => ({ ...prev, name: value }));
  };

  return (
    <div className="kodda-home">
      {showAdminPreviewBar ? (
        <div className="kodda-admin-preview-banner" role="note">
          <p>
            <strong>Vista explorador:</strong> mismo prototipo que vería una cuenta de usuario. Cuando termines,{' '}
            <Link to="/admin">volvé al panel de administración</Link>.
          </p>
        </div>
      ) : null}

      <header className="kodda-topbar">
        <KoddaLogo compact />
        <form className="kodda-search" onSubmit={handleSearchSubmit} role="search">
          <span className="kodda-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="search"
            value={filterDraft.name}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por nombre de prenda…"
            aria-label="Buscar prendas por nombre"
          />
          {filterDraft.name ? (
            <button type="submit" className="kodda-search-submit" aria-label="Buscar">
              Ir
            </button>
          ) : null}
        </form>
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
          {showAdminPreviewBar ? (
            <Link to="/admin" className="kodda-btn-accent-outline" title="Ir al panel de administración">
              Panel admin
            </Link>
          ) : null}
          <Link to="/publicar" className="kodda-btn-accent-outline">
            Vender prenda
          </Link>
          <button type="button" className="kodda-btn-ghost" onClick={() => setChatOpen(true)}>
            Chat Kodda
          </button>
          <NotificationBell />
          <Link to="/carrito" className="kodda-cart-icon-link" title="Mi carrito">
            🛒
            {cantidadCarrito > 0 && <span className="kodda-cart-badge">{cantidadCarrito}</span>}
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
          <Link
            to="/login?cambiar=1"
            className="kodda-link-cuenta"
            title="Para demo con dos cuentas: esta ventana + otra en modo privado (misma URL)"
          >
            Cambiar de cuenta
          </Link>
          <button type="button" className="kodda-btn-ghost" onClick={() => logout()}>
            Salir
          </button>
        </nav>
      </header>

      <main className="kodda-home-main">
        <section className="kodda-catalog-hero">
          <div>
            <p className="kodda-hello">Hola, {user?.username || 'explorador'}</p>
            <p className="kodda-hello-sub">
              Descubrí moda circular con fotos reales, filtros por talle y disponibilidad al instante.
            </p>
          </div>
          <div className="kodda-catalog-hero-tags" aria-hidden="true">
            <span>Segunda mano</span>
            <span>Con stock en vivo</span>
            <span>Envío seguro</span>
          </div>
        </section>

        <form className="kodda-mobile-search" onSubmit={handleSearchSubmit} role="search">
          <span className="kodda-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="search"
            value={filterDraft.name}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar campera, jean, vestido…"
            aria-label="Buscar prendas"
          />
          <button type="submit" className="kodda-btn-accent-outline kodda-btn-sm">
            Buscar
          </button>
        </form>

        <ProductFilters
          values={filterDraft}
          appliedFilters={appliedFilters}
          onChange={setFilterDraft}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
          onRemoveFilter={handleRemoveFilter}
          loading={loading}
          resultCount={loading ? null : productos.length}
          categoryOptions={activeCategories}
          brandOptions={activeBrands}
        />

        <div className="kodda-section-title">
          <h2>Prendas disponibles</h2>
          <span className="kodda-badge-ia">
            {hasActiveCatalogFilters(appliedFilters) ? 'Filtrado' : 'Catálogo en vivo'}
          </span>
        </div>

        {loading ? (
          <CatalogSkeleton />
        ) : error ? (
          <div className="kodda-catalog-empty kodda-catalog-empty--error">
            <p>{error}</p>
          </div>
        ) : productos.length === 0 ? (
          <div className="kodda-catalog-empty">
            <p>
              {hasActiveCatalogFilters(appliedFilters)
                ? 'No hay prendas que coincidan con los filtros'
                : 'No hay prendas disponibles por el momento'}
            </p>
          </div>
        ) : (
          <div className="kodda-grid" role="list">
            {productos.map((producto) => {
              const imageSrc = resolveMediaUrl(producto.main_image_url);
              return (
                <article
                  key={producto.id}
                  className="kodda-card-product kodda-card-product--clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/productos/${producto.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/productos/${producto.id}`);
                    }
                  }}
                  aria-label={`Ver detalle de ${producto.name}`}
                >
                  <div className="kodda-card-visual">
                    {imageSrc ? (
                      <img src={imageSrc} alt={producto.name} loading="lazy" decoding="async" />
                    ) : (
                      <div className="kodda-product-detail-image-placeholder">Sin imagen</div>
                    )}
                    {producto.stock > 0 ? (
                      <span className="kodda-card-stock-badge">Disponible</span>
                    ) : (
                      <span className="kodda-card-stock-badge kodda-card-stock-badge--out">Agotado</span>
                    )}
                  </div>
                  <div className="kodda-card-body">
                    <h3>{producto.name}</h3>
                    <p className="kodda-card-meta" style={{ marginTop: '0.15rem', marginBottom: '0.4rem' }}>
                      Publicada por{' '}
                      <Link
                        to={`/vendedores/${producto.seller_id}`}
                        className="kodda-auth-link"
                        title="Ver reputación del vendedor"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {producto.seller_username || `#${producto.seller_id}`}
                      </Link>
                    </p>
                    <div className="kodda-card-flags">
                      {producto.brand ? <span className="kodda-card-flag">{producto.brand}</span> : null}
                      <span className="kodda-card-flag">{producto.category}</span>
                      {producto.size ? <span className="kodda-card-flag kodda-card-flag--size">{producto.size}</span> : null}
                    </div>
                    <div className="kodda-price">${producto.price.toLocaleString('es-AR')}</div>
                    <p className="kodda-card-meta" style={{ marginTop: '0.35rem' }}>
                      {producto.stock > 0 ? `${producto.stock} en stock` : 'Sin stock'}
                    </p>
                    <button
                      type="button"
                      className="kodda-btn-add-to-cart"
                      onClick={(e) => {
                        e.stopPropagation();
                        agregarAlCarrito(producto);
                      }}
                      disabled={producto.stock === 0}
                      title={producto.stock === 0 ? 'Sin stock disponible' : 'Agregar al carrito'}
                    >
                      {producto.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="kodda-strip">
          <p>
            <strong>Kodda</strong> conecta vendedores y compradores; la IA autocompleta datos desde fotos, sugiere
            precios y estima talle comparando tus medidas con la prenda — vos tenés la última palabra.
          </p>
          <Link to="/carrito" className="kodda-btn-accent-outline">
            Ver carrito
          </Link>
        </div>

        <section style={{ marginTop: '2rem' }}>
          <div className="kodda-section-title">
            <h2>Tu cuenta</h2>
          </div>
          <ul style={{ textAlign: 'left', lineHeight: 1.85, color: 'var(--kd-mist)', paddingLeft: '1.1rem' }}>
            <li>
              <strong style={{ color: 'var(--kd-ink-soft)' }}>Email:</strong> {user?.email}
            </li>
            <li>
              <strong style={{ color: 'var(--kd-ink-soft)' }}>Rol:</strong> {user?.role}
            </li>
          </ul>
        </section>
      </main>

      <nav className="kodda-mobile-bottom-nav" aria-label="Accesos rápidos">
        <Link to="/" className="kodda-mobile-bottom-nav-item kodda-mobile-bottom-nav-item--active">
          <span aria-hidden="true">🏠</span>
          Inicio
        </Link>
        <Link to="/carrito" className="kodda-mobile-bottom-nav-item">
          <span aria-hidden="true">🛒</span>
          Carrito
          {cantidadCarrito > 0 ? <span className="kodda-mobile-bottom-nav-badge">{cantidadCarrito}</span> : null}
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

      <footer className="kodda-home-footer">Kodda — moda circular inteligente · Prototipo de producto</footer>

      {chatOpen && (
        <div className="kodda-chat-modal-overlay">
          <ChatBot onClose={() => setChatOpen(false)} />
        </div>
      )}
    </div>
  );
}
