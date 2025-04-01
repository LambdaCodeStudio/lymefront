// components/StockIndicator.tsx
import React, { memo, useMemo } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { StockIndicatorProps } from '../types/inventory.types';
import { LOW_STOCK_THRESHOLD } from '../utils/constants';

/**
 * Componente para mostrar indicadores visuales del nivel de stock
 * Optimizado con memo y useMemo para prevenir renderizados innecesarios
 * 
 * @param stock - Cantidad actual de stock
 * @param alertaStockBajo - Flag explícito que indica si el stock es bajo
 * @param stockMinimo - Valor mínimo de stock configurado para el producto
 * @param threshold - Umbral personalizado para considerar stock bajo (por defecto LOW_STOCK_THRESHOLD)
 */
const StockIndicator: React.FC<StockIndicatorProps> = ({
  stock,
  alertaStockBajo,
  stockMinimo,
  threshold = LOW_STOCK_THRESHOLD
}) => {
  // Calcular estado del stock de manera memoizada
  const { isLowStock, isOutOfStock, displayContent } = useMemo(() => {
    // Determinar si no hay stock
    const outOfStock = stock <= 0;

    // Usar el flag explícito si está disponible, o calcularlo con el umbral
    const lowStock = alertaStockBajo !== undefined
      ? alertaStockBajo
      : (stock <= threshold && stock > 0);

    // Contenido a mostrar basado en el estado
    let content;
    
    if (outOfStock) {
      content = (
        <div className="flex items-center gap-1" role="status" aria-live="polite">
          <AlertCircle 
            className="w-4 h-4 text-red-500" 
            aria-hidden="true" 
          />
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            Sin stock
          </span>
        </div>
      );
    } else if (lowStock) {
      content = (
        <div className="flex items-center gap-1" role="status" aria-live="polite">
          <AlertTriangle 
            className="w-4 h-4 text-yellow-500 animate-pulse" 
            aria-hidden="true" 
          />
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
            {stock} unidades - ¡Stock bajo!
          </span>
        </div>
      );
    } else {
      content = (
        <span 
          className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-[#DFEFE6] text-[#29696B]"
          role="status"
        >
          {stock} unidades
        </span>
      );
    }

    return {
      isLowStock: lowStock,
      isOutOfStock: outOfStock,
      displayContent: content
    };
  }, [stock, alertaStockBajo, threshold]);

  // Mostrar información adicional sobre stock mínimo si está disponible
  const stockMinimoInfo = useMemo(() => {
    if (stockMinimo && stockMinimo > 0) {
      return (
        <div className="text-xs text-[#7AA79C] mt-1">
          Mínimo: {stockMinimo} unidades
        </div>
      );
    }
    return null;
  }, [stockMinimo]);

  return (
    <div className="stock-indicator">
      {displayContent}
      {stockMinimoInfo}
    </div>
  );
};

export default memo(StockIndicator);