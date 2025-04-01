// components/ImageActionButton.tsx
import React, { memo, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Image as ImageIcon, Edit, Trash2 } from 'lucide-react';
import { Product } from '../types/inventory.types';
import { hasProductImage } from '../utils/product-image.utils';

interface ImageActionButtonProps {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Botón condicional para realizar acciones sobre imágenes de productos
 * VERSIÓN MEJORADA para verificar con precisión si el producto tiene imagen
 * 
 * @param product - Producto actual
 * @param onEdit - Función a ejecutar para editar la imagen
 * @param onDelete - Función a ejecutar para eliminar la imagen
 * @param size - Tamaño del botón
 * @param className - Clases CSS adicionales
 */
const ImageActionButton: React.FC<ImageActionButtonProps> = ({
  product,
  onEdit,
  onDelete,
  size = 'sm',
  className = ''
}) => {
  // VERIFICACIÓN ESTRICTA: 
  // Usamos hasProductImage con evaluación adicional para mayor seguridad
  const productHasImage = useMemo(() => {
    const hasImage = hasProductImage(product);
    
    // Verificación adicional por si la función falla
    const hasExplicitImage = product.imageUrl && product.imageUrl.trim() !== '';
    
    return hasImage || hasExplicitImage;
  }, [product]);
  
  // Si el producto no tiene imagen, no renderizar nada
  if (!productHasImage) {
    return null;
  }
  
  // Determinar clases según el tamaño
  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'sm': return 'h-8 w-8';
      case 'md': return 'h-9 w-9';
      case 'lg': return 'h-10 w-10';
      default: return 'h-8 w-8';
    }
  }, [size]);
  
  return (
    <TooltipProvider>
      <div className={`dropdown relative ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`p-0 bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 group ${sizeClasses}`}
              aria-label="Opciones de imagen"
            >
              <ImageIcon className="w-4 h-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Gestionar imagen</p>
          </TooltipContent>
        </Tooltip>
        
        <div className="dropdown-menu absolute right-0 top-full mt-1 z-10 w-40 rounded-md shadow-md bg-white border border-gray-200 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200">
          <div className="p-1 flex flex-col">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="justify-start text-blue-700 hover:bg-blue-50"
              aria-label="Cambiar imagen"
            >
              <Edit className="w-4 h-4 mr-2" aria-hidden="true" />
              <span>Cambiar imagen</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="justify-start text-red-600 hover:bg-red-50"
              aria-label="Eliminar imagen"
            >
              <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
              <span>Eliminar imagen</span>
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default memo(ImageActionButton);