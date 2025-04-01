import { useCallback } from 'react';
import { getFromCache, saveToCache, invalidateCache } from '../utils/clientUtils';

/**
 * Hook personalizado para gestión de caché con typado genérico
 * Proporciona métodos para obtener, guardar e invalidar datos en caché
 */
export const useCache = () => {
  /**
   * Obtiene datos de la caché con un tipo específico
   */
  const getCached = useCallback(<T>(key: string): T | null => {
    return getFromCache<T>(key);
  }, []);

  /**
   * Guarda datos en la caché con un tipo específico
   */
  const saveCache = useCallback(<T>(key: string, data: T): void => {
    saveToCache<T>(key, data);
  }, []);

  /**
   * Invalida una o varias claves de caché
   */
  const invalidate = useCallback((keys: string | string[]): void => {
    const keysToInvalidate = Array.isArray(keys) ? keys : [keys];
    invalidateCache(keysToInvalidate);
  }, []);

  return {
    getCached,
    saveCache,
    invalidate
  };
};

export default useCache;