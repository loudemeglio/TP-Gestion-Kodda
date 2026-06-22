import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import AppTopbar from './AppTopbar';
import ProductCard from './ProductCard';

function MyLikesSkeleton() {
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

export default function MyLikes() {
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMyLikes = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/api/likes/my-likes?limit=100');
        setLikes(data.products || []);
        setError(null);
      } catch (err) {
        console.error('Error al cargar likes:', err);
        const detail = err.response?.data?.detail;
        const msg =
          typeof detail === 'string'
            ? detail
            : 'Error al cargar tus prendas con like';
        setError(msg);
        setLikes([]);
      } finally {
        setLoading(false);
      }
    };

    loadMyLikes();
  }, []);

  return (
    <div className="kodda-home">
      <AppTopbar>
        <Link to="/explorador" className="kodda-btn-ghost">
          Volver al catálogo
        </Link>
      </AppTopbar>
      <main className="kodda-home-main">
      <section className="kodda-catalog-hero">
        <div>
          <p className="kodda-hello">Mis prendas con like ❤️</p>
          <p className="kodda-hello-sub">
            Todas las prendas que marcaste como favoritas
          </p>
        </div>
      </section>

      <div className="kodda-section-title">
        <h2>Prendas con like</h2>
        {!loading && likes.length > 0 && (
          <span className="kodda-badge-ia">{likes.length} prendas</span>
        )}
      </div>

      {loading ? (
        <MyLikesSkeleton />
      ) : error ? (
        <div className="kodda-catalog-empty kodda-catalog-empty--error">
          <p>{error}</p>
        </div>
      ) : likes.length === 0 ? (
        <div className="kodda-catalog-empty">
          <p>No tienes prendas marcadas como favoritas aún</p>
          <Link to="/explorador" className="kodda-btn-accent-outline" style={{ marginTop: '1rem' }}>
            Ir al catálogo
          </Link>
        </div>
      ) : (
        <div className="kodda-grid" role="list">
          {likes.map((producto) => (
            <ProductCard key={producto.id} producto={producto} showLink={true} />
          ))}
        </div>
      )}
      </main>
    </div>
  );
}
