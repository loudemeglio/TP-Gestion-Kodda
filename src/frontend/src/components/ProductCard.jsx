import { Link, useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useCarrito } from '../context/CarritoContext';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { api } from '../api/client';
import '../styles/likeButton.css';

/**
 * Tarjeta de producto reutilizable
 * Se usa en ConsumerHome, PersonalRecommendationsSection y MyLikes
 */
export default function ProductCard({ producto, showLink = true, showSellerLink = true }) {
  const navigate = useNavigate();
  const { agregarAlCarrito } = useCarrito();
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  // Cargar estado inicial del like
  useEffect(() => {
    const checkLikeStatus = async () => {
      try {
        const { data } = await api.get(`/api/likes/product/${producto.id}/is-liked`);
        setIsLiked(data.is_liked);
      } catch (err) {
        // Si hay error, mantener false
        console.error('Error al verificar like:', err);
      }
    };
    checkLikeStatus();
  }, [producto.id]);

  const imageSrc = resolveMediaUrl(producto.main_image_url);

  const handleToggleLike = async (e) => {
    e.stopPropagation();
    try {
      setLikeLoading(true);
      const { data } = await api.post(`/api/likes/toggle/${producto.id}`);
      setIsLiked(data.liked);
    } catch (err) {
      console.error('Error al actualizar like:', err);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    agregarAlCarrito(producto);
  };

  const handleClick = () => {
    if (showLink) {
      navigate(`/productos/${producto.id}`);
    }
  };

  const handleKeyDown = (e) => {
    if (showLink && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      navigate(`/productos/${producto.id}`);
    }
  };

  return (
    <article
      className="kodda-card-product kodda-card-product--clickable"
      role="button"
      tabIndex={showLink ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Ver detalle de ${producto.name}`}
    >
      <div className="kodda-card-visual">
        {imageSrc ? (
          <img src={imageSrc} alt={producto.name} loading="lazy" decoding="async" />
        ) : (
          <div className="kodda-product-detail-image-placeholder">Sin imagen</div>
        )}

        <button
          type="button"
          className={`kodda-btn-like ${isLiked ? 'kodda-btn-like--liked' : 'kodda-btn-like--not-liked'}`}
          onClick={handleToggleLike}
          disabled={likeLoading}
          title={isLiked ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          aria-label={isLiked ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          {isLiked ? '❤️' : '♡'}
        </button>

        {producto.stock > 0 ? (
          <span className="kodda-card-stock-badge">Disponible</span>
        ) : (
          <span className="kodda-card-stock-badge kodda-card-stock-badge--out">Agotado</span>
        )}
      </div>

      <div className="kodda-card-body">
        <h3>{producto.name}</h3>
        {showSellerLink ? (
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
        ) : null}
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
          onClick={handleAddToCart}
          disabled={producto.stock === 0}
          title={producto.stock === 0 ? 'Sin stock disponible' : 'Agregar al carrito'}
        >
          {producto.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
        </button>
      </div>
    </article>
  );
}
