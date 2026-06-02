import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatApiError } from '../utils/apiError';

/**
 * Carga marcas y categorías activas del catálogo maestro (para formularios de vendedor).
 */
export function useActiveCatalog() {
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: brandsData }, { data: categoriesData }] = await Promise.all([
        api.get('/api/catalog/brands/active'),
        api.get('/api/catalog/categories/active'),
      ]);
      setBrands(brandsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(formatApiError(err, 'No se pudo cargar el catálogo.'));
      setBrands([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { brands, categories, loading, error, reload };
}

export function findCategoryIdByName(categories, name) {
  if (!name) return '';
  const match = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  return match ? String(match.id) : '';
}

export function findBrandIdByName(brands, name) {
  if (!name) return '';
  const match = brands.find((b) => b.name.toLowerCase() === name.toLowerCase());
  return match ? String(match.id) : '';
}
