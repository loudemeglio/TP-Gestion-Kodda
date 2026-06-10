import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { KoddaLogo } from './KoddaLogo';

const FIT_OPTIONS = [
  { value: '', label: 'Sin preferencia' },
  { value: 'ajustado', label: 'Ajustado / ceñido' },
  { value: 'regular', label: 'Regular / al cuerpo' },
  { value: 'holgado', label: 'Holgado / oversize' },
];

function FitPreferenceSelect({ id, value, onChange, describedBy }) {
  return (
    <select
      id={id}
      className="kodda-input kodda-profile-fit-pref-select"
      value={value}
      onChange={onChange}
      aria-describedby={describedBy}
    >
      {FIT_OPTIONS.map((opt) => (
        <option key={opt.value || 'none'} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function numToInput(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function buildPatchBody(form) {
  const body = {};
  const username = form.username.trim();
  if (username) body.username = username;
  body.bio = form.bio.trim() || null;
  body.address = form.address.trim() || null;
  body.shoe_size = form.shoeSize.trim() || null;
  body.top_size = form.topSize.trim() || null;
  body.bottom_size = form.bottomSize.trim() || null;
  body.top_fit_preference = form.topFitPreference || null;
  body.bottom_fit_preference = form.bottomFitPreference || null;
  body.shoe_fit_preference = form.shoeFitPreference || null;
  body.body_type = form.bodyType || null;

  const w = form.weight.trim().replace(',', '.');
  if (w !== '') {
    const n = Number.parseFloat(w);
    if (Number.isNaN(n) || n < 0) throw new Error('Peso inválido.');
    body.weight = n;
  } else {
    body.weight = null;
  }
  const h = form.height.trim().replace(',', '.');
  if (h !== '') {
    const n = Number.parseFloat(h);
    if (Number.isNaN(n) || n < 0) throw new Error('Altura inválida.');
    body.height = n;
  } else {
    body.height = null;
  }
  return body;
}

export default function ProfileEdit() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { reloadUser, avatarVersion, bumpAvatarVersion } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [address, setAddress] = useState('');
  const [shoeSize, setShoeSize] = useState('');
  const [topSize, setTopSize] = useState('');
  const [bottomSize, setBottomSize] = useState('');
  const [topFitPreference, setTopFitPreference] = useState('');
  const [bottomFitPreference, setBottomFitPreference] = useState('');
  const [shoeFitPreference, setShoeFitPreference] = useState('');
  const [bodyType, setBodyType] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/users/me/profile');
        if (cancelled) return;
        setUsername(data.username || '');
        setBio(data.bio || '');
        setWeight(numToInput(data.weight));
        setHeight(numToInput(data.height));
        setAddress(data.address || '');
        setShoeSize(data.shoe_size || '');
        setTopSize(data.top_size || '');
        setBottomSize(data.bottom_size || '');
        const legacyFit = data.fit_preference || '';
        setTopFitPreference(data.top_fit_preference || legacyFit);
        setBottomFitPreference(data.bottom_fit_preference || legacyFit);
        setShoeFitPreference(data.shoe_fit_preference || legacyFit);
        setBodyType(data.body_type || '');
        setAvatarPreview(resolveMediaUrl(data.profile_image_url, avatarVersion || undefined));
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.detail || 'No se pudo cargar tu perfil.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingAvatar(true);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/api/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      bumpAvatarVersion();
      const bust = Date.now();
      setAvatarPreview(resolveMediaUrl(data.profile_image_url, bust));
      URL.revokeObjectURL(objectUrl);
      await reloadUser();
    } catch (err) {
      URL.revokeObjectURL(objectUrl);
      try {
        const { data } = await api.get('/api/users/me/profile');
        setAvatarPreview(resolveMediaUrl(data.profile_image_url, avatarVersion || undefined));
      } catch {
        setAvatarPreview(null);
      }
      setError(err.response?.data?.detail || 'No se pudo subir la imagen.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    let body;
    try {
      body = buildPatchBody({
        username,
        bio,
        weight,
        height,
        address,
        shoeSize,
        topSize,
        bottomSize,
        topFitPreference,
        bottomFitPreference,
        shoeFitPreference,
        bodyType,
      });
    } catch (validationErr) {
      setError(validationErr.message);
      return;
    }

    setSubmitting(true);
    try {
      await api.patch('/api/users/me/profile', body);
      await reloadUser();
      navigate('/perfil', { replace: true, state: { profileSaved: true } });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'No se pudo guardar el perfil.');
    } finally {
      setSubmitting(false);
    }
  }

  const initial = (username || '?').charAt(0).toUpperCase();

  return (
    <div className="kodda-home kodda-profile-edit-page">
      <header className="kodda-topbar">
        <KoddaLogo compact />
        <div className="kodda-topbar-spacer" />
        <nav className="kodda-nav-actions">
          <Link to="/perfil" className="kodda-btn-ghost">
            ← Mi perfil
          </Link>
        </nav>
      </header>

      <main className="kodda-profile-edit-layout">
        <header className="kodda-profile-edit-hero">
          <p className="kodda-profile-edit-eyebrow">Tu cuenta</p>
          <h1 className="kodda-profile-edit-title">Editar perfil</h1>
          <p className="kodda-profile-edit-lead">
            Foto, descripción y medidas para que Kodda te recomiende prendas que realmente te queden bien.
          </p>
        </header>

        {loading ? (
          <p className="kodda-auth-muted kodda-profile-edit-loading">Cargando tu perfil…</p>
        ) : (
          <form className="kodda-profile-edit-card" onSubmit={handleSubmit}>
            {error ? <p className="kodda-auth-error">{error}</p> : null}

            <section className="kodda-profile-edit-section kodda-profile-edit-section--avatar">
              <h2 className="kodda-profile-edit-section-title">
                Foto de perfil
                <span className="kodda-badge-ia">Visible en la app</span>
              </h2>
              <div className="kodda-profile-avatar-block">
                <div className="kodda-profile-avatar-ring">
                  {avatarPreview ? (
                    <img
                      key={avatarPreview}
                      src={avatarPreview}
                      alt=""
                      className="kodda-profile-avatar-preview"
                    />
                  ) : (
                    <span className="kodda-profile-avatar-placeholder" aria-hidden="true">
                      {initial}
                    </span>
                  )}
                </div>
                <div className="kodda-profile-avatar-actions">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="kodda-profile-file-input"
                    onChange={handleAvatarChange}
                    disabled={uploadingAvatar}
                    aria-label="Elegir foto de perfil"
                  />
                  <button
                    type="button"
                    className="kodda-btn-accent-outline"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingAvatar ? 'Subiendo…' : avatarPreview ? 'Cambiar foto' : 'Subir foto'}
                  </button>
                  <p className="kodda-profile-avatar-hint">JPEG, PNG o WebP · máx. 2 MB</p>
                </div>
              </div>
            </section>

            <section className="kodda-profile-edit-section">
              <h2 className="kodda-profile-edit-section-title">Sobre vos</h2>
              <label className="kodda-field">
                <span>Nombre de usuario</span>
                <input
                  className="kodda-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={50}
                  placeholder="Cómo te ven otros en Kodda"
                />
              </label>
              <label className="kodda-field">
                <span>Descripción</span>
                <textarea
                  className="kodda-input kodda-textarea"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Tu estilo, qué buscás, qué vendés…"
                />
              </label>
            </section>

            <section className="kodda-profile-edit-section">
              <h2 className="kodda-profile-edit-section-title">
                Medidas y talles
                <span className="kodda-badge-ia">Recomendaciones IA</span>
              </h2>
              <p className="kodda-profile-edit-section-desc">
                Opcional, pero mejora las sugerencias de talle al comprar o publicar.
              </p>
              <div className="kodda-profile-edit-grid">
                <label className="kodda-field">
                  <span>Peso (kg)</span>
                  <input
                    className="kodda-input"
                    type="text"
                    inputMode="decimal"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="70,5"
                  />
                </label>
                <label className="kodda-field">
                  <span>Altura (cm)</span>
                  <input
                    className="kodda-input"
                    type="text"
                    inputMode="decimal"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="175"
                  />
                </label>
                <label className="kodda-field">
                  <span>Calzado</span>
                  <input
                    className="kodda-input"
                    type="text"
                    value={shoeSize}
                    onChange={(e) => setShoeSize(e.target.value)}
                    maxLength={20}
                    placeholder="42"
                  />
                </label>
                <label className="kodda-field">
                  <span>Parte superior</span>
                  <input
                    className="kodda-input"
                    type="text"
                    value={topSize}
                    onChange={(e) => setTopSize(e.target.value)}
                    maxLength={20}
                    placeholder="L"
                  />
                </label>
                <label className="kodda-field">
                  <span>Parte inferior</span>
                  <input
                    className="kodda-input"
                    type="text"
                    value={bottomSize}
                    onChange={(e) => setBottomSize(e.target.value)}
                    maxLength={20}
                    placeholder="32"
                  />
                </label>
                <label className="kodda-field">
                  <span>Contextura</span>
                  <select
                    className="kodda-input"
                    value={bodyType}
                    onChange={(e) => setBodyType(e.target.value)}
                  >
                    <option value="">Prefiero no decir</option>
                    <option value="delgado">Delgada</option>
                    <option value="promedio">Promedio</option>
                    <option value="atletico">Atlética</option>
                    <option value="robusto">Robusta</option>
                  </select>
                </label>
              </div>

              <div className="kodda-profile-fit-prefs">
                <h3 className="kodda-profile-fit-prefs-title">¿Cómo te gusta que te quede?</h3>
                <p className="kodda-profile-fit-prefs-desc" id="fit-prefs-help">
                  Podés elegir un calce distinto para cada zona. Por ejemplo: remeras más ajustadas y pantalones
                  más holgados.
                </p>
                <div className="kodda-profile-fit-prefs-grid">
                  <div className="kodda-profile-fit-pref-row">
                    <span className="kodda-profile-fit-pref-icon" aria-hidden="true">
                      👕
                    </span>
                    <div className="kodda-profile-fit-pref-copy">
                      <label htmlFor="top-fit-pref">Parte superior</label>
                      <small>Remeras, camperas, vestidos…</small>
                      <FitPreferenceSelect
                        id="top-fit-pref"
                        value={topFitPreference}
                        onChange={(e) => setTopFitPreference(e.target.value)}
                        describedBy="fit-prefs-help"
                      />
                    </div>
                  </div>
                  <div className="kodda-profile-fit-pref-row">
                    <span className="kodda-profile-fit-pref-icon" aria-hidden="true">
                      👖
                    </span>
                    <div className="kodda-profile-fit-pref-copy">
                      <label htmlFor="bottom-fit-pref">Parte inferior</label>
                      <small>Pantalones, jeans, shorts…</small>
                      <FitPreferenceSelect
                        id="bottom-fit-pref"
                        value={bottomFitPreference}
                        onChange={(e) => setBottomFitPreference(e.target.value)}
                        describedBy="fit-prefs-help"
                      />
                    </div>
                  </div>
                  <div className="kodda-profile-fit-pref-row">
                    <span className="kodda-profile-fit-pref-icon" aria-hidden="true">
                      👟
                    </span>
                    <div className="kodda-profile-fit-pref-copy">
                      <label htmlFor="shoe-fit-pref">Calzado</label>
                      <small>Zapatillas, botas, sandalias…</small>
                      <FitPreferenceSelect
                        id="shoe-fit-pref"
                        value={shoeFitPreference}
                        onChange={(e) => setShoeFitPreference(e.target.value)}
                        describedBy="fit-prefs-help"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="kodda-profile-edit-grid">
                <label className="kodda-field kodda-profile-edit-grid-full">
                  <span>Dirección de envío</span>
                  <input
                    className="kodda-input"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    maxLength={200}
                    placeholder="Calle, ciudad…"
                  />
                </label>
              </div>
            </section>

            <footer className="kodda-profile-edit-footer">
              <button
                className="kodda-btn-primary kodda-profile-edit-submit"
                type="submit"
                disabled={submitting || uploadingAvatar}
              >
                {submitting ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <Link to="/perfil" className="kodda-btn-ghost">
                Cancelar
              </Link>
            </footer>
          </form>
        )}
      </main>
    </div>
  );
}
