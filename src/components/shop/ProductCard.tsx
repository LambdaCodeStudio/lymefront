import React, { useState } from 'react';
import {
  Heart,
  ShoppingCart,
  AlertTriangle,
  Plus,
  Minus,
  Package,
  Check,
  PackagePlus,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Interfaz para elementos de combo
interface ComboItem {
  productoId: string | {
    _id: string;
    nombre: string;
    precio: number;
  };
  cantidad: number;
}

// Interfaz para el producto adaptada al modelo del backend
interface Product {
  _id: string;
  nombre: string;
  descripcion?: string;
  categoria: 'limpieza' | 'mantenimiento';
  subCategoria?: string;
  marca?: string;
  precio: number;
  stock: number;
  stockMinimo?: number;
  alertaStockBajo?: boolean;
  hasImage?: boolean;
  imageUrl?: string; // URL directa a la imagen almacenada en public
  imagenInfo?: {
    mimetype?: string;
    tamano?: number;
    ultimaActualizacion?: string;
  };
  esCombo?: boolean;
  itemsCombo?: ComboItem[];
  estado?: 'activo' | 'discontinuado' | 'agotado';
  vendidos?: number;
}

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onAddToCart: (quantity: number) => void;
  useBase64?: boolean; // Propiedad para elegir el formato de imagen (deprecated)
  compact?: boolean; // Nueva propiedad para modo compacto en móviles
  onShowDetails?: () => void; // Callback para mostrar detalles/modal
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  useBase64 = false, // Mantenido por compatibilidad
  compact = false, // Por defecto, no usar modo compacto
  onShowDetails
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [showQuantitySelector, setShowQuantitySelector] = useState<boolean>(false);
  const [showDescription, setShowDescription] = useState<boolean>(false);
  const [expandedCombo, setExpandedCombo] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  // URL base para la API (solo usado como fallback)
  const API_URL = 'http://localhost:3000/api';

  // Función para truncar texto largo
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  // Determinar la clase de gradiente según la categoría
  const getGradientClass = () => {
    if (product.esCombo) {
      return 'from-[#3a8fb7]/80 to-[#5baed1]/80'; // Degradado para combos
    } else if (product.categoria === 'limpieza') {
      return 'from-[#5baed1]/80 to-[#a8e6cf]/80'; // Degradado para limpieza
    }
    return 'from-[#2a7a9f]/80 to-[#3a8fb7]/80'; // Degradado para mantenimiento
  };

  // Determinar el color de borde según la categoría
  const getBorderClass = () => {
    if (product.esCombo) {
      return 'border-[#3a8fb7]'; // Borde para combos
    } else if (product.categoria === 'limpieza') {
      return 'border-[#5baed1]'; // Borde para limpieza
    }
    return 'border-[#2a7a9f]'; // Borde para mantenimiento
  };

  // Determinar el color del botón según la categoría
  const getButtonClass = () => {
    if (product.esCombo) {
      return 'bg-[#3a8fb7] hover:bg-[#2a7a9f]'; // Botón especial para combos
    } else if (product.categoria === 'limpieza') {
      return 'bg-[#3a8fb7] hover:bg-[#5baed1]'; // Botón para limpieza
    }
    return 'bg-[#2a7a9f] hover:bg-[#3a8fb7]'; // Botón para mantenimiento
  };

  // Obtener colores y estilos para el indicador de stock
  const getStockBadgeStyle = () => {
    // Para productos de mantenimiento, no mostramos stock específico
    if (product.categoria === 'mantenimiento') {
      return {
        bg: 'bg-[#f2f2f2]',
        text: 'text-[#3a8fb7]',
        border: 'border-[#3a8fb7]',
        icon: <Check size={12} className="mr-1" />,
        label: 'Disponible'
      };
    }

    // Para productos de limpieza - ahora usando alertaStockBajo del backend
    if (product.stock === 0) {
      return {
        bg: 'bg-[#F44336]/10',
        text: 'text-[#F44336]',
        border: 'border-[#F44336]',
        icon: <AlertTriangle size={12} className="mr-1" />,
        label: 'Sin stock'
      };
    } else if (product.alertaStockBajo) {
      return {
        bg: 'bg-[#FF9800]/10',
        text: 'text-[#FF9800]',
        border: 'border-[#FF9800]',
        icon: <Package size={12} className="mr-1" />,
        label: `Stock: ${product.stock}`
      };
    } else {
      return {
        bg: 'bg-[#a8e6cf]/30',
        text: 'text-[#2a7a9f]',
        border: 'border-[#a8e6cf]',
        icon: <Check size={12} className="mr-1" />,
        label: `Stock: ${product.stock}`
      };
    }
  };

  // Manejar cambio de cantidad con validación según categoría y si es combo
  const handleQuantityChange = (newQuantity: number) => {
    // Asegurar que la cantidad sea siempre al menos 1
    newQuantity = Math.max(1, newQuantity);

    // Para combos, limitamos a 1 unidad máximo
    if (product.esCombo) {
      setQuantity(1);
      return;
    }

    // Para productos de mantenimiento, NO limitamos por stock
    if (product.categoria === 'mantenimiento') {
      // Sin límite superior para productos de mantenimiento
      setQuantity(newQuantity);
      return;
    }

    // Para productos de limpieza y otros, limitamos según stock disponible
    const maxQuantity = product.stock;
    const limitedQuantity = Math.min(newQuantity, maxQuantity);
    setQuantity(limitedQuantity);
  };

  // Manejar añadir al carrito
  const handleAddToCart = () => {
    onAddToCart(quantity);
    setShowQuantitySelector(false);
    setQuantity(1); // Resetear a 1 después de añadir
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Marcar que hubo un error con la imagen para mostrar el fallback
    setImageError(true);

    // Registrar información de diagnóstico
    console.error(`Error cargando imagen: ${product.nombre} (${product._id})`);

    // Verificar si el elemento sigue en el DOM antes de intentar modificarlo
    const target = e.target as HTMLImageElement;
    if (target && target.parentElement) {
      // Si estamos en desarrollo, mostrar información de depuración
      if (process.env.NODE_ENV === 'development') {
      }
    }
  };

  // Obtener estilo del indicador de stock
  const stockStyle = getStockBadgeStyle();

  // Verificar si el producto está disponible para comprar
  const isAvailable = product.categoria === 'mantenimiento' || product.stock > 0;

  // Extraer nombres de productos del combo para mostrar
  const getComboItems = () => {
    if (!product.esCombo || !product.itemsCombo || product.itemsCombo.length === 0) {
      return [];
    }

    return product.itemsCombo.map(item => {
      let nombre = 'Producto';
      let cantidad = item.cantidad;

      if (typeof item.productoId === 'object' && item.productoId.nombre) {
        nombre = item.productoId.nombre;
      }

      return { nombre, cantidad };
    });
  };

  // Renderizar contenido de combo
  const renderComboContent = () => {
    const comboItems = getComboItems();
    if (comboItems.length === 0) return null;

    // Número de elementos a mostrar inicialmente
    const initialItemsToShow = 3;
    const hasMoreItems = comboItems.length > initialItemsToShow;

    // Determinar qué elementos mostrar
    const displayedItems = expandedCombo
      ? comboItems
      : comboItems.slice(0, initialItemsToShow);

    const toggleExpand = (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpandedCombo(!expandedCombo);
    };

    return (
      <div className="mt-2 text-[#333333] bg-[#d4f1f9]/50 rounded-md p-2 text-xs">
        <div className="font-medium mb-1 flex items-center justify-between">
          <div className="flex items-center">
            <PackagePlus size={14} className="mr-1 text-[#3a8fb7]" />
            Incluye:
          </div>
          {hasMoreItems && (
            <Button
              variant="ghost"
              className="h-5 px-1 py-0 text-[10px] text-[#333333] hover:bg-[#3a8fb7]/20"
              onClick={toggleExpand}
            >
              {expandedCombo ? 'Ver menos' : `Ver todos (${comboItems.length})`}
            </Button>
          )}
        </div>
        <ul className={`space-y-1 ${expandedCombo ? 'max-h-48' : 'max-h-16'} overflow-y-auto transition-all duration-300 scrollbar-thin scrollbar-thumb-[#3a8fb7]/40 scrollbar-track-transparent`}>
          {displayedItems.map((item, index) => (
            <li key={index} className="flex justify-between">
              <span className="truncate pr-2">{item.nombre}</span>
              <span className="text-[#3a8fb7]">x{item.cantidad}</span>
            </li>
          ))}
        </ul>
        {!expandedCombo && hasMoreItems && (
          <div className="mt-1 text-center text-[#5c5c5c] text-[10px]">
            +{comboItems.length - initialItemsToShow} productos más
          </div>
        )}
      </div>
    );
  };

  // Toggle para mostrar/ocultar descripción completa
  const toggleDescription = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDescription(!showDescription);
  };

  // URL para imágenes - OPTIMIZADA para depuración
  const getImageUrl = () => {
    // Si el producto tiene imageUrl, usarla directamente sin modificaciones
    // Ya que esta URL debería estar configurada correctamente para el entorno frontend
    if (product.imageUrl) {
      return product.imageUrl;
    }

    // Si no tiene imageUrl pero tiene ID, construir una URL basada en el ID
    if (product._id) {
      const url = `/images/products/${product._id}.webp`;
      return url;
    }

    // Esto solo se usaría si no hay imageUrl ni ID disponible
    return `${API_URL}/producto/${product._id}/imagen`;
  };

  // Verificar si el producto tiene imagen
  const hasImage = () => {
    // Consideramos que tiene imagen si:
    // 1. Tiene imageUrl explícitamente
    // 2. El backend ha indicado que tiene imagen (hasImage)
    // 3. Asumimos que tiene imagen si tiene ID (último recurso)
    return !!product.imageUrl || product.hasImage === true || !!product._id;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5 }}
      className="h-full product-card"
    >
      <Card
        className={`h-full flex flex-col bg-gradient-to-br ${getGradientClass()} border ${getBorderClass()} hover:shadow-lg hover:shadow-[#3a8fb7]/30 transition-all duration-300 overflow-hidden`}
        onClick={onShowDetails}
      >
        {/* Imagen del producto - Optimizada para responsividad */}
        <div className="pt-2 sm:pt-3 px-2 sm:px-3">
          <div className="aspect-square w-full rounded-lg overflow-hidden bg-white relative">
            {hasImage() && !imageError ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src={getImageUrl()}
                  alt={product.nombre}
                  className="w-full h-full object-contain"
                  loading="lazy"
                  onError={handleImageError}
                  onLoad={() => {
                  }}
                />
              </div>
            ) : (
              // Fallback cuando no hay imagen o hubo un error
              <div className="flex items-center justify-center w-full h-full">
                <img
                  src="/lyme.png"
                  alt="Lyme Logo"
                  className="h-3/4 w-3/4 object-contain"
                />
                <span className="absolute text-[#5c5c5c] text-xs">
                  {product.esCombo}
                </span>
              </div>
            )}

            {/* Badge de combo */}
            {product.esCombo && (
              <Badge
                className="absolute top-2 left-2 z-10 bg-[#ffffff] text-[#3a8fb7] border border-[#3a8fb7]"
              >
                <PackagePlus size={12} className="mr-1" />
                Combo
              </Badge>
            )}

            {/* Badge de estado si está discontinuado o agotado */}
            {product.estado && product.estado !== 'activo' && (
              <Badge
                className={`absolute ${product.esCombo ? 'top-9' : 'top-2'} right-2 z-10 
                  ${product.estado === 'discontinuado'
                    ? 'bg-[#F44336]/10 text-[#F44336] border-[#F44336]'
                    : 'bg-[#FF9800]/10 text-[#FF9800] border-[#FF9800]'}`}
              >
                {product.estado === 'discontinuado' ? 'Discontinuado' : 'Agotado'}
              </Badge>
            )}

            {/* Indicador de stock - Con diseño adaptable */}
            {(product.categoria === 'limpieza' || product.categoria === 'mantenimiento') && (
              <Badge className={`absolute ${product.esCombo ? 'top-9' : 'top-2'} left-2 z-10
                ${stockStyle.bg} ${stockStyle.text} border ${stockStyle.border}
                ${compact ? 'text-xs px-1.5 py-0.5' : ''} transition-all`}>
                {compact ? (
                  <span>{product.categoria === 'mantenimiento' ? 'Disponible' : `Stock: ${product.stock}`}</span>
                ) : (
                  <>
                    {stockStyle.icon}
                    {stockStyle.label}
                  </>
                )}
              </Badge>
            )}

            {/* Botón de favorito - Adaptable y con área táctil adecuada */}
            <Button
              variant="ghost"
              size="icon"
              className={`absolute top-2 right-2 z-10 bg-white/70 hover:bg-[#a8e6cf]/30 rounded-full 
                ${compact ? 'h-7 w-7 sm:h-8 sm:w-8' : 'h-8 w-8'} 
                ${isFavorite ? 'text-[#FF9800]' : 'text-[#5c5c5c]'} 
                transition-all duration-200 touch-manipulation`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
            >
              <Heart className={isFavorite ? 'fill-current' : ''} size={compact ? 16 : 18} />
            </Button>
          </div>
        </div>

        <CardContent className={`flex-grow ${compact ? 'pt-2 px-2 sm:px-3' : 'pt-3 sm:pt-4 px-3'}`}>
          {/* Badge de categoría - Ahora siempre visible, mostrando Limpieza o Mantenimiento */}
          <div className="flex flex-wrap gap-1 mb-1 sm:mb-2">
            {/* Badge de categoría principal */}
            <Badge
              variant="outline"
              className={`text-xs border-[#3a8fb7] text-[#333333] bg-white/60
                category-badge ${product.categoria === 'mantenimiento' ? 'maintenance' : 'cleaning'}`}
            >
              {product.categoria === 'mantenimiento' ? 'Mantenimiento' : 'Limpieza'}
            </Badge>

            {/* Badge de subcategoría - Opcional */}
            {product.subCategoria && (
              <Badge
                variant="outline"
                className={`text-xs border-[#3a8fb7] text-[#333333] bg-white/60
                  ${compact ? 'hidden xs:inline-flex' : ''} category-badge ${product.categoria === 'mantenimiento' ? 'maintenance' : 'cleaning'}`}
              >
                {product.subCategoria}
              </Badge>
            )}
          </div>

          {/* Nombre del producto - Ahora sin truncar */}
          <h3 className={`font-medium text-[#333333] 
            ${compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'} mb-1`}>
            {product.nombre}
          </h3>

          {/* Descripción - Con expansión controlada */}
          {product.descripcion && (
            <div className="relative">
              <p className={`text-sm text-[#4a4a4a] ${showDescription ? '' : 'line-clamp-2'} 
                ${compact ? 'text-xs sm:text-sm mb-1' : 'mb-1 sm:mb-2'}`}>
                {product.descripcion}
              </p>
              {product.descripcion.length > 100 && (
                <Button
                  variant="ghost"
                  className="absolute bottom-0 right-0 h-6 px-1 py-0.5 text-xs text-[#5c5c5c] hover:bg-[#3a8fb7]/20 hover:text-[#333333]"
                  onClick={toggleDescription}
                  aria-label={showDescription ? "Mostrar menos" : "Mostrar más"}
                >
                  {showDescription ? 'Menos' : 'Más'}
                </Button>
              )}
            </div>
          )}

          {/* Mostrar elementos del combo con expansión/contracción */}
          {product.esCombo && renderComboContent()}

          {/* Precio - Con formato adaptable */}
          <div className={`font-bold text-[#FFFFFF] ${compact ? 'text-base sm:text-lg mt-1' : 'text-xl mt-2'}`}>
            ${product.precio.toFixed(2)}
          </div>
        </CardContent>

        <CardFooter className={compact ? "pt-1 pb-2 sm:pb-3 px-2 sm:px-3" : "pt-2 pb-3 sm:pb-4 px-3"}>
          {isAvailable ? (
            showQuantitySelector ? (
              <div className="w-full">
                <div className="flex items-center justify-between mb-2 bg-white/80 rounded-md p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`${compact ? 'h-8 w-8 sm:h-8 sm:w-8' : 'h-8 w-8'} p-0 text-[#333333] hover:text-[#3a8fb7] hover:bg-[#d4f1f9]/60 touch-manipulation`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuantityChange(quantity - 1);
                    }}
                    aria-label="Disminuir cantidad"
                    disabled={quantity <= 1}
                  >
                    <Minus className={`${compact ? 'h-3 w-3 sm:h-4 sm:w-4' : 'h-4 w-4'}`} />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    max={product.esCombo ? 1 : (product.categoria === 'mantenimiento' ? undefined : product.stock)}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    onClick={(e) => e.stopPropagation()}
                    className={`${compact ? 'w-10 sm:w-14 h-8' : 'w-14 h-8'} text-center p-0 border-0 bg-transparent focus:ring-0 text-[#333333]`}
                    aria-label="Cantidad"
                    readOnly={product.esCombo}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`${compact ? 'h-8 w-8 sm:h-8 sm:w-8' : 'h-8 w-8'} p-0 text-[#333333] hover:text-[#3a8fb7] hover:bg-[#d4f1f9]/60 touch-manipulation`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuantityChange(quantity + 1);
                    }}
                    aria-label="Aumentar cantidad"
                    disabled={product.esCombo || (product.categoria === 'limpieza' && quantity >= product.stock)}
                  >
                    <Plus className={`${compact ? 'h-3 w-3 sm:h-4 sm:w-4' : 'h-4 w-4'}`} />
                  </Button>
                </div>
                <Button
                  className={`w-full ${getButtonClass()} text-white ${compact ? 'text-xs sm:text-sm py-1 h-8 sm:h-9' : 'h-9 sm:h-10'} touch-manipulation shadow-md hover:shadow-lg hover:shadow-[#3a8fb7]/30 transition-all duration-300`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart();
                  }}
                  aria-label={`Añadir ${quantity} ${quantity > 1 ? 'unidades' : 'unidad'} al carrito`}
                >
                  <ShoppingCart size={compact ? 14 : 16} className="mr-1 sm:mr-2" />
                  {compact ?
                    `Añadir (${quantity})` :
                    `Agregar ${quantity} ${quantity > 1 ? 'unidades' : 'unidad'}`}
                </Button>
              </div>
            ) : (
              <Button
                className={`w-full ${getButtonClass()} group transition-all duration-300 text-white 
                  ${compact ? 'text-xs sm:text-sm py-1 h-8 sm:h-9' : 'h-9 sm:h-10'} touch-manipulation shadow-md hover:shadow-lg hover:shadow-[#3a8fb7]/30`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQuantitySelector(true);
                }}
                aria-label="Agregar al carrito"
              >
                <ShoppingCart size={compact ? 14 : 16} className="mr-1 sm:mr-2 group-hover:animate-bounce" />
                {compact ? 'Añadir' : 'Agregar al carrito'}
              </Button>
            )
          ) : (
            <Button
              disabled
              className={`w-full bg-[#878787] text-white cursor-not-allowed 
                ${compact ? 'text-xs sm:text-sm py-1 h-8 sm:h-9' : 'h-9 sm:h-10'}`}
              aria-label="Sin stock disponible"
            >
              <AlertTriangle size={compact ? 14 : 16} className="mr-1 sm:mr-2" />
              Sin stock disponible
            </Button>
          )}
        </CardFooter>

        {/* Botón para mostrar detalles completos - Optimizado para táctil */}
        {onShowDetails && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute bottom-2 right-2 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/70 hover:bg-[#3a8fb7]/80 text-[#3a8fb7] hover:text-white touch-manipulation transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowDetails();
                  }}
                  aria-label="Ver detalles del producto"
                >
                  <Info size={compact ? 14 : 16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-white border-[#3a8fb7] text-[#333333]">
                <p>Ver detalles</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </Card>
    </motion.div>
  );
};