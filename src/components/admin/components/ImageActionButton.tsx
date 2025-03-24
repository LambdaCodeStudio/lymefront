import React from 'react';
import { ImageIcon, Pencil, XCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Product } from '@/types/inventory';
import { hasProductImage } from '@/utils/image-utils';

interface ImageActionButtonProps {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Botón específico para gestionar imágenes de productos
 * Solo se muestra cuando el producto tiene una imagen
 */
const ImageActionButton: React.FC<ImageActionButtonProps> = ({ 
  product, 
  onEdit, 
  onDelete,
  size = 'sm',
  className = ''
}) => {
  // Verificar si el producto tiene imagen
  const hasImage = hasProductImage(product);

  // Si no tiene imagen, no mostrar nada
  if (!hasImage) return null;

  const sizeClass = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-10 w-10'
  }[size];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={`${sizeClass} relative group bg-white hover:bg-[#DFEFE6]/50 border-[#91BEAD] ${className}`}
            aria-label="Gestionar imagen"
          >
            <ImageIcon className="w-4 h-4 text-[#29696B] group-hover:text-[#29696B]" />
            
            {/* Acciones que aparecen al hacer hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-around bg-white/90 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                aria-label="Editar imagen"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              
              <div className="w-px h-5 bg-gray-300"></div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100"
                aria-label="Eliminar imagen"
              >
                <XCircle className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-sm">Gestionar imagen</div>
          <div className="text-xs text-gray-500">Hover para opciones</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ImageActionButton;