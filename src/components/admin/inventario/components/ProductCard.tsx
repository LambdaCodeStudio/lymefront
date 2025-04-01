// components/ProductCard.tsx
import React, { memo } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Edit,
  Trash2,
  PackageOpen,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import ProductImage from './ProductImage';
import StockIndicator from './StockIndicator';
import ImageActionButton from './ImageActionButton';
import { Product, ComboItem } from '../types/inventory.types';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onEditImage: (product: Product) => void;
  onDeleteImage: (id: string) => void;
}

/**
 * Componente de tarjeta de producto optimizado para vista móvil
 * 
 * @param product - Producto a mostrar
 * @param onEdit - Función para editar el producto
 * @param onDelete - Función para eliminar el producto
 * @param onEditImage - Función para editar la imagen
 * @param onDeleteImage - Función para eliminar la imagen
 */
const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete,
  onEditImage,
  onDeleteImage
}) => {
  
  /**
   * Renderiza los items del combo si el producto es uno
   */
  const renderComboItems = () => {
    if (!product.esCombo || !product.itemsCombo || product.itemsCombo.length === 0) {
      return null;
    }
    
    return (
      <div className="mt-2 pt-2 border-t border-[#91BEAD]/10">
        <p className="text-xs font-medium text-[#29696B] mb-1">Productos en el combo:</p>
        <div className="text-xs text-[#7AA79C] max-h-24 overflow-y-auto pr-1">
          {product.itemsCombo.map((item, index) => {
            const productoNombre = item.productoId && typeof item.productoId === 'object'
              ? item.productoId.nombre
              : 'Producto';

            return (
              <div key={index} className="flex justify-between py-1 border-b border-[#91BEAD]/10 last:border-0">
                <span>{productoNombre}</span>
                <span>x{item.cantidad}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  // Determina clases para la tarjeta basadas en el estado del producto
  const cardClasses = product.stock > 0 && product.alertaStockBajo
    ? 'border-yellow-300 bg-yellow-50'
    : product.stock <= 0
      ? 'border-red-300 bg-red-50'
      : product.esCombo
        ? 'border-[#00888A]/50 bg-[#00888A]/5'
        : 'border-[#91BEAD]/20 bg-white';

  return (
    <Card className={`overflow-hidden shadow-sm border ${cardClasses}`}>
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <CardTitle 
              className="text-base truncate mr-2 text-[#29696B] max-w-[200px]"
              title={product.nombre}
            >
              {product.nombre}
            </CardTitle>
            {product.esCombo && (
              <Badge variant="outline" className="bg-[#00888A]/10 border-[#00888A] text-[#00888A] text-xs">
                Combo
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 pb-3">
        <div className="flex gap-4 mb-3">
          <ProductImage 
            product={product} 
            size="medium" 
            className="flex-shrink-0"
            alt={`Imagen de ${product.nombre}`}
          />
          <div className="flex-1 min-w-0">
            {product.descripcion && (
              <p className="text-sm text-[#7AA79C] line-clamp-2 mb-2">
                {product.descripcion}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 text-[#91BEAD] mr-1" aria-hidden="true" />
                <span className="font-medium text-[#29696B]">
                  ${product.precio.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center">
                <PackageOpen className="w-4 h-4 text-[#91BEAD] mr-1" aria-hidden="true" />
                <span className={`font-medium ${
                  product.stock <= 0
                    ? 'text-red-600'
                    : product.alertaStockBajo
                      ? 'text-yellow-600 flex items-center gap-1'
                      : 'text-[#29696B]'
                }`}>
                  {product.alertaStockBajo && product.stock > 0 && (
                    <AlertTriangle className="w-3 h-3 text-yellow-500 animate-pulse" aria-hidden="true" />
                  )}
                  {product.stock <= 0 ? 'Sin stock' : `${product.stock} unid.`}
                </span>
              </div>
            </div>
            <div className="mt-2 text-xs text-[#7AA79C]">
              <div className="flex justify-between">
                <span className="block">
                  <Badge variant="outline" className="capitalize text-xs border-[#91BEAD] text-[#29696B]">
                    {product.esCombo ? 'Combo' : product.categoria}
                  </Badge>
                </span>
              </div>

              <div className="flex justify-between items-center mt-1">
                <span className="capitalize">{product.subCategoria}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items del combo */}
        {renderComboItems()}
      </CardContent>
      <CardFooter className="p-2 flex justify-end gap-2 bg-[#DFEFE6]/20 border-t border-[#91BEAD]/10">
        {/* Botón para gestionar imagen */}
        <ImageActionButton
          product={product}
          onEdit={() => onEditImage(product)}
          onDelete={() => onDeleteImage(product._id)}
          size="md"
        />
        
        {/* Botón para editar producto */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(product)}
          className="text-[#29696B] hover:bg-[#DFEFE6]"
          aria-label={`Editar ${product.nombre}`}
        >
          <Edit className="w-4 h-4" aria-hidden="true" />
        </Button>
        
        {/* Botón para eliminar producto */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(product._id)}
          className="text-red-600 hover:text-red-800 hover:bg-red-50"
          aria-label={`Eliminar ${product.nombre}`}
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default memo(ProductCard);