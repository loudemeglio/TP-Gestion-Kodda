import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { KoddaLogo } from './KoddaLogo';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Falta el token en el enlace.');
      return undefined;
    }
    let cancelled = false;
    api
      .post('/api/auth/verify-email', { token })
      .then((res) => {
        if (!cancelled) {
          setStatus('ok');
          setMessage(res.data.message);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus('error');
          const d = err.response?.data?.detail;
          setMessage(typeof d === 'string' ? d : 'No se pudo verificar el correo.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="kodda-auth-simple">
      <div className="kodda-auth-card">
        <KoddaLogo compact />
        <h1 style={{ marginTop: '1rem' }}>Verificación de correo</h1>
        <p className="kodda-auth-sub">Activá tu cuenta para usar todas las funciones de Kodda.</p>

        {status === 'loading' ? <p className="kodda-auth-muted">Procesando…</p> : null}
        {status !== 'loading' ? (
          <p className={status === 'error' ? 'kodda-auth-error' : 'kodda-auth-success'}>{message}</p>
        ) : null}

        <div className="kodda-auth-links">
          <Link to="/login">Volver al inicio de sesión</Link>
        </div>
      </div>
    </div>
  );
}
