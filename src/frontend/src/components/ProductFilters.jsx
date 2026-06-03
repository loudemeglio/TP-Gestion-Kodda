import { useMemo, useState } from 'react';
import { EMPTY_CATALOG_FILTERS, getActiveFilterChips } from '../utils/productFilters';

function buildFilterFields(categoryOptions, brandOptions) {
  return [
    {
      key: 'name',
      type: 'text',
      label: 'Nombre',
      placeholder: 'Ej: campera jean',
      autoComplete: 'off',
    },
    {
      key: 'description',
      type: 'text',
      label: 'Descripción',
      placeholder: 'Palabras que aparezcan en la descripción',
      autoComplete: 'off',
    },
    {
      key: 'size',
      type: 'text',
      label: 'Talle',
      placeholder: 'Ej: M, L, 42',
      autoComplete: 'off',
    },
    {
      key: 'price_min',
      type: 'number',
      label: 'Precio desde ($)',
      placeholder: '0',
      min: 0,
      step: 100,
      group: 'price',
    },
    {
      key: 'price_max',
      type: 'number',
      label: 'Precio hasta ($)',
      placeholder: 'Sin tope',
      min: 0,
      step: 100,
      group: 'price',
    },
    {
      key: 'category',
      type: 'select',
      label: 'Categoría',
      options: [
        { value: '', label: 'Todas las categorías' },
        ...categoryOptions.map((c) => ({ value: c.name, label: c.name })),
      ],
    },
    {
      key: 'brand',
      type: 'select',
      label: 'Marca',
      options: [
        { value: '', label: 'Todas las marcas' },
        ...brandOptions.map((b) => ({ value: b.name, label: b.name })),
      ],
    },
  ];
}

export { EMPTY_CATALOG_FILTERS };

/**
 * @param {{
 *   values: typeof EMPTY_CATALOG_FILTERS,
 *   appliedFilters?: typeof EMPTY_CATALOG_FILTERS,
 *   onChange: (next: typeof EMPTY_CATALOG_FILTERS) => void,
 *   onApply: () => void,
 *   onClear: () => void,
 *   onRemoveFilter?: (chipKey: string) => void,
 *   loading?: boolean,
 *   resultCount?: number | null,
 *   categoryOptions?: Array<{ id: number, name: string }>,
 *   brandOptions?: Array<{ id: number, name: string }>,
 * }} props
 */
export default function ProductFilters({
  values,
  appliedFilters,
  onChange,
  onApply,
  onClear,
  onRemoveFilter,
  loading = false,
  resultCount = null,
  categoryOptions = [],
  brandOptions = [],
}) {
  const [open, setOpen] = useState(false);
  const filterFields = useMemo(
    () => buildFilterFields(categoryOptions, brandOptions),
    [categoryOptions, brandOptions]
  );
  const activeChips = getActiveFilterChips(appliedFilters ?? values);
  const activeCount = activeChips.length;

  const handleField = (key, value) => {
    onChange({ ...values, [key]: value });
  };

  const textFields = filterFields.filter((f) => f.type === 'text');
  const priceFields = filterFields.filter((f) => f.group === 'price');
  const selectFields = filterFields.filter((f) => f.type === 'select');

  return (
    <section className="kodda-filters" aria-label="Filtros del catálogo">
      <div className="kodda-filters-toolbar">
        <button
          type="button"
          className={`kodda-filters-toggle${open ? ' kodda-filters-toggle--open' : ''}`}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="kodda-filters-panel"
        >
          <span>Filtrar prendas</span>
          {activeCount > 0 ? (
            <span className="kodda-filters-count" aria-label={`${activeCount} filtros activos`}>
              {activeCount}
            </span>
          ) : null}
          <span
            className={`kodda-filters-chevron${open ? ' kodda-filters-chevron--open' : ''}`}
            aria-hidden="true"
          >
            ▼
          </span>
        </button>

        {resultCount !== null && !loading ? (
          <span className="kodda-filters-results">
            {resultCount} {resultCount === 1 ? 'prenda' : 'prendas'}
          </span>
        ) : null}
      </div>

      {activeChips.length > 0 ? (
        <div className="kodda-filter-chips" aria-label="Filtros activos">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="kodda-filter-chip"
              onClick={() => onRemoveFilter?.(chip.key)}
              title="Quitar filtro"
            >
              {chip.label}
              <span aria-hidden="true">×</span>
            </button>
          ))}
          <button type="button" className="kodda-filter-chip kodda-filter-chip--clear" onClick={onClear}>
            Limpiar todo
          </button>
        </div>
      ) : null}

      {open ? (
        <div id="kodda-filters-panel" className="kodda-filters-panel">
          <div className="kodda-filters-grid">
            {textFields.map((field) => (
              <label key={field.key} className="kodda-field kodda-filters-field">
                <span>{field.label}</span>
                <input
                  type={field.type}
                  className="kodda-input"
                  placeholder={field.placeholder}
                  autoComplete={field.autoComplete}
                  value={values[field.key]}
                  onChange={(e) => handleField(field.key, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onApply();
                    }
                  }}
                />
              </label>
            ))}

            <div className="kodda-filters-price-group">
              <span className="kodda-filters-group-label">Rango de precio</span>
              <div className="kodda-filters-price-inputs">
                {priceFields.map((field) => (
                  <label key={field.key} className="kodda-field kodda-filters-field">
                    <span>{field.label}</span>
                    <input
                      type={field.type}
                      className="kodda-input"
                      placeholder={field.placeholder}
                      min={field.min}
                      step={field.step}
                      value={values[field.key]}
                      onChange={(e) => handleField(field.key, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>

            {selectFields.map((field) => (
              <label key={field.key} className="kodda-field kodda-filters-field">
                <span>{field.label}</span>
                <select
                  className="kodda-input"
                  value={values[field.key]}
                  onChange={(e) => handleField(field.key, e.target.value)}
                >
                  {field.options.map((opt) => (
                    <option key={opt.value || 'all'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="kodda-filters-actions">
            <button
              type="button"
              className="kodda-btn-primary kodda-filters-apply"
              onClick={onApply}
              disabled={loading}
            >
              {loading ? 'Buscando…' : 'Aplicar filtros'}
            </button>
            <button type="button" className="kodda-btn-secondary" onClick={onClear} disabled={loading}>
              Limpiar
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
