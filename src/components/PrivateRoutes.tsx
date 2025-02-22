import React from 'react';
import { Route, Navigate } from 'react-router-dom';

interface PrivateRouteProps {
  path: string;
  component: React.ComponentType<any>;
  allowedRoles: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ path, component: Component, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');

  if (!token) {
    // Si no hay token, redirigir al login
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(userRole || '')) {
    // Si el rol del usuario no está permitido, redirigir a una página de acceso denegado
    return <Navigate to="/access-denied" replace />;
  }

  // Si el token existe y el rol está permitido, renderizar la ruta
  return <Route path={path} element={<Component />} />;
};

export default PrivateRoute;