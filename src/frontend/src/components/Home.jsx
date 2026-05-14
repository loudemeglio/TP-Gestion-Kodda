import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import ConsumerHome from './ConsumerHome';

export default function Home() {
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <ConsumerHome />;
}
