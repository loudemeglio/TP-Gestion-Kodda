import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

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
    <div className="auth-page">
      <h1>Verificación de correo</h1>
      {status === 'loading' ? <p>Procesando…</p> : null}
      {status !== 'loading' ? (
        <p className={status === 'error' ? 'auth-error' : ''}>{message}</p>
      ) : null}
      <p>
        <Link to="/login">Volver al inicio de sesión</Link>
      </p>
    </div>
  );
}
