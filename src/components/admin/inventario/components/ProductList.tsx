// components/ProductList.tsx
import React, { memo, useRef } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Search } from 'lucide-react';
import  EnhancedPagination  from "../../components/Pagination";
import ProductTable from './ProductTable';
import ProductCard from './ProductCard';
import { Product } from '../types/inventory.types';
import { MESSAGES } from '../utils/constants';

interface ProductListProps {
  products: Product[];
  loading: boolean;
  error: string;
  totalCount: number;
  currentPage: number;
  itemsPerPage: number;
  windowWidth: number;
  searchTerm: string;
  selectedCategory: string;
  showLowStockOnly: boolean;
  showNoStockOnly: boolean;
  
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onEditImage: (product: Product) => void;
  onDeleteImage: (id: string) => void;
  onPageChange: (page: number) => void;
}

/**
 * Componente lista de productos optimizado que renderiza una vista
 * de tabla en desktop o tarjetas en móvil
 * 
 * @param products - Lista de productos a mostrar
 * @param loading - Estado de carga
 * @param error - Mensaje de error (si existe)
 * @param totalCount - Total de productos (para paginación)
 * @param currentPage - Página actual
 * @param itemsPerPage - Elementos por página
 * @param windowWidth - Ancho de la ventana
 * @param searchTerm - Término de búsqueda actual
 * @param selectedCategory - Categoría seleccionada
 * @param showLowStockOnly - Si se muestran solo productos con stock bajo
 * @param showNoStockOnly - Si se muestran solo productos sin stock
 * @param onEdit - Función para editar producto
 * @param onDelete - Función para eliminar producto
 * @param onEditImage - Función para editar imagen
 * @param onDeleteImage - Función para eliminar imagen
 * @param onPageChange - Función para cambiar de página
 */
const ProductList: React.FC<ProductListProps> = ({
  products,
  loading,
  error,
  totalCount,
  currentPage,
  itemsPerPage,
  windowWidth,
  searchTerm,
  selectedCategory,
  showLowStockOnly,
  showNoStockOnly,
  onEdit,
  onDelete,
  onEditImage,
  onDeleteImage,
  onPageChange
}) => {
  // Referencia para scroll en dispositivos móviles
  const mobileListRef = useRef<HTMLDivElement>(null);
  
  // Calcular total de páginas
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  
  // Determinar si estamos en modo móvil
  const isMobile = windowWidth < 768;
  
  // Calcular índices para mostrar información de paginación
  const indexOfLastProduct = currentPage * itemsPerPage;
  const indexOfFirstProduct = (currentPage - 1) * itemsPerPage + 1;
  const showingFromTo = totalCount > 0
    ? `${indexOfFirstProduct}-${Math.min(indexOfLastProduct, totalCount)} de ${totalCount}`
    : '0 de 0';
  
  // Mostrar indicador de carga
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-[#91BEAD]/20">
        <div className="inline-flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[#29696B] animate-spin mr-2" aria-hidden="true" />
          <p className="text-[#29696B]" role="status">{MESSAGES.LOADING}</p>
        </div>
      </div>
    );
  }

  // Mostrar mensaje de error
  if (error) {
    return (
      <Alert className="bg-red-50 border border-red-200 text-red-800 rounded-lg">
        <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
        <AlertDescription className="ml-2">{error}</AlertDescription>
      </Alert>
    );
  }
  
  // Mostrar mensaje cuando no hay productos
  if (totalCount === 0) {
    const message = searchTerm || selectedCategory !== 'all' || showLowStockOnly || showNoStockOnly
      ? MESSAGES.NO_RESULTS
      : MESSAGES.NO_PRODUCTS;
      
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-[#91BEAD]/20">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
          <Search className="w-6 h-6 text-[#29696B]" aria-hidden="true" />
        </div>
        <p className="text-[#7AA79C]" role="status">
          {message}
        </p>
      </div>
    );
  }
  
  // Renderizar contador de resultados
  const renderResultsCounter = () => (
    <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm text-[#29696B] flex flex-col sm:flex-row sm:justify-between items-center">
      <span>
        Total: {totalCount} {totalCount === 1 ? 'producto' : 'productos'}
      </span>
      <span className="text-[#29696B] font-medium">
        Mostrando: {showingFromTo}
      </span>
    </div>
  );
  
  // Renderizar paginación
  const renderPagination = () => {
    if (totalCount <= itemsPerPage) return null;
    
    return (
      <div className="py-4 border-t border-[#91BEAD]/20">
        <EnhancedPagination
          totalItems={totalCount}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={(page) => {
            onPageChange(page);
            
            // Scroll al inicio de la lista en móvil
            if (isMobile && mobileListRef.current) {
              mobileListRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className={isMobile ? "" : "px-6"}
        />
      </div>
    );
  };

  return (
    <>
      {/* Contador de resultados */}
      {renderResultsCounter()}
      
      {/* Vista de tabla para desktop */}
      {!isMobile && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-[#91BEAD]/20">
          <ProductTable
            products={products}
            onEdit={onEdit}
            onDelete={onDelete}
            onEditImage={onEditImage}
            onDeleteImage={onDeleteImage}
          />
          {renderPagination()}
        </div>
      )}
      
      {/* Vista de tarjetas para móvil */}
      {isMobile && (
        <div ref={mobileListRef} id="mobile-products-list" className="grid grid-cols-1 gap-4">
          {/* Paginación arriba para móvil */}
          {renderPagination()}
          
          {/* Lista de tarjetas */}
          {products.map(product => (
            <ProductCard
              key={product._id}
              product={product}
              onEdit={onEdit}
              onDelete={onDelete}
              onEditImage={onEditImage}
              onDeleteImage={onDeleteImage}
            />
          ))}
          
          {/* Información de página actual */}
          {totalPages > 1 && (
            <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm">
              <span className="text-[#29696B] font-medium">
                Página {currentPage} de {totalPages}
              </span>
            </div>
          )}
          
          {/* Paginación duplicada al final para mayor visibilidad */}
          {renderPagination()}
        </div>
      )}
    </>
  );
};

export default memo(ProductList);