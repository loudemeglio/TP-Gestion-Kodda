import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatApiError } from '../utils/apiError';
import { KoddaLogo } from './KoddaLogo';
import { findBrandIdByName, findCategoryIdByName, useActiveCatalog } from '../hooks/useActiveCatalog';
import '../styles/my-products.css';

// Modal de confirmación
function ConfirmModal({ title, message, onConfirm, onCancel, isLoading, isDanger = false }) {
  return (
    <div className="kodda-modal-overlay">
      <div className="kodda-modal">
        <div className="kodda-modal-head">
          <div className="kodda-modal-icon">{isDanger ? '⚠️' : '❓'}</div>
          <h2 className="kodda-modal-title">{title}</h2>
        </div>
        <div className="kodda-modal-body">
          <p>{message}</p>
          <div className="kodda-modal-actions">
            <button
              type="button"
              className="kodda-btn-ghost"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={isDanger ? 'kodda-btn-danger-outline' : 'kodda-btn-primary'}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Procesando…' : isDanger ? 'Eliminar' : 'Continuar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, brands, categories, onEdit, onEditCancel, isEditing, editData, onEditChange, onSave, isSaving, onDelete, onTogglePause }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPauseToggling, setIsPauseToggling] = useState(false);

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    try {
      await onDelete(product.id);
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Error eliminando:', err);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleTogglePause() {
    setIsPauseToggling(true);
    try {
      await onTogglePause(product.id, product.is_paused);
    } finally {
      setIsPauseToggling(false);
    }
  }

  if (isEditing) {
    return (
      <div className="kodda-product-card kodda-product-card--editing">
        <div className="kodda-product-card-header">
          <h3>Editar publicación</h3>
          <button
            type="button"
            className="kodda-btn-ghost-small"
            onClick={onEditCancel}
            disabled={isSaving}
          >
            ✕
          </button>
        </div>

        <form className="kodda-product-edit-form" onSubmit={(e) => {
          e.preventDefault();
          onSave(product.id);
        }}>
          <label className="kodda-field">
            <span>Nombre</span>
            <input
              className="kodda-input"
              type="text"
              value={editData.name}
              onChange={(e) => onEditChange('name', e.target.value)}
              required
            />
          </label>

          <label className="kodda-field">
            <span>Descripción</span>
            <textarea
              className="kodda-input"
              value={editData.description}
              onChange={(e) => onEditChange('description', e.target.value)}
              required
              rows={3}
            />
          </label>

          <label className="kodda-field">
            <span>Precio ($)</span>
            <input
              className="kodda-input"
              type="number"
              value={editData.price}
              onChange={(e) => onEditChange('price', e.target.value)}
              min="0.01"
              step="0.01"
              required
            />
          </label>

          <label className="kodda-field">
            <span>Stock</span>
            <input
              className="kodda-input"
              type="number"
              value={editData.stock}
              onChange={(e) => onEditChange('stock', e.target.value)}
              min="0"
              step="1"
              required
            />
          </label>

          <label className="kodda-field">
            <span>Marca</span>
            <select
              className="kodda-input"
              value={editData.brand_id || ''}
              onChange={(e) => onEditChange('brand_id', e.target.value)}
              required
            >
              <option value="">Seleccioná una marca</option>
              {brands.map((brand) => (
                <option key={brand.id} value={String(brand.id)}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>

          <label className="kodda-field">
            <span>Categoría</span>
            <select
              className="kodda-input"
              value={editData.category_id || ''}
              onChange={(e) => onEditChange('category_id', e.target.value)}
              required
            >
              <option value="">Seleccioná una categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
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
              value={editData.size || ''}
              onChange={(e) => onEditChange('size', e.target.value)}
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
              value={editData.main_image_url || ''}
              onChange={(e) => onEditChange('main_image_url', e.target.value)}
              placeholder="https://…"
            />
          </label>

          <div className="kodda-product-edit-actions">
            <button
              type="submit"
              className="kodda-btn-primary"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              className="kodda-btn-secondary"
              onClick={onEditCancel}
              disabled={isSaving}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="kodda-product-card">
        <div className="kodda-product-card-image">
          {product.main_image_url ? (
            <img src={product.main_image_url} alt={product.name} />
          ) : (
            <div className="kodda-product-card-image-placeholder">
              📷 Sin imagen
            </div>
          )}
          {product.is_paused && (
            <div className="kodda-product-paused-overlay">
              <span className="kodda-product-paused-badge">⏸ Pausado</span>
            </div>
          )}
        </div>

        <div className="kodda-product-card-content">
          <div className="kodda-product-card-header">
            <h3>{product.name}</h3>
            <div className="kodda-product-badges">
              {product.brand ? <span className="kodda-product-badge">{product.brand}</span> : null}
              <span className="kodda-product-badge">{product.category}</span>
            </div>
          </div>

          <p className="kodda-product-description">{product.description}</p>

          <div className="kodda-product-info-grid">
            <div className="kodda-product-info-item">
              <span className="kodda-product-label">Precio</span>
              <span className="kodda-product-value">${product.price.toFixed(2)}</span>
            </div>
            <div className="kodda-product-info-item">
              <span className="kodda-product-label">Stock</span>
              <span className={`kodda-product-value ${product.stock === 0 ? 'kodda-product-value--zero' : ''}`}>
                {product.stock}
              </span>
            </div>
            <div className="kodda-product-info-item">
              <span className="kodda-product-label">Talle</span>
              <span className="kodda-product-value">{product.size || '—'}</span>
            </div>
            <div className="kodda-product-info-item">
              <span className="kodda-product-label">Publicado</span>
              <span className="kodda-product-value">
                {new Date(product.created_at).toLocaleDateString('es-AR')}
              </span>
            </div>
          </div>

          <div className="kodda-product-actions">
            <button
              type="button"
              className="kodda-btn-accent-outline"
              onClick={() => onEdit(product)}
            >
              ✎ Editar
            </button>
            <button
              type="button"
              className="kodda-btn-secondary"
              onClick={handleTogglePause}
              disabled={isPauseToggling}
            >
              {isPauseToggling ? '…' : product.is_paused ? '▶ Reanudar' : '⏸ Pausar'}
            </button>
            <button
              type="button"
              className="kodda-btn-danger"
              onClick={() => setShowDeleteModal(true)}
            >
              🗑 Eliminar
            </button>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <ConfirmModal
          title="Eliminar publicación"
          message={`¿Estás seguro de que querés eliminar "${product.name}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
          isLoading={isDeleting}
          isDanger={true}
        />
      )}
    </>
  );
}

export default function MyProducts() {
  const { brands, categories, loading: catalogLoading, error: catalogError } = useActiveCatalog();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(''), 3000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  async function loadProducts() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/catalog/products/my');
      setProducts(data);
    } catch (err) {
      setError(formatApiError(err, 'No se pudieron cargar tus publicaciones.'));
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(product) {
    setEditingId(product.id);
    setEditData({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      brand_id: product.brand_id
        ? String(product.brand_id)
        : findBrandIdByName(brands, product.brand),
      category_id: product.category_id
        ? String(product.category_id)
        : findCategoryIdByName(categories, product.category),
      size: product.size || '',
      main_image_url: product.main_image_url || '',
    });
    setSaveError('');
  }

  function handleEditCancel() {
    setEditingId(null);
    setEditData({});
    setSaveError('');
  }

  function handleEditChange(field, value) {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSave(productId) {
    setSaveError('');
    
    // Validation
    if (!editData.name?.trim()) {
      setSaveError('El nombre es obligatorio.');
      return;
    }
    if (!editData.description?.trim()) {
      setSaveError('La descripción es obligatoria.');
      return;
    }
    const priceNum = Number(editData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setSaveError('El precio debe ser mayor a 0.');
      return;
    }
    const stockNum = Number(editData.stock);
    if (isNaN(stockNum) || stockNum < 0) {
      setSaveError('El stock no puede ser negativo.');
      return;
    }
    if (!editData.brand_id) {
      setSaveError('La marca es obligatoria.');
      return;
    }
    if (!editData.category_id) {
      setSaveError('La categoría es obligatoria.');
      return;
    }
    if (!editData.size?.trim()) {
      setSaveError('El talle es obligatorio.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: editData.name.trim(),
        description: editData.description.trim(),
        price: priceNum,
        stock: stockNum,
        brand_id: Number(editData.brand_id),
        category_id: Number(editData.category_id),
        size: editData.size.trim(),
        main_image_url: editData.main_image_url?.trim() || null,
      };

      const { data: updatedProduct } = await api.put(
        `/api/catalog/products/${productId}`,
        payload
      );

      // Update the product in the list
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? updatedProduct : p))
      );

      setEditingId(null);
      setEditData({});
      setSuccessMessage('Publicación actualizada correctamente.');
    } catch (err) {
      setSaveError(formatApiError(err, 'Error al actualizar la publicación.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(productId) {
    try {
      await api.delete(`/api/catalog/products/${productId}`);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setSuccessMessage('Publicación eliminada correctamente.');
    } catch (err) {
      const message = formatApiError(err, 'Error al eliminar la publicación.');
      setError(message);
      throw new Error(message);
    }
  }

  async function handleTogglePause(productId, currentlyPaused) {
    try {
      const endpoint = currentlyPaused ? 'resume' : 'pause';
      const { data: updatedProduct } = await api.patch(
        `/api/catalog/products/${productId}/${endpoint}`
      );
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? updatedProduct : p))
      );
      setSuccessMessage(
        currentlyPaused ? 'Publicación reanudada.' : 'Publicación pausada.'
      );
    } catch (err) {
      const message = formatApiError(err, 'Error al cambiar el estado de la publicación.');
      setError(message);
      throw new Error(message);
    }
  }

  return (
    <div className="kodda-home kodda-my-products-page">
      <header className="kodda-topbar">
        <KoddaLogo compact />
        <div className="kodda-topbar-spacer" />
        <nav className="kodda-nav-actions" aria-label="Navegación">
          <Link to="/perfil" className="kodda-btn-ghost">
            Mi perfil
          </Link>
          <Link to="/publicar" className="kodda-btn-accent-outline">
            Publicar prenda
          </Link>
        </nav>
      </header>

      <main className="kodda-my-products-main">
        <div className="kodda-my-products-header">
          <h1>Mis publicaciones activas</h1>
          <p>Ver y editar los productos que publicaste en Kodda</p>
        </div>

        {successMessage ? (
          <p className="kodda-auth-success" role="status">
            {successMessage}
          </p>
        ) : null}

        {error && !loading ? (
          <p className="kodda-auth-error">{error}</p>
        ) : null}

        {catalogError ? <p className="kodda-auth-error">{catalogError}</p> : null}

        {loading || catalogLoading ? (
          <p className="kodda-auth-muted">Cargando tus publicaciones…</p>
        ) : products.length === 0 ? (
          <div className="kodda-my-products-empty">
            <p>No tienes publicaciones activas.</p>
            <Link to="/publicar" className="kodda-btn-primary">
              Publicar tu primera prenda
            </Link>
          </div>
        ) : (
          <div className="kodda-products-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                brands={brands}
                categories={categories}
                onEdit={handleEdit}
                onEditCancel={handleEditCancel}
                isEditing={editingId === product.id}
                editData={editData}
                onEditChange={handleEditChange}
                onSave={handleSave}
                isSaving={isSaving}
                onDelete={handleDelete}
                onTogglePause={handleTogglePause}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="kodda-home-footer">Kodda — tus publicaciones</footer>
    </div>
  );
}
