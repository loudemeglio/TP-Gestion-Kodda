import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import '../styles/chat.css';

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const GEMINI_URL = GEMINI_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`
  : null;

// Detectar intención del usuario y buscar productos específicos
async function searchProductsByIntent(userMessage) {
  try {
    const msg = userMessage.toLowerCase();

    // Palabras clave por categoría
    const categoryMap = {
      camperas: 'Camperas',
      campera: 'Camperas',
      remeras: 'Remeras',
      remera: 'Remeras',
      pantalones: 'Pantalones',
      pantalón: 'Pantalones',
      vestidos: 'Vestidos',
      vestido: 'Vestidos',
      calzado: 'Calzado',
      zapatos: 'Calzado',
      accesorios: 'Accesorios',
      accesorio: 'Accesorios',
    };

    // Detectar categoría solicitada
    let categoryFilter = null;
    for (const [keyword, category] of Object.entries(categoryMap)) {
      if (msg.includes(keyword)) {
        categoryFilter = category;
        break;
      }
    }

    // Buscar en la API
    const params = new URLSearchParams({ limit: 15 });
    if (categoryFilter) {
      params.append('category', categoryFilter);
    }

    const res = await api.get(`/api/catalog/products?${params.toString()}`).catch(() => null);
    return res?.data || [];
  } catch (err) {
    console.warn('Error búsqueda:', err);
    return [];
  }
}

// Formatear productos para el contexto
function formatProductsForContext(products) {
  if (!products || products.length === 0) return 'No hay prendas disponibles.';

  return products
    .slice(0, 8)
    .map(
      (p) =>
        `- ${p.name} (${p.category}, talle ${p.size}, $${Math.floor(p.price)} ARS, ${p.condition || 'buen estado'})`
    )
    .join('\n');
}

async function buildChatPromptWithContext() {
  try {
    // Obtener datos reales del catálogo
    const productsRes = await api.get('/api/catalog/products?limit=50').catch(() => null);
    const products = productsRes?.data || [];

    // Agrupar por categoría, marca, talle, rango de precio
    const categories = {};
    const brands = new Set();
    const sizes = new Set();
    const priceRanges = { min: Infinity, max: 0 };

    products.forEach((p) => {
      if (p.category) {
        if (!categories[p.category]) categories[p.category] = [];
        categories[p.category].push(p);
      }
      if (p.brand) brands.add(p.brand);
      if (p.size) sizes.add(p.size);
      if (p.price) {
        priceRanges.min = Math.min(priceRanges.min, p.price);
        priceRanges.max = Math.max(priceRanges.max, p.price);
      }
    });

    const categoryStats = Object.keys(categories)
      .map((cat) => `${cat}: ${categories[cat].length} prendas`)
      .join(' | ');

    const brandsList = Array.from(brands).slice(0, 10).join(', ');
    const sizesList = Array.from(sizes).sort().join(', ');
    const priceInfo =
      priceRanges.min !== Infinity
        ? `$${Math.floor(priceRanges.min)} - $${Math.floor(priceRanges.max)} ARS`
        : 'variable';

    return `Sos Kodda, asistente de moda circular de plataforma Kodda (Argentina).
SOLO responde sobre prendas/vendedores del CATÁLOGO REAL. No información general.

CATÁLOGO ACTUAL:
Total: ${products.length}+ prendas disponibles
Categorías: ${categoryStats}
Marcas: ${brandsList}
Talles: ${sizesList}
Rango precios: ${priceInfo}

REGLAS:
✓ "En nuestro catálogo tenemos..." - Cita lo real
✓ "Encontramos X prendas de [categoría]..." - Datos concretos
✓ Recomendaciones de talle basadas en talles disponibles
✓ Si no hay en stock → "No tenemos disponible ahora"
✗ NO inventes productos/precios/vendedores
✗ NO des información general (solo lo que existe en BD)

Responde conciso, amigable, rioplatense.`;
  } catch (err) {
    console.warn('Error contexto:', err);
    return `Sos Kodda. Responde SOLO sobre prendas/vendedores reales del catálogo Kodda.
