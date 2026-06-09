import { useEffect, useState } from 'react';
import { api } from '../api/client';
import ProductCard from './ProductCard';
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
        {recommendations.map((producto) => (
          <ProductCard key={producto.id} producto={producto} showLink={true} />
        ))}
      </div>
    </section>
  );
}
