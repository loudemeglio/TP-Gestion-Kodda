import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KoddaLogo } from './KoddaLogo';
import { api } from '../api/client';

export default function RegisterForm() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Ingresá un email válido.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/users/', { username, email, password });
      navigate('/login', {
        replace: true,
        state: {
          registerFlash:
            'Registro exitoso. Te enviamos un correo para verificar tu cuenta (revisá también spam). Después podés iniciar sesión.',
        },
      });
    } catch (err) {
      const resp = err.response;
      if (!resp) {
        setError('No hay conexión con el servidor.');
      } else if (resp.data) {
        const detail = resp.data.detail;
        if (typeof detail === 'string') {
          if (detail.toLowerCase().includes('email')) {
            setError('El email ya está registrado.');
          } else if (detail.toLowerCase().includes('username')) {
            setError('El nombre de usuario ya está en uso.');
          } else {
            setError(detail);
          }
        } else if (Array.isArray(detail)) {
          const messages = detail.map((d) => {
            if (d?.msg && d?.loc?.length) {
              if (d.loc.includes('email')) return 'Email inválido o ya registrado.';
              if (d.loc.includes('username')) return 'Nombre de usuario inválido o ya en uso.';
              if (d.loc.includes('password')) return 'Contraseña inválida.';
              return d.msg;
            }
            return typeof d === 'string' ? d : '';
          });
          setError(messages.filter(Boolean).join(' '));
        } else {
          setError('No se pudo registrar el usuario.');
        }
      } else {
        setError('No se pudo registrar el usuario.');
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
          <p className="kodda-auth-eyebrow">Plataforma C2C / B2C</p>
          <h1 className="kodda-auth-headline">Tu placard, en movimiento circular.</h1>
          <p className="kodda-auth-lead">
            Comprá y vendé con precios más accesibles. La IA te ayuda con talles, búsqueda en lenguaje natural y
            reputación inteligente — vos decidís; Kodda conecta.
          </p>
          <div className="kodda-auth-pills">
            <span className="kodda-pill">Sugerencia de precio</span>
            <span className="kodda-pill">Talle recomendado</span>
            <span className="kodda-pill">Chat asistido</span>
            <span className="kodda-pill">Búsqueda libre</span>
          </div>
        </div>
        <p className="kodda-auth-footer-note">
          Creá tu cuenta en segundos. Después podés completar medidas y talles desde tu perfil.
        </p>
      </aside>

      <main className="kodda-auth-panel">
        <div className="kodda-auth-card">
          <h1>Registrarse</h1>
          <p className="kodda-auth-sub">Usuario, email y contraseña. El resto lo cargás cuando quieras en tu perfil.</p>

          <form onSubmit={handleSubmit}>
            {error ? <p className="kodda-auth-error">{error}</p> : null}

            <label className="kodda-field">
              <span>Usuario</span>
              <input
                className="kodda-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="ej. mateo"
                required
              />
            </label>

            <label className="kodda-field">
              <span>Email</span>
              <input
                className="kodda-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="ej. mateo@mail.com"
                required
              />
            </label>

            <label className="kodda-field">
              <span>Contraseña</span>
              <input
                className="kodda-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </label>

            <label className="kodda-field">
              <span>Repetir contraseña</span>
              <input
                className="kodda-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </label>

            <button className="kodda-btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Registrando…' : 'Crear cuenta'}
            </button>
          </form>

          <div className="kodda-auth-links">
            <span className="kodda-auth-muted">
              ¿Ya tenés cuenta?{' '}
              <Link to="/login" className="kodda-auth-link">
                Iniciar sesión
              </Link>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
