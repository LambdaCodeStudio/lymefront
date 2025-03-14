// src/utils/apiUtils.ts

// Obtener la URL base de la API desde variables de entorno
// En desarrollo, generalmente será una cadena vacía (lo que resulta en URLs relativas)
// En producción, podría ser la URL completa de tu servidor
export const getApiBaseUrl = (): string => {
    // Usa REACT_APP_API_URL si está disponible (naming convention de Create React App)
    // De lo contrario, usa PUBLIC_URL como fallback
    return process.env.REACT_APP_API_URL || process.env.PUBLIC_URL || '';
  };
  
  // Función para construir URLs completas para las llamadas a la API
  export const getApiUrl = (endpoint: string): string => {
    const baseUrl = getApiBaseUrl();
    
    // Asegúrate de que el endpoint comience con /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    return `${baseUrl}${normalizedEndpoint}`;
  };