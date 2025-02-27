import React, { useState } from 'react';
import LoadingScreen from '@/components/ui/loading-screen';

export const UnauthorizedPage: React.FC = () => {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleLogin = () => {
    setIsRedirecting(true);
    setTimeout(() => {
      window.location.href = '/login';
    }, 500);
  };

  const handleGoBack = () => {
    setIsRedirecting(true);
    setTimeout(() => {
      window.history.back();
    }, 500);
  };

  return (
    <>
      {isRedirecting && <LoadingScreen />}
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-xl p-8 text-center border border-gray-100">
          <div className="mb-6">
            <div className="w-24 h-24 bg-red-100 rounded-full mx-auto flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Acceso No Autorizado
          </h2>
          <div className="w-16 h-1 bg-red-500 mx-auto mb-6"></div>
          <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
            No tiene permisos para acceder a esta sección. Por favor inicie sesión con una cuenta que tenga los permisos adecuados.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGoBack}
              disabled={isRedirecting}
              className={`border border-gray-300 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-50 
                transition-all duration-300 font-medium ${isRedirecting ? 'opacity-70' : ''}`}
            >
              Volver
            </button>
            <button
              onClick={handleLogin}
              disabled={isRedirecting}
              className={`bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 
                transition-all duration-300 font-medium ${isRedirecting ? 'opacity-70' : ''}`}
            >
              {isRedirecting ? 'Redirigiendo...' : 'Iniciar Sesión'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default UnauthorizedPage;