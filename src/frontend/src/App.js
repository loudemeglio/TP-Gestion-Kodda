import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminHome from './components/admin/AdminHome';
import AdminLayout from './components/admin/AdminLayout';
import ForgotPassword from './components/ForgotPassword';
import ConsumerHome from './components/ConsumerHome';
import Home from './components/Home';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import UserList from './components/UserList';
import VerifyEmail from './components/VerifyEmail';
import PublishProduct from './components/PublishProduct';
import ProfileEdit from './components/ProfileEdit';
import ProfileView from './components/ProfileView';
import RegisterForm from './components/RegisterForm';
import MyProducts from './components/MyProducts';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="loading">Cargando…</div>;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      />
      <Route
        path="/publicar"
        element={
          <PrivateRoute>
            <PublishProduct />
          </PrivateRoute>
        }
      />
      <Route
        path="/explorador"
        element={
          <PrivateRoute>
            <ConsumerHome allowAdminPreview />
          </PrivateRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <PrivateRoute>
            <ProfileView />
          </PrivateRoute>
        }
      />
      <Route
        path="/perfil/editar"
        element={
          <PrivateRoute>
            <ProfileEdit />
          </PrivateRoute>
        }
      />
      <Route
        path="/mis-publicaciones"
        element={
          <PrivateRoute>
            <MyProducts />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          </PrivateRoute>
        }
      >
        <Route index element={<AdminHome />} />
        <Route path="users" element={<UserList />} />
      </Route>
      <Route
        path="/users"
        element={
          <PrivateRoute>
            <Navigate to="/admin/users" replace />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
