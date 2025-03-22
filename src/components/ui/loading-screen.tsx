import React from 'react';

interface LoadingScreenProps {
  bgColor?: string;
  spinnerColor?: string;
  textColor?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  bgColor = "bg-[#3a8fb7]/90",  // --primary con opacidad
  spinnerColor = "border-t-[#e8f7fc]", // --accent-light
  textColor = "text-white" // --text-inverted
}) => {
  return (
    <div className={`fixed inset-0 ${bgColor} backdrop-blur-sm flex items-center justify-center z-50`}>
      <div className="text-center p-8 rounded-xl bg-[#3a8fb7]/60 backdrop-blur-md shadow-xl border border-[#a8e6cf]/30">
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Outer static ring */}
          <div className="absolute top-0 left-0 w-full h-full border-8 border-[#a8e6cf]/30 rounded-full"></div>
          
          {/* Inner animated ring */}
          <div className={`absolute top-0 left-0 w-full h-full border-8 ${spinnerColor} rounded-full animate-spin`}></div>
          
          {/* Pulsing center */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-[#c4f0de]/20 rounded-full animate-pulse"></div>
        </div>
        
        <h3 className={`text-xl font-medium ${textColor} mb-2`}>Cargando...</h3>
        <p className="text-[#d4f1f9]">Por favor espere mientras procesamos su solicitud</p>
      </div>
    </div>
  );
};

export default LoadingScreen;