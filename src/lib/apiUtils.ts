// src/lib/apiUtils.ts
import { AxiosError } from 'axios';

// Tipo para la respuesta de una operación asíncrona
export interface AsyncResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// Función para extraer mensaje de error de diferentes tipos de errores
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    // Error de axios con respuesta
    if (error.response?.data) {
      const responseData = error.response.data;
      
      // Comprobar si hay un mensaje en la respuesta
      if (typeof responseData === 'object' && 'msg' in responseData) {
        return responseData.msg as string;
      }
      
      if (typeof responseData === 'object' && 'message' in responseData) {
        return responseData.message as string;
      }
      
      // Si es string, devolverlo directamente
      if (typeof responseData === 'string') {
        return responseData;
      }
    }
    
    // Si no hay respuesta o no se puede extraer el mensaje
    return error.message || 'Error en la comunicación con el servidor';
  }
  
  // Error estándar con mensaje
  if (error instanceof Error) {
    return error.message;
  }
  
  // Cualquier otro tipo de error
  return String(error);
}

// Manejador de errores asíncrono
export async function handleAsync<T>(
  promise: Promise<T>,
  errorMsg = 'Ha ocurrido un error'
): Promise<AsyncResult<T>> {
  try {
    const data = await promise;
    return { data, error: null, loading: false };
  } catch (error) {
    console.error('Error en operación asíncrona:', error);
    return { 
      data: null, 
      error: getErrorMessage(error) || errorMsg,
      loading: false 
    };
  }
}

// Formato para parámetros de consulta
export function formatQueryParams(params: Record<string, any>): string {
  return Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      // Manejar arrays
      if (Array.isArray(value)) {
        return value
          .map(v => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`)
          .join('&');
      }
      
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');
}

// Función para descargar un blob como archivo
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}