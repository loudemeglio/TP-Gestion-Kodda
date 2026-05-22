import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCarrito } from '../context/CarritoContext';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { buildCatalogQueryParams, hasActiveCatalogFilters } from '../utils/productFilters';
import { KoddaLogo } from './KoddaLogo';
import ProductFilters, { EMPTY_CATALOG_FILTERS } from './ProductFilters';
import { api } from '../api/client';
import { useCallback, useEffect, useState } from 'react';



/**
 * Vista de inicio tipo usuario (feed prototipo + cuenta).
 * @param {{ allowAdminPreview?: boolean }} props — si es true y el usuario es admin, muestra aviso y acceso al panel.
 */
export default function ConsumerHome({ allowAdminPreview = false }) {
  const { user, logout, avatarVersion } = useAuth();
  const { agregarAlCarrito, obtenerCantidadTotal } = useCarrito();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterDraft, setFilterDraft] = useState(EMPTY_CATALOG_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_CATALOG_FILTERS);
  const initial = (user?.username || user?.email || '?').charAt(0).toUpperCase();
  const avatarSrc = resolveMediaUrl(user?.profile_image_url, avatarVersion || undefined);
  const showAdminPreviewBar = allowAdminPreview && user?.role === 'admin';
  const cantidadCarrito = obtenerCantidadTotal();

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
        <div className="kodda-search" title="Próximamente: búsqueda en lenguaje natural">
          <span aria-hidden="true">🔍</span>
          <input type="search" placeholder='Probá: "ropa para boda de día en noviembre"' disabled />
        </div>
        <div className="kodda-topbar-spacer" />
        <nav className="kodda-nav-actions" aria-label="Acciones principales">
          {showAdminPreviewBar ? (
            <Link to="/admin" className="kodda-btn-accent-outline" title="Ir al panel de administración">
              Panel admin
            </Link>
          ) : null}
          <Link to="/publicar" className="kodda-btn-accent-outline">
            Vender prenda
          </Link>
          <button type="button" className="kodda-btn-ghost" disabled title="Próximamente">
            Chat Kodda
          </button>
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
        <p className="kodda-hello">Hola, {user?.username || 'explorador'} 👋</p>
        <p className="kodda-hello-sub">
          Acá verás prendas publicadas por otros usuarios — priorizando lo que mejor te queda.
        </p>

        <ProductFilters
          values={filterDraft}
          onChange={setFilterDraft}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
          loading={loading}
        />

        <div className="kodda-section-title">
          <h2>Prendas disponibles</h2>
          <span className="kodda-badge-ia">
            {hasActiveCatalogFilters(appliedFilters) ? 'Filtrado' : 'Catálogo en vivo'}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            <p>Cargando prendas...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#c00' }}>
            <p>{error}</p>
          </div>
        ) : productos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
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
              <article key={producto.id} className="kodda-card-product" role="listitem">
                <div className="kodda-card-visual">
                  {imageSrc ? (
                    <img src={imageSrc} alt={producto.name} />
                  ) : null}
                </div>
                <div className="kodda-card-body">
                  <h3>{producto.name}</h3>
                  <p className="kodda-card-meta">{producto.category}</p>
                  <div className="kodda-price">${producto.price.toLocaleString('es-AR')}</div>
                  <p className="kodda-card-meta" style={{ marginTop: '0.35rem' }}>
                    {producto.stock > 0 ? `Stock: ${producto.stock}` : 'Sin stock'}
                  </p>
                  <button
                    type="button"
                    className="kodda-btn-add-to-cart"
                    onClick={() => agregarAlCarrito(producto)}
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

      <footer className="kodda-home-footer">Kodda — moda circular inteligente · Prototipo de producto</footer>
    </div>
  );
}
