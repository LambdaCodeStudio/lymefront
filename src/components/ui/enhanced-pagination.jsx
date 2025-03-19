// src/components/ui/enhanced-pagination.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Hook para detección de media query
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);
    
    const handler = (event) => setMatches(event.matches);
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
    }
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, [query]);
  
  return matches;
};

// Componente de paginación para dispositivos móviles
const MobilePagination = ({ 
  page, 
  totalPages, 
  firstItemOnPage, 
  lastItemOnPage, 
  totalItems, 
  onPageChange 
}) => (
  <div className="flex flex-col items-center space-y-2">
    <div className="text-sm text-[#F8F9FA] font-medium">
      {firstItemOnPage}-{lastItemOnPage} de {totalItems}
    </div>

    <div className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="h-8 w-8 p-0 border-[#00701A] text-[#F8F9FA] hover:bg-[#00701A]/20"
          aria-label="Primera página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="h-8 w-8 p-0 border-[#00701A] text-[#F8F9FA] hover:bg-[#00701A]/20"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center bg-[#00701A]/20 px-3 py-1 rounded-lg">
        <span className="text-sm font-medium text-[#F8F9FA]">
          {page} / {totalPages}
        </span>
      </div>

      <div className="flex items-center space-x-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="h-8 w-8 p-0 border-[#00701A] text-[#F8F9FA] hover:bg-[#00701A]/20"
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className="h-8 w-8 p-0 border-[#00701A] text-[#F8F9FA] hover:bg-[#00701A]/20"
          aria-label="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
);

// Componente de paginación para escritorio
const DesktopPagination = ({ 
  page, 
  totalPages, 
  pageNumbers, 
  firstItemOnPage, 
  lastItemOnPage, 
  totalItems, 
  onPageChange, 
  itemsPerPage, 
  onItemsPerPageChange 
}) => (
  <div className="flex flex-col items-center space-y-2">
    <div className="text-sm text-[#F8F9FA] w-full text-center">
      Mostrando {firstItemOnPage}-{lastItemOnPage} de {totalItems} resultados
    </div>

    <div className="flex items-center justify-center">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(1)}
        disabled={page === 1}
        className="h-8 w-8 p-0 rounded-r-none border-[#00701A] text-[#F8F9FA] hover:bg-[#00701A]/20"
        aria-label="Primera página"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="h-8 w-8 p-0 rounded-none border-l-0 border-[#00701A] text-[#F8F9FA] hover:bg-[#00701A]/20"
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pageNumbers.map((pageNum, idx) => (
        <React.Fragment key={idx}>
          {pageNum === '...' ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="h-8 w-8 p-0 rounded-none border-l-0 border-[#00701A] text-[#F8F9FA]"
            >
              ...
            </Button>
          ) : (
            <Button
              variant={pageNum === page ? "default" : "outline"}
              size="sm"
              onClick={() => pageNum !== page && onPageChange(pageNum)}
              className={`h-8 w-8 p-0 rounded-none border-l-0 ${
                pageNum === page
                  ? "bg-[#00701A] text-white hover:bg-[#2E7D32]"
                  : "border-[#00701A] text-[#F8F9FA] hover:bg-[#00701A]/20"
              }`}
              aria-label={`Página ${pageNum}`}
              aria-current={pageNum === page ? "page" : undefined}
            >
              {pageNum}
            </Button>
          )}
        </React.Fragment>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="h-8 w-8 p-0 rounded-none border-l-0 border-[#00701A] text-[#F8F9FA] hover:bg-[#00701A]/20"
        aria-label="Página siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(totalPages)}
        disabled={page === totalPages}
        className="h-8 w-8 p-0 rounded-l-none border-l-0 border-[#00701A] text-[#F8F9FA] hover:bg-[#00701A]/20"
        aria-label="Última página"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>

    {onItemsPerPageChange && (
      <div className="flex items-center mt-3 text-sm text-[#F8F9FA]">
        <span className="mr-2">Items por página:</span>
        <Select
          value={String(itemsPerPage)}
          onValueChange={(value) => onItemsPerPageChange(Number(value))}
        >
          <SelectTrigger className="w-[80px] h-8 border-[#00701A] bg-transparent">
            <SelectValue placeholder={itemsPerPage} />
          </SelectTrigger>
          <SelectContent className="bg-[#cad9e7] border-[#00701A]">
            {[10, 20, 50, 100].map((value) => (
              <SelectItem key={value} value={String(value)}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )}
  </div>
);

/**
 * Componente de paginación mejorado con soporte para dispositivos móviles y escritorio
 */
const EnhancedPagination = ({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  className = '',
  onItemsPerPageChange = null,
}) => {
  // Detectar si es móvil
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Calcular el número total de páginas
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalItems / itemsPerPage || 1));
  }, [totalItems, itemsPerPage]);
  
  // Ajustar la página actual para que esté dentro de los límites
  const page = useMemo(() => {
    return Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  }, [currentPage, totalPages]);
  
  // Calcular límites de items que se muestran
  const { firstItemOnPage, lastItemOnPage } = useMemo(() => {
    return {
      firstItemOnPage: totalItems > 0 ? (page - 1) * itemsPerPage + 1 : 0,
      lastItemOnPage: Math.min(page * itemsPerPage, totalItems)
    };
  }, [page, itemsPerPage, totalItems]);
  
  // Calcular números de página a mostrar
  const pageNumbers = useMemo(() => {
    const delta = isMobile ? 1 : 2;
    const range = [];

    for (
      let i = Math.max(1, page - delta);
      i <= Math.min(totalPages, page + delta);
      i++
    ) {
      range.push(i);
    }

    if (range.length > 0 && range[0] > 1) {
      if (range[0] > 2) {
        range.unshift('...');
      }
      range.unshift(1);
    }

    if (range.length > 0 && range[range.length - 1] < totalPages) {
      if (range[range.length - 1] < totalPages - 1) {
        range.push('...');
      }
      range.push(totalPages);
    }

    return range;
  }, [page, totalPages, isMobile]);
  
  // Decidir si mostrar la paginación o no
  if (!totalItems || !itemsPerPage || totalItems <= itemsPerPage || totalPages <= 1) {
    return null;
  }

  return (
    <div className={`pagination-container py-4 ${className}`}>
      {isMobile ? (
        <MobilePagination 
          page={page} 
          totalPages={totalPages} 
          firstItemOnPage={firstItemOnPage} 
          lastItemOnPage={lastItemOnPage} 
          totalItems={totalItems} 
          onPageChange={onPageChange} 
        />
      ) : (
        <DesktopPagination 
          page={page} 
          totalPages={totalPages} 
          pageNumbers={pageNumbers} 
          firstItemOnPage={firstItemOnPage} 
          lastItemOnPage={lastItemOnPage} 
          totalItems={totalItems} 
          onPageChange={onPageChange} 
          itemsPerPage={itemsPerPage} 
          onItemsPerPageChange={onItemsPerPageChange} 
        />
      )}
    </div>
  );
};

export default React.memo(EnhancedPagination);