Si no hay datos → "No tenemos eso disponible". Conciso, amigable.`;
  }
}

export default function ChatBot({ onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      text: '¡Hola! Soy Kodda, tu asistente de moda circular. Puedo ayudarte a encontrar prendas, recomendarte talles, o contarte sobre vendedores. ¿En qué te puedo ayudar?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cargar prompt del sistema al montar el componente
  useEffect(() => {
    (async () => {
      const prompt = await buildChatPromptWithContext();
      setSystemPrompt(prompt);
    })();
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !GEMINI_URL || !systemPrompt) {
      if (!GEMINI_URL) {
        setError('IA no configurada. Falta REACT_APP_GEMINI_API_KEY.');
      }
      if (!systemPrompt && GEMINI_URL) {
        setError('Cargando contexto de la plataforma…');
      }
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue('');
    setError('');

    // Add user message to state
    const userMsg = {
      id: messages.length + 1,
      role: 'user',
      text: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Buscar productos específicos según la pregunta
      const foundProducts = await searchProductsByIntent(userMessage);
      const productsContext =
        foundProducts.length > 0
          ? `PRODUCTOS ENCONTRADOS:\n${formatProductsForContext(foundProducts)}`
          : '';

      // Limitar historial
      const recentMessages = messages.slice(-6);
      const conversationContext = recentMessages
        .map(
          (msg) =>
            `${msg.role === 'assistant' ? 'Kodda' : 'Usuario'}: ${msg.text}`
        )
        .join('\n');

      const fullPrompt = `${systemPrompt}

${productsContext}

--- Conversación ---
${conversationContext}
Usuario: ${userMessage}

Kodda:`;

      const body = {
        contents: [
          {
            parts: [
              {
                text: fullPrompt,
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
        const errorData = await resp.json().catch(() => ({}));
        if (resp.status === 503) {
          throw new Error('Servidor de IA sobrecargado. Intentá en unos segundos.');
        }
        throw new Error(
          errorData.error?.message ||
            `Error ${resp.status}: no se pudo procesar tu pregunta.`
        );
      }

      const data = await resp.json();
      const assistantText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!assistantText) {
        throw new Error('No se pudo interpretar la respuesta.');
      }

      const assistantMsg = {
        id: messages.length + 2,
        role: 'assistant',
        text: assistantText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Error IA:', err);
      setError(
        err.message ||
          'No se pudo procesar tu pregunta. Intentá de nuevo.'
      );
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="kodda-chat-container">
      <div className="kodda-chat-header">
        <div className="kodda-chat-title">
          <h2>Chat Kodda</h2>
          <p className="kodda-chat-subtitle">Tu asistente de moda circular</p>
        </div>
        <button
          className="kodda-chat-close"
          onClick={onClose}
          aria-label="Cerrar chat"
          title="Cerrar"
        >
          ✕
        </button>
      </div>

      <div className="kodda-chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`kodda-chat-message kodda-chat-message--${msg.role}`}
          >
            <div className="kodda-chat-message-avatar" aria-hidden="true">
              {msg.role === 'assistant' ? '🧠' : '👤'}
            </div>
            <div className="kodda-chat-message-content">
              <p className="kodda-chat-message-text">{msg.text}</p>
              <span className="kodda-chat-message-time">
                {msg.timestamp.toLocaleTimeString('es-AR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="kodda-chat-message kodda-chat-message--assistant">
            <div className="kodda-chat-message-avatar" aria-hidden="true">
              🧠
            </div>
            <div className="kodda-chat-message-content">
              <div className="kodda-chat-loading">
                <span className="kodda-chat-dot"></span>
                <span className="kodda-chat-dot"></span>
                <span className="kodda-chat-dot"></span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="kodda-chat-error">
            <p>{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="kodda-chat-footer">
        <div className="kodda-chat-input-wrapper">
          <textarea
            className="kodda-chat-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              !systemPrompt
                ? 'Cargando contexto de la plataforma…'
                : 'Preguntá sobre prendas, vendedores, talles…'
            }
            disabled={loading || !GEMINI_URL || !systemPrompt}
            rows={2}
          />
          <button
            className="kodda-chat-send"
            onClick={handleSendMessage}
            disabled={loading || !inputValue.trim() || !GEMINI_URL || !systemPrompt}
            aria-label="Enviar mensaje"
            title="Enviar (Enter)"
          >
            ✉️
          </button>
        </div>
        <p className="kodda-chat-hint">
          Kodda puede ayudarte con búsquedas, recomendaciones de talle y
          preguntas sobre vendedores.
        </p>
      </div>
    </div>
  );
}
