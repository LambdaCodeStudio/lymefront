// components/StockFilters.tsx
import React, { memo } from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, HelpCircle, Loader2 } from 'lucide-react';
import { LOW_STOCK_THRESHOLD } from '../utils/constants';

interface StockFiltersProps {
  showLowStockOnly: boolean;
  showNoStockOnly: boolean;
  lowStockCount: number;
  noStockCount: number;
  isLowStockLoading: boolean;
  isNoStockLoading: boolean;
  onLowStockToggle: () => void;
  onNoStockToggle: () => void;
  isMobile?: boolean;
}

/**
 * Componente para filtros de stock bajo y sin stock
 * 
 * @param showLowStockOnly - Estado del filtro de stock bajo
 * @param showNoStockOnly - Estado del filtro de sin stock
 * @param lowStockCount - Cantidad de productos con stock bajo
 * @param noStockCount - Cantidad de productos sin stock
 * @param isLowStockLoading - Estado de carga del conteo de stock bajo
 * @param isNoStockLoading - Estado de carga del conteo de sin stock
 * @param onLowStockToggle - Función para alternar filtro de stock bajo
 * @param onNoStockToggle - Función para alternar filtro de sin stock
 * @param isMobile - Si debe renderizarse en modo móvil
 */
const StockFilters: React.FC<StockFiltersProps> = ({
  showLowStockOnly,
  showNoStockOnly,
  lowStockCount,
  noStockCount,
  isLowStockLoading,
  isNoStockLoading,
  onLowStockToggle,
  onNoStockToggle,
  isMobile = false
}) => {
  // Si es móvil, mostrar como botones flotantes
  if (isMobile) {
    return (
      <div className="fixed bottom-6 right-6 z-10 flex flex-col gap-2">
        <TooltipProvider>
          {lowStockCount > 0 && !showLowStockOnly && !showNoStockOnly && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onLowStockToggle}
                  className="rounded-full h-14 w-14 shadow-lg bg-yellow-500 hover:bg-yellow-600 text-white"
                  aria-label={`${lowStockCount} productos con stock bajo`}
                >
                  <div className="relative">
                    <HelpCircle className="h-6 w-6" aria-hidden="true" />
                    <span 
                      className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                      aria-hidden="true"
                    >
                      {lowStockCount > 99 ? '99+' : lowStockCount}
                    </span>
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Hay {lowStockCount} productos con stock bajo</p>
                <p className="text-xs">Toca para ver solo estos productos</p>
              </TooltipContent>
            </Tooltip>
          )}

          {noStockCount > 0 && !showLowStockOnly && !showNoStockOnly && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onNoStockToggle}
                  className="rounded-full h-14 w-14 shadow-lg bg-red-500 hover:bg-red-600 text-white"
                  aria-label={`${noStockCount} productos sin stock`}
                >
                  <div className="relative">
                    <AlertCircle className="h-6 w-6" aria-hidden="true" />
                    <span 
                      className="absolute -top-2 -right-2 bg-white text-red-500 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                      aria-hidden="true"
                    >
                      {noStockCount > 99 ? '99+' : noStockCount}
                    </span>
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Hay {noStockCount} productos sin stock</p>
                <p className="text-xs">Toca para ver solo estos productos</p>
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    );
  }
  
  // Versión desktop como botones normales
  return (
    <div className="flex flex-wrap gap-2">
      {/* Botón para filtrar por stock bajo */}
      <Button
        onClick={onLowStockToggle}
        variant={showLowStockOnly ? "default" : "outline"}
        className={`
          relative 
          ${showLowStockOnly
            ? 'bg-yellow-500 hover:bg-yellow-600 border-yellow-500 text-white'
            : 'border-yellow-500 text-yellow-700 hover:bg-yellow-50'
          }
        `}
        disabled={isLowStockLoading}
        aria-pressed={showLowStockOnly}
        aria-label={`Filtrar por stock bajo (≤ ${LOW_STOCK_THRESHOLD} unidades)`}
      >
        <HelpCircle className="w-4 h-4 mr-2" aria-hidden="true" />
        <span className="hidden sm:inline">Stock bajo</span>
        {!isLowStockLoading && lowStockCount > 0 && !showLowStockOnly && (
          <span 
            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
            aria-label={`${lowStockCount} productos`}
          >
            {lowStockCount > 99 ? '99+' : lowStockCount}
          </span>
        )}
        {isLowStockLoading && (
          <Loader2 className="w-4 h-4 ml-1 animate-spin" aria-hidden="true" />
        )}
      </Button>

      {/* Botón para filtrar productos sin stock */}
      <Button
        onClick={onNoStockToggle}
        variant={showNoStockOnly ? "default" : "outline"}
        className={`
          relative 
          ${showNoStockOnly
            ? 'bg-red-500 hover:bg-red-600 border-red-500 text-white'
            : 'border-red-500 text-red-700 hover:bg-red-50'
          }
        `}
        disabled={isNoStockLoading}
        aria-pressed={showNoStockOnly}
        aria-label="Filtrar productos sin stock"
      >
        <AlertCircle className="w-4 h-4 mr-2" aria-hidden="true" />
        <span className="hidden sm:inline">Sin stock</span>
        {!isNoStockLoading && noStockCount > 0 && !showNoStockOnly && (
          <span 
            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
            aria-label={`${noStockCount} productos`}
          >
            {noStockCount > 99 ? '99+' : noStockCount}
          </span>
        )}
        {isNoStockLoading && (
          <Loader2 className="w-4 h-4 ml-1 animate-spin" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
};

export default memo(StockFilters);