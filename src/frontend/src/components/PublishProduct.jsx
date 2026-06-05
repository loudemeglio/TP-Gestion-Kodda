import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KoddaLogo } from './KoddaLogo';
import { api } from '../api/client';
import { findBrandIdByName, findCategoryIdByName, useActiveCatalog } from '../hooks/useActiveCatalog';

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const GEMINI_URL = GEMINI_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`
  : null;

const VALID_CONDITIONS = new Set(['nuevo', 'como_nuevo', 'bueno', 'regular']);

const CONDITION_LABELS = {
  nuevo: 'Nuevo',
  como_nuevo: 'Como nuevo',
  bueno: 'Bueno',
  regular: 'Regular',
};

function formatArs(amount) {
  return Number(amount).toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildGeminiPrompt(categoryNames, brandNames) {
  return `Analizá esta prenda de ropa de segunda mano para una plataforma argentina (Kodda).
Respondé SOLO un JSON válido (sin markdown ni texto extra) con estas claves:
- name: nombre del producto en español (ej. "Campera de cuero negra")
- description: descripción breve en español rioplatense, máximo 120 caracteres
- category: una sola categoría de esta lista: ${categoryNames}
- brand: marca visible o inferida; si no hay, "desconocida". Preferí marcas de esta lista si aplica: ${brandNames}
- condition: uno de nuevo, como_nuevo, bueno, regular (estado de la prenda)
- size: talle estimado (ej. M, L, 42) o "desconocido"
- suggested_price: número entero en pesos argentinos (ARS) o null
- can_suggest_price: true solo si identificás con confianza la marca, el tipo de prenda y el estado
- price_rationale: una línea en español explicando el rango de precio en el mercado de segunda mano en Argentina (2025/2026)

