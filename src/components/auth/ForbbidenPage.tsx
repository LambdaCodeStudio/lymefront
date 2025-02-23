import React from 'react';
import { useNavigate } from 'react-router-dom';

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Acceso Denegado
        </h2>
        <p className="text-gray-600 mb-6">
          No tienes los permisos necesarios para acceder a esta página.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
        >
          Volver al Inicio
        </button>
      </div>
    </div>
  );
};