import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Visor de imagen con zoom al hover (desktop) y lightbox al tocar/clic.
 * Solo mejora la presentación; no altera datos del producto.
 */
export default function ProductImageViewer({ src, alt, className = '' }) {
  const containerRef = useRef(null);
  const [zooming, setZooming] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleMove = useCallback((event) => {
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setLightboxOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [lightboxOpen]);

  if (!src) return null;

  return (
    <>
      <button
        type="button"
        ref={containerRef}
        className={`kodda-image-viewer ${className}${zooming ? ' kodda-image-viewer--zoom' : ''}`}
        onMouseEnter={() => setZooming(true)}
        onMouseLeave={() => {
          setZooming(false);
          setOrigin('50% 50%');
        }}
        onMouseMove={handleMove}
        onClick={() => setLightboxOpen(true)}
        aria-label={`Ampliar imagen de ${alt}`}
      >
        <img
          src={src}
          alt={alt}
          className="kodda-image-viewer-img"
          style={{ transformOrigin: origin }}
          loading="eager"
          decoding="async"
        />
        <span className="kodda-image-viewer-hint" aria-hidden="true">
          Tocá para ampliar · Pasá el mouse para zoom
        </span>
      </button>

      {lightboxOpen ? (
        <div
          className="kodda-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Imagen ampliada: ${alt}`}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="kodda-lightbox-close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Cerrar imagen ampliada"
          >
            ✕
          </button>
          <img src={src} alt={alt} className="kodda-lightbox-img" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </>
  );
}
