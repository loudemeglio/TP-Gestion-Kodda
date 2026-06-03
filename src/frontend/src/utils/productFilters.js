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
  return getActiveFilterChips(filters).length > 0;
}

/** Etiquetas legibles de filtros activos para chips en la UI. */
export function getActiveFilterChips(filters) {
  const chips = [];

  if (filters.name?.trim()) {
    chips.push({ key: 'name', label: filters.name.trim() });
  }
  if (filters.description?.trim()) {
    chips.push({ key: 'description', label: `Desc: ${filters.description.trim()}` });
  }
  if (filters.size?.trim()) {
    chips.push({ key: 'size', label: `Talle ${filters.size.trim()}` });
  }
  if (filters.category) {
    chips.push({ key: 'category', label: filters.category });
  }
  if (filters.brand) {
    chips.push({ key: 'brand', label: filters.brand });
  }
  const min = parsePrice(filters.price_min);
  const max = parsePrice(filters.price_max);
  if (min !== null && max !== null) {
    chips.push({ key: 'price', label: `$${min.toLocaleString('es-AR')} – $${max.toLocaleString('es-AR')}` });
  } else if (min !== null) {
    chips.push({ key: 'price_min', label: `Desde $${min.toLocaleString('es-AR')}` });
  } else if (max !== null) {
    chips.push({ key: 'price_max', label: `Hasta $${max.toLocaleString('es-AR')}` });
  }

  return chips;
}

export function clearCatalogFilter(filters, chipKey) {
  if (chipKey === 'price') {
    return { ...filters, price_min: '', price_max: '' };
  }
  if (chipKey in EMPTY_CATALOG_FILTERS) {
    return { ...filters, [chipKey]: EMPTY_CATALOG_FILTERS[chipKey] };
  }
  return filters;
}

function parsePrice(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
