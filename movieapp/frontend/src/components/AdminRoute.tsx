// src/components/AdminRoute.tsx
import { Navigate } from 'react-router-dom';

interface AdminRouteProps {
  children: JSX.Element;
}

export function AdminRoute({ children }: AdminRouteProps) {
  // Lê a flag que guardámos no Login
  const isAdmin = localStorage.getItem('movieapp_is_admin') === 'true';

  if (!isAdmin) {
    // Se não for admin, chuta para a lista de filmes
    return <Navigate to="/movies" replace />;
  }

  // Se for admin, deixa entrar
  return children;
}