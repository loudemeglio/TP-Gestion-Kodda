import { useState, useCallback } from 'react';
import { api } from '../api/client';

/**
 * Hook para manejar likes de productos
 * @param {number} productId - ID del producto
 * @param {boolean} initialLiked - Estado inicial del like (opcional)
 * @returns {Object} { isLiked, toggleLike, loading }
 */
export function useProductLike(productId, initialLiked = false) {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [loading, setLoading] = useState(false);

  const toggleLike = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.post(`/api/likes/toggle/${productId}`);
      setIsLiked(data.liked);
    } catch (err) {
      console.error('Error al actualizar like:', err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  return { isLiked, toggleLike, loading };
}
