import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from 'react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import debounce from 'lodash/debounce';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  PackageOpen,
  DollarSign,
  AlertTriangle,
  Image as ImageIcon,
  X,
  Loader2,
  Package,
  Filter,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Pagination from "@/components/ui/pagination";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useNotification } from '@/context/NotificationContext';
import { imageService } from '@/services/imageService';
import ImageUpload from '@/components/admin/components/ImageUpload';
import { Switch } from "@/components/ui/switch";
import { getAuthToken } from '@/utils/inventoryUtils';

// Definir interfaces según el backend
interface ProductoExtendido {
  _id: string;
  nombre: string;
  descripcion?: string;
  categoria: 'limpieza' | 'mantenimiento';
  subCategoria: string; 
  precio: number;
  stock: number;
  imagen?: string | Buffer | null;
  vendidos?: number;
  hasImage?: boolean;
  imageBase64?: string;
  proovedorInfo?: string;
  esCombo?: boolean;
  itemsCombo?: ItemCombo[];
}

interface RespuestaPaginada<T> {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ItemCombo {
  productoId: string | any; // Permitir objetos para manipulación más fácil
  cantidad: number;
}

interface FormData {
  nombre: string;
  descripcion: string;
  categoria: 'limpieza' | 'mantenimiento';
  subCategoria: string;
  precio: string;
  stock: string;
  proovedorInfo: string;
  esCombo?: boolean;
  itemsCombo?: ItemCombo[];
  imagen?: File | null;
  imagenPreview?: string | null;
}

// Definir interfaces para los props de los componentes
interface FilaProductoProps {
  producto: ProductoExtendido;
  onEdit: (producto: ProductoExtendido) => void;
  onDelete: (id: string) => void;
  userSections: string;
  isInViewport?: boolean;
}

interface TablaProductosVirtualizadaProps {
  productos: ProductoExtendido[];
  onEdit: (producto: ProductoExtendido) => void;
  onDelete: (id: string) => void;
  userSections: string;
  tableContainerRef: React.RefObject<HTMLDivElement>;
  onVisibleItemsChanged?: (elementos: ProductoExtendido[]) => void;
}

interface TarjetaProductoProps {
  producto: ProductoExtendido;
  onEdit: (producto: ProductoExtendido) => void;
  onDelete: (id: string) => void;
  userSections: string;
  isInViewport?: boolean;
}

interface ListaProductosMobileProps {
  productos: ProductoExtendido[];
  onEdit: (producto: ProductoExtendido) => void;
  onDelete: (id: string) => void;
  userSections: string;
  onVisibleItemsChanged?: (elementos: ProductoExtendido[]) => void;
}

// Subcategorías organizadas por categoría
const subCategorias: Record<string, Array<{value: string, label: string}>> = {
  limpieza: [
    { value: 'accesorios', label: 'Accesorios' },
    { value: 'aerosoles', label: 'Aerosoles' },
    { value: 'bolsas', label: 'Bolsas' },
    { value: 'estandar', label: 'Estándar' },
    { value: 'indumentaria', label: 'Indumentaria' },
    { value: 'liquidos', label: 'Líquidos' },
    { value: 'papeles', label: 'Papeles' },
    { value: 'sinClasificarLimpieza', label: 'Sin Clasificar' }
  ],
  mantenimiento: [
    { value: 'iluminaria', label: 'Iluminaria' },
    { value: 'electricidad', label: 'Electricidad' },
    { value: 'cerraduraCortina', label: 'Cerradura/Cortina' },
    { value: 'pintura', label: 'Pintura' },
    { value: 'superficiesConstruccion', label: 'Superficies/Construcción' },
    { value: 'plomeria', label: 'Plomería' }
  ]
};

// Definir umbral de stock bajo
const UMBRAL_STOCK_BAJO = 10;

// Clave para caché de productos
const CLAVE_CACHE_PRODUCTOS = 'productos';

// Caché de estados de imágenes - versión global para reutilización
const cacheEstadoImagen = new Map<string, boolean>();

/**
 * Componente de imagen de producto optimizado con carga diferida y cacheo
 */
interface PropiedadesImagenProducto {
  productId: string;
  alt?: string;
  width?: number;
  height?: number;
  quality?: number;
  className?: string;
  fallbackClassName?: string;
  containerClassName?: string;
  useBase64?: boolean;
  priority?: boolean;
  placeholderText?: string;
  onLoadComplete?: () => void;
}

const ImagenProductoOptimizada: React.FC<PropiedadesImagenProducto> = ({
  productId,
  alt = 'Imagen del producto',
  width = 80,
  height = 80,
  quality = 75,
  className = '',
  fallbackClassName = '',
  containerClassName = '',
  useBase64 = false,
  priority = false,
  placeholderText,
  onLoadComplete
}) => {
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const timestamp = useRef<number>(Date.now());
  
  // URL de la imagen con parámetro para evitar caché del navegador
  const imageUrl = `https://lyme-back.vercel.app/api/producto/${productId}/imagen?quality=${quality}&width=${width}&height=${height}&v=${timestamp.current}`;

  useEffect(() => {
    // Si no hay ID de producto, no hacer nada
    if (!productId) return;

    // Si ya comprobamos esta imagen antes, usar el resultado en caché
    if (cacheEstadoImagen.has(productId)) {
      if (!cacheEstadoImagen.get(productId)) {
        setCargando(false);
        setError(true);
      }
      return;
    }

    const cargarImagen = () => {
      setCargando(true);
      
      const imgElement = new Image();
      imgElement.onload = () => {
        setCargando(false);
        cacheEstadoImagen.set(productId, true);
        if (onLoadComplete) onLoadComplete();
      };
      
      imgElement.onerror = () => {
        setCargando(false);
        setError(true);
        cacheEstadoImagen.set(productId, false);
      };
      
      imgElement.src = imageUrl;
    };

    // Si es prioritaria, cargar inmediatamente
    if (priority) {
      cargarImagen();
      return;
    }

    // Usar IntersectionObserver para carga diferida
    if ('IntersectionObserver' in window && imgRef.current) {
      // Destruir observer anterior si existe
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      // Crear nuevo observer
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            // Cargar imagen cuando sea visible
            cargarImagen();
            // Dejar de observar este elemento
            if (observerRef.current) {
              observerRef.current.disconnect();
              observerRef.current = null;
            }
          }
        },
        {
          rootMargin: '200px', // Precargar cuando esté a 200px de ser visible
          threshold: 0.01 // Cargar cuando apenas sea visible
        }
      );

      // Empezar a observar
      observerRef.current.observe(imgRef.current);
    } else {
      // Fallback para navegadores sin IntersectionObserver
      cargarImagen();
    }

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [productId, imageUrl, priority, onLoadComplete]);

  return (
    <div 
      className={`relative ${containerClassName}`} 
      style={{ width: width, height: height }}
      ref={imgRef}
    >
      {/* Placeholder mientras carga o si hay error */}
      {(cargando || error) && (
        <div className={`flex items-center justify-center ${fallbackClassName || 'bg-gray-100 rounded-md'}`} 
          style={{ width: width, height: height }}>
          <div className="flex flex-col items-center justify-center">
            <ImageIcon className="w-6 h-6 text-gray-400" />
            {placeholderText && <span className="text-xs text-gray-400 mt-1">{placeholderText}</span>}
          </div>
        </div>
      )}
      
      {/* Imagen real */}
      {!error && (
        <img
          src={cargando ? undefined : imageUrl}
          alt={alt}
          width={width}
          height={height}
          className={`${className} ${!cargando ? 'opacity-100' : 'opacity-0'} absolute top-0 left-0 transition-opacity duration-300`}
          loading="lazy"
          onLoad={() => {
            setCargando(false);
            cacheEstadoImagen.set(productId, true);
            if (onLoadComplete) onLoadComplete();
          }}
          onError={() => {
            setCargando(false);
            setError(true);
            cacheEstadoImagen.set(productId, false);
          }}
        />
      )}
    </div>
  );
};

// Componente para entrada de stock con límite máximo
const EntradaStockProducto: React.FC<{
  value: string;
  onChange: (value: string) => void;
  id?: string;
  required?: boolean;
  maxStock?: number;
  categoria?: string;
}> = ({
  value,
  onChange,
  id = "stock",
  required = true,
  maxStock = 999999999,
  categoria
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    if (inputValue === '') {
      onChange('');
      return;
    }
    
    const numValue = parseInt(inputValue, 10);
    
    if (isNaN(numValue)) {
      return;
    }
    
    // Para productos de limpieza, stock mínimo es 1
    if (categoria === 'limpieza' && numValue < 1) {
      onChange('1');
      return;
    }
    
    if (numValue > maxStock) {
      onChange(maxStock.toString());
    } else if (numValue < 0) {
      onChange('0');
    } else {
      onChange(numValue.toString());
    }
  };

  // Mostrar advertencia para productos de limpieza
  const advertenciaStockMinimo = categoria === 'limpieza' ? (
    <p className="mt-1 text-xs text-amber-600">
      Para productos de limpieza, el stock mínimo debe ser 1
    </p>
  ) : null;

  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        min={categoria === 'limpieza' ? "1" : "0"}
        max={maxStock}
        value={value}
        onChange={handleChange}
        required={required}
        className="mt-1"
      />
      {advertenciaStockMinimo}
      <p className="mt-1 text-xs text-[#7AA79C]">
        Máximo: {maxStock.toLocaleString()}
      </p>
    </div>
  );
};

