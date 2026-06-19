import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import '../styles/chat.css';

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const GEMINI_URL = GEMINI_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
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

function renderAssistantMessage(text) {
  const lines = text.split('\n');
  const hasList = lines.some((line) => /^[\s]*[-•*]\s+/.test(line));

  if (!hasList) {
    return <p className="kodda-chat-message-text">{text}</p>;
  }

  return (
    <div className="kodda-chat-message-text kodda-chat-message-text--formatted">
      {lines.map((line, i) => {
        const listMatch = line.match(/^[\s]*[-•*]\s+(.*)/);
        if (listMatch) {
          return (
            <div key={i} className="kodda-chat-list-item">
              <span className="kodda-chat-list-bullet" aria-hidden="true">
                •
              </span>
              <span>{listMatch[1]}</span>
            </div>
          );
        }
        if (line.trim() === '') {
          return <div key={i} className="kodda-chat-list-spacer" />;
        }
        return (
          <p key={i} className="kodda-chat-message-paragraph">
            {line}
          </p>
        );
      })}
    </div>
  );
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
✓ Al sugerir productos, listalos uno por línea con guión (-) al inicio
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
  const { user } = useAuth();
  const storageKey = user ? `kodda_chat_messages_${user.username || user.id}` : 'kodda_chat_messages_guest';
  const openStorageKey = user ? `kodda_chat_open_${user.username || user.id}` : 'kodda_chat_open_guest';

  const [isOpen, setIsOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(openStorageKey);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Cargar historial y prompt del sistema al montar el componente/cambiar de usuario
  useEffect(() => {
    if (!user) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setMessages(
          parsed.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }))
        );
      } else {
        setMessages([
          {
            id: 1,
            role: 'assistant',
            text: '¡Hola! Soy Kodda, tu asistente de moda circular. Puedo ayudarte a encontrar prendas, recomendarte talles, o contarte sobre vendedores. ¿En qué te puedo ayudar?',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (e) {
      console.warn('Error loading chat messages:', e);
      setMessages([
        {
          id: 1,
          role: 'assistant',
          text: '¡Hola! Soy Kodda, tu asistente de moda circular. Puedo ayudarte a encontrar prendas, recomendarte talles, o contarte sobre vendedores. ¿En qué te puedo ayudar?',
          timestamp: new Date(),
        },
      ]);
    }

    (async () => {
      const prompt = await buildChatPromptWithContext();
      setSystemPrompt(prompt);
    })();
  }, [user, storageKey]);

  // Guardar historial en localStorage
  useEffect(() => {
    if (messages.length > 0 && user) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch (e) {
        console.warn('Error saving chat messages:', e);
      }
    }
  }, [messages, user, storageKey]);

  const handleToggleOpen = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    try {
      localStorage.setItem(openStorageKey, String(nextOpen));
    } catch (e) {
      console.warn('Error saving chat open state:', e);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    try {
      localStorage.setItem(openStorageKey, 'false');
    } catch (e) {
      console.warn('Error saving chat open state:', e);
    }
    if (onClose) {
      onClose();
    }
  };

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
    <>
      {/* Botón Burbuja Flotante de Chat */}
      <button
        className={`kodda-chat-bubble-trigger ${isOpen ? 'open' : ''}`}
        onClick={handleToggleOpen}
        aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat'}
        title="Chat Kodda"
      >
        <span className="kodda-chat-bubble-icon">{isOpen ? '✕' : '💬'}</span>
      </button>

      {/* Ventana de Chat Flotante */}
      {isOpen && (
        <div className="kodda-chat-floating-widget">
          <div className="kodda-chat-header">
            <div className="kodda-chat-title">
              <h2>Chat Kodda</h2>
              <p className="kodda-chat-subtitle">Tu asistente de moda circular</p>
            </div>
            <button
              className="kodda-chat-close"
              onClick={handleClose}
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
                  {msg.role === 'assistant' ? (
                    renderAssistantMessage(msg.text)
                  ) : (
                    <p className="kodda-chat-message-text">{msg.text}</p>
                  )}
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
      )}
    </>
  );
}
