// Optional enhanced version with more features
import React, { useState } from 'react';

export const UnauthorizedPage: React.FC = () => {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleLogin = () => {
    setIsRedirecting(true);
    setTimeout(() => {
      window.location.href = '/login';
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Acceso No Autorizado
        </h2>
        <p className="text-gray-600 mb-6">
          Debes iniciar sesión para acceder a esta página.
        </p>
        <button
          onClick={handleLogin}
          disabled={isRedirecting}
          className={`bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 
            transition-all duration-300 ${isRedirecting ? 'opacity-70' : ''}`}
        >
          {isRedirecting ? 'Redirigiendo...' : 'Iniciar Sesión'}
        </button>
      </div>
    </div>
  );
};

export default UnauthorizedPage;