Reglas para el precio en ARS:
- Usá precios realistas del mercado argentino de ropa usada (Mercado Libre, redes locales), no USD.
- Marcas premium valen más que genéricas.
- Ajustá por estado: nuevo ~100%, como_nuevo ~85%, bueno ~70%, regular ~50% del precio de referencia usado.
- Si no podés identificar marca + categoría + estado con confianza: can_suggest_price false y suggested_price null.`;
}

export default function PublishProduct() {
  const navigate = useNavigate();
  const { brands, categories, loading: catalogLoading, error: catalogError } = useActiveCatalog();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [brandId, setBrandId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [size, setSize] = useState('');
  const [mainImageUrl, setMainImageUrl] = useState('');

  const [iaFile, setIaFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [iaError, setIaError] = useState('');
  const [iaAnalysisDone, setIaAnalysisDone] = useState(false);

  const [suggestedPrice, setSuggestedPrice] = useState(null);
  const [canSuggestPrice, setCanSuggestPrice] = useState(false);
  const [detectedCondition, setDetectedCondition] = useState('');
  const [detectedBrandName, setDetectedBrandName] = useState('');
  const [priceRationale, setPriceRationale] = useState('');
  const [priceFromSuggestion, setPriceFromSuggestion] = useState(false);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function resetPriceSuggestion() {
    setSuggestedPrice(null);
    setCanSuggestPrice(false);
    setDetectedCondition('');
    setDetectedBrandName('');
    setPriceRationale('');
    setPriceFromSuggestion(false);
    setIaAnalysisDone(false);
  }

  function applyParsedAnalysis(parsed) {
    if (parsed.name) setName(parsed.name);
    if (parsed.description) setDescription(parsed.description);

    if (parsed.category) {
      const matchedCategoryId = findCategoryIdByName(categories, parsed.category);
      if (matchedCategoryId) setCategoryId(matchedCategoryId);
    }

    if (parsed.brand) {
      setDetectedBrandName(parsed.brand);
      const matchedBrandId = findBrandIdByName(brands, parsed.brand);
      if (matchedBrandId) setBrandId(matchedBrandId);
    }

    if (parsed.size && parsed.size !== 'desconocido') {
      setSize(parsed.size);
    }

    const condition = typeof parsed.condition === 'string' ? parsed.condition.toLowerCase() : '';
    const hasValidCondition = VALID_CONDITIONS.has(condition);
    if (hasValidCondition) {
      setDetectedCondition(condition);
    } else {
      setDetectedCondition('');
    }

    const wantsSuggestion = parsed.can_suggest_price === true;
    const priceNum = Number(parsed.suggested_price);
    const hasValidPrice = !Number.isNaN(priceNum) && priceNum > 0;

    if (wantsSuggestion && hasValidCondition && hasValidPrice) {
      setSuggestedPrice(Math.round(priceNum));
      setCanSuggestPrice(true);
      setPriceRationale(
        typeof parsed.price_rationale === 'string' ? parsed.price_rationale.trim() : ''
      );
    } else {
      setSuggestedPrice(null);
      setCanSuggestPrice(false);
      setPriceRationale('');
    }

    setIaAnalysisDone(true);
  }

  function handleIaFileChange(file) {
    setIaFile(file);
    resetPriceSuggestion();
    setIaError('');
  }

  async function handleAnalyzeIA() {
    if (!iaFile) return;
    setAnalyzing(true);
    setIaError('');
    resetPriceSuggestion();

    try {
      const base64 = await fileToBase64(iaFile);
      const mimeType = iaFile.type || 'image/jpeg';
      const categoryNames = categories.map((c) => c.name).join(', ');
      const brandNames = brands.map((b) => b.name).join(', ');

      const body = {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64,
                },
              },
              {
                text: buildGeminiPrompt(categoryNames, brandNames || 'cualquier marca'),
              },
            ],
          },
        ],
      };

      const resp = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        throw new Error(`Gemini respondió con status ${resp.status}`);
      }

      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo interpretar la respuesta de la IA.');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      applyParsedAnalysis(parsed);
    } catch (err) {
      console.error('Error IA:', err);
      setIaError('No se pudo analizar la imagen. Completá los datos manualmente.');
      setIaAnalysisDone(false);
    } finally {
      setAnalyzing(false);
    }
  }

  function handleUseSuggestedPrice() {
    if (suggestedPrice == null) return;
    setPrice(String(suggestedPrice));
    setPriceFromSuggestion(true);
  }

  function handlePriceChange(value) {
    setPrice(value);
    setPriceFromSuggestion(false);
  }

  const categoryLabel =
    categories.find((c) => String(c.id) === categoryId)?.name || '';
  const suggestionMetaParts = [
    detectedBrandName || brands.find((b) => String(b.id) === brandId)?.name,
    categoryLabel,
    detectedCondition ? `Estado: ${CONDITION_LABELS[detectedCondition] || detectedCondition}` : '',
  ].filter(Boolean);

  function validateForm() {
    const missing = [];
    if (!name.trim()) missing.push('Nombre');
    if (!description.trim()) missing.push('Descripción');
    if (!price) missing.push('Precio');
    if (stock === '' || stock === null || stock === undefined) missing.push('Stock');
    if (!brandId) missing.push('Marca');
    if (!categoryId) missing.push('Categoría');
    if (!size.trim()) missing.push('Talle');

    if (missing.length > 0) {
      return `Faltan campos obligatorios: ${missing.join(', ')}.`;
    }

    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return 'El precio debe ser mayor a 0.';
    }

    const stockNum = Number(stock);
    if (isNaN(stockNum) || stockNum < 0) {
      return 'El stock no puede ser negativo.';
    }

    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      stock: Number(stock),
      brand_id: Number(brandId),
      category_id: Number(categoryId),
      size: size.trim(),
    };

    const imageUrl = mainImageUrl.trim();
    if (imageUrl) {
      payload.main_image_url = imageUrl;
    }

    setSubmitting(true);
    try {
      await api.post('/api/catalog/products', payload);
      navigate('/', {
        replace: true,
        state: {
          publishFlash: '¡Producto publicado exitosamente! Ya está disponible en el catálogo.',
        },
      });
    } catch (err) {
      const resp = err.response;
      if (!resp) {
        setError('No hay conexión con el servidor.');
      } else if (resp.data) {
        const detail = resp.data.detail;
        if (typeof detail === 'string') {
          setError(detail);
        } else if (Array.isArray(detail)) {
          const messages = detail.map((d) => {
            if (d?.msg && d?.loc?.length) {
              if (d.loc.includes('price')) return 'Precio inválido (debe ser mayor a 0).';
              if (d.loc.includes('stock')) return 'Stock inválido (no puede ser negativo).';
              if (d.loc.includes('name')) return 'Nombre es obligatorio.';
              if (d.loc.includes('description')) return 'Descripción es obligatoria.';
              if (d.loc.includes('brand_id')) return 'Marca inválida o no disponible.';
              if (d.loc.includes('category_id')) return 'Categoría inválida o no disponible.';
              if (d.loc.includes('size')) return 'Talle es obligatorio.';
              return d.msg;
            }
            return typeof d === 'string' ? d : '';
          });
          setError(messages.filter(Boolean).join(' '));
        } else {
          setError('No se pudo publicar el producto.');
        }
      } else {
        setError('No se pudo publicar el producto.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="kodda-home">
      <div className="kodda-auth-root" style={{ minHeight: 'auto', flex: 1 }}>
      <aside className="kodda-auth-brand" aria-hidden="false">
        <div className="kodda-auth-brand-inner">
          <KoddaLogo />
          <p className="kodda-auth-eyebrow">Catálogo C2C / B2C</p>
          <h1 className="kodda-auth-headline">Publicá tu prenda en Kodda.</h1>
          <p className="kodda-auth-lead">
            Subí una foto y la IA completa los datos por vos. Revisá, ajustá el precio y publicá — en
            segundos tu prenda está en el catálogo.
          </p>
          <div className="kodda-auth-pills">
            <span className="kodda-pill">Autocompletado IA</span>
            <span className="kodda-pill">Precio sugerido</span>
            <span className="kodda-pill">Catálogo instantáneo</span>
          </div>
        </div>
        <p className="kodda-auth-footer-note">
          Kodda conecta vendedores y compradores; vos tenés la última palabra sobre cada publicación.
        </p>
      </aside>

      <main className="kodda-auth-panel">
        <div className="kodda-auth-card">
          <h1>Publicar prenda</h1>
          <p className="kodda-auth-sub">Completá los datos de tu producto o dejá que la IA te ayude.</p>

          {catalogError ? <p className="kodda-auth-error">{catalogError}</p> : null}

          <form onSubmit={handleSubmit}>
            {error ? <p className="kodda-auth-error">{error}</p> : null}

            {GEMINI_URL ? (
              <>
                <label className="kodda-field">
                  <span>Foto de la prenda (opcional)</span>
                  <input
                    className="kodda-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleIaFileChange(e.target.files?.[0] || null)}
                  />
                </label>

                <button
                  type="button"
                  className="kodda-btn-accent-outline"
                  onClick={handleAnalyzeIA}
                  disabled={!iaFile || analyzing}
                  style={{ marginBottom: '1rem' }}
                >
                  {analyzing ? 'Analizando…' : 'Analizar con IA'}
                </button>

                {iaError ? <p className="kodda-auth-error">{iaError}</p> : null}
              </>
            ) : null}

            <label className="kodda-field">
              <span>Nombre del producto</span>
              <input
                className="kodda-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Campera de cuero negra"
                required
              />
            </label>

            <label className="kodda-field">
              <span>Descripción</span>
              <textarea
                className="kodda-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describí tu prenda (material, estado, detalles…)"
                required
                rows={3}
              />
            </label>

            {iaAnalysisDone && canSuggestPrice ? (
              <div className="kodda-price-suggestion" role="status" aria-live="polite">
                <p className="kodda-price-suggestion-label">Precio sugerido</p>
                <p className="kodda-price-suggestion-amount">${formatArs(suggestedPrice)}</p>
                {suggestionMetaParts.length > 0 ? (
                  <p className="kodda-price-suggestion-meta">{suggestionMetaParts.join(' · ')}</p>
                ) : null}
                <p className="kodda-price-suggestion-hint">
                  {priceRationale ||
                    'Basado en tendencias del mercado de segunda mano en Argentina.'}
                </p>
                <button
                  type="button"
                  className="kodda-btn-accent-outline kodda-price-suggestion-btn"
                  onClick={handleUseSuggestedPrice}
                >
                  Usar este precio
                </button>
              </div>
            ) : null}

            {iaAnalysisDone && !canSuggestPrice && !iaError ? (
              <p className="kodda-price-suggestion-manual" role="status">
                No hay datos suficientes para estimar un precio. Ingresalo manualmente.
              </p>
            ) : null}

            <label className="kodda-field">
              <span>
                Precio (ARS)
                {priceFromSuggestion ? (
                  <span className="kodda-price-suggestion-badge">Precio aceptado de la sugerencia</span>
                ) : null}
              </span>
              <input
                className="kodda-input"
                type="number"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="ej. 15000"
                min="0.01"
                step="0.01"
                required
              />
            </label>

            <label className="kodda-field">
              <span>Stock inicial</span>
              <input
                className="kodda-input"
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="ej. 1"
                min="0"
                step="1"
                required
              />
            </label>

            <label className="kodda-field">
              <span>Marca</span>
              <select
                className="kodda-input"
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                required
                disabled={catalogLoading || brands.length === 0}
              >
                <option value="">
                  {catalogLoading ? 'Cargando marcas…' : 'Seleccioná una marca'}
                </option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="kodda-field">
              <span>Categoría</span>
              <select
                className="kodda-input"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                disabled={catalogLoading || categories.length === 0}
              >
                <option value="">
                  {catalogLoading ? 'Cargando categorías…' : 'Seleccioná una categoría'}
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="kodda-field">
              <span>Talle</span>
              <input
                className="kodda-input"
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="ej. M, L, 42, Único"
                maxLength={20}
                required
              />
            </label>

            <label className="kodda-field">
              <span>Imagen principal URL (opcional)</span>
              <input
                className="kodda-input"
                type="text"
                value={mainImageUrl}
                onChange={(e) => setMainImageUrl(e.target.value)}
                placeholder="https://… o dejá en blanco"
              />
            </label>

            <button className="kodda-btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Publicando…' : 'Publicar prenda'}
            </button>
          </form>

          <div className="kodda-auth-links">
            <Link to="/">← Volver al inicio</Link>
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
