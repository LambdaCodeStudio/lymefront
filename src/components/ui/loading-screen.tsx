import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div className="absolute top-0 left-0 w-full h-full border-8 border-gray-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-8 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
        <h3 className="text-xl font-medium text-gray-800 mb-2">Cargando...</h3>
        <p className="text-gray-600">Por favor espere mientras procesamos su solicitud</p>
      </div>
    </div>
  );
};

export default LoadingScreen;