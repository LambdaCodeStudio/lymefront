import React, { useState } from 'react';
import { 
  Heart, 
  ShoppingCart,
  AlertTriangle,
  Plus,
  Minus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
// Importar el componente ProductImage
import ProductImage from '@/components/admin/components/ProductImage';

interface Product {
  _id: string;
  nombre: string;
  descripcion: string;
  categoria: 'limpieza' | 'mantenimiento';
  subCategoria: string;
  precio: number;
  stock: number;
  hasImage?: boolean;
}

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onAddToCart: (quantity: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFavorite,
  onToggleFavorite,
  onAddToCart
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
        <div className="relative pt-3 px-3">
          <div className="aspect-square rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
            <ProductImage 
              productId={product._id}
              alt={product.nombre}
              width={300}
              height={300}
              quality={85}
              className="object-cover h-full w-full"
              containerClassName="h-full w-full"
              fallbackClassName="h-full w-full"
              placeholderText="Sin imagen"
            />
          </div>
          
          {/* Botón de favorito */}
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-4 right-4 bg-white/50 backdrop-blur-md hover:bg-red/70 rounded-full h-8 w-8 
              ${isFavorite ? 'text-red-500' : 'text-[#00888A]/70'}`}
            onClick={onToggleFavorite}
          >
            <Heart className={isFavorite ? 'fill-current' : ''} size={16} />
          </Button>
          
          {/* Indicador de stock bajo */}
          {product.stock <= 5 && (
            <Badge className="absolute top-4 left-4 bg-amber-50 text-amber-700 border-amber-200">
              <AlertTriangle size={12} className="mr-1" />
              Stock bajo
            </Badge>
          )}
        </div>
        
        <CardContent className="flex-grow pt-4">
          <Badge variant="outline" className="mb-2 text-xs border-[#75D0E0] text-[#D4F5E6] bg-[#75D0E0]/20">
            {product.subCategoria}
          </Badge>
          
          <h3 className="font-medium text-lg mb-1 line-clamp-1 text-white">{product.nombre}</h3>
          
          {product.descripcion && (
            <p className="text-sm text-[#D4F5E6]/80 line-clamp-2 mb-3">
              {product.descripcion}
            </p>
          )}
          
          <div className="text-xl font-bold text-white">${product.precio.toFixed(2)}</div>
        </CardContent>
        
        <CardFooter className="pt-2 pb-4">
          {showQuantitySelector ? (
            <div className="w-full">
              <div className="flex items-center justify-between mb-2 bg-white/10 rounded-md p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-[#D4F5E6]"
                  onClick={() => handleQuantityChange(quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  className="w-14 h-8 text-center p-0 border-0 bg-transparent focus:ring-0 text-[#D4F5E6]"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-[#D4F5E6]"
                  onClick={() => handleQuantityChange(quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <Button
                className={`w-full ${getButtonClass()} text-white`}
                onClick={handleAddToCart}
              >
                <ShoppingCart size={16} className="mr-2" />
                Agregar {quantity} {quantity > 1 ? 'unidades' : 'unidad'}
              </Button>
            </div>
          ) : (
            <Button
              className={`w-full ${getButtonClass()} group transition-all duration-300 text-white`}
              onClick={() => setShowQuantitySelector(true)}
            >
              <ShoppingCart size={16} className="mr-2 group-hover:animate-bounce" />
              Agregar al carrito
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};