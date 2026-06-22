import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCarrito } from '../context/CarritoContext';
import {
  buildCatalogQueryParams,
  clearCatalogFilter,
  hasActiveCatalogFilters,
} from '../utils/productFilters';
import AppTopbar from './AppTopbar';
import ProductFilters, { EMPTY_CATALOG_FILTERS } from './ProductFilters';
import { useActiveCatalog } from '../hooks/useActiveCatalog';
import PersonalRecommendationsSection from './PersonalRecommendationsSection';
import ProductCard from './ProductCard';
import { api } from '../api/client';
import { useCallback, useEffect, useState } from 'react';

function CatalogSkeleton() {
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

/**
 * Vista de inicio tipo usuario (feed prototipo + cuenta).
 * @param {{ allowAdminPreview?: boolean }} props — si es true y el usuario es admin, muestra aviso y acceso al panel.
 */
export default function ConsumerHome({ allowAdminPreview = false }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { agregarAlCarrito, obtenerCantidadTotal } = useCarrito();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterDraft, setFilterDraft] = useState(EMPTY_CATALOG_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_CATALOG_FILTERS);
  const [aiQuery, setAiQuery] = useState('');
  const [appliedAiQuery, setAppliedAiQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const showAdminPreviewBar = allowAdminPreview && user?.role === 'admin';
  const cantidadCarrito = obtenerCantidadTotal();
  const { categories: activeCategories, brands: activeBrands } = useActiveCatalog();

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
    if (!appliedAiQuery) {
      cargarProductos(appliedFilters);
    }
  }, [appliedFilters, appliedAiQuery, cargarProductos]);

  const handleApplyFilters = () => {
    setAppliedAiQuery('');
    setAppliedFilters({ ...filterDraft });
  };

  const handleClearFilters = () => {
    setFilterDraft(EMPTY_CATALOG_FILTERS);
    setAppliedFilters(EMPTY_CATALOG_FILTERS);
  };

  const handleRemoveFilter = (chipKey) => {
    const nextApplied = clearCatalogFilter(appliedFilters, chipKey);
    const nextDraft = clearCatalogFilter(filterDraft, chipKey);
    setAppliedFilters(nextApplied);
    setFilterDraft(nextDraft);
  };

  const handleAiSearch = async (event) => {
    if (event) event.preventDefault();
    if (!aiQuery.trim()) return;

    setIsAiSearching(true);
    setError(null);

    try {
      const { data: allProducts } = await api.get('/api/catalog/products?limit=200');

      if (allProducts.length === 0) {
        setProductos([]);
        setAppliedAiQuery(aiQuery);
        setIsAiSearching(false);
        return;
      }

      const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
      if (!GEMINI_API_KEY) {
        throw new Error('La IA no está configurada. Falta la clave de API.');
      }

      const prompt = `Actúas como un motor de búsqueda semántico inteligente para la tienda de ropa Kodda en Argentina.
Consulta del usuario: "${aiQuery}"

Debes evaluar cuáles de las siguientes prendas disponibles corresponden con lo que el usuario está buscando (por ejemplo, por su deporte, uso, estilo, ocasión, descripción o tipo de prenda).
Prendas disponibles en el catálogo:
${JSON.stringify(allProducts.map(p => ({ id: p.id, name: p.name, description: p.description, category: p.category, brand: p.brand })))}

Responde ÚNICAMENTE con un array JSON de números que representen los IDs de las prendas que coinciden (ej. [1, 3, 12]). Si ninguna coincide, responde con un array vacío: [].
No agregues explicaciones, formato Markdown, ni bloques de código. El output debe ser directamente parseable por JSON.parse().`;

      const body = {
        contents: [{ parts: [{ text: prompt }] }]
      };

      const modelsToTry = [
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash-lite',
        'gemini-flash-latest',
        'gemini-3.5-flash',
        'gemini-2.0-flash'
      ];

      let response = null;
      let lastError = null;

      for (const model of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          
          if (res.ok) {
            response = res;
            break;
          } else {
            const errorData = await res.json().catch(() => ({}));
            const errMsg = errorData.error?.message || `HTTP ${res.status}`;
            console.warn(`Model ${model} failed: ${errMsg}`);
            lastError = new Error(errMsg);
          }
        } catch (err) {
          console.warn(`Failed calling ${model}:`, err);
          lastError = err;
        }
      }

      if (!response) {
        throw lastError || new Error('No se pudo conectar con ningún modelo de IA de búsqueda.');
      }

      const responseData = await response.json();
      const rawText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleanText = rawText.replace(/```json|```/g, '').trim();
      
      let matchedIds = [];
      try {
        matchedIds = JSON.parse(cleanText);
      } catch (parseErr) {
        console.error('Error parseando JSON de Gemini:', cleanText, parseErr);
        throw new Error('La respuesta de la IA no pudo ser interpretada.');
      }

      if (Array.isArray(matchedIds)) {
        const filtered = allProducts.filter(p => matchedIds.includes(p.id));
        setProductos(filtered);
      } else {
        setProductos([]);
      }
      setAppliedAiQuery(aiQuery);
    } catch (err) {
      console.error('Error en búsqueda con IA:', err);
      setError(err.message || 'Ocurrió un error al procesar la búsqueda con IA.');
      setProductos([]);
    } finally {
      setIsAiSearching(false);
    }
  };

  const handleClearAiSearch = () => {
    setAiQuery('');
    setAppliedAiQuery('');
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

      <AppTopbar
        collapsible
        showNotifications
        trailing={(
          <Link
            to="/login?cambiar=1"
            className="kodda-link-cuenta"
            title="Para demo con dos cuentas: esta ventana + otra en modo privado (misma URL)"
          >
            Cambiar de cuenta
          </Link>
        )}
      >
        {showAdminPreviewBar ? (
          <Link to="/admin" className="kodda-btn-accent-outline" title="Ir al panel de administración">
            Panel admin
          </Link>
        ) : null}
        <Link to="/publicar" className="kodda-btn-sell">
          <span className="kodda-btn-sell-icon" aria-hidden="true">+</span>
          Vender prenda
        </Link>
      </AppTopbar>

      <main className="kodda-home-main">
        <div className="kodda-catalog-intro">
          <header className="kodda-catalog-hero">
            <div className="kodda-catalog-hero-copy">
              <p className="kodda-catalog-hero-eyebrow">Tu placard inteligente</p>
              <h1 className="kodda-hello">Hola, {user?.username || 'explorador'}</h1>
              <p className="kodda-hello-sub">
                Descubrí moda circular con fotos reales, filtros por talle y disponibilidad al instante.
              </p>
            </div>
          </header>

          <ProductFilters
            values={filterDraft}
            appliedFilters={appliedFilters}
            onChange={setFilterDraft}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
            onRemoveFilter={handleRemoveFilter}
            loading={loading}
            resultCount={loading ? null : productos.length}
            categoryOptions={activeCategories}
            brandOptions={activeBrands}
            aiQuery={aiQuery}
            onChangeAiQuery={setAiQuery}
            onAiSearch={handleAiSearch}
            onClearAiSearch={handleClearAiSearch}
            isAiSearching={isAiSearching}
            appliedAiQuery={appliedAiQuery}
          />
        </div>

        {!hasActiveCatalogFilters(appliedFilters) && !appliedAiQuery && (
          <PersonalRecommendationsSection />
        )}

        <div className="kodda-section-title">
          <h2>Prendas disponibles</h2>
          <span className="kodda-badge-ia">
            {appliedAiQuery ? 'Búsqueda IA' : hasActiveCatalogFilters(appliedFilters) ? 'Filtrado' : 'Catálogo en vivo'}
          </span>
        </div>

        {loading ? (
          <CatalogSkeleton />
        ) : error ? (
          <div className="kodda-catalog-empty kodda-catalog-empty--error">
            <p>{error}</p>
          </div>
        ) : productos.length === 0 ? (
          <div className="kodda-catalog-empty">
            <p>
              {appliedAiQuery
                ? 'ninguna publicacion coincide con lo requerido'
                : hasActiveCatalogFilters(appliedFilters)
                  ? 'No hay prendas que coincidan con los filtros'
                  : 'No hay prendas disponibles por el momento'}
            </p>
          </div>
        ) : (
          <div className="kodda-grid" role="list">
            {productos.map((producto) => (
              <ProductCard key={producto.id} producto={producto} showLink={true} />
            ))}
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

      </main>

      <nav className="kodda-mobile-bottom-nav" aria-label="Accesos rápidos">
        <Link to="/" className="kodda-mobile-bottom-nav-item kodda-mobile-bottom-nav-item--active">
          <span aria-hidden="true">🏠</span>
          Inicio
        </Link>
        <Link to="/carrito" className="kodda-mobile-bottom-nav-item">
          <span aria-hidden="true">🛒</span>
          Carrito
          {cantidadCarrito > 0 ? <span className="kodda-mobile-bottom-nav-badge">{cantidadCarrito}</span> : null}
        </Link>
        <Link to="/publicar" className="kodda-mobile-bottom-nav-item">
          <span aria-hidden="true">➕</span>
          Vender
        </Link>
        <Link to="/perfil" className="kodda-mobile-bottom-nav-item">
          <span aria-hidden="true">👤</span>
          Perfil
        </Link>
      </nav>

      <footer className="kodda-home-footer">Kodda — moda circular inteligente · Prototipo de producto</footer>
    </div>
  );
}
