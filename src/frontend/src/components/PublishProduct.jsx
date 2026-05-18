import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KoddaLogo } from './KoddaLogo';
import { api } from '../api/client';

const CATEGORIES = ['Camperas', 'Remeras', 'Pantalones', 'Vestidos', 'Calzado', 'Accesorios', 'Otros'];

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const GEMINI_URL = GEMINI_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`
  : null;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // result is "data:<mime>;base64,<data>"
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PublishProduct() {
  const navigate = useNavigate();

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('');
  const [mainImageUrl, setMainImageUrl] = useState('');

  // IA
  const [iaFile, setIaFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [iaError, setIaError] = useState('');

  // Submit
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleAnalyzeIA() {
    if (!iaFile) return;
    setAnalyzing(true);
    setIaError('');
    try {
      const base64 = await fileToBase64(iaFile);
      const mimeType = iaFile.type || 'image/jpeg';

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
                text: 'Analizá esta prenda de ropa y respondé en JSON con estas claves: name (nombre del producto, ej: \'Campera de cuero negra\'), description (descripción breve en español, máx 120 caracteres), category (una sola categoría de: Camperas, Remeras, Pantalones, Vestidos, Calzado, Accesorios, Otros). Solo el JSON, sin texto extra.',
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

      // Extract JSON from the response (it may be wrapped in ```json ... ```)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo interpretar la respuesta de la IA.');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.name) setName(parsed.name);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.category && CATEGORIES.includes(parsed.category)) {
        setCategory(parsed.category);
      }
    } catch (err) {
      console.error('Error IA:', err);
      setIaError('No se pudo analizar la imagen. Completá los datos manualmente.');
    } finally {
      setAnalyzing(false);
    }
  }

  function validateForm() {
    const missing = [];
    if (!name.trim()) missing.push('Nombre');
    if (!description.trim()) missing.push('Descripción');
    if (!price) missing.push('Precio');
    if (stock === '' || stock === null || stock === undefined) missing.push('Stock');
    if (!category) missing.push('Categoría');

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
      category,
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
              if (d.loc.includes('category')) return 'Categoría es obligatoria.';
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
    <div className="kodda-auth-root">
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

          <form onSubmit={handleSubmit}>
            {error ? <p className="kodda-auth-error">{error}</p> : null}

            {/* IA Section — only shown if API key is available */}
            {GEMINI_URL ? (
              <>
                <p className="kodda-auth-optional-note">
                  <span className="kodda-badge-ia">IA · Gemini</span>{' '}
                  Subí una foto y la IA completa los datos automáticamente.
                </p>

                <label className="kodda-field">
                  <span>Foto de la prenda (opcional)</span>
                  <input
                    className="kodda-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setIaFile(e.target.files?.[0] || null)}
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

            {/* Product fields */}
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

            <label className="kodda-field">
              <span>Precio ($)</span>
              <input
                className="kodda-input"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
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
              <span>Categoría</span>
              <select
                className="kodda-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">Seleccioná una categoría</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
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
  );
}
