import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Sesión iniciada</h1>
        <button type="button" onClick={() => logout()}>
          Cerrar sesión
        </button>
      </header>
      {user ? (
        <ul className="user-summary">
          <li>
            <strong>Usuario:</strong> {user.username}
          </li>
          <li>
            <strong>Email:</strong> {user.email}
          </li>
          <li>
            <strong>Rol:</strong> {user.role}
          </li>
        </ul>
      ) : null}
    </div>
  );
}
