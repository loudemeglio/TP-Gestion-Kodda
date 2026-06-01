/**
 * Filtros del catálogo. Para agregar un criterio nuevo:
 * 1. Sumar la clave en EMPTY_CATALOG_FILTERS y CATALOG_FILTER_FIELDS (ProductFilters.jsx)
 * 2. Mapear el query param en buildCatalogQueryParams
 * 3. Implementar el filtro en el backend (app/products/filters.py)
 */

export const EMPTY_CATALOG_FILTERS = {
  name: '',
  description: '',
  price_min: '',
  price_max: '',
  category: '',
  brand: '',
  size: '',
};

/** Convierte el estado del formulario en query params para GET /api/catalog/products */
export function buildCatalogQueryParams(filters, { limit = 100 } = {}) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));

  if (filters.name?.trim()) {
    params.set('name', filters.name.trim());
  }
  if (filters.description?.trim()) {
    params.set('description', filters.description.trim());
  }
  const min = parsePrice(filters.price_min);
  const max = parsePrice(filters.price_max);
  if (min !== null) {
    params.set('price_min', String(min));
  }
  if (max !== null) {
    params.set('price_max', String(max));
  }
  if (filters.category) {
    params.set('category', filters.category);
  }
  if (filters.brand) {
    params.set('brand', filters.brand);
  }
  if (filters.size?.trim()) {
    params.set('size', filters.size.trim());
  }

  return params;
}

export function hasActiveCatalogFilters(filters) {
  return (
    Boolean(filters.name?.trim()) ||
    Boolean(filters.description?.trim()) ||
    parsePrice(filters.price_min) !== null ||
    parsePrice(filters.price_max) !== null ||
    Boolean(filters.category) ||
    Boolean(filters.brand) ||
    Boolean(filters.size?.trim())
  );
}

function parsePrice(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
