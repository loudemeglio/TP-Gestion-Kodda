import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';

function CatalogMasterTable({
  title,
  items,
  loading,
  onCreate,
  onRename,
  onToggleActive,
  creating,
  savingId,
  togglingId,
}) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    const ok = await onCreate(newName.trim());
    if (ok) setNewName('');
  }

  async function handleSaveEdit(itemId) {
    if (!editName.trim()) return;
    const ok = await onRename(itemId, editName.trim());
    if (ok) {
      setEditingId(null);
      setEditName('');
    }
  }

  return (
    <section className="kodda-admin-catalog-section">
      <div className="kodda-section-title">
        <h3>{title}</h3>
      </div>

      <form className="kodda-admin-catalog-add" onSubmit={handleCreate}>
        <label className="kodda-field kodda-admin-catalog-add-field">
          <span>Nueva entrada</span>
          <input
            className="kodda-input"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre exacto (ej. Nike)"
            maxLength={120}
          />
        </label>
        <button type="submit" className="kodda-btn-accent-outline" disabled={creating || !newName.trim()}>
          {creating ? 'Agregando…' : 'Agregar'}
        </button>
      </form>

      {loading ? (
        <p className="kodda-auth-muted">Cargando…</p>
      ) : (
        <div className="kodda-table-wrap">
          <table className="kodda-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="kodda-auth-muted">
                    No hay registros todavía.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {editingId === item.id ? (
                        <input
                          className="kodda-input"
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={120}
                          autoFocus
                        />
                      ) : (
                        <strong>{item.name}</strong>
                      )}
                    </td>
                    <td>
                      <span
                        className={`kodda-catalog-status${item.is_active ? ' kodda-catalog-status--active' : ''}`}
                      >
                        {item.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td>
                      <div className="kodda-admin-catalog-actions">
                        {editingId === item.id ? (
                          <>
                            <button
                              type="button"
                              className="kodda-btn-accent-outline kodda-btn-small"
                              onClick={() => handleSaveEdit(item.id)}
                              disabled={savingId === item.id}
                            >
                              {savingId === item.id ? 'Guardando…' : 'Guardar'}
                            </button>
                            <button
                              type="button"
                              className="kodda-btn-ghost kodda-btn-small"
                              onClick={() => {
                                setEditingId(null);
                                setEditName('');
                              }}
                              disabled={savingId === item.id}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="kodda-btn-ghost kodda-btn-small"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditName(item.name);
                            }}
                          >
                            Editar nombre
                          </button>
                        )}

                        <label className="kodda-toggle" title={item.is_active ? 'Desactivar' : 'Activar'}>
                          <input
                            type="checkbox"
                            checked={item.is_active}
                            onChange={() => onToggleActive(item.id, !item.is_active)}
                            disabled={togglingId === item.id}
                          />
                          <span className="kodda-toggle-track" aria-hidden="true" />
                          <span className="kodda-sr-only">
                            {item.is_active ? 'Desactivar' : 'Activar'} {item.name}
                          </span>
                        </label>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function AdminCatalogPanel() {
  const [tab, setTab] = useState('brands');
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [savingBrandId, setSavingBrandId] = useState(null);
  const [savingCategoryId, setSavingCategoryId] = useState(null);
  const [togglingBrandId, setTogglingBrandId] = useState(null);
  const [togglingCategoryId, setTogglingCategoryId] = useState(null);

  const brandBase = '/api/admin/catalog/brands';
  const categoryBase = '/api/admin/catalog/categories';

  async function loadBrands() {
    setLoadingBrands(true);
    try {
      const { data } = await api.get(brandBase);
      setBrands(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar marcas.');
    } finally {
      setLoadingBrands(false);
    }
  }

  async function loadCategories() {
    setLoadingCategories(true);
    try {
      const { data } = await api.get(categoryBase);
      setCategories(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar categorías.');
    } finally {
      setLoadingCategories(false);
    }
  }

  async function loadAll() {
    setError('');
    await Promise.all([loadBrands(), loadCategories()]);
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (!success) return undefined;
    const t = window.setTimeout(() => setSuccess(''), 3500);
    return () => window.clearTimeout(t);
  }, [success]);

  const sortedBrands = useMemo(
    () => [...brands].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [brands]
  );
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [categories]
  );

  async function createBrand(name) {
    setCreatingBrand(true);
    setError('');
    try {
      const { data } = await api.post(brandBase, { name });
      setBrands((prev) => [...prev, data]);
      setSuccess(`Marca "${data.name}" creada.`);
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo crear la marca.');
      return false;
    } finally {
      setCreatingBrand(false);
    }
  }

  async function createCategory(name) {
    setCreatingCategory(true);
    setError('');
    try {
      const { data } = await api.post(categoryBase, { name });
      setCategories((prev) => [...prev, data]);
      setSuccess(`Categoría "${data.name}" creada.`);
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo crear la categoría.');
      return false;
    } finally {
      setCreatingCategory(false);
    }
  }

  async function renameBrand(id, name) {
    setSavingBrandId(id);
    setError('');
    try {
      const { data } = await api.patch(`${brandBase}/${id}`, { name });
      setBrands((prev) => prev.map((b) => (b.id === id ? data : b)));
      setSuccess('Marca actualizada.');
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo actualizar la marca.');
      return false;
    } finally {
      setSavingBrandId(null);
    }
  }

  async function renameCategory(id, name) {
    setSavingCategoryId(id);
    setError('');
    try {
      const { data } = await api.patch(`${categoryBase}/${id}`, { name });
      setCategories((prev) => prev.map((c) => (c.id === id ? data : c)));
      setSuccess('Categoría actualizada.');
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo actualizar la categoría.');
      return false;
    } finally {
      setSavingCategoryId(null);
    }
  }

  async function toggleBrand(id, isActive) {
    setTogglingBrandId(id);
    setError('');
    try {
      const { data } = await api.patch(`${brandBase}/${id}/active`, { is_active: isActive });
      setBrands((prev) => prev.map((b) => (b.id === id ? data : b)));
      setSuccess(isActive ? 'Marca activada.' : 'Marca desactivada (baja lógica).');
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo cambiar el estado de la marca.');
    } finally {
      setTogglingBrandId(null);
    }
  }

  async function toggleCategory(id, isActive) {
    setTogglingCategoryId(id);
    setError('');
    try {
      const { data } = await api.patch(`${categoryBase}/${id}/active`, { is_active: isActive });
      setCategories((prev) => prev.map((c) => (c.id === id ? data : c)));
      setSuccess(isActive ? 'Categoría activada.' : 'Categoría desactivada (baja lógica).');
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo cambiar el estado de la categoría.');
    } finally {
      setTogglingCategoryId(null);
    }
  }

  return (
    <div className="kodda-admin-page">
      <div className="kodda-section-title">
        <h2>Catálogo maestro</h2>
        <p className="kodda-admin-userlist-sub">
          Gestioná marcas y categorías con baja lógica. Los vendedores solo pueden elegir entradas activas al publicar.
        </p>
      </div>

      {error ? <p className="kodda-auth-error kodda-admin-flash">{error}</p> : null}
      {success ? <p className="kodda-auth-success kodda-admin-flash">{success}</p> : null}

      <div className="kodda-admin-tabs" role="tablist" aria-label="Marcas o categorías">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'brands'}
          className={`kodda-admin-tab${tab === 'brands' ? ' kodda-admin-tab--active' : ''}`}
          onClick={() => setTab('brands')}
        >
          Marcas ({brands.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'categories'}
          className={`kodda-admin-tab${tab === 'categories' ? ' kodda-admin-tab--active' : ''}`}
          onClick={() => setTab('categories')}
        >
          Categorías ({categories.length})
        </button>
      </div>

      {tab === 'brands' ? (
        <CatalogMasterTable
          title="Marcas"
          items={sortedBrands}
          loading={loadingBrands}
          onCreate={createBrand}
          onRename={renameBrand}
          onToggleActive={toggleBrand}
          creating={creatingBrand}
          savingId={savingBrandId}
          togglingId={togglingBrandId}
        />
      ) : (
        <CatalogMasterTable
          title="Categorías"
          items={sortedCategories}
          loading={loadingCategories}
          onCreate={createCategory}
          onRename={renameCategory}
          onToggleActive={toggleCategory}
          creating={creatingCategory}
          savingId={savingCategoryId}
          togglingId={togglingCategoryId}
        />
      )}
    </div>
  );
}
