import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCarrito } from '../context/CarritoContext';
import { api } from '../api/client';
import { resolveMediaUrl } from '../utils/mediaUrl';
import '../styles/personalRecommendationsSection.css';

function RecommendationSkeleton() {
  return (
    <div className="kodda-grid kodda-grid--skeleton" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
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

export default function PersonalRecommendationsSection() {
  const navigate = useNavigate();
  const { agregarAlCarrito } = useCarrito();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/api/recommendations/personalized?limit=6');
        setRecommendations(data.recommendations || []);
        setError(null);
      } catch (err) {
        console.error('Error al cargar recomendaciones:', err);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, []);

  if (loading) {
    return (
      <section className="kodda-recommendations-section">
        <div className="kodda-section-title">
          <h2> Prendas recomendadas para ti</h2>
          <span className="kodda-badge-ia">Basado en tus compras</span>
        </div>
        <RecommendationSkeleton />
      </section>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <section className="kodda-recommendations-section">
      <div className="kodda-section-title">
        <h2> Prendas recomendadas para ti</h2>
        <span className="kodda-badge-ia">Basado en tus compras</span>
      </div>

      <div className="kodda-grid" role="list">
        {recommendations.map((producto) => {
          const imageSrc = resolveMediaUrl(producto.main_image_url);
          return (
            <article
              key={producto.id}
              className="kodda-card-product kodda-card-product--clickable kodda-card-recommended"
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
    </section>
  );
}
