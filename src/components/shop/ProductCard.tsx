import React from 'react';
import { 
  Heart, 
  ShoppingCart,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Product {
  _id: string;
  nombre: string;
  descripcion: string;
  categoria: 'limpieza' | 'mantenimiento';
  subCategoria: string;
  precio: number;
  stock: number;
  imagen?: string;
}

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onAddToCart: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFavorite,
  onToggleFavorite,
  onAddToCart
}) => {
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
            {product.imagen ? (
              <img 
                src={`data:image/jpeg;base64,${product.imagen}`}
                alt={product.nombre}
                className="object-cover h-full w-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full w-full text-[#D4F5E6]/50">
                Sin imagen
              </div>
            )}
          </div>
          
          {/* Botón de favorito */}
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-4 right-4 bg-white/50 backdrop-blur-md hover:bg-white/70 rounded-full h-8 w-8 
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
          <Button
            className={`w-full ${getButtonClass()} group transition-all duration-300 text-white`}
            onClick={onAddToCart}
          >
            <ShoppingCart size={16} className="mr-2 group-hover:animate-bounce" />
            Agregar al carrito
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};