import React, { useState } from 'react';
import {
  Heart,
  ShoppingCart,
  AlertTriangle,
  Plus,
  Minus,
  Package,
  Check
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
// Importar el componente OptimizedProductImage en lugar del original
import OptimizedProductImage from '@/components/OptimizedProductImage';

interface Product {
  _id: string;
  nombre: string;
  descripcion: string;
  categoria: 'limpieza' | 'mantenimiento';
  subCategoria: string;
  precio: number;
  stock: number;
  hasImage?: boolean;
  imageBase64?: string;
}

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onAddToCart: (quantity: number) => void;
  useBase64?: boolean; // Propiedad para elegir el formato de imagen
  compact?: boolean; // Nueva propiedad para modo compacto en móviles
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  useBase64 = true,
  compact = false // Por defecto, no usar modo compacto
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [showQuantitySelector, setShowQuantitySelector] = useState<boolean>(false);

  // Función para truncar texto largo
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  // Determinar la clase de gradiente según la categoría
  const getGradientClass = () => {
    if (product.categoria === 'limpieza') {
      return 'from-[#00888A]/70 to-[#50C3AD]/70';
    }
    return 'from-[#50C3AD]/70 to-[#75D0E0]/70';
  };

  // Determinar el color de borde según la categoría
  const getBorderClass = () => {
    if (product.categoria === 'limpieza') {
      return 'border-[#00888A]';
    }
    return 'border-[#50C3AD]';
  };

  // Determinar el color del botón según la categoría
  const getButtonClass = () => {
    if (product.categoria === 'limpieza') {
      return 'bg-[#00888A] hover:bg-[#50C3AD]';
    }
    return 'bg-[#50C3AD] hover:bg-[#00888A]';
  };

  // Obtener colores y estilos para el indicador de stock
  const getStockBadgeStyle = () => {
    if (product.stock <= 5) {
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        icon: <AlertTriangle size={12} className="mr-1" />
      };
    } else if (product.stock <= 15) {
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        icon: <Package size={12} className="mr-1" />
      };
    } else {
      return {
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200',
        icon: <Check size={12} className="mr-1" />
      };
    }
  };

  // Manejar cambio de cantidad
  const handleQuantityChange = (newQuantity: number) => {
    // Asegurar que la cantidad esté entre 1 y el stock disponible
    const limitedQuantity = Math.min(Math.max(1, newQuantity), product.stock);
    setQuantity(limitedQuantity);
  };

  // Manejar añadir al carrito
  const handleAddToCart = () => {
    onAddToCart(quantity);
    setShowQuantitySelector(false);
    setQuantity(1); // Resetear a 1 después de añadir
  };

  // Obtener estilo del indicador de stock
  const stockStyle = getStockBadgeStyle();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5 }}
      className="h-full"
    >
      <Card className={`h-full flex flex-col bg-gradient-to-br ${getGradientClass()} backdrop-blur-sm border ${getBorderClass()} hover:shadow-lg transition-all overflow-hidden`}>
        {/* Imagen del producto */}
        <div className="relative pt-2 sm:pt-3 px-2 sm:px-3">
          <div className="aspect-square rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
            <div className="w-full h-full flex items-center justify-center">
              {/* Usar la imagen base64 directamente si está disponible */}
              {useBase64 && product.imageBase64 ? (
                <img
                  src={product.imageBase64}
                  alt={product.nombre}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <OptimizedProductImage
                  productId={product._id}
                  alt={product.nombre}
                  width={300}
                  height={300}
                  quality={compact ? 60 : 75} // Calidad reducida para mejor rendimiento
                  className="max-w-full max-h-full object-contain"
                  containerClassName="h-full w-full flex items-center justify-center"
                  fallbackClassName="h-full w-full flex items-center justify-center"
                  placeholderText="Sin imagen"
                  useBase64={useBase64}
                  priority={false} // Solo priorizar imágenes críticas
                />
              )}
            </div>
          </div>

          {/* Botón de favorito - más pequeño en modo compacto */}
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-3 sm:top-4 right-3 sm:right-4 bg-white/50 backdrop-blur-md hover:bg-red/70 rounded-full 
              ${compact ? 'h-6 w-6' : 'h-8 w-8'} 
              ${isFavorite ? 'text-red-500' : 'text-[#00888A]/70'}`}
            onClick={onToggleFavorite}
          >
            <Heart className={isFavorite ? 'fill-current' : ''} size={compact ? 12 : 16} />
          </Button>

          {/* Indicador de stock - ahora se muestra para todos los productos */}
          <Badge className={`absolute top-3 sm:top-4 left-3 sm:left-4 ${stockStyle.bg} ${stockStyle.text} border ${stockStyle.border}
            ${compact ? 'text-xs px-1.5 py-0.5' : ''}`}>
            {compact ? (
              <span>Stock: {product.stock}</span>
            ) : (
              <>
                {stockStyle.icon}
                {product.stock <= 5 ? 'Stock bajo' : `Stock: ${product.stock}`}
              </>
            )}
          </Badge>
        </div>

        <CardContent className={`flex-grow ${compact ? 'pt-2 px-3' : 'pt-4'}`}>
          {/* Badge de categoría - oculto en modo compacto en XS */}
          <Badge 
            variant="outline" 
            className={`mb-1 sm:mb-2 text-xs border-[#75D0E0] text-[#D4F5E6] bg-[#75D0E0]/20
              ${compact ? 'hidden xs:inline-flex' : ''}`}
          >
            {product.subCategoria}
          </Badge>

          {/* Nombre del producto - tamaño de fuente reducido en modo compacto */}
          <h3 className={`font-medium line-clamp-1 text-white 
            ${compact ? 'text-base' : 'text-lg mb-1'}`}>
            {product.nombre}
          </h3>

          {/* Descripción - más corta o incluso oculta en modo compacto */}
          {product.descripcion && !compact && (
            <p className="text-sm text-[#D4F5E6]/80 line-clamp-2 mb-3">
              {product.descripcion}
            </p>
          )}

          {/* Precio - tamaño de fuente reducido en modo compacto */}
          <div className={`font-bold text-white ${compact ? 'text-lg mt-1' : 'text-xl'}`}>
            ${product.precio.toFixed(2)}
          </div>
        </CardContent>

        <CardFooter className={compact ? "pt-1 pb-3 px-3" : "pt-2 pb-4"}>
          {showQuantitySelector ? (
            <div className="w-full">
              <div className="flex items-center justify-between mb-2 bg-white/10 rounded-md p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${compact ? 'h-7 w-7' : 'h-8 w-8'} p-0 text-[#D4F5E6]`}
                  onClick={() => handleQuantityChange(quantity - 1)}
                >
                  <Minus className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
                </Button>
                <Input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  className={`${compact ? 'w-10 h-7' : 'w-14 h-8'} text-center p-0 border-0 bg-transparent focus:ring-0 text-[#D4F5E6]`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${compact ? 'h-7 w-7' : 'h-8 w-8'} p-0 text-[#D4F5E6]`}
                  onClick={() => handleQuantityChange(quantity + 1)}
                >
                  <Plus className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
                </Button>
              </div>
              <Button
                className={`w-full ${getButtonClass()} text-white ${compact ? 'text-xs py-1 h-8' : ''}`}
                onClick={handleAddToCart}
              >
                <ShoppingCart size={compact ? 14 : 16} className="mr-1 sm:mr-2" />
                {compact ? `Añadir (${quantity})` : `Agregar ${quantity} ${quantity > 1 ? 'unidades' : 'unidad'}`}
              </Button>
            </div>
          ) : (
            <Button
              className={`w-full ${getButtonClass()} group transition-all duration-300 text-white 
                ${compact ? 'text-xs py-1 h-8' : ''}`}
              onClick={() => setShowQuantitySelector(true)}
            >
              <ShoppingCart size={compact ? 14 : 16} className="mr-1 sm:mr-2 group-hover:animate-bounce" />
              {compact ? 'Añadir' : 'Agregar al carrito'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};