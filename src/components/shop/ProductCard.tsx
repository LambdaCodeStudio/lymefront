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
import OptimizedProductImage from '@/components/admin/components/ProductImage';
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
  esCombo?: boolean;
  itemsCombo?: ComboItem[];
}

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onAddToCart: (quantity: number) => void;
  useBase64?: boolean; // Propiedad para elegir el formato de imagen
  compact?: boolean; // Nueva propiedad para modo compacto en móviles
  onShowDetails?: () => void; // Callback para mostrar detalles/modal
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  useBase64 = true,
  compact = false, // Por defecto, no usar modo compacto
  onShowDetails
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [showQuantitySelector, setShowQuantitySelector] = useState<boolean>(false);
  const [showDescription, setShowDescription] = useState<boolean>(false);
  const [expandedCombo, setExpandedCombo] = useState<boolean>(false);

  // Función para truncar texto largo
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  // Determinar la clase de gradiente según la categoría - ACTUALIZADO con nueva paleta
  const getGradientClass = () => {
    if (product.esCombo) {
      return 'from-[#1B9C96]/80 to-[#84D6C8]/80'; // Degradado de turquesa a turquesa claro para combos
    } else if (product.categoria === 'limpieza') {
      return 'from-[#84D6C8]/80 to-[#CFF2E4]/80'; // Degradado de turquesa claro a verde menta para limpieza
    }
    return 'from-[#29696B]/80 to-[#1B9C96]/80'; // Degradado de turquesa oscuro a turquesa para mantenimiento
  };

  // Determinar el color de borde según la categoría
  const getBorderClass = () => {
    if (product.esCombo) {
      return 'border-[#1B9C96]'; // Borde turquesa para combos
    } else if (product.categoria === 'limpieza') {
      return 'border-[#84D6C8]'; // Borde turquesa claro para limpieza
    }
    return 'border-[#29696B]'; // Borde turquesa oscuro para mantenimiento
  };

  // Determinar el color del botón según la categoría
  const getButtonClass = () => {
    if (product.esCombo) {
      return 'bg-[#1B9C96] hover:bg-[#139692]'; // Botón especial para combos
    } else if (product.categoria === 'limpieza') {
      return 'bg-[#1B9C96] hover:bg-[#139692]'; // Botón turquesa para limpieza
    }
    return 'bg-[#29696B] hover:bg-[#1B9C96]'; // Botón turquesa oscuro a turquesa para mantenimiento
  };

  // Obtener colores y estilos para el indicador de stock
  const getStockBadgeStyle = () => {
    // Para productos de mantenimiento, no mostramos stock específico
    if (product.categoria === 'mantenimiento') {
      return {
        bg: 'bg-[#F8FDFC]',
        text: 'text-[#1B9C96]',
        border: 'border-[#1B9C96]',
        icon: <Check size={12} className="mr-1" />,
        label: 'Disponible'
      };
    }
    
    // Para productos de limpieza
    if (product.stock <= 5) {
      return {
        bg: 'bg-[#E74C3C]/10',
        text: 'text-[#E74C3C]',
        border: 'border-[#E74C3C]',
        icon: <AlertTriangle size={12} className="mr-1" />,
        label: 'Stock bajo'
      };
    } else if (product.stock <= 15) {
      return {
        bg: 'bg-[#F2A516]/10',
        text: 'text-[#F2A516]',
        border: 'border-[#F2A516]',
        icon: <Package size={12} className="mr-1" />,
        label: `Stock: ${product.stock}`
      };
    } else {
      return {
        bg: 'bg-[#CFF2E4]',
        text: 'text-[#1B9C96]',
        border: 'border-[#1B9C96]',
        icon: <Check size={12} className="mr-1" />,
        label: `Stock: ${product.stock}`
      };
    }
  };

  // Manejar cambio de cantidad con validación según categoría
  const handleQuantityChange = (newQuantity: number) => {
    // Asegurar que la cantidad sea siempre al menos 1
    newQuantity = Math.max(1, newQuantity);
    
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

  // Obtener estilo del indicador de stock
  const stockStyle = getStockBadgeStyle();

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
      <div className="mt-2 text-[#0D4E4B] bg-[#CFF2E4]/70 rounded-md p-2 text-xs">
        <div className="font-medium mb-1 flex items-center justify-between">
          <div className="flex items-center">
            <PackagePlus size={14} className="mr-1 text-[#1B9C96]" />
            Incluye:
          </div>
          {hasMoreItems && (
            <Button
              variant="ghost"
              className="h-5 px-1 py-0 text-[10px] text-[#0D4E4B] hover:bg-[#1B9C96]/20"
              onClick={toggleExpand}
            >
              {expandedCombo ? 'Ver menos' : `Ver todos (${comboItems.length})`}
            </Button>
          )}
        </div>
        <ul className={`space-y-1 ${expandedCombo ? 'max-h-48' : 'max-h-16'} overflow-y-auto transition-all duration-300 scrollbar-thin scrollbar-thumb-[#1B9C96]/40 scrollbar-track-transparent`}>
          {displayedItems.map((item, index) => (
            <li key={index} className="flex justify-between">
              <span className="truncate pr-2">{item.nombre}</span>
              <span className="text-[#1B9C96]">x{item.cantidad}</span>
            </li>
          ))}
        </ul>
        {!expandedCombo && hasMoreItems && (
          <div className="mt-1 text-center text-[#4A7C79] text-[10px]">
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5 }}
      className="h-full product-card"
    >
      <Card 
        className={`h-full flex flex-col bg-gradient-to-br ${getGradientClass()} border ${getBorderClass()} hover:shadow-lg hover:shadow-[#1B9C96]/20 transition-all overflow-hidden`}
        onClick={onShowDetails}
      >
        {/* Imagen del producto - Optimizada para responsividad */}
        <div className="pt-2 sm:pt-3 px-2 sm:px-3">
          <div className="aspect-square w-full rounded-lg overflow-hidden bg-white relative">
            {useBase64 && product.imageBase64 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src={product.imageBase64}
                  alt={product.nombre}
                  className="w-full h-full object-contain"
                  loading="lazy"
                  onError={(e) => {
                    // Si hay un error cargando la imagen base64, ocultar la imagen
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    
                    // Crear un elemento de fallback
                    const fallbackDiv = document.createElement('div');
                    fallbackDiv.className = "flex items-center justify-center w-full h-full text-[#4A7C79]";
                    fallbackDiv.textContent = product.esCombo ? "Combo" : "Sin imagen";
                    if (e.currentTarget.parentElement) {
                      e.currentTarget.parentElement.appendChild(fallbackDiv);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {product.hasImage ? (
                  <img
                    src={`http://localhost:3000/api/producto/${product._id}/imagen?width=${compact ? 200 : 300}&height=${compact ? 200 : 300}&quality=${compact ? 60 : 75}&${Date.now()}`}
                    alt={product.nombre}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    onError={(e) => {
                      // Si hay un error cargando la imagen, ocultar y mostrar fallback
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      
                      // Crear un elemento de fallback con el logo
                      if (e.currentTarget.parentElement) {
                        const fallbackContainer = document.createElement('div');
                        fallbackContainer.className = "flex items-center justify-center w-full h-full";
                        
                        const logoImg = document.createElement('img');
                        logoImg.src = "/lyme.png";
                        logoImg.alt = "Lyme Logo";
                        logoImg.className = "h-3/4 w-3/4 object-contain";
                        
                        // Si el logo no carga, mostrar texto alternativo
                        logoImg.onerror = () => {
                          logoImg.style.display = 'none';
                          const textSpan = document.createElement('span');
                          textSpan.className = "text-[#4A7C79]";
                          textSpan.textContent = product.esCombo ? "Combo" : "Sin imagen";
                          fallbackContainer.appendChild(textSpan);
                        };
                        
                        fallbackContainer.appendChild(logoImg);
                        e.currentTarget.parentElement.appendChild(fallbackContainer);
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <img
                      src="/lyme.png"
                      alt="Lyme Logo"
                      className="h-3/4 w-3/4 object-contain"
                      onError={(e) => {
                        // Si el logo no carga, mostrar texto alternativo
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        
                        if (e.currentTarget.parentElement) {
                          const textSpan = document.createElement('span');
                          textSpan.className = "text-[#4A7C79]";
                          textSpan.textContent = product.esCombo ? "Combo" : "Sin imagen";
                          e.currentTarget.parentElement.appendChild(textSpan);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Badge de combo */}
            {product.esCombo && (
              <Badge 
                className="absolute top-2 left-2 z-10 bg-[#ffffff] text-[#1B9C96] border border-[#1B9C96]"
              >
                <PackagePlus size={12} className="mr-1" />
                Combo
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
              className={`absolute top-2 right-2 z-10 bg-white/70 hover:bg-[#F2A516]/20 rounded-full 
                ${compact ? 'h-7 w-7 sm:h-8 sm:w-8' : 'h-8 w-8'} 
                ${isFavorite ? 'text-[#F2A516]' : 'text-[#4A7C79]'} 
                transition-all touch-manipulation`}
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
          {/* Badge de categoría - Responsivo */}
          <Badge 
            variant="outline" 
            className={`mb-1 sm:mb-2 text-xs border-[#1B9C96] text-[#0D4E4B] bg-white/60
              ${compact ? 'hidden xs:inline-flex' : ''} category-badge ${product.categoria === 'mantenimiento' ? 'maintenance' : 'cleaning'}`}
          >
            {product.subCategoria}
          </Badge>

          {/* Nombre del producto - Con tamaño adaptable */}
          <h3 className={`font-medium line-clamp-1 text-[#0D4E4B] 
            ${compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'} mb-1`}>
            {product.nombre}
          </h3>

          {/* Descripción - Con expansión controlada */}
          {product.descripcion && (
            <div className="relative">
              <p className={`text-sm text-[#29696B] ${showDescription ? '' : 'line-clamp-2'} 
                ${compact ? 'text-xs sm:text-sm mb-1' : 'mb-1 sm:mb-2'}`}>
                {product.descripcion}
              </p>
              {product.descripcion.length > 100 && (
                <Button
                  variant="ghost"
                  className="absolute bottom-0 right-0 h-6 px-1 py-0.5 text-xs text-[#4A7C79] hover:bg-[#1B9C96]/20 hover:text-[#0D4E4B]"
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
          <div className={`font-bold text-[#F2A516] ${compact ? 'text-base sm:text-lg mt-1' : 'text-xl mt-2'}`}>
            ${product.precio.toFixed(2)}
          </div>
        </CardContent>

        <CardFooter className={compact ? "pt-1 pb-2 sm:pb-3 px-2 sm:px-3" : "pt-2 pb-3 sm:pb-4 px-3"}>
          {showQuantitySelector ? (
            <div className="w-full">
              <div className="flex items-center justify-between mb-2 bg-white/80 rounded-md p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${compact ? 'h-8 w-8 sm:h-8 sm:w-8' : 'h-8 w-8'} p-0 text-[#0D4E4B] hover:text-[#1B9C96] hover:bg-[#CFF2E4] touch-manipulation`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuantityChange(quantity - 1);
                  }}
                  aria-label="Disminuir cantidad"
                >
                  <Minus className={`${compact ? 'h-3 w-3 sm:h-4 sm:w-4' : 'h-4 w-4'}`} />
                </Button>
                <Input
                  type="number"
                  min="1"
                  max={product.categoria === 'mantenimiento' ? undefined : product.stock}
                  value={quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  onClick={(e) => e.stopPropagation()}
                  className={`${compact ? 'w-10 sm:w-14 h-8' : 'w-14 h-8'} text-center p-0 border-0 bg-transparent focus:ring-0 text-[#0D4E4B]`}
                  aria-label="Cantidad"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${compact ? 'h-8 w-8 sm:h-8 sm:w-8' : 'h-8 w-8'} p-0 text-[#0D4E4B] hover:text-[#1B9C96] hover:bg-[#CFF2E4] touch-manipulation`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuantityChange(quantity + 1);
                  }}
                  aria-label="Aumentar cantidad"
                >
                  <Plus className={`${compact ? 'h-3 w-3 sm:h-4 sm:w-4' : 'h-4 w-4'}`} />
                </Button>
              </div>
              <Button
                className={`w-full ${getButtonClass()} text-white ${compact ? 'text-xs sm:text-sm py-1 h-8 sm:h-9' : 'h-9 sm:h-10'} touch-manipulation shadow-md hover:shadow-lg hover:shadow-[#1B9C96]/30 transition-all duration-300`}
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
                ${compact ? 'text-xs sm:text-sm py-1 h-8 sm:h-9' : 'h-9 sm:h-10'} touch-manipulation shadow-md hover:shadow-lg hover:shadow-[#1B9C96]/30`}
              onClick={(e) => {
                e.stopPropagation();
                setShowQuantitySelector(true);
              }}
              aria-label="Agregar al carrito"
            >
              <ShoppingCart size={compact ? 14 : 16} className="mr-1 sm:mr-2 group-hover:animate-bounce" />
              {compact ? 'Añadir' : 'Agregar al carrito'}
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
                  className="absolute bottom-2 right-2 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/70 hover:bg-[#1B9C96]/60 text-[#1B9C96] hover:text-white touch-manipulation"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowDetails();
                  }}
                  aria-label="Ver detalles del producto"
                >
                  <Info size={compact ? 14 : 16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-white border-[#1B9C96] text-[#0D4E4B]">
                <p>Ver detalles</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </Card>
    </motion.div>
  );
};