// Función para renderizar indicador de stock
const renderizarIndicadorStock = (stock: number) => {
  if (stock <= 0) {
    return (
      <div className="flex items-center gap-1">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          Sin stock
        </span>
      </div>
    );
  } else if (stock <= UMBRAL_STOCK_BAJO) {
    return (
      <div className="flex items-center gap-1">
        <AlertTriangle className="w-4 h-4 text-yellow-500 animate-pulse" />
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
          {stock} unidades - ¡Stock bajo!
        </span>
      </div>
    );
  } else {
    return (
      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-[#DFEFE6] text-[#29696B]">
        {stock} unidades
      </span>
    );
  }
};

// Fila de producto mejorada para rendimiento
const FilaProducto: React.FC<FilaProductoProps> = ({ 
  producto, 
  onEdit, 
  onDelete, 
  userSections,
  isInViewport = false 
}) => {
  // Comprobar permisos
  const puedeEditar = userSections === 'ambos' || producto.categoria === userSections;
  
  // Seguimiento de estado de carga de imagen
  const [imagenCargada, setImagenCargada] = useState(false);

  return (
    <tr 
      className={`hover:bg-[#DFEFE6]/20 transition-colors ${
        producto.stock > 0 && producto.stock <= UMBRAL_STOCK_BAJO 
          ? 'bg-yellow-50 hover:bg-yellow-100' 
          : producto.stock <= 0 
            ? 'bg-red-50 hover:bg-red-100'
            : ''
      }`}
    >
      <td className="px-6 py-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 mr-3">
            <ImagenProductoOptimizada
              productId={producto._id}
              alt={producto.nombre}
              width={40}
              height={40}
              quality={75}
              className={`h-10 w-10 rounded-full object-cover border border-[#91BEAD]/30 transition-opacity duration-300 ${imagenCargada ? 'opacity-100' : 'opacity-0'}`}
              fallbackClassName="h-10 w-10 rounded-full bg-[#DFEFE6]/50 flex items-center justify-center border border-[#91BEAD]/30"
              containerClassName="h-10 w-10"
              priority={isInViewport}
              key={`img-${producto._id}`}
              onLoadComplete={() => setImagenCargada(true)}
            />
          </div>
          <div>
            <div className="text-sm font-medium text-[#29696B] flex items-center">
              {producto.nombre}
              {producto.esCombo && (
                <Badge variant="outline" className="ml-2 text-xs border-[#91BEAD] text-[#29696B] bg-[#DFEFE6]/40">
                  Combo
                </Badge>
              )}
            </div>
            {producto.descripcion && (
              <div className="text-sm text-[#7AA79C] truncate max-w-xs">
                {producto.descripcion}
              </div>
            )}
            {producto.esCombo && producto.itemsCombo && producto.itemsCombo.length > 0 && (
              <div className="text-xs text-[#7AA79C] mt-1">
                Contiene: {producto.itemsCombo.length} productos
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-[#7AA79C]">
        <Badge variant="outline" className="capitalize border-[#91BEAD] text-[#29696B]">
          {producto.categoria}
        </Badge>
        <div className="text-xs mt-1 capitalize text-[#7AA79C]">{producto.subCategoria}</div>
      </td>
      <td className="px-6 py-4 text-sm font-medium text-[#29696B]">
        ${producto.precio.toFixed(2)}
      </td>
      <td className="px-6 py-4">
        {renderizarIndicadorStock(producto.stock)}
      </td>
      <td className="px-6 py-4 text-sm text-[#7AA79C]">
        {producto.vendidos || 0}
      </td>
      <td className="px-6 py-4 text-right text-sm font-medium">
        <div className="flex justify-end space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(producto)}
            className="text-[#29696B] hover:text-[#29696B] hover:bg-[#DFEFE6]"
            disabled={!puedeEditar}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(producto._id)}
            className="text-red-600 hover:text-red-800 hover:bg-red-50"
            disabled={!puedeEditar}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
};

// Componente de tabla virtualizada (mejora rendimiento con muchos productos)
const TablaProductosVirtualizada: React.FC<TablaProductosVirtualizadaProps> = ({ 
  productos, 
  onEdit, 
  onDelete, 
  userSections,
  tableContainerRef,
  onVisibleItemsChanged
}) => {
  const rowVirtualizer = useVirtualizer({
    count: productos.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 70, // Altura estimada de fila
    overscan: 5, // Cuántos elementos renderizar antes/después del área visible
    onChange: (instance) => {
      if (instance.range && onVisibleItemsChanged) {
        try {
          // Notificar al padre cuando cambian los elementos visibles
          const elementosVisibles = productos.slice(
            instance.range.startIndex,
            instance.range.endIndex + 1
          );
          onVisibleItemsChanged(elementosVisibles);
        } catch (error) {
          console.warn("Error en virtualizador de tabla:", error);
        }
      }
    }
  });

  return (
    <table className="w-full">
      <thead className="bg-[#DFEFE6]/50 border-b border-[#91BEAD]/20 sticky top-0 z-10">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
            Nombre
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
            Categoría
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
            Precio
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
            Stock
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
            Vendidos
          </th>
          <th className="px-6 py-3 text-right text-xs font-medium text-[#29696B] uppercase tracking-wider">
            Acciones
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-[#91BEAD]/20 relative">
        <tr style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
          <td colSpan={6} className="p-0">
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
              }}
            >
              {rowVirtualizer.getVirtualItems().map(virtualRow => {
                const producto = productos[virtualRow.index];
                return (
                  <div
                    key={`${producto._id}-row`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: virtualRow.size,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="contents"
                  >
                    <FilaProducto
                      producto={producto}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      userSections={userSections}
                      isInViewport={true}
                    />
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

// Tarjeta de producto mejorada para móvil
const TarjetaProducto: React.FC<TarjetaProductoProps> = ({ 
  producto, 
  onEdit, 
  onDelete, 
  userSections, 
  isInViewport 
}) => {
  // Verificar permisos
  const puedeEditar = userSections === 'ambos' || producto.categoria === userSections;
  // Seguimiento del estado de carga de imagen
  const [imagenCargada, setImagenCargada] = useState(false);

  return (
    <Card 
      className={`overflow-hidden shadow-sm border ${
        producto.stock > 0 && producto.stock <= UMBRAL_STOCK_BAJO 
          ? 'border-yellow-300 bg-yellow-50' 
          : producto.stock <= 0 
            ? 'border-red-300 bg-red-50'
            : 'border-[#91BEAD]/20 bg-white'
      }`}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base truncate mr-2 text-[#29696B]">
            <div className="flex items-center">
              {producto.nombre}
              {producto.esCombo && (
                <Badge variant="outline" className="ml-2 text-xs border-[#91BEAD] text-[#29696B] bg-[#DFEFE6]/40">
                  Combo
                </Badge>
              )}
            </div>
          </CardTitle>
          <Badge variant="outline" className="capitalize text-xs border-[#91BEAD] text-[#29696B]">
            {producto.categoria}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 pb-3">
        <div className="flex gap-4 mb-3">
          <div className="flex-shrink-0 h-16 w-16">
            <ImagenProductoOptimizada
              productId={producto._id}
              alt={producto.nombre}
              width={64}
              height={64}
              quality={60}
              className={`h-16 w-16 rounded-md object-cover border border-[#91BEAD]/30 transition-opacity duration-300 ${imagenCargada ? 'opacity-100' : 'opacity-0'}`}
              fallbackClassName="h-16 w-16 rounded-md bg-[#DFEFE6]/50 flex items-center justify-center border border-[#91BEAD]/30"
              containerClassName="h-16 w-16"
              priority={isInViewport}
              onLoadComplete={() => setImagenCargada(true)}
            />
          </div>
          <div className="flex-1 min-w-0">
            {producto.descripcion && (
              <p className="text-sm text-[#7AA79C] line-clamp-2 mb-2">
                {producto.descripcion}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 text-[#91BEAD] mr-1" />
                <span className="font-medium text-[#29696B]">${producto.precio.toFixed(2)}</span>
              </div>
              <div className="flex items-center">
                <PackageOpen className="w-4 h-4 text-[#91BEAD] mr-1" />
                <span className={`font-medium ${
                  producto.stock <= 0 
                    ? 'text-red-600' 
                    : producto.stock <= UMBRAL_STOCK_BAJO
                      ? 'text-yellow-600 flex items-center gap-1'
                      : 'text-[#29696B]'
                }`}>
                  {producto.stock <= UMBRAL_STOCK_BAJO && producto.stock > 0 && (
                    <AlertTriangle className="w-3 h-3 text-yellow-500 animate-pulse" />
                  )}
                  {producto.stock <= 0 ? 'Sin stock' : `${producto.stock} unid.`}
                </span>
              </div>
            </div>
            <div className="mt-2 text-xs text-[#7AA79C]">
              <span className="block">Subcategoría: <span className="capitalize">{producto.subCategoria}</span></span>
              <span className="block">Vendidos: {producto.vendidos || 0}</span>
              {producto.esCombo && producto.itemsCombo && (
                <span className="block">Contiene: {producto.itemsCombo.length} productos</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-2 flex justify-end gap-2 bg-[#DFEFE6]/20 border-t border-[#91BEAD]/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(producto)}
          className="text-[#29696B] hover:bg-[#DFEFE6]"
          disabled={!puedeEditar}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(producto._id)}
          className="text-red-600 hover:text-red-800 hover:bg-red-50"
          disabled={!puedeEditar}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

// Vista móvil optimizada
const ListaProductosMobile: React.FC<ListaProductosMobileProps> = ({ 
  productos, 
  onEdit, 
  onDelete, 
  userSections, 
  onVisibleItemsChanged 
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: productos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Altura estimada de tarjeta
    overscan: 3,
    onChange: (instance) => {
      if (instance.range && onVisibleItemsChanged) {
        try {
          // Notificar al componente padre sobre elementos visibles
          const elementosVisibles = productos.slice(
            instance.range.startIndex,
            instance.range.endIndex + 1
          );
          onVisibleItemsChanged(elementosVisibles);
        } catch (error) {
          console.warn("Error en virtualizador móvil:", error);
        }
      }
    }
  });
  
  return (
    <div ref={parentRef} className="h-[70vh] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualRow => {
          const producto = productos[virtualRow.index];
          return (
            <div
              key={`${producto._id}-card`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
                padding: '4px',
              }}
            >
              <TarjetaProducto 
                producto={producto} 
                onEdit={onEdit} 
                onDelete={onDelete} 
                userSections={userSections}
                isInViewport={true}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Componente principal SeccionInventario
const InventorySection: React.FC = () => {
  // Inicializar React Query
  const queryClient = useQueryClient();
  
  const { addNotification } = useNotification();
  const [productos, setProductos] = useState<ProductoExtendido[]>([]);
  const [opcionesProductos, setOpcionesProductos] = useState<ProductoExtendido[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [cargandoImagen, setCargandoImagen] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [mensajeExito, setMensajeExito] = useState<string>('');
  const [mostrarModal, setMostrarModal] = useState<boolean>(false);
  const [mostrarModalCombo, setMostrarModalCombo] = useState<boolean>(false);
  const [dialogoEliminarAbierto, setDialogoEliminarAbierto] = useState<boolean>(false);
  const [dialogoEliminarImagenAbierto, setDialogoEliminarImagenAbierto] = useState<boolean>(false);
  const [productoAEliminar, setProductoAEliminar] = useState<string | null>(null);
  const [productoEditando, setProductoEditando] = useState<ProductoExtendido | null>(null);
  const [terminoBusqueda, setTerminoBusqueda] = useState<string>('');
  const [terminoBusquedaRetrasado, setTerminoBusquedaRetrasado] = useState<string>('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('all');
  const [seccionesUsuario, setSeccionesUsuario] = useState<string>('ambos');
  const [esCargaInicial, setEsCargaInicial] = useState<boolean>(true);
  const refInputArchivo = useRef<HTMLInputElement>(null);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPaginas, setTotalPaginas] = useState<number>(1);
  const [estaCargando, setEstaCargando] = useState<boolean>(false);

  // Estado para item combo seleccionado
  const [itemComboSeleccionado, setItemComboSeleccionado] = useState<string>('');
  const [cantidadItemCombo, setCantidadItemCombo] = useState<number>(1);

  // Estado para paginación
  const [paginaActual, setPaginaActual] = useState<number>(1);

  // Referencias para scroll en móvil
  const refListaMobile = useRef<HTMLDivElement>(null);
  const refTabla = useRef<HTMLDivElement>(null);

  // Tamaños fijos para cada tipo de dispositivo
  const ITEMS_POR_PAGINA_MOBILE = 5;
  const ITEMS_POR_PAGINA_DESKTOP = 10;

  // Estado para controlar ancho de ventana
  const [anchoVentana, setAnchoVentana] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Calcular dinámicamente itemsPorPagina basado en ancho de ventana
  const itemsPorPagina = anchoVentana < 768 ? ITEMS_POR_PAGINA_MOBILE : ITEMS_POR_PAGINA_DESKTOP;

  // Referencia al controlador de aborto para cancelar peticiones pendientes
  const refControladorAborto = useRef<AbortController | null>(null);

  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    descripcion: '',
    categoria: 'limpieza',
    subCategoria: 'aerosoles',
    precio: '',
    stock: '',
    proovedorInfo: '',
    esCombo: false,
    itemsCombo: [],
    imagen: null,
    imagenPreview: null
  });

  // Función para precargar imágenes de productos visibles
  const precargarImagenesVisibles = useCallback((productosVisibles: ProductoExtendido[]) => {
    if (!productosVisibles.length || esCargaInicial) return;
    
    // Con el nuevo sistema simplificado, las imágenes se cargan automáticamente
    // cuando entran en el viewport gracias al IntersectionObserver
  }, [esCargaInicial]);

  // Obtener token de autenticación
  const getAuthToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }, []);

  // Función para generar clave de caché de productos
  const getClaveProductosCache = useCallback(
    (pagina: number, categoria: string, busqueda: string) => {
      return [CLAVE_CACHE_PRODUCTOS, pagina, itemsPorPagina, categoria, busqueda];
    },
    [itemsPorPagina]
  );

  // Función para buscar productos con React Query - Optimizada
  const buscarDatosProductos = useCallback(async (
    pagina: number, 
    limite: number, 
    categoria: string, 
    busqueda: string
  ): Promise<RespuestaPaginada<ProductoExtendido>> => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Abortar solicitud anterior si existe
      if (refControladorAborto.current) {
        refControladorAborto.current.abort();
      }
      
      // Crear nuevo controlador de aborto
      refControladorAborto.current = new AbortController();

      // Parámetros de paginación y filtro
      const params = new URLSearchParams({
        page: pagina.toString(),
        limit: limite.toString(),
        category: categoria !== 'all' ? categoria : '',
        search: busqueda,
        _: new Date().getTime().toString() // Para evitar caché
      });
      
      const response = await fetchConReintentos(
        `https://lyme-back.vercel.app/api/producto?${params}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          cache: 'no-store',
          signal: refControladorAborto.current.signal
        },
        3
      );
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      return await response.json();
    } catch (error: any) {
      // No reportar error si fue cancelado
      if (error.name === 'AbortError') {
        console.log('Solicitud cancelada');
        // Devolver estado vacío en lugar de lanzar error
        return {
          items: [],
          page: pagina,
          limit: limite,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        };
      }
      
      console.error('Error buscando productos:', error);
      throw new Error(`Error cargando productos: ${error.message}`);
    } finally {
      // Limpiar controlador de aborto si la solicitud se completó o falló
      if (refControladorAborto.current?.signal.aborted) {
        refControladorAborto.current = null;
      }
    }
  }, [getAuthToken]);

  // Mejorar función fetch con reintentos para manejar "failed to fetch"
  const fetchConReintentos = async (url: string, opciones: RequestInit, maxReintentos = 2) => {
    let reintentos = 0;
    
    while (reintentos < maxReintentos) {
      try {
        const response = await fetch(url, opciones);
        
        if (!response.ok) {
          // Si error de autenticación, no reintentar
          if (response.status === 401) {
            throw new Error('Error de autenticación');
          }
          
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        return response;
      } catch (error: any) {
        // Si la solicitud fue cancelada, no reintentar
        if (error.name === 'AbortError') {
          throw error;
        }
        
        reintentos++;
        console.warn(`Intento ${reintentos}/${maxReintentos} falló: ${error.message}`);
        
        // Si es el último intento, lanzar el error
        if (reintentos >= maxReintentos) {
          throw error;
        }
        
        // Esperar antes de reintentar (espera más corta y rápida)
        const delay = Math.min(500 * reintentos, 3000);
        console.log(`Esperando ${delay}ms antes de reintentar...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Por seguridad, aunque nunca debería llegar aquí
    throw new Error(`Falló después de ${maxReintentos} reintentos`);
  };

  // Usar React Query para cargar productos - Configuración optimizada
  const { 
    data, 
    isLoading, 
    error: queryError,
    refetch
  } = useQuery(
    getClaveProductosCache(paginaActual, categoriaSeleccionada, terminoBusquedaRetrasado),
    () => buscarDatosProductos(paginaActual, itemsPorPagina, categoriaSeleccionada, terminoBusquedaRetrasado),
    {
      keepPreviousData: true,
      staleTime: 300000, // Aumentado a 5 minutos
      cacheTime: 3600000, // 1 hora - para mantener datos en caché más tiempo
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false, // Deshabilitar actualización automática al reconectar
      onSuccess: (data) => {
        setProductos(data.items);
        setTotalItems(data.totalItems);
        setTotalPaginas(data.totalPages);
        
        // Extraer productos no-combo para selector
        const opcionesProductosFiltradas = data.items.filter(p => !p.esCombo);
        setOpcionesProductos(opcionesProductosFiltradas);
        
        // Ya no está en carga inicial después de primera carga
        setEsCargaInicial(false);
        
        // Pre-cargar siguiente página si existe
        if (data.hasNextPage) {
          queryClient.prefetchQuery(
            getClaveProductosCache(paginaActual + 1, categoriaSeleccionada, terminoBusquedaRetrasado),
            () => buscarDatosProductos(paginaActual + 1, itemsPorPagina, categoriaSeleccionada, terminoBusquedaRetrasado)
          );
        }
        
        // Precargar imágenes para productos de primera página
        precargarImagenesVisibles(data.items);
      },
      onError: (err: any) => {
        // No mostrar errores si la solicitud fue cancelada
        if (err.name === 'AbortError') return;
        
        const errorMsg = `Error cargando productos: ${err.message}`;
        setError(errorMsg);
        
        if (typeof addNotification === 'function') {
          addNotification(errorMsg, 'error');
        }
      },
      onSettled: () => {
        setEstaCargando(false);
      }
    }
  );

  // Mutación para eliminar producto
  const eliminarProductoMutation = useMutation(
    async (id: string) => {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await fetch(`https://lyme-back.vercel.app/api/producto/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar producto');
      }
      
      return id;
    },
    {
      // Actualización optimista de caché
      onMutate: async (deletedId) => {
        // Cancelar consultas en curso
        await queryClient.cancelQueries(getClaveProductosCache(paginaActual, categoriaSeleccionada, terminoBusquedaRetrasado));
        
        // Guardar estado anterior
        const previousProducts = queryClient.getQueryData(
          getClaveProductosCache(paginaActual, categoriaSeleccionada, terminoBusquedaRetrasado)
        );
        
        // Actualizar caché con actualización optimista
        queryClient.setQueryData(
          getClaveProductosCache(paginaActual, categoriaSeleccionada, terminoBusquedaRetrasado),
          (old: any) => {
            const newData = { ...old };
            newData.items = old.items.filter((p: ProductoExtendido) => p._id !== deletedId);
            newData.totalItems = (old.totalItems || 0) - 1;
            newData.totalPages = Math.ceil(newData.totalItems / itemsPorPagina);
            return newData;
          }
        );
        
        // Devolver estado anterior para rollback si es necesario
        return { previousProducts };
      },
      onError: (err, id, context: any) => {
        // Restaurar estado anterior en caso de error
        if (context?.previousProducts) {
          queryClient.setQueryData(
            getClaveProductosCache(paginaActual, categoriaSeleccionada, terminoBusquedaRetrasado),
            context.previousProducts
          );
        }
        
        const errorMsg = `Error eliminando producto: ${err instanceof Error ? err.message : 'Error desconocido'}`;
        setError(errorMsg);
        addNotification(errorMsg, 'error');
      },
      onSuccess: (deletedId) => {
        // Invalidar todas las consultas de productos para asegurar sincronización
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === CLAVE_CACHE_PRODUCTOS,
        });
        
        // Eliminar imagen de cachés
        cacheEstadoImagen.delete(deletedId);
        
        const successMsg = 'Producto eliminado exitosamente';
        setMensajeExito(successMsg);
        addNotification(successMsg, 'success');
        
        // Limpiar mensaje después de unos segundos
        setTimeout(() => setMensajeExito(''), 5000);
      },
      onSettled: () => {
        // Cerrar diálogo
        setDialogoEliminarAbierto(false);
        setProductoAEliminar(null);
      }
    }
  );

  // Mutación para eliminar imagen
  const eliminarImagenMutation = useMutation(
    async (productId: string) => {
      return await imageService.deleteImage(productId);
    },
    {
      // Actualización optimista de caché para imagen
      onMutate: async (productId) => {
        setEstaCargando(true);
        
        // Cancelar consultas en curso
        await queryClient.cancelQueries(getClaveProductosCache(paginaActual, categoriaSeleccionada, terminoBusquedaRetrasado));
        
        // Guardar estado anterior
        const previousProducts = queryClient.getQueryData(
          getClaveProductosCache(paginaActual, categoriaSeleccionada, terminoBusquedaRetrasado)
        );
        
        // Actualizar caché optimistamente para mostrar que la imagen fue eliminada
        queryClient.setQueryData(
          getClaveProductosCache(paginaActual, categoriaSeleccionada, terminoBusquedaRetrasado),
          (old: any) => {
            if (!old || !old.items) return old;
            
            const newData = { ...old };
            newData.items = old.items.map((p: ProductoExtendido) => {
              if (p._id === productId) {
                // Marcar que ya no tiene una imagen
                return {
                  ...p,
                  hasImage: false
                };
              }
              return p;
            });
            return newData;
          }
        );
        
        // Limpiar cualquier caché de imagen existente
        cacheEstadoImagen.delete(productId);
        
        // Actualizar formulario si está abierto
        if (productoEditando && productoEditando._id === productId) {
          setFormData(prev => ({
            ...prev,
            imagen: null,
            imagenPreview: null
          }));
        }
        
        return { previousProducts };
      },
      onError: (err, productId, context: any) => {
        // Restaurar estado anterior en caso de error
        if (context?.previousProducts) {
          queryClient.setQueryData(
            getClaveProductosCache(paginaActual, categoriaSeleccionada, terminoBusquedaRetrasado),
            context.previousProducts
          );
        }
        
        // Mostrar error
        console.error('Error eliminando imagen:', err);
        addNotification('Error eliminando imagen', 'error');
      },
      onSuccess: (_, productId) => {
        // Limpiar referencias de imagen
        if (productoEditando && productoEditando._id === productId) {
          setFormData(prev => ({
            ...prev,
            imagen: null,
            imagenPreview: null
          }));
          
          // Actualizar estado de productoEditando para reflejar cambio de imagen
          setProductoEditando(prev => prev ? {...prev, hasImage: false} : null);
        }
        
        // Invalidar cachés de imágenes
        cacheEstadoImagen.delete(productId);
        
        // Actualizar estado local de productos para mostrar cambio inmediatamente
        setProductos(prevProductos => 
          prevProductos.map(p => 
            p._id === productId 
              ? {...p, hasImage: false} 
              : p
          )
        );
        
        // Invalidar todas las consultas de productos para asegurar sincronización
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === CLAVE_CACHE_PRODUCTOS,
        });
        
        addNotification('Imagen eliminada exitosamente', 'success');
      },
      onSettled: () => {
        setDialogoEliminarImagenAbierto(false);
        setCargandoImagen(false);
        setEstaCargando(false);
      }
    }
  );

  // Mutación para crear/actualizar producto
  const productoMutation = useMutation(
    async (data: { id?: string; payload: any; image?: File }) => {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const url = data.id
        ? `https://lyme-back.vercel.app/api/producto/${data.id}`
        : 'https://lyme-back.vercel.app/api/producto';
      
      const method = data.id ? 'PUT' : 'POST';
      
      // Hacer solicitud para crear/actualizar producto
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data.payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error procesando solicitud');
      }
      
      const productGuardado = await response.json();
      
      // Si hay una imagen, subirla
      if (data.image) {
        await handleImageUpload(productGuardado._id, data.image);
      }
      
      return productGuardado;
    },
    {
      onMutate: async (data) => {
        setEstaCargando(true);
        return { data };
      },
      onSuccess: (productGuardado) => {
        setMostrarModal(false);
        resetForm();
        
        // Forzar actualización inmediata de datos
        refetch();
        
        // Invalidar todas las consultas de productos para asegurar sincronización
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === CLAVE_CACHE_PRODUCTOS,
        });
        
        const successMsg = `Producto ${productoEditando ? 'actualizado' : 'creado'} exitosamente`;
        setMensajeExito(successMsg);
        addNotification(successMsg, 'success');
        
        // Limpiar mensaje después de unos segundos
        setTimeout(() => setMensajeExito(''), 5000);
      },
      onError: (error: any) => {
        const errorMsg = 'Error guardando producto: ' + error.message;
        setError(errorMsg);
        addNotification(errorMsg, 'error');
      },
      onSettled: () => {
        setEstaCargando(false);
      }
    }
  );

  // Búsqueda con retraso - optimizada con useCallback
  const busquedaRetrasada = useCallback(
    debounce((value: string) => {
      setTerminoBusquedaRetrasado(value);
      setPaginaActual(1); // Resetear a primera página
      setEstaCargando(true);
    }, 300),
    []
  );

  // Verificar productos con stock bajo y enviar notificación - optimizado con useMemo
  const productosStockBajo = useMemo(() => {
    if (!Array.isArray(productos)) return [];
    return productos.filter(producto => 
      producto.stock > 0 && producto.stock <= UMBRAL_STOCK_BAJO
    );
  }, [productos]);

  // Función para comprimir imágenes usando Canvas - optimizada
  const comprimirImagen = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<File> => {
    return new Promise((resolve, reject) => {
      try {
        // Crear elementos para manipulación de imagen
        const reader = new FileReader();
        const img = new Image();
        
        reader.onload = (event) => {
          if (!event.target?.result) {
            return resolve(file);
          }
          
          img.onload = () => {
            try {
              // Usar OffscreenCanvas si está disponible para mejor rendimiento
              let canvas: HTMLCanvasElement | OffscreenCanvas;
              let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
              
              if (typeof OffscreenCanvas !== 'undefined') {
                canvas = new OffscreenCanvas(img.width, img.height);
                ctx = canvas.getContext('2d');
              } else {
                canvas = document.createElement('canvas');
                ctx = canvas.getContext('2d');
              }
              
              if (!ctx) {
                console.warn('No se pudo obtener contexto 2D del canvas');
                return resolve(file);
              }

              // Calcular dimensiones
              let width = img.width;
              let height = img.height;
              
              if (width > height) {
                if (width > maxWidth) {
                  height *= maxWidth / width;
                  width = maxWidth;
                }
              } else {
                if (height > maxHeight) {
                  width *= maxHeight / height;
                  height = maxHeight;
                }
              }
              
              width = Math.floor(width);
              height = Math.floor(height);
              
              // Configurar canvas con nuevas dimensiones
              if (canvas instanceof HTMLCanvasElement) {
                canvas.width = width;
                canvas.height = height;
              } else {
                // Para OffscreenCanvas
                canvas.width = width;
                canvas.height = height;
              }
              
              // Dibujar imagen
              ctx.drawImage(img, 0, 0, width, height);
              
              // Determinar tipo de salida
              const outputType = file.type === 'image/png' ? 'image/png' : 'image/webp';
              
              // Crear blob
              const canvasToBlob = (canvas: HTMLCanvasElement | OffscreenCanvas, callback: (blob: Blob | null) => void) => {
                if (canvas instanceof HTMLCanvasElement) {
                  canvas.toBlob(callback, outputType, quality);
                } else {
                  // Para OffscreenCanvas
                  canvas.convertToBlob({ type: outputType, quality }).then(callback);
                }
              };
              
              canvasToBlob(canvas, (blob) => {
                if (!blob) {
                  return resolve(file);
                }
                
                // Crear nombre de archivo con extensión apropiada
                let fileName = file.name;
                if (outputType === 'image/webp' && !fileName.toLowerCase().endsWith('.webp')) {
                  const nameParts = fileName.split('.');
                  fileName = nameParts.length > 1 
                    ? nameParts.slice(0, -1).join('.') + '.webp'
                    : fileName + '.webp';
                }
                
                const compressedFile = new File([blob], fileName, {
                  type: outputType,
                  lastModified: Date.now()
                });
                
                resolve(compressedFile);
              });
              
            } catch (err) {
              console.error('Error durante compresión:', err);
              resolve(file);
            }
          };
          
          img.onerror = () => resolve(file);
          img.src = event.target.result as string;
        };
        
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
        
      } catch (err) {
        console.error('Error general en compresión:', err);
        resolve(file);
      }
    });
  };

  // Formatear tamaños de archivo
  const formatearTamañoArchivo = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Mostrar notificación para productos con stock bajo
  useEffect(() => {
    if (productosStockBajo.length > 0 && !cargando && !esCargaInicial) {
      const nombresProductos = productosStockBajo.slice(0, 3).map(p => p.nombre).join(', ');
      const textoMas = productosStockBajo.length > 3 ? ` y ${productosStockBajo.length - 3} más` : '';
      const mensaje = `Alerta: ${productosStockBajo.length} producto${productosStockBajo.length > 1 ? 's' : ''} con stock bajo: ${nombresProductos}${textoMas}`;
      
      if (addNotification) {
        addNotification(mensaje, 'warning');
      }
    }
  }, [productosStockBajo, cargando, addNotification, esCargaInicial]);

  // Obtener permisos de sección de usuario
  useEffect(() => {
    const obtenerUsuarioActual = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          throw new Error('No hay token de autenticación');
        }

        const response = await fetch('https://lyme-back.vercel.app/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Error obteniendo información de usuario');
        }

        const data = await response.json();
        // Guardar las secciones a las que el usuario tiene acceso
        if (data.secciones) {
          setSeccionesUsuario(data.secciones);
          console.log(`Usuario con acceso a secciones: ${data.secciones}`);
        }
      } catch (err) {
        console.error('Error obteniendo secciones de usuario:', err);
      }
    };
    
    obtenerUsuarioActual();
  }, [getAuthToken]);

  // Efecto para manejar búsqueda
  useEffect(() => {
    busquedaRetrasada(terminoBusqueda);
  }, [terminoBusqueda, busquedaRetrasada]);

  // Efecto para detectar tamaño de ventana
  useEffect(() => {
    const handleResize = () => {
      const nuevoAncho = window.innerWidth;
      setAnchoVentana(nuevoAncho);
      
      // Si cambiamos entre móvil y escritorio, volver a primera página
      if ((nuevoAncho < 768 && anchoVentana >= 768) || (nuevoAncho >= 768 && anchoVentana < 768)) {
        setPaginaActual(1);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [anchoVentana]);

  // Limpiar controladores de aborto al desmontar
  useEffect(() => {
    return () => {
      // Abortar cualquier solicitud pendiente
      if (refControladorAborto.current) {
        refControladorAborto.current.abort();
      }
    };
  }, []);

  // Manejar cambio de imagen con compresión automática
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar tamaño de archivo (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        console.log('La imagen no debe exceder los 5MB');
        addNotification('La imagen no debe exceder los 5MB', 'error');
        if (refInputArchivo.current) {
          refInputArchivo.current.value = '';
        }
        return;
      }

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        console.log('El archivo debe ser una imagen');
        addNotification('El archivo debe ser una imagen', 'error');
        if (refInputArchivo.current) {
          refInputArchivo.current.value = '';
        }
        return;
      }
      
      // Mostrar mensaje si vamos a comprimir
      if (file.size > 1024 * 1024) {
        addNotification(
          `La imagen será optimizada para mejor rendimiento (${formatearTamañoArchivo(file.size)})`,
          'info'
        );
      }
      
      // Crear URL para vista previa
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          imagen: file,
          imagenPreview: reader.result as string
        });
      };
      
      reader.readAsDataURL(file);
    }
  };

  // Eliminar imagen del formulario
  const handleRemoveImage = () => {
    setFormData({
      ...formData,
      imagen: null,
      imagenPreview: null
    });
    if (refInputArchivo.current) {
      refInputArchivo.current.value = '';
    }
  };

  // Eliminar imagen de producto ya guardado
  const handleDeleteProductImage = (productId: string) => {
    // Usar mutación en lugar de implementación directa
    eliminarImagenMutation.mutate(productId);
  };

  // Manejar subida de imagen después de crear/editar producto con compresión y reintentos
  const handleImageUpload = async (productId: string, imageFile?: File) => {
    const imageToProcess = imageFile || formData.imagen;
    if (!imageToProcess) return true;
    
    try {
      setCargandoImagen(true);
      setEstaCargando(true);
      
      // Comprimir imagen antes de convertir a base64
      let imageToUpload = imageToProcess;
      
      if (imageToUpload.size > 1024 * 1024) {
        console.log(`Comprimiendo imagen grande (${formatearTamañoArchivo(imageToUpload.size)})...`);
        
        // Nivel de calidad basado en tamaño de archivo
        let quality = 0.7; // Valor por defecto
        
        // Ajustar calidad basado en tamaño
        if (imageToUpload.size > 3 * 1024 * 1024) quality = 0.5; // Imágenes muy grandes
        else if (imageToUpload.size > 2 * 1024 * 1024) quality = 0.6; // Imágenes grandes
        
        // Comprimir imagen
        imageToUpload = await comprimirImagen(imageToUpload, 1200, 1200, quality);
      }
      
      // Convertir a base64 y subir
      const base64Data = await imageService.fileToBase64(imageToUpload);
      
      // Implementar sistema de reintento para manejar "failed to fetch"
      const MAX_REINTENTOS = 3;
      let contadorReintentos = 0;
      let exito = false;
      
      while (contadorReintentos < MAX_REINTENTOS && !exito) {
        try {
          // Si no es el primer intento, esperar antes de reintentar
          if (contadorReintentos > 0) {
            const tiempoEspera = Math.pow(2, contadorReintentos) * 1000; // Espera exponencial
            console.log(`Reintentando subida de imagen (intento ${contadorReintentos + 1}/${MAX_REINTENTOS}) después de ${tiempoEspera}ms...`);
            await new Promise(resolve => setTimeout(resolve, tiempoEspera));
          }
          
          await imageService.uploadImageBase64(productId, base64Data);
          exito = true;
          
          // Actualizar caché directamente después de subir imagen
          queryClient.setQueryData(
            getClaveProductosCache(paginaActual, categoriaSeleccionada, terminoBusquedaRetrasado),
            (old: any) => {
              if (!old || !old.items) return old;
              
              return {
                ...old,
                items: old.items.map((p: ProductoExtendido) => {
                  if (p._id === productId) {
                    // Actualizar producto para indicar que ahora tiene una imagen
                    return {
                      ...p,
                      hasImage: true
                    };
                  }
                  return p;
                })
              };
            }
          );
          
          // Actualizar estado local de productos para mostrar cambio inmediatamente
          setProductos(prevProductos => 
            prevProductos.map(p => 
              p._id === productId 
                ? {...p, hasImage: true} 
                : p
            )
          );
          
          // Si estamos editando este producto, actualizar su estado
          if (productoEditando && productoEditando._id === productId) {
            setProductoEditando(prev => prev ? {...prev, hasImage: true} : null);
          }
          
          // Invalidar caché de imagen para forzar recarga
          cacheEstadoImagen.delete(productId);
          
          // Forzar actualización de datos
          queryClient.invalidateQueries({
            predicate: (query) => query.queryKey[0] === CLAVE_CACHE_PRODUCTOS,
          });
        } catch (error: any) {
          contadorReintentos++;
          
          if (contadorReintentos >= MAX_REINTENTOS) {
            console.error(`Error después de ${MAX_REINTENTOS} intentos:`, error);
            throw error;
          } else {
            console.warn(`Error subiendo imagen (intento ${contadorReintentos}/${MAX_REINTENTOS}):`, error.message);
          }
        }
      }
      
      return exito;
    } catch (error: any) {
      console.error('Error subiendo imagen:', error);
      addNotification(`Error subiendo imagen: ${error.message || 'Error desconocido'}`, 'error');
      return false;
    } finally {
      setCargandoImagen(false);
      setEstaCargando(false);
    }
  };

  // Manejar envío de formulario (crear/editar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      // Validaciones específicas para combos
      if (formData.esCombo) {
        // Verificar que haya al menos un producto en el combo
        if (!formData.itemsCombo || formData.itemsCombo.length === 0) {
          throw new Error('Un combo debe contener al menos un producto');
        }
        
        // Verificar que todos los productos existan en la lista de productos
        const productosInvalidos = formData.itemsCombo.filter(item => 
          !opcionesProductos.some(p => p._id === item.productoId)
        );
        
        if (productosInvalidos.length > 0) {
          throw new Error('El combo contiene productos inválidos');
        }
      }
      
      // IMPORTANTE: Asegurarse de que productoId sean strings válidos
      let itemsComboArreglados = [];
      if (formData.esCombo && formData.itemsCombo && formData.itemsCombo.length > 0) {
        itemsComboArreglados = formData.itemsCombo.map(item => {
          // Explícitamente asegurar que ID es un string válido
          return {
            productoId: item.productoId.toString(), // Explícitamente convertir a string
            cantidad: item.cantidad
          };
        });
      }
      
      // Datos básicos del producto (sin la imagen que se manejará por separado)
      const payload = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        categoria: formData.categoria,
        subCategoria: formData.subCategoria,
        precio: Number(formData.precio),
        stock: Number(formData.stock),
        proovedorInfo: formData.proovedorInfo,
        esCombo: !!formData.esCombo,
        itemsCombo: formData.esCombo ? itemsComboArreglados : []
      };
      
      // Usar mutación para crear/editar producto
      productoMutation.mutate({
        id: productoEditando?._id,
        payload,
        image: formData.imagen || undefined
      });
    } catch (err: any) {
      const errorMsg = 'Error guardando producto: ' + err.message;
      setError(errorMsg);
      addNotification(errorMsg, 'error');
    }
  };

  // Iniciar proceso de eliminación mostrando diálogo de confirmación
  const confirmarEliminar = (id: string) => {
    setProductoAEliminar(id);
    setDialogoEliminarAbierto(true);
  };

  // Confirmar eliminación de imagen
  const confirmarEliminarImagen = (id: string) => {
    setProductoAEliminar(id);
    setDialogoEliminarImagenAbierto(true);
  };

  // Eliminar producto (después de confirmación)
  const handleDelete = (id: string) => {
    // Comprobar si este producto está en algún combo antes de intentar eliminar
    const combosConProducto = productos.filter(
      p => p.esCombo && p.itemsCombo?.some(item => {
        // Manejar tanto si productoId es un string o un objeto
        const itemId = typeof item.productoId === 'object' 
          ? item.productoId._id 
          : item.productoId;
        return itemId === id;
      })
    );
    
    if (combosConProducto.length > 0) {
      const nombresCombo = combosConProducto.map(c => c.nombre).join(', ');
      const errorMsg = `No se puede eliminar este producto porque está incluido en los siguientes combos: ${nombresCombo}`;
      setError(errorMsg);
      addNotification(errorMsg, 'error');
      setDialogoEliminarAbierto(false);
      setProductoAEliminar(null);
      return;
    }
    
    // Usar mutación para eliminar
    eliminarProductoMutation.mutate(id);
  };

  // Preparar edición de producto
  const handleEdit = async (producto: ProductoExtendido) => {
    setProductoEditando(producto);
    
    // Al editar un combo existente, asegurarse de que todas las referencias a productos
    // en itemsCombo estén correctamente configuradas
    let itemsComboArreglados = [];
    
    if (producto.esCombo && producto.itemsCombo && producto.itemsCombo.length > 0) {
      // Verificar IDs de producto dentro del combo y arreglarlos si es necesario
      itemsComboArreglados = producto.itemsCombo.map(item => {
        const productoId = typeof item.productoId === 'object' 
          ? item.productoId._id 
          : item.productoId;
          
        // Validar que ID existe en lista de productos
        const productoExiste = opcionesProductos.some(p => p._id === productoId);
        
        if (!productoExiste) {
          console.warn(`Producto con ID ${productoId} no encontrado en la lista de productos disponibles`);
        }
        
        return {
          productoId: productoId,
          cantidad: item.cantidad
        };
      });
    }
    
    // Configurar formData para edición
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      categoria: producto.categoria,
      subCategoria: producto.subCategoria,
      precio: producto.precio.toString(),
      stock: producto.stock.toString(),
      proovedorInfo: producto.proovedorInfo || '',
      esCombo: !!producto.esCombo,
      itemsCombo: producto.esCombo ? itemsComboArreglados : [],
      imagen: null,
      imagenPreview: null
    });
    
    // Tratar de cargar imagen si existe
    if (producto.hasImage) {
      try {
        // Cargar imagen para vista previa
        // Agregar parámetro de versión para forzar recarga
        const timestamp = new Date().getTime();
        const imageUrl = `${imageService.getImageUrl(producto._id)}?v=${timestamp}`;
        setFormData(prev => ({
          ...prev,
          imagenPreview: imageUrl
        }));
      } catch (error) {
        console.error('Error cargando imagen para vista previa:', error);
      }
    }
    
    setMostrarModal(true);
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      categoria: 'limpieza',
      subCategoria: 'aerosoles',
      precio: '',
      stock: '',
      proovedorInfo: '',
      esCombo: false,
      itemsCombo: [],
      imagen: null,
      imagenPreview: null
    });
    setProductoEditando(null);
    if (refInputArchivo.current) {
      refInputArchivo.current.value = '';
    }
  };

  // Manejar cambio de categoría
  const handleCategoryChange = (value: 'limpieza' | 'mantenimiento') => {
    try {
      if (!subCategorias[value]) {
        console.error(`Categoría inválida: ${value}`);
        addNotification(`Error: Categoría '${value}' no válida`, 'error');
        return;
      }
      
      const defaultSubcategoria = subCategorias[value][0].value;
      
      setFormData(prevState => ({
        ...prevState,
        categoria: value,
        subCategoria: defaultSubcategoria
      }));
    } catch (error) {
      console.error("Error cambiando categoría:", error);
      addNotification("Error cambiando categoría", 'error');
    }
  };

  // Manejar cambio de estado esCombo
  const handleComboChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      esCombo: checked,
      // Si no es combo, vaciar la lista de productos
      itemsCombo: checked ? prev.itemsCombo : []
    }));
  };

  // Agregar item a combo - Optimizado con validaciones y comprobaciones
  const handleAddComboItem = () => {
    if (!itemComboSeleccionado || itemComboSeleccionado === "none" || cantidadItemCombo <= 0) {
      addNotification('Seleccione un producto y cantidad válida', 'warning');
      return;
    }

    // Verificar si el producto ya está en el combo
    const productoExiste = formData.itemsCombo?.some(
      item => item.productoId === itemComboSeleccionado
    );

    if (productoExiste) {
      addNotification('Este producto ya está en el combo', 'warning');
      return;
    }

    // Verificar que el producto no sea un combo (no se permiten combos dentro de combos)
    const productoSeleccionado = productos.find(p => p._id === itemComboSeleccionado);
    if (!productoSeleccionado) {
      addNotification('Producto no encontrado', 'error');
      return;
    }
    
    if (productoSeleccionado.esCombo) {
      addNotification('No se pueden agregar combos dentro de combos', 'error');
      return;
    }

    // Validar stock disponible
    if (productoSeleccionado.stock < cantidadItemCombo) {
      addNotification(`Solo hay ${productoSeleccionado.stock} unidades disponibles para este producto`, 'warning');
      // No bloquear acción, solo avisar
    }

    // Agregar al combo
    setFormData(prev => ({
      ...prev,
      itemsCombo: [
        ...(prev.itemsCombo || []),
        {
          productoId: itemComboSeleccionado,
          cantidad: cantidadItemCombo
        }
      ]
    }));

    // Resetear selección
    setItemComboSeleccionado('');
    setCantidadItemCombo(1);
    setMostrarModalCombo(false);
  };

  // Eliminar item del combo
  const handleRemoveComboItem = (index: number) => {
    const itemsActualizados = [...(formData.itemsCombo || [])];
    itemsActualizados.splice(index, 1);
    
    setFormData(prev => ({
      ...prev,
      itemsCombo: itemsActualizados
    }));
  };

  // Función para cambiar página
  const handlePageChange = useCallback((pageNumber: number) => {
    setPaginaActual(pageNumber);
    setEstaCargando(true);
    
    // Al cambiar de página, hacer scroll hacia arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Hacer scroll al inicio de la lista en móvil
    if (anchoVentana < 768 && refListaMobile.current) {
      refListaMobile.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [anchoVentana]);

  // Manejar subida de imagen con nuevo componente
  const handleImageUploaded = (success: boolean, productId?: string) => {
    if (success && productId) {
      setEstaCargando(true);
      
      // Actualizar caché directamente
      queryClient.setQueryData(
        getClaveProductosCache(paginaActual, categoriaSeleccionada, terminoBusquedaRetrasado),
        (old: any) => {
          if (!old || !old.items) return old;
          
          return {
            ...old,
            items: old.items.map((p: ProductoExtendido) => {
              if (p._id === productId) {
                // Actualizar producto para indicar que ahora tiene una imagen
                return {
                  ...p,
                  hasImage: true
                };
              }
              return p;
            })
          };
        }
      );
      
      // Actualizar estado local de productos para mostrar cambio inmediatamente
      setProductos(prevProductos => 
        prevProductos.map(p => 
          p._id === productId 
            ? {...p, hasImage: true} 
            : p
        )
      );
      
      // Invalidar caché de imagen para forzar recarga
      cacheEstadoImagen.delete(productId);
      
      // Forzar actualización para asegurar datos actualizados
      refetch().then(() => {
        setEstaCargando(false);
      });
    }
  };

  // Obtener nombre de producto por ID para combos - Mejorado con validación adicional
  const getNombreProductoPorId = (id: string) => {
    if (!id) {
      console.warn('ID de producto inválido en combo:', id);
      return 'ID inválido';
    }
    
    // Buscar por ID exacto
    const producto = productos.find(p => p._id === id);
    if (producto) {
      return producto.nombre;
    }
    
    // Si no se encuentra, intentar buscar independientemente del formato (para manejar posibles problemas de tipo de dato)
    const productoPorComparacionString = productos.find(p => 
      p._id.toString() === id.toString()
    );
    
    if (productoPorComparacionString) {
      return productoPorComparacionString.nombre;
    }
    
    console.warn('Producto no encontrado para ID:', id);
    return 'Producto no encontrado';
  };

  // Calcular precio total del combo
  const calcularTotalCombo = useCallback(() => {
    if (!formData.itemsCombo || formData.itemsCombo.length === 0) return 0;
    
    return formData.itemsCombo.reduce((total, item) => {
      if (!Array.isArray(productos)) return total;
      
      // Manejar tanto si productoId es un string o un objeto
      const productoId = typeof item.productoId === 'object'
        ? item.productoId._id
        : item.productoId;
        
      const producto = productos.find(p => p._id === productoId);
      if (!producto) return total;
      
      return total + (producto.precio * item.cantidad);
    }, 0);
  }, [formData.itemsCombo, productos]);

  // Mostrar información detallada sobre paginación
  const indexUltimoProducto = paginaActual * itemsPorPagina;
  const indexPrimerProducto = indexUltimoProducto - itemsPorPagina;
  const mostrandoDesdeHasta = totalItems > 0 
    ? `${indexPrimerProducto + 1}-${Math.min(indexUltimoProducto, totalItems)} de ${totalItems}`
    : '0 de 0';

  // Obtener productos no-combo para selector - Optimizado con useMemo
  const productosNoCombo = useMemo(() => {
    if (!Array.isArray(opcionesProductos)) return [];
    return opcionesProductos.filter(p => !p.esCombo);
  }, [opcionesProductos]);

  // Controlador para cambio de elementos visibles - Mejora rendimiento precargando solo lo visible
  const handleElementosVisiblesChanged = useCallback((elementosVisibles: ProductoExtendido[]) => {
    if (elementosVisibles && elementosVisibles.length > 0) {
      // Con el nuevo sistema optimizado, no necesitamos hacer nada extra aquí
      // ya que las imágenes se cargan automáticamente cuando entran en el viewport
    }
  }, []);
  

  // Cuando cambia la categoría seleccionada, actualizar UI
  useEffect(() => {
    setEstaCargando(true);
  }, [categoriaSeleccionada]);

  return (
    <div className="p-4 md:p-6 space-y-6 bg-[#DFEFE6]/30">
      {/* Alertas */}
      {error && (
        <Alert className="bg-red-50 border border-red-200 text-red-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}
      
      {mensajeExito && (
        <Alert className="bg-[#DFEFE6] border border-[#91BEAD] text-[#29696B] rounded-lg">
          <CheckCircle className="h-4 w-4 text-[#29696B]" />
          <AlertDescription className="ml-2">{mensajeExito}</AlertDescription>
        </Alert>
      )}

      {/* Barra de herramientas */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 bg-white rounded-xl shadow-sm p-4 border border-[#91BEAD]/20">
        <div className="w-full md:w-64">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar productos..."
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
              className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
            />
          </div>
          
          <Tabs 
            defaultValue="all" 
            value={categoriaSeleccionada}
            onValueChange={setCategoriaSeleccionada}
            className="w-full"
          >
            <TabsList className="w-full mb-2 flex flex-wrap h-auto bg-[#DFEFE6]/50">
              <TabsTrigger 
                value="all" 
                className="flex-1 data-[state=active]:bg-[#29696B] data-[state=active]:text-white"
              >
                Todos
              </TabsTrigger>
              <TabsTrigger 
                value="limpieza" 
                className="flex-1 data-[state=active]:bg-[#29696B] data-[state=active]:text-white"
                disabled={seccionesUsuario === 'mantenimiento'}
              >
                Limpieza
              </TabsTrigger>
              <TabsTrigger 
                value="mantenimiento" 
                className="flex-1 data-[state=active]:bg-[#29696B] data-[state=active]:text-white"
                disabled={seccionesUsuario === 'limpieza'}
              >
                Mantenimiento
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="w-full md:w-auto">            
          <Button 
            onClick={() => {
              resetForm();
              setMostrarModal(true);
            }}
            className="w-full md:w-auto bg-[#29696B] hover:bg-[#29696B]/90 text-white"
            disabled={seccionesUsuario !== 'ambos' && categoriaSeleccionada !== 'all' && categoriaSeleccionada !== seccionesUsuario}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Alerta para productos con stock bajo */}
      {!isLoading && productosStockBajo.length > 0 && (
        <Alert className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="ml-2">
            Hay {productosStockBajo.length} productos con stock bajo. Por favor, revise el inventario.
          </AlertDescription>
        </Alert>
      )}

      {/* Mensaje cuando no hay productos */}
      {!isLoading && productos.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-[#91BEAD]/20">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
            {estaCargando ? (
              <Loader2 className="w-6 h-6 text-[#29696B] animate-spin" />
            ) : (
              <Search className="w-6 h-6 text-[#29696B]" />
            )}
          </div>
          <p className="text-[#7AA79C]">
            {estaCargando 
              ? 'Cargando productos...'
              : 'No se encontraron productos que coincidan con la búsqueda'
            }
          </p>
        </div>
      )}

      {/* Contador de resultados con información detallada */}
      {!isLoading && productos.length > 0 && (
        <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm text-[#29696B] flex flex-col sm:flex-row sm:justify-between items-center">
          <span>
            Total: {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
          </span>
          <span className="text-[#29696B] font-medium">
          Mostrando: {mostrandoDesdeHasta}
          </span>
        </div>
      )}

      {/* Estado de carga */}
      {isLoading && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-[#91BEAD]/20">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
            <Loader2 className="w-6 h-6 text-[#29696B] animate-spin" />
          </div>
          <p className="text-[#7AA79C]">Cargando productos...</p>
        </div>
      )}

      {/* Tabla para pantallas medianas y grandes - IMPLEMENTACIÓN VIRTUALIZADA */}
      <div ref={refTabla} className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-[#91BEAD]/20 h-[70vh]">
        {!isLoading && productos.length > 0 && (
          <div className="overflow-auto h-full">
            <TablaProductosVirtualizada
              productos={productos}
              onEdit={handleEdit}
              onDelete={confirmarEliminar}
              userSections={seccionesUsuario}
              tableContainerRef={refTabla}
              onVisibleItemsChanged={handleElementosVisiblesChanged}
            />
          </div>
        )}
        
        {/* Paginación para tabla */}
        {!isLoading && totalPaginas > 1 && (
          <div className="py-4 border-t border-[#91BEAD]/20">
            <Pagination
              totalItems={totalItems}
              itemsPerPage={itemsPorPagina}
              currentPage={paginaActual}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Vista de tarjetas para dispositivos móviles - IMPLEMENTACIÓN VIRTUALIZADA */}
      <div ref={refListaMobile} id="lista-productos-mobile" className="md:hidden">
        {/* Paginación visible en la parte superior para móvil */}
        {!isLoading && totalPaginas > 1 && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20">
            <Pagination
              totalItems={totalItems}
              itemsPerPage={itemsPorPagina}
              currentPage={paginaActual}
              onPageChange={handlePageChange}
            />
          </div>
        )}
        
        {!isLoading && productos.length > 0 && (
          <ListaProductosMobile
            productos={productos}
            onEdit={handleEdit}
            onDelete={confirmarEliminar}
            userSections={seccionesUsuario}
            onVisibleItemsChanged={handleElementosVisiblesChanged}
          />
        )}
        
        {/* Indicador de carga en móvil */}
        {estaCargando && (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="w-5 h-5 text-[#29696B] animate-spin mr-2" />
            <span className="text-[#29696B] text-sm">Actualizando...</span>
          </div>
        )}
        
        {/* Mensaje que muestra página actual y total */}
        {!isLoading && totalPaginas > 1 && (
          <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm">
            <span className="text-[#29696B] font-medium">
              Página {paginaActual} de {totalPaginas}
            </span>
          </div>
        )}
        
        {/* Paginación duplicada al final de la lista para mejor visibilidad */}
        {!isLoading && totalPaginas > 1 && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20 mt-2">
            <Pagination
              totalItems={totalItems}
              itemsPerPage={itemsPorPagina}
              currentPage={paginaActual}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Modal de Producto */}
      <Dialog open={mostrarModal} onOpenChange={setMostrarModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto bg-white border border-[#91BEAD]/20">
          <DialogHeader className="sticky top-0 bg-white pt-4 pb-2 z-10">
            <DialogTitle className="text-[#29696B]">
              {productoEditando ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid gap-3">
              <div>
                <Label htmlFor="nombre" className="text-sm text-[#29696B]">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
                />
              </div>

              <div>
                <Label htmlFor="descripcion" className="text-sm text-[#29696B]">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={2}
                  className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="categoria" className="text-sm text-[#29696B]">Categoría</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value: 'limpieza' | 'mantenimiento') => handleCategoryChange(value)}
                    disabled={
                      // Deshabilitar si el usuario no tiene permiso para esta categoría
                      seccionesUsuario !== 'ambos' && formData.categoria !== seccionesUsuario
                    }
                  >
                    <SelectTrigger id="categoria" className="mt-1 border-[#91BEAD] focus:ring-[#29696B]/20">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent className="border-[#91BEAD]">
                      <SelectItem value="limpieza" disabled={seccionesUsuario === 'mantenimiento'}>Limpieza</SelectItem>
                      <SelectItem value="mantenimiento" disabled={seccionesUsuario === 'limpieza'}>Mantenimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subCategoria" className="text-sm text-[#29696B]">Subcategoría</Label>
                  <Select
                    value={formData.subCategoria}
                    onValueChange={(value) => setFormData({ ...formData, subCategoria: value })}
                  >
                    <SelectTrigger id="subCategoria" className="mt-1 border-[#91BEAD] focus:ring-[#29696B]/20">
                      <SelectValue placeholder="Seleccionar subcategoría" />
                    </SelectTrigger>
                    <SelectContent className="border-[#91BEAD]">
                      {subCategorias[formData.categoria]?.map((sub) => (
                        <SelectItem key={sub.value} value={sub.value}>
                          {sub.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="precio" className="text-sm text-[#29696B]">Precio</Label>
                  <Input
                    id="precio"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    required
                    className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
                    maxLength={10}
                  />
                </div>

                <div>
                  <Label htmlFor="stock" className="text-sm text-[#29696B]">Stock</Label>
                  <EntradaStockProducto
                    id="stock"
                    value={formData.stock}
                    onChange={(value) => setFormData({ ...formData, stock: value })}
                    required
                    maxStock={999999999}
                    categoria={formData.categoria}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="proovedorInfo" className="text-sm text-[#29696B]">Información del Proveedor</Label>
                <Input
                  id="proovedorInfo"
                  value={formData.proovedorInfo}
                  onChange={(e) => setFormData({ ...formData, proovedorInfo: e.target.value })}
                  className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
                />
              </div>
              
              {/* Switch para combos */}
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="isCombo"
                  checked={formData.esCombo}
                  onCheckedChange={handleComboChange}
                />
                <Label htmlFor="isCombo" className="text-sm text-[#29696B]">¿Es un combo?</Label>
              </div>
              
              {/* Sección de productos de combo */}
              {formData.esCombo && (
                <div className="space-y-3 p-3 border border-[#91BEAD]/30 rounded-lg bg-[#DFEFE6]/10">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm text-[#29696B] font-medium">Productos en el combo</Label>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setMostrarModalCombo(true)}
                      className="bg-[#29696B] hover:bg-[#29696B]/90 text-white text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Agregar
                    </Button>
                  </div>
                  
                  {formData.itemsCombo && formData.itemsCombo.length > 0 ? (
                    <div className="space-y-2">
                      {formData.itemsCombo.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-white rounded border border-[#91BEAD]/20">
                          <div className="text-sm">
                            <span className="font-medium text-[#29696B]">{getNombreProductoPorId(item.productoId)}</span>
                            <span className="text-[#7AA79C] ml-2">x{item.cantidad}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveComboItem(index)}
                            className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <div className="mt-2 pt-2 border-t border-[#91BEAD]/20 flex justify-between items-center">
                        <span className="text-sm text-[#7AA79C]">Total calculado:</span>
                        <span className="font-medium text-[#29696B]">${calcularTotalCombo().toFixed(2)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-3 text-sm text-[#7AA79C] bg-[#DFEFE6]/20 rounded">
                      No hay productos en el combo
                    </div>
                  )}
                  
                  <div className="text-xs text-amber-600">
                    Recuerde que el precio del combo puede ser diferente del total calculado.
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm text-[#29696B] block mb-2">Imagen del Producto</Label>
                
                {/* Mostrar componente de carga de imagen cuando se está editando */}
                {productoEditando ? (
                  <div className="mt-2">
                    {formData.imagenPreview ? (
                      <div className="relative w-full h-32 bg-[#DFEFE6]/20 rounded-md overflow-hidden border border-[#91BEAD]/30">
                        <img 
                          src={formData.imagenPreview} 
                          alt="Vista previa" 
                          className="w-full h-full object-contain" 
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => confirmarEliminarImagen(productoEditando._id)}
                          className="absolute top-2 right-2 h-8 w-8 p-0 bg-red-500 hover:bg-red-600"
                          disabled={eliminarImagenMutation.isLoading}
                        >
                          {eliminarImagenMutation.isLoading ? 
                            <Loader2 className="h-4 w-4 animate-spin" /> : 
                            <X className="h-4 w-4" />
                          }
                        </Button>
                      </div>
                    ) : (
                      <ImageUpload 
                        productId={productoEditando._id}
                        useBase64={false}
                        onImageUploaded={(success) => handleImageUploaded(success, productoEditando._id)}
                      />
                    )}
                  </div>
                ) : (
                  // Para productos nuevos, mantener UI original
                  <div className="mt-1 flex flex-col space-y-2">
                    {formData.imagenPreview ? (
                      <div className="relative w-full h-32 bg-[#DFEFE6]/20 rounded-md overflow-hidden border border-[#91BEAD]/30">
                        <img 
                          src={formData.imagenPreview} 
                          alt="Vista previa" 
                          className="w-full h-full object-contain" 
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 h-8 w-8 p-0 bg-red-500 hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-[#91BEAD]/30 border-dashed rounded-md cursor-pointer bg-[#DFEFE6]/20 hover:bg-[#DFEFE6]/40 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-3 pb-4">
                            <ImageIcon className="w-8 h-8 text-[#7AA79C] mb-1" />
                            <p className="text-xs text-[#7AA79C]">
                              Haga clic para subir una imagen
                            </p>
                            <p className="text-xs text-[#7AA79C]">
                              Máximo 5MB
                            </p>
                          </div>
                          <input 
                            ref={refInputArchivo}
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageChange}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="sticky bottom-0 bg-white pt-2 pb-4 z-10 gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMostrarModal(false);
                  resetForm();
                }}
                className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
                disabled={productoMutation.isLoading || cargandoImagen}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
                disabled={productoMutation.isLoading || cargandoImagen}
              >
                {productoMutation.isLoading || cargandoImagen ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {cargandoImagen ? 'Procesando imagen...' : 'Guardando...'}
                  </>
                ) : (
                  productoEditando ? 'Guardar Cambios' : 'Crear Producto'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Modal para agregar producto al combo */}
      <Dialog open={mostrarModalCombo} onOpenChange={setMostrarModalCombo}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">Agregar Producto al Combo</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="comboItem" className="text-sm text-[#29696B]">Producto</Label>
              <Select 
                value={itemComboSeleccionado}
                onValueChange={setItemComboSeleccionado}
              >
                <SelectTrigger id="comboItem" className="border-[#91BEAD] focus:ring-[#29696B]/20">
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {/* Filtramos para excluir combos y también productos ya añadidos */}
                  {productos
                    .filter(p => !p.esCombo) // Excluir combos
                    .filter(p => !formData.itemsCombo?.some(item => 
                      item.productoId.toString() === p._id.toString()
                    )) // Excluir productos ya añadidos
                    .map(producto => (
                    <SelectItem key={producto._id} value={producto._id}>
                      {producto.nombre} - ${producto.precio.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Contador de disponibilidad */}
              <div className="mt-1 text-xs text-[#7AA79C]">
                {productos.filter(p => !p.esCombo).filter(p => !formData.itemsCombo?.some(item => 
                  item.productoId.toString() === p._id.toString()
                )).length} productos disponibles para agregar
              </div>
            </div>
            
            <div>
              <Label htmlFor="comboQuantity" className="text-sm text-[#29696B]">Cantidad</Label>
              <Input
                id="comboQuantity"
                type="number"
                min="1"
                value={cantidadItemCombo}
                onChange={(e) => setCantidadItemCombo(parseInt(e.target.value) || 1)}
                className="border-[#91BEAD] focus:ring-[#29696B]/20 focus:border-[#29696B]"
              />
              
              {/* Mostrar información sobre stock disponible */}
              {itemComboSeleccionado && (
                <div className="mt-2 text-xs">
                  {(() => {
                    const productoSeleccionado = productos.find(p => p._id === itemComboSeleccionado);
                    if (!productoSeleccionado) return null;
                    
                    return (
                      <div className={`${
                        productoSeleccionado.stock < cantidadItemCombo 
                          ? 'text-amber-600' 
                          : 'text-[#7AA79C]'
                      }`}>
                        Stock disponible: {productoSeleccionado.stock} unidades
                        {productoSeleccionado.stock < cantidadItemCombo && (
                          <div className="text-amber-600 mt-1">
                            ¡Atención! La cantidad seleccionada supera el stock disponible.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMostrarModalCombo(false)}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAddComboItem}
              className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              disabled={!itemComboSeleccionado || cantidadItemCombo <= 0}
            >
              Agregar al Combo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <ConfirmationDialog
        open={dialogoEliminarAbierto}
        onOpenChange={setDialogoEliminarAbierto}
        title="Eliminar producto"
        description="¿Está seguro de que desea eliminar este producto? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar" 
        onConfirm={() => productoAEliminar && handleDelete(productoAEliminar)}
        variant="destructive"
      />

      {/* Diálogo de confirmación de eliminación de imagen */}
      <ConfirmationDialog
        open={dialogoEliminarImagenAbierto}
        onOpenChange={setDialogoEliminarImagenAbierto}
        title="Eliminar imagen"
        description="¿Está seguro de que desea eliminar la imagen de este producto?"
        confirmText="Eliminar"
        cancelText="Cancelar" 
        onConfirm={() => productoAEliminar && handleDeleteProductImage(productoAEliminar)}
        variant="destructive"
      />
    </div>
  );
};

export default InventorySection;