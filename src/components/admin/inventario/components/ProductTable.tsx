// components/ProductTable.tsx
import React, { memo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from 'lucide-react';
import ProductImage from './ProductImage';
import StockIndicator from './StockIndicator';
import ImageActionButton from './ImageActionButton';
import { Product } from '../types/inventory.types';
import { hasProductImage } from '../utils/product-image.utils';

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onEditImage: (product: Product) => void;
  onDeleteImage: (id: string) => void;
}

/**
 * Componente de tabla de productos optimizado para vista desktop
 * 
 * @param products - Lista de productos a mostrar
 * @param onEdit - Función para editar un producto
 * @param onDelete - Función para eliminar un producto
 * @param onEditImage - Función para editar imagen
 * @param onDeleteImage - Función para eliminar imagen
 */
const ProductTable: React.FC<ProductTableProps> = ({
  products,
  onEdit,
  onDelete,
  onEditImage,
  onDeleteImage
}) => {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-[#DFEFE6]/50 border-b border-[#91BEAD]/20">
          <TableRow>
            <TableHead className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
              Nombre
            </TableHead>
            <TableHead className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
              Categoría/Subcategoría
            </TableHead>
            <TableHead className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
              Precio
            </TableHead>
            <TableHead className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
              Stock
            </TableHead>
            <TableHead className="px-6 py-3 text-right text-xs font-medium text-[#29696B] uppercase tracking-wider">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="bg-white divide-y divide-[#91BEAD]/20">
          {products.map((product) => (
            <TableRow
              key={product._id}
              className={`hover:bg-[#DFEFE6]/20 transition-colors ${
                product.stock > 0 && product.alertaStockBajo
                  ? 'bg-yellow-50 hover:bg-yellow-100'
                  : product.stock <= 0
                    ? 'bg-red-50 hover:bg-red-100'
                    : ''
              }`}
            >
              <TableCell className="px-6 py-4">
                <div className="flex items-center">
                  <ProductImage 
                    product={product} 
                    size="small" 
                    className="mr-3" 
                    alt={`Imagen de ${product.nombre}`}
                  />
                  <div className="min-w-0 max-w-[200px]">
                    <div className="flex items-center">
                      <div 
                        className="text-sm font-medium text-[#29696B] truncate"
                        title={product.nombre}
                      >
                        {product.nombre}
                      </div>
                      {product.esCombo && (
                        <Badge variant="outline" className="ml-2 bg-[#00888A]/10 border-[#00888A] text-[#00888A] text-xs">
                          Combo
                        </Badge>
                      )}
                      {hasProductImage(product) && (
                        <div 
                          className="ml-2 w-2 h-2 rounded-full bg-blue-500" 
                          title="Tiene imagen"
                          aria-hidden="true"
                        ></div>
                      )}
                    </div>
                    {product.descripcion && (
                      <div 
                        className="text-sm text-[#7AA79C] truncate"
                        title={product.descripcion}
                      >
                        {product.descripcion}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="px-6 py-4 text-sm text-[#7AA79C]">
                <Badge variant="outline" className="capitalize border-[#91BEAD] text-[#29696B]">
                  {product.esCombo ? 'Combo' : product.categoria}
                </Badge>
                <div className="text-xs mt-1 capitalize text-[#7AA79C]">
                  {product.subCategoria}
                </div>
              </TableCell>
              <TableCell className="px-6 py-4 text-sm font-medium text-[#29696B]">
                ${product.precio.toFixed(2)}
              </TableCell>
              <TableCell className="px-6 py-4">
                <StockIndicator 
                  stock={product.stock} 
                  alertaStockBajo={product.alertaStockBajo}
                  stockMinimo={product.stockMinimo}
                />
              </TableCell>
              <TableCell className="px-6 py-4 text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
                  {/* Botón específico para gestionar imagen */}
                  <ImageActionButton
                    product={product}
                    onEdit={() => onEditImage(product)}
                    onDelete={() => onDeleteImage(product._id)}
                    className="mr-1"
                  />
                  
                  {/* Botón para editar producto */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(product)}
                    className="text-[#29696B] hover:text-[#29696B] hover:bg-[#DFEFE6]"
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
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default memo(ProductTable);