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
      return 'from-blue-900/40 to-blue-800/20';
    }
    return 'from-purple-900/40 to-purple-800/20';
  };

  // Determinar el color de borde según la categoría
  const getBorderClass = () => {
    if (product.categoria === 'limpieza') {
      return 'border-blue-900';
    }
    return 'border-purple-900';
  };

  // Determinar el color del botón según la categoría
  const getButtonClass = () => {
    if (product.categoria === 'limpieza') {
      return 'bg-blue-700 hover:bg-blue-600';
    }
    return 'bg-purple-700 hover:bg-purple-600';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5 }}
      className="h-full"
    >
      <Card className={`h-full flex flex-col bg-gradient-to-br ${getGradientClass()} backdrop-blur-sm border ${getBorderClass()} hover:shadow-lg hover:shadow-purple-900/20 transition-all overflow-hidden`}>
        {/* Imagen del producto */}
        <div className="relative pt-3 px-3">
          <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
            {product.imagen ? (
              <img 
                src={`data:image/jpeg;base64,${product.imagen}`}
                alt={product.nombre}
                className="object-cover h-full w-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full w-full text-gray-500">
                Sin imagen
              </div>
            )}
          </div>
          
          {/* Botón de favorito */}
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-4 right-4 bg-black/40 backdrop-blur-md hover:bg-black/60 rounded-full h-8 w-8 
              ${isFavorite ? 'text-red-500' : 'text-gray-300'}`}
            onClick={onToggleFavorite}
          >
            <Heart className={isFavorite ? 'fill-current' : ''} size={16} />
          </Button>
          
          {/* Indicador de stock bajo */}
          {product.stock <= 5 && (
            <Badge className="absolute top-4 left-4 bg-yellow-900/80 text-yellow-200 border-yellow-800">
              <AlertTriangle size={12} className="mr-1" />
              Stock bajo
            </Badge>
          )}
        </div>
        
        <CardContent className="flex-grow pt-4">
          <Badge variant="outline" className="mb-2 text-xs border-gray-700 text-gray-300 bg-gray-800/50">
            {product.subCategoria}
          </Badge>
          
          <h3 className="font-medium text-lg mb-1 line-clamp-1 text-white">{product.nombre}</h3>
          
          {product.descripcion && (
            <p className="text-sm text-gray-300 line-clamp-2 mb-3">
              {product.descripcion}
            </p>
          )}
          
          <div className="text-xl font-bold text-white">${product.precio.toFixed(2)}</div>
        </CardContent>
        
        <CardFooter className="pt-2 pb-4">
          <Button
            className={`w-full ${getButtonClass()} group transition-all duration-300`}
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