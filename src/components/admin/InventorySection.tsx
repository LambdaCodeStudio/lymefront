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
  ShoppingBag,
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

// Importar el ProductImage optimizado (asegúrate de haberlo implementado)
import OptimizedProductImage from './components/ProductImage';

// COMPONENTE OPTIMIZADO DE IMAGEN DE PRODUCTO
// Implementa este componente en un archivo separado
const ProductImage = ({ 
  productId, 
  alt = "Product image", 
  width = 80, 
  height = 80, 
  quality = 70, 
  className = "", 
  fallbackClassName = "", 
  containerClassName = "", 
  useBase64 = false, 
  priority = false 
}) => {
  const [loadState, setLoadState] = useState('loading');
  const imageRef = useRef(null);
  const observerRef = useRef(null);
  const [retryCount, setRetryCount] = useState(0);
  const [timestamp, setTimestamp] = useState(Date.now());
  
  // Construir URL de la imagen con cache busting
  const imageUrl = useBase64 
    ? `https://lyme-back.vercel.app/api/producto/${productId}/imagen-base64`
    : `https://lyme-back.vercel.app/api/producto/${productId}/imagen?quality=${quality}&width=${width}&height=${height}&v=${timestamp}`;

  useEffect(() => {
    if (!productId) return;

    const loadImage = () => {
      // Para imágenes base64, se manejaría diferente
      if (useBase64) {
        fetch(imageUrl)
          .then(response => {
            if (!response.ok) {
              if (response.status === 204) {
                setLoadState('notExists');
                return;
              }
              throw new Error('Failed to load image');
            }
            return response.json();
          })
          .then(() => {
            setLoadState('loaded');
          })
          .catch(() => {
            setLoadState('error');
          });
      } else {
        // Para imágenes directas, se maneja en el evento onload/onerror
        setLoadState('loading');
      }
    };

    // Cargar inmediatamente si es prioritaria
    if (priority) {
      loadImage();
      return;
    }

    // Lazy loading con IntersectionObserver
    if ('IntersectionObserver' in window && imageRef.current) {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            loadImage();
            observerRef.current?.disconnect();
            observerRef.current = null;
          }
        },
        {
          rootMargin: '200px', // Precargar cuando esté a 200px de ser visible
          threshold: 0.01 // Cargar cuando apenas sea visible
        }
      );

      observerRef.current.observe(imageRef.current);
    } else {
      // Fallback
      loadImage();
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [productId, imageUrl, priority, useBase64]);

  // Manejar carga correcta
  const handleImageLoad = () => {
    setLoadState('loaded');
    setRetryCount(0);
  };

  // Manejar error con reintento
  const handleImageError = () => {
    if (retryCount < 1) {
      // Reintentar una vez con un nuevo timestamp
      setRetryCount(prev => prev + 1);
      setTimestamp(Date.now());
    } else {
      setLoadState('error');
    }
  };

  const isLoading = loadState === 'loading';
  const hasError = loadState === 'error' || loadState === 'notExists';

  return (
    <div className={`relative ${containerClassName}`} style={{ width, height }}>
      {/* Placeholder mientras carga o si hay error */}
      {(isLoading || hasError) && (
        <div className={`flex items-center justify-center ${fallbackClassName || 'bg-gray-100 rounded-md'}`} 
          style={{ width, height }}>
          <ImageIcon className="w-6 h-6 text-gray-400" />
        </div>
      )}
      
      {/* Solo renderizar si no se usa base64 */}
      {!useBase64 && (
        <img
          ref={imageRef}
          src={!isLoading ? imageUrl : undefined}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`${className} ${loadState === 'loaded' ? 'opacity-100' : 'opacity-0'} absolute top-0 left-0 transition-opacity duration-300`}
          loading="lazy"
        />
      )}
    </div>
  );
};

// Definir interfaces según el backend
interface ProductExtended {
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
  itemsCombo?: ComboItem[];
}

interface PagedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ComboItem {
  productoId: string | any; // Permitir objetos para facilitar la manipulación
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
  itemsCombo?: ComboItem[];
  imagen?: File | null;
  imagenPreview?: string | null;
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
const LOW_STOCK_THRESHOLD = 10;
// Clave para cache de productos
const PRODUCTS_CACHE_KEY = 'products';

// Componente para input de stock con límite máximo
const ProductStockInput: React.FC<{
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
    
    // Para productos de limpieza, el stock mínimo es 1
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
  const minStockWarning = categoria === 'limpieza' ? (
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
      {minStockWarning}
      <p className="mt-1 text-xs text-[#7AA79C]">
        Máximo: {maxStock.toLocaleString()}
      </p>
    </div>
  );
};

// COMPONENTE DE FILA DE PRODUCTO OPTIMIZADO
const ProductRow = React.memo(({ 
  product, 
  onEdit, 
  onDelete, 
  userSections,
  isInViewport = false // Nueva prop para optimizar la carga de imágenes
}) => {
  // Verificar permisos
  const canEdit = userSections === 'ambos' || product.categoria === userSections;

  return (
    <tr 
      className={`hover:bg-[#DFEFE6]/20 transition-colors ${
        product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD 
          ? 'bg-yellow-50 hover:bg-yellow-100' 
          : product.stock <= 0 
            ? 'bg-red-50 hover:bg-red-100'
            : ''
      }`}
    >
      <td className="px-6 py-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 mr-3">
            <ProductImage
              productId={product._id}
              alt={product.nombre}
              width={40}
              height={40}
              quality={60} // Calidad reducida para mejor rendimiento
              className="h-10 w-10 rounded-full object-cover border border-[#91BEAD]/30"
              fallbackClassName="h-10 w-10 rounded-full bg-[#DFEFE6]/50 flex items-center justify-center border border-[#91BEAD]/30"
              containerClassName="h-10 w-10"
              useBase64={false}
              priority={isInViewport} // Cargar con prioridad solo si está visible
              key={`img-${product._id}-${product.hasImage ? 'has-image' : 'no-image'}`}
            />
          </div>
          <div>
            <div className="text-sm font-medium text-[#29696B] flex items-center">
              {product.nombre}
              {product.esCombo && (
                <Badge variant="outline" className="ml-2 text-xs border-[#91BEAD] text-[#29696B] bg-[#DFEFE6]/40">
                  Combo
                </Badge>
              )}
            </div>
            {product.descripcion && (
              <div className="text-sm text-[#7AA79C] truncate max-w-xs">
                {product.descripcion}
              </div>
            )}
            {product.esCombo && product.itemsCombo && product.itemsCombo.length > 0 && (
              <div className="text-xs text-[#7AA79C] mt-1">
                Contiene: {product.itemsCombo.length} productos
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-[#7AA79C]">
        <Badge variant="outline" className="capitalize border-[#91BEAD] text-[#29696B]">
          {product.categoria}
        </Badge>
        <div className="text-xs mt-1 capitalize text-[#7AA79C]">{product.subCategoria}</div>
      </td>
      <td className="px-6 py-4 text-sm font-medium text-[#29696B]">
        ${product.precio.toFixed(2)}
      </td>
      <td className="px-6 py-4">
        {renderStockIndicator(product.stock)}
      </td>
      <td className="px-6 py-4 text-sm text-[#7AA79C]">
        {product.vendidos || 0}
      </td>
      <td className="px-6 py-4 text-right text-sm font-medium">
        <div className="flex justify-end space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(product)}
            className="text-[#29696B] hover:text-[#29696B] hover:bg-[#DFEFE6]"
            disabled={!canEdit}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(product._id)}
            className="text-red-600 hover:text-red-800 hover:bg-red-50"
            disabled={!canEdit}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
});

// Función para renderizar indicador de stock
const renderStockIndicator = (stock: number) => {
  if (stock <= 0) {
    return (
      <div className="flex items-center gap-1">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          Sin stock
        </span>
      </div>
    );
  } else if (stock <= LOW_STOCK_THRESHOLD) {
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

// COMPONENTE DE TABLA VIRTUALIZADA
const VirtualizedProductTable = ({ 
  products, 
  onEdit, 
  onDelete, 
  userSections,
  tableContainerRef
}) => {
  const rowVirtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 70, // Altura estimada de fila
    overscan: 5 // Cuántos elementos renderizar antes/después del área visible
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
                const product = products[virtualRow.index];
                return (
                  <div
                    key={`${product._id}-${product.hasImage ? 'has-image' : 'no-image'}`}
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
                    <ProductRow
                      product={product}
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

// COMPONENTE PARA VISTA MÓVIL OPTIMIZADA
const MobileProductList = React.memo(({ products, onEdit, onDelete, userSections }) => {
  const parentRef = useRef(null);
  
  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Altura estimada de tarjeta
    overscan: 3
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
          const product = products[virtualRow.index];
          return (
            <div
              key={`${product._id}-${product.hasImage ? 'has-image' : 'no-image'}`}
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
              <ProductCard 
                product={product} 
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
});

// COMPONENTE DE TARJETA DE PRODUCTO PARA MÓVIL
const ProductCard = React.memo(({ product, onEdit, onDelete, userSections, isInViewport }) => {
  // Verificar permisos
  const canEdit = userSections === 'ambos' || product.categoria === userSections;

  return (
    <Card 
      className={`overflow-hidden shadow-sm border ${
        product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD 
          ? 'border-yellow-300 bg-yellow-50' 
          : product.stock <= 0 
            ? 'border-red-300 bg-red-50'
            : 'border-[#91BEAD]/20 bg-white'
      }`}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base truncate mr-2 text-[#29696B]">
            <div className="flex items-center">
              {product.nombre}
              {product.esCombo && (
                <Badge variant="outline" className="ml-2 text-xs border-[#91BEAD] text-[#29696B] bg-[#DFEFE6]/40">
                  Combo
                </Badge>
              )}
            </div>
          </CardTitle>
          <Badge variant="outline" className="capitalize text-xs border-[#91BEAD] text-[#29696B]">
            {product.categoria}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 pb-3">
        <div className="flex gap-4 mb-3">
          <div className="flex-shrink-0 h-16 w-16">
            <ProductImage
              productId={product._id}
              alt={product.nombre}
              width={64}
              height={64}
              quality={60}
              className="h-16 w-16 rounded-md object-cover border border-[#91BEAD]/30"
              fallbackClassName="h-16 w-16 rounded-md bg-[#DFEFE6]/50 flex items-center justify-center border border-[#91BEAD]/30"
              containerClassName="h-16 w-16"
              useBase64={false}
              priority={isInViewport}
              key={`img-${product._id}-${product.hasImage ? 'has-image' : 'no-image'}`}
            />
          </div>
          <div className="flex-1 min-w-0">
            {product.descripcion && (
              <p className="text-sm text-[#7AA79C] line-clamp-2 mb-2">
                {product.descripcion}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 text-[#91BEAD] mr-1" />
                <span className="font-medium text-[#29696B]">${product.precio.toFixed(2)}</span>
              </div>
              <div className="flex items-center">
                <PackageOpen className="w-4 h-4 text-[#91BEAD] mr-1" />
                <span className={`font-medium ${
                  product.stock <= 0 
                    ? 'text-red-600' 
                    : product.stock <= LOW_STOCK_THRESHOLD
                      ? 'text-yellow-600 flex items-center gap-1'
                      : 'text-[#29696B]'
                }`}>
                  {product.stock <= LOW_STOCK_THRESHOLD && product.stock > 0 && (
                    <AlertTriangle className="w-3 h-3 text-yellow-500 animate-pulse" />
                  )}
                  {product.stock <= 0 ? 'Sin stock' : `${product.stock} unid.`}
                </span>
              </div>
            </div>
            <div className="mt-2 text-xs text-[#7AA79C]">
              <span className="block">Subcategoría: <span className="capitalize">{product.subCategoria}</span></span>
              <span className="block">Vendidos: {product.vendidos || 0}</span>
              {product.esCombo && product.itemsCombo && (
                <span className="block">Contiene: {product.itemsCombo.length} productos</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-2 flex justify-end gap-2 bg-[#DFEFE6]/20 border-t border-[#91BEAD]/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(product)}
          className="text-[#29696B] hover:bg-[#DFEFE6]"
          disabled={!canEdit}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(product._id)}
          className="text-red-600 hover:text-red-800 hover:bg-red-50"
          disabled={!canEdit}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
});

const InventorySection: React.FC = () => {
  // Inicializar React Query
  const queryClient = useQueryClient();
  
  const { addNotification } = useNotification();
  const [products, setProducts] = useState<ProductExtended[]>([]);
  const [productOptions, setProductOptions] = useState<ProductExtended[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showComboModal, setShowComboModal] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deleteImageDialogOpen, setDeleteImageDialogOpen] = useState<boolean>(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductExtended | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [userSections, setUserSections] = useState<string>('ambos');
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Estado para combo seleccionado
  const [selectedComboItem, setSelectedComboItem] = useState<string>('');
  const [comboItemQuantity, setComboItemQuantity] = useState<number>(1);

  // Estado para la paginación
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Referencias para el scroll en móvil
  const mobileListRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Tamaños fijos para cada tipo de dispositivo
  const ITEMS_PER_PAGE_MOBILE = 5;
  const ITEMS_PER_PAGE_DESKTOP = 10;

  // Estado para controlar el ancho de la ventana
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Calculamos dinámicamente itemsPerPage basado en el ancho de la ventana
  const itemsPerPage = windowWidth < 768 ? ITEMS_PER_PAGE_MOBILE : ITEMS_PER_PAGE_DESKTOP;

  // Creamos caché para evitar peticiones repetidas al API de imágenes
  const imageCache = useRef<Map<string, boolean>>(new Map());

  // Referencia al controlador de aborto para cancelar solicitudes pendientes
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Obtener auth token
  const getAuthToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }, []);

  // Función para generar clave de caché de productos
  const getProductsCacheKey = useCallback(
    (page: number, category: string, search: string) => {
      return [PRODUCTS_CACHE_KEY, page, itemsPerPage, category, search];
    },
    [itemsPerPage]
  );

  // Función para obtener productos con React Query - Optimizada
  const fetchProductsData = useCallback(async (
    page: number, 
    limit: number, 
    category: string, 
    search: string
  ): Promise<PagedResponse<ProductExtended>> => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Abortar solicitud anterior si existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Crear nuevo controlador de aborto
      abortControllerRef.current = new AbortController();

      // Parámetros de paginación y filtros
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        category: category !== 'all' ? category : '',
        search: search,
        _: new Date().getTime().toString() // Cache-busting
      });
      
      const response = await fetchWithRetry(
        `https://lyme-back.vercel.app/api/producto?${params}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          cache: 'no-store',
          signal: abortControllerRef.current.signal
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
        // Devolvemos un estado vacío en lugar de lanzar un error
        return {
          items: [],
          page,
          limit,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        };
      }
      
      console.error('Error fetching products:', error);
      throw new Error(`Error al cargar productos: ${error.message}`);
    } finally {
      // Limpiar controlador de aborto si la solicitud se completó o falló
      if (abortControllerRef.current?.signal.aborted) {
        abortControllerRef.current = null;
      }
    }
  }, [getAuthToken]);

  // Mejorar la función fetch con reintentos para manejar "failed to fetch"
  const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 2) => {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
          // Si es un error de autenticación, no reintentar
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
        
        retries++;
        console.warn(`Intento ${retries}/${maxRetries} fallido: ${error.message}`);
        
        // Si es el último intento, lanzar el error
        if (retries >= maxRetries) {
          throw error;
        }
        
        // Esperar antes de reintentar (espera menor y más corta)
        const delay = Math.min(500 * retries, 3000);
        console.log(`Esperando ${delay}ms antes de reintentar...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Por seguridad, aunque nunca debería llegar aquí
    throw new Error(`Failed after ${maxRetries} retries`);
  };

  // Usar React Query para cargar productos - Configuración optimizada
  const { 
    data, 
    isLoading, 
    error: queryError,
    refetch
  } = useQuery(
    getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm),
    () => fetchProductsData(currentPage, itemsPerPage, selectedCategory, debouncedSearchTerm),
    {
      keepPreviousData: true,
      staleTime: 300000, // Aumentado a 5 minutos
      cacheTime: 3600000, // 1 hora - para mantener datos en caché más tiempo
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false, // Deshabilitar auto refresh al reconectar
      onSuccess: (data) => {
        setProducts(data.items);
        setTotalItems(data.totalItems);
        setTotalPages(data.totalPages);
        
        // Extraer productos no combo para selector
        const productOptionsFiltered = data.items.filter(p => !p.esCombo);
        setProductOptions(productOptionsFiltered);
        
        // Ya no estamos en carga inicial después de la primera carga
        setIsInitialLoad(false);
        
        // Pre-fetch siguiente página si existe
        if (data.hasNextPage) {
          queryClient.prefetchQuery(
            getProductsCacheKey(currentPage + 1, selectedCategory, debouncedSearchTerm),
            () => fetchProductsData(currentPage + 1, itemsPerPage, selectedCategory, debouncedSearchTerm)
          );
        }
      },
      onError: (err: any) => {
        // No mostrar errores si la solicitud fue cancelada
        if (err.name === 'AbortError') return;
        
        const errorMsg = `Error al cargar productos: ${err.message}`;
        setError(errorMsg);
        
        if (typeof addNotification === 'function') {
          addNotification(errorMsg, 'error');
        }
      },
      onSettled: () => {
        setIsFetching(false);
      }
    }
  );

  // Mutation para eliminar producto
  const deleteProductMutation = useMutation(
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
      // Actualización optimista del caché
      onMutate: async (deletedId) => {
        // Cancelar consultas en curso
        await queryClient.cancelQueries(getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm));
        
        // Guardar el estado anterior
        const previousProducts = queryClient.getQueryData(
          getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm)
        );
        
        // Actualizar la caché con optimistic update
        queryClient.setQueryData(
          getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm),
          (old: any) => {
            const newData = { ...old };
            newData.items = old.items.filter((p: ProductExtended) => p._id !== deletedId);
            newData.totalItems = (old.totalItems || 0) - 1;
            newData.totalPages = Math.ceil(newData.totalItems / itemsPerPage);
            return newData;
          }
        );
        
        // Retornar el estado anterior para rollback si es necesario
        return { previousProducts };
      },
      onError: (err, id, context: any) => {
        // Restaurar el estado anterior en caso de error
        if (context?.previousProducts) {
          queryClient.setQueryData(
            getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm),
            context.previousProducts
          );
        }
        
        const errorMsg = `Error al eliminar producto: ${err instanceof Error ? err.message : 'Error desconocido'}`;
        setError(errorMsg);
        addNotification(errorMsg, 'error');
      },
      onSuccess: (deletedId) => {
        // Invalidar todas las consultas de productos para asegurar sincronización
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === PRODUCTS_CACHE_KEY,
        });
        
        // Eliminar imagen de las cachés de imágenes
        imageService.invalidateCache(deletedId);
        imageCache.current.delete(deletedId);
        
        const successMsg = 'Producto eliminado correctamente';
        setSuccessMessage(successMsg);
        addNotification(successMsg, 'success');
        
        // Limpiar mensaje después de unos segundos
        setTimeout(() => setSuccessMessage(''), 5000);
      },
      onSettled: () => {
        // Cerrar diálogo
        setDeleteDialogOpen(false);
        setProductToDelete(null);
      }
    }
  );

  // Mutation para eliminar imagen
  const deleteImageMutation = useMutation(
    async (productId: string) => {
      return await imageService.deleteImage(productId);
    },
    {
      // Actualización optimista del caché para la imagen
      onMutate: async (productId) => {
        setIsFetching(true);
        
        // Cancelar consultas en curso
        await queryClient.cancelQueries(getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm));
        
        // Guardar el estado anterior
        const previousProducts = queryClient.getQueryData(
          getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm)
        );
        
        // Actualizar optimistamente el caché para mostrar que la imagen se eliminó
        queryClient.setQueryData(
          getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm),
          (old: any) => {
            if (!old || !old.items) return old;
            
            const newData = { ...old };
            newData.items = old.items.map((p: ProductExtended) => {
              if (p._id === productId) {
                // Marcar que ya no tiene imagen
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
        imageService.invalidateCache(productId);
        imageCache.current.delete(productId);
        
        // Actualizar formulario si está abierto
        if (editingProduct && editingProduct._id === productId) {
          setFormData(prev => ({
            ...prev,
            imagen: null,
            imagenPreview: null
          }));
        }
        
        return { previousProducts };
      },
      onError: (err, productId, context: any) => {
        // Restaurar el estado anterior en caso de error
        if (context?.previousProducts) {
          queryClient.setQueryData(
            getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm),
            context.previousProducts
          );
        }
        
        // Mostrar error
        console.error('Error al eliminar la imagen:', err);
        addNotification('Error al eliminar la imagen', 'error');
      },
      onSuccess: (_, productId) => {
        // Limpiar referencias a la imagen
        if (editingProduct && editingProduct._id === productId) {
          setFormData(prev => ({
            ...prev,
            imagen: null,
            imagenPreview: null
          }));
          
          // Actualizar el estado de editingProduct para reflejar el cambio de imagen
          setEditingProduct(prev => prev ? {...prev, hasImage: false} : null);
        }
        
        // Invalidar cachés de imágenes
        imageService.invalidateCache(productId);
        imageCache.current.delete(productId);
        
        // Actualizar el estado local de products para mostrar el cambio inmediatamente
        setProducts(prevProducts => 
          prevProducts.map(p => 
            p._id === productId 
              ? {...p, hasImage: false} 
              : p
          )
        );
        
        // Invalidar todas las consultas de productos para asegurar sincronización
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === PRODUCTS_CACHE_KEY,
        });
        
        addNotification('Imagen eliminada correctamente', 'success');
      },
      onSettled: () => {
        setDeleteImageDialogOpen(false);
        setImageLoading(false);
        setIsFetching(false);
      }
    }
  );

  // Mutation para crear/actualizar producto
  const productMutation = useMutation(
    async (data: { id?: string; payload: any; image?: File }) => {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const url = data.id
        ? `https://lyme-back.vercel.app/api/producto/${data.id}`
        : 'https://lyme-back.vercel.app/api/producto';
      
      const method = data.id ? 'PUT' : 'POST';
      
      // Realizar solicitud para crear/actualizar producto
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
        throw new Error(error.error || 'Error al procesar la solicitud');
      }
      
      const savedProduct = await response.json();
      
      // Si hay imagen, subirla
      if (data.image) {
        await handleImageUpload(savedProduct._id, data.image);
      }
      
      return savedProduct;
    },
    {
      onMutate: async (data) => {
        setIsFetching(true);
        return { data };
      },
      onSuccess: (savedProduct) => {
        setShowModal(false);
        resetForm();
        
        // Forzar refresco inmediato de los datos
        refetch();
        
        // Invalidar todas las consultas de productos para asegurar sincronización
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === PRODUCTS_CACHE_KEY,
        });
        
        const successMsg = `Producto ${editingProduct ? 'actualizado' : 'creado'} correctamente`;
        setSuccessMessage(successMsg);
        addNotification(successMsg, 'success');
        
        // Limpiar mensaje después de unos segundos
        setTimeout(() => setSuccessMessage(''), 5000);
      },
      onError: (error: any) => {
        const errorMsg = 'Error al guardar producto: ' + error.message;
        setError(errorMsg);
        addNotification(errorMsg, 'error');
      },
      onSettled: () => {
        setIsFetching(false);
      }
    }
  );

  // Debounced search - optimizado con useCallback
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearchTerm(value);
      setCurrentPage(1); // Reset a primera página
      setIsFetching(true);
    }, 300),
    []
  );

  // Verificar productos con stock bajo y enviar notificación - optimizado con useMemo
  const lowStockProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter(product => 
      product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD
    );
  }, [products]);

  // Función para comprimir imágenes usando Canvas - optimizada
  const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<File> => {
    return new Promise((resolve, reject) => {
      try {
        // Crear elementos para la manipulación de la imagen
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
              
              // Configurar canvas con las nuevas dimensiones
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
                
                // Crear filename con extensión apropiada
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
              console.error('Error durante la compresión:', err);
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

  // Función auxiliar para formatear tamaños de archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Mostrar notificación por productos con stock bajo
  useEffect(() => {
    if (lowStockProducts.length > 0 && !loading && !isInitialLoad) {
      const productNames = lowStockProducts.slice(0, 3).map(p => p.nombre).join(', ');
      const moreText = lowStockProducts.length > 3 ? ` y ${lowStockProducts.length - 3} más` : '';
      const message = `Alerta: ${lowStockProducts.length} producto${lowStockProducts.length > 1 ? 's' : ''} con stock bajo: ${productNames}${moreText}`;
      
      if (addNotification) {
        addNotification(message, 'warning');
      }
    }
  }, [lowStockProducts, loading, addNotification, isInitialLoad]);

  // Obtener permisos de sección del usuario actual
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          throw new Error('No hay token de autenticación');
        }

        const response = await fetch('https://lyme-back.vercel.app/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Error al obtener información del usuario');
        }

        const data = await response.json();
        // Guardar las secciones a las que tiene acceso el usuario
        if (data.secciones) {
          setUserSections(data.secciones);
          console.log(`Usuario con acceso a secciones: ${data.secciones}`);
        }
      } catch (err) {
        console.error('Error al obtener secciones del usuario:', err);
      }
    };
    
    fetchCurrentUser();
  }, [getAuthToken]);

  // Efecto para manejar búsqueda
  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  // Efecto para detectar el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
      
      // Si cambiamos entre móvil y escritorio, volvemos a la primera página
      if ((newWidth < 768 && windowWidth >= 768) || (newWidth >= 768 && windowWidth < 768)) {
        setCurrentPage(1);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [windowWidth]);

  // Limpiar controladores de aborto al desmontar
  useEffect(() => {
    return () => {
      // Abortar cualquier solicitud pendiente
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Manejar cambio de imagen con compresión automática
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar tamaño del archivo (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        console.log('La imagen no debe superar los 5MB');
        addNotification('La imagen no debe superar los 5MB', 'error');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        console.log('El archivo debe ser una imagen');
        addNotification('El archivo debe ser una imagen', 'error');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      // Mostrar mensaje si comprimiremos
      if (file.size > 1024 * 1024) {
        addNotification(
          `La imagen será optimizada para mejor rendimiento (${formatFileSize(file.size)})`,
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Eliminar imagen del producto ya guardado
  const handleDeleteProductImage = (productId: string) => {
    // Usar la mutación en lugar de la implementación directa
    deleteImageMutation.mutate(productId);
  };

  // Manejar subida de imagen después de crear/editar producto con compresión y reintentos
  const handleImageUpload = async (productId: string, imageFile?: File) => {
    const imageToProcess = imageFile || formData.imagen;
    if (!imageToProcess) return true;
    
    try {
      setImageLoading(true);
      setIsFetching(true);
      
      // Comprimir imagen antes de convertir a base64
      let imageToUpload = imageToProcess;
      
      if (imageToUpload.size > 1024 * 1024) {
        console.log(`Comprimiendo imagen grande (${formatFileSize(imageToUpload.size)})...`);
        
        // Nivel de calidad basado en el tamaño del archivo
        let quality = 0.7; // Valor predeterminado
        
        // Ajustar calidad según tamaño
        if (imageToUpload.size > 3 * 1024 * 1024) quality = 0.5; // Imágenes muy grandes
        else if (imageToUpload.size > 2 * 1024 * 1024) quality = 0.6; // Imágenes grandes
        
        // Comprimir imagen
        imageToUpload = await compressImage(imageToUpload, 1200, 1200, quality);
      }
      
      // Convertir a base64 y subir
      const base64Data = await imageService.fileToBase64(imageToUpload);
      
      // Implementar sistema de reintentos para manejar "failed to fetch"
      const MAX_RETRIES = 3;
      let retryCount = 0;
      let success = false;
      
      while (retryCount < MAX_RETRIES && !success) {
        try {
          // Si no es el primer intento, esperar antes de reintentar
          if (retryCount > 0) {
            const waitTime = Math.pow(2, retryCount) * 1000; // Espera exponencial
            console.log(`Reintentando subida de imagen (intento ${retryCount + 1}/${MAX_RETRIES}) después de ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          
          await imageService.uploadImageBase64(productId, base64Data);
          success = true;
          
          // Actualizar el caché directamente después de subir imagen
          queryClient.setQueryData(
            getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm),
            (old: any) => {
              if (!old || !old.items) return old;
              
              return {
                ...old,
                items: old.items.map((p: ProductExtended) => {
                  if (p._id === productId) {
                    // Actualizar el producto para indicar que ahora tiene imagen
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
          
          // Actualizar el estado local de products para mostrar el cambio inmediatamente
          setProducts(prevProducts => 
            prevProducts.map(p => 
              p._id === productId 
                ? {...p, hasImage: true} 
                : p
            )
          );
          
          // Si estamos editando este producto, actualizar su estado
          if (editingProduct && editingProduct._id === productId) {
            setEditingProduct(prev => prev ? {...prev, hasImage: true} : null);
          }
          
          // Invalidar caché de imágenes para forzar una recarga
          imageService.invalidateCache(productId);
          imageCache.current.delete(productId);
          
          // Forzar refresco de datos
          queryClient.invalidateQueries({
            predicate: (query) => query.queryKey[0] === PRODUCTS_CACHE_KEY,
          });
        } catch (error: any) {
          retryCount++;
          
          if (retryCount >= MAX_RETRIES) {
            console.error(`Error después de ${MAX_RETRIES} intentos:`, error);
            throw error;
          } else {
            console.warn(`Error al subir imagen (intento ${retryCount}/${MAX_RETRIES}):`, error.message);
          }
        }
      }
      
      return success;
    } catch (error: any) {
      console.error('Error al subir imagen:', error);
      addNotification(`Error al subir imagen: ${error.message || 'Error desconocido'}`, 'error');
      return false;
    } finally {
      setImageLoading(false);
      setIsFetching(false);
    }
  };

  // Manejar envío del formulario (crear/editar)
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
        const invalidProducts = formData.itemsCombo.filter(item => 
          !productOptions.some(p => p._id === item.productoId)
        );
        
        if (invalidProducts.length > 0) {
          throw new Error('El combo contiene productos inválidos');
        }
      }
      
      // IMPORTANTE: Asegurarnos de que los productoId sean cadenas válidas
      let itemsComboFixed = [];
      if (formData.esCombo && formData.itemsCombo && formData.itemsCombo.length > 0) {
        itemsComboFixed = formData.itemsCombo.map(item => {
          // Asegurar que el ID sea una cadena válida
          return {
            productoId: item.productoId.toString(), // Convertir explícitamente a string
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
        itemsCombo: formData.esCombo ? itemsComboFixed : []
      };
      
      // Usar mutation para crear/editar producto
      productMutation.mutate({
        id: editingProduct?._id,
        payload,
        image: formData.imagen || undefined
      });
    } catch (err: any) {
      const errorMsg = 'Error al guardar producto: ' + err.message;
      setError(errorMsg);
      addNotification(errorMsg, 'error');
    }
  };

  // Iniciar el proceso de eliminación mostrando el diálogo de confirmación
  const confirmDelete = (id: string) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Confirmar eliminación de imagen
  const confirmDeleteImage = (id: string) => {
    setProductToDelete(id);
    setDeleteImageDialogOpen(true);
  };

  // Eliminar producto (después de confirmación)
  const handleDelete = (id: string) => {
    // Verificar si este producto está en algún combo antes de intentar eliminar
    const combosWithProduct = products.filter(
      p => p.esCombo && p.itemsCombo?.some(item => {
        // Manejar tanto si productoId es un string como si es un objeto
        const itemId = typeof item.productoId === 'object' 
          ? item.productoId._id 
          : item.productoId;
        return itemId === id;
      })
    );
    
    if (combosWithProduct.length > 0) {
      const comboNames = combosWithProduct.map(c => c.nombre).join(', ');
      const errorMsg = `No se puede eliminar este producto porque está incluido en los siguientes combos: ${comboNames}`;
      setError(errorMsg);
      addNotification(errorMsg, 'error');
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      return;
    }
    
    // Usar la mutación para eliminar
    deleteProductMutation.mutate(id);
  };

  // Preparar edición de producto
  const handleEdit = async (product: ProductExtended) => {
    setEditingProduct(product);
    
    // Cuando editamos un combo existente, asegurémonos de que todas las referencias a productos
    // en itemsCombo estén correctamente configuradas
    let itemsComboFixed = [];
    
    if (product.esCombo && product.itemsCombo && product.itemsCombo.length > 0) {
      // Verificar los IDs de productos dentro del combo y arreglarlos si es necesario
      itemsComboFixed = product.itemsCombo.map(item => {
        const productId = typeof item.productoId === 'object' 
          ? item.productoId._id 
          : item.productoId;
          
        // Validar que el ID exista en la lista de productos
        const productExists = productOptions.some(p => p._id === productId);
        
        if (!productExists) {
          console.warn(`Producto con ID ${productId} no encontrado en la lista de productos disponibles`);
        }
        
        return {
          productoId: productId,
          cantidad: item.cantidad
        };
      });
    }
    
    // Configurar formData para edición
    setFormData({
      nombre: product.nombre,
      descripcion: product.descripcion || '',
      categoria: product.categoria,
      subCategoria: product.subCategoria,
      precio: product.precio.toString(),
      stock: product.stock.toString(),
      proovedorInfo: product.proovedorInfo || '',
      esCombo: !!product.esCombo,
      itemsCombo: product.esCombo ? itemsComboFixed : [],
      imagen: null,
      imagenPreview: null
    });
    
    // Intentamos cargar la imagen si existe
    if (product.hasImage) {
      try {
        // Cargar imagen para vista previa 
        // Añadir parámetro de versión para forzar recarga
        const timestamp = new Date().getTime();
        const imageUrl = `${imageService.getImageUrl(product._id)}?v=${timestamp}`;
        setFormData(prev => ({
          ...prev,
          imagenPreview: imageUrl
        }));
      } catch (error) {
        console.error('Error al cargar imagen para vista previa:', error);
      }
    }
    
    setShowModal(true);
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
    setEditingProduct(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Manejar cambio de categoría
  const handleCategoryChange = (value: 'limpieza' | 'mantenimiento') => {
    try {
      if (!subCategorias[value]) {
        console.error(`Categoría no válida: ${value}`);
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
      console.error("Error al cambiar categoría:", error);
      addNotification("Error al cambiar categoría", 'error');
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

  // Agregar item al combo - Optimizado con validaciones y comprobaciones
  const handleAddComboItem = () => {
    if (!selectedComboItem || selectedComboItem === "none" || comboItemQuantity <= 0) {
      addNotification('Seleccione un producto y una cantidad válida', 'warning');
      return;
    }

    // Verificar que el producto no esté ya en el combo
    const productExists = formData.itemsCombo?.some(
      item => item.productoId === selectedComboItem
    );

    if (productExists) {
      addNotification('Este producto ya está en el combo', 'warning');
      return;
    }

    // Verificar que el producto no sea un combo (no se permiten combos dentro de combos)
    const selectedProduct = products.find(p => p._id === selectedComboItem);
    if (!selectedProduct) {
      addNotification('Producto no encontrado', 'error');
      return;
    }
    
    if (selectedProduct.esCombo) {
      addNotification('No se pueden agregar combos dentro de combos', 'error');
      return;
    }

    // Validar stock disponible
    if (selectedProduct.stock < comboItemQuantity) {
      addNotification(`Solo hay ${selectedProduct.stock} unidades disponibles de este producto`, 'warning');
      // No bloqueamos la acción, solo advertimos
    }

    // Agregar al combo
    setFormData(prev => ({
      ...prev,
      itemsCombo: [
        ...(prev.itemsCombo || []),
        {
          productoId: selectedComboItem,
          cantidad: comboItemQuantity
        }
      ]
    }));

    // Reset selección
    setSelectedComboItem('');
    setComboItemQuantity(1);
    setShowComboModal(false);
  };

  // Eliminar item del combo
  const handleRemoveComboItem = (index: number) => {
    const updatedItems = [...(formData.itemsCombo || [])];
    updatedItems.splice(index, 1);
    
    setFormData(prev => ({
      ...prev,
      itemsCombo: updatedItems
    }));
  };

  // Función para cambiar de página
  const handlePageChange = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
    setIsFetching(true);
    
    // Al cambiar de página, hacemos scroll hacia arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Hacer scroll al inicio de la lista en móvil
    if (windowWidth < 768 && mobileListRef.current) {
      mobileListRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [windowWidth]);

  // Manejar la subida de imagen con el nuevo componente
  const handleImageUploaded = (success: boolean, productId?: string) => {
    if (success && productId) {
      setIsFetching(true);
      
      // Actualizar el caché directamente
      queryClient.setQueryData(
        getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm),
        (old: any) => {
          if (!old || !old.items) return old;
          
          return {
            ...old,
            items: old.items.map((p: ProductExtended) => {
              if (p._id === productId) {
                // Actualizar el producto para indicar que ahora tiene imagen
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
      
      // Actualizar el estado local de products para mostrar el cambio inmediatamente
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p._id === productId 
            ? {...p, hasImage: true} 
            : p
        )
      );
      
      // Invalidar caché de imágenes para forzar una recarga
      imageService.invalidateCache(productId);
      imageCache.current.delete(productId);
      
      // Forzar refresco para asegurar datos actualizados
      refetch().then(() => {
        setIsFetching(false);
      });
    }
  };

  // Obtener nombre de producto por ID para combos - Mejorado con validación adicional
  const getProductNameById = (id: string) => {
    if (!id) {
      console.warn('ID de producto inválido en combo:', id);
      return 'ID inválido';
    }
    
    // Buscar por ID exacto
    const product = products.find(p => p._id === id);
    if (product) {
      return product.nombre;
    }
    
    // Si no lo encuentra, intentar buscar sin importar el formato (para manejar posibles problemas de tipo de datos)
    const productByStringComp = products.find(p => 
      p._id.toString() === id.toString()
    );
    
    if (productByStringComp) {
      return productByStringComp.nombre;
    }
    
    console.warn('Producto no encontrado para ID:', id);
    return 'Producto no encontrado';
  };

  // Calcular precio total del combo
  const calculateComboTotal = useCallback(() => {
    if (!formData.itemsCombo || formData.itemsCombo.length === 0) return 0;
    
    return formData.itemsCombo.reduce((total, item) => {
      if (!Array.isArray(products)) return total;
      
      // Manejar tanto si productoId es un string como si es un objeto
      const productId = typeof item.productoId === 'object'
        ? item.productoId._id
        : item.productoId;
        
      const product = products.find(p => p._id === productId);
      if (!product) return total;
      
      return total + (product.precio * item.cantidad);
    }, 0);
  }, [formData.itemsCombo, products]);

  // Mostrar información detallada sobre la paginación
  const indexOfLastProduct = currentPage * itemsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - itemsPerPage;
  const showingFromTo = totalItems > 0 
    ? `${indexOfFirstProduct + 1}-${Math.min(indexOfLastProduct, totalItems)} de ${totalItems}`
    : '0 de 0';

  // Obtener productos no combo para selector - Optimizado con useMemo
  const nonComboProducts = useMemo(() => {
    if (!Array.isArray(productOptions)) return [];
    return productOptions.filter(p => !p.esCombo);
  }, [productOptions]);

  // Cuando cambia la categoría seleccionada, actualizamos la UI
  useEffect(() => {
    setIsFetching(true);
  }, [selectedCategory]);

  return (
    <div className="p-4 md:p-6 space-y-6 bg-[#DFEFE6]/30">
      {/* Alertas */}
      {error && (
        <Alert className="bg-red-50 border border-red-200 text-red-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert className="bg-[#DFEFE6] border border-[#91BEAD] text-[#29696B] rounded-lg">
          <CheckCircle className="h-4 w-4 text-[#29696B]" />
          <AlertDescription className="ml-2">{successMessage}</AlertDescription>
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
            />
          </div>
          
          <Tabs 
            defaultValue="all" 
            value={selectedCategory}
            onValueChange={setSelectedCategory}
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
                disabled={userSections === 'mantenimiento'}
              >
                Limpieza
              </TabsTrigger>
              <TabsTrigger 
                value="mantenimiento" 
                className="flex-1 data-[state=active]:bg-[#29696B] data-[state=active]:text-white"
                disabled={userSections === 'limpieza'}
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
              setShowModal(true);
            }}
            className="w-full md:w-auto bg-[#29696B] hover:bg-[#29696B]/90 text-white"
            disabled={userSections !== 'ambos' && selectedCategory !== 'all' && selectedCategory !== userSections}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Alerta para productos con stock bajo */}
      {!isLoading && lowStockProducts.length > 0 && (
        <Alert className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="ml-2">
            Hay {lowStockProducts.length} productos con stock bajo. Por favor, revise el inventario.
          </AlertDescription>
        </Alert>
      )}

      {/* Mensaje cuando no hay productos */}
      {!isLoading && products.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-[#91BEAD]/20">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
            {isFetching ? (
              <Loader2 className="w-6 h-6 text-[#29696B] animate-spin" />
            ) : (
              <Search className="w-6 h-6 text-[#29696B]" />
            )}
          </div>
          <p className="text-[#7AA79C]">
            {isFetching 
              ? 'Cargando productos...'
              : 'No se encontraron productos que coincidan con la búsqueda'
            }
          </p>
        </div>
      )}

      {/* Contador de resultados con información detallada */}
      {!isLoading && products.length > 0 && (
        <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm text-[#29696B] flex flex-col sm:flex-row sm:justify-between items-center">
          <span>
            Total: {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
          </span>
          <span className="text-[#29696B] font-medium">
            Mostrando: {showingFromTo}
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
      <div ref={tableRef} className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-[#91BEAD]/20 h-[70vh]">
        {!isLoading && products.length > 0 && (
          <div className="overflow-auto h-full">
            <VirtualizedProductTable
              products={products}
              onEdit={handleEdit}
              onDelete={confirmDelete}
              userSections={userSections}
              tableContainerRef={tableRef}
            />
          </div>
        )}
        
        {/* Paginación para la tabla */}
        {!isLoading && totalPages > 1 && (
          <div className="py-4 border-t border-[#91BEAD]/20">
            <Pagination
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              className="px-6"
            />
          </div>
        )}
      </div>

      {/* Vista de Tarjetas para dispositivos móviles - IMPLEMENTACIÓN VIRTUALIZADA */}
      <div ref={mobileListRef} id="mobile-products-list" className="md:hidden">
        {/* Paginación visible en la parte superior para móvil */}
        {!isLoading && totalPages > 1 && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20">
            <Pagination
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={handlePageChange}
            />
          </div>
        )}
        
        {!isLoading && products.length > 0 && (
          <MobileProductList
            products={products}
            onEdit={handleEdit}
            onDelete={confirmDelete}
            userSections={userSections}
          />
        )}
        
        {/* Indicador de carga en móvil */}
        {isFetching && (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="w-5 h-5 text-[#29696B] animate-spin mr-2" />
            <span className="text-[#29696B] text-sm">Actualizando...</span>
          </div>
        )}
        
        {/* Mensaje que muestra la página actual y el total */}
        {!isLoading && totalPages > 1 && (
          <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm">
            <span className="text-[#29696B] font-medium">
              Página {currentPage} de {totalPages}
            </span>
          </div>
        )}
        
        {/* Paginación duplicada al final de la lista para mayor visibilidad */}
        {!isLoading && totalPages > 1 && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20 mt-2">
            <Pagination
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Modal de Producto */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto bg-white border border-[#91BEAD]/20">
          <DialogHeader className="sticky top-0 bg-white pt-4 pb-2 z-10">
            <DialogTitle className="text-[#29696B]">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
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
                      userSections !== 'ambos' && formData.categoria !== userSections
                    }
                  >
                    <SelectTrigger id="categoria" className="mt-1 border-[#91BEAD] focus:ring-[#29696B]/20">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent className="border-[#91BEAD]">
                    <SelectItem value="limpieza" disabled={userSections === 'mantenimiento'}>Limpieza</SelectItem>
                      <SelectItem value="mantenimiento" disabled={userSections === 'limpieza'}>Mantenimiento</SelectItem>
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
                  <ProductStockInput
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
              
              {/* Sección de productos en combo */}
              {formData.esCombo && (
                <div className="space-y-3 p-3 border border-[#91BEAD]/30 rounded-lg bg-[#DFEFE6]/10">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm text-[#29696B] font-medium">Productos en el combo</Label>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setShowComboModal(true)}
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
                            <span className="font-medium text-[#29696B]">{getProductNameById(item.productoId)}</span>
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
                        <span className="font-medium text-[#29696B]">${calculateComboTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-3 text-sm text-[#7AA79C] bg-[#DFEFE6]/20 rounded">
                      No hay productos en el combo
                    </div>
                  )}
                  
                  <div className="text-xs text-amber-600">
                    Recuerde que el precio del combo puede ser diferente al total calculado.
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm text-[#29696B] block mb-2">Imagen del Producto</Label>
                
                {/* Mostrar el componente de carga de imágenes cuando estamos editando */}
                {editingProduct ? (
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
                          onClick={() => confirmDeleteImage(editingProduct._id)}
                          className="absolute top-2 right-2 h-8 w-8 p-0 bg-red-500 hover:bg-red-600"
                          disabled={deleteImageMutation.isLoading}
                        >
                          {deleteImageMutation.isLoading ? 
                            <Loader2 className="h-4 w-4 animate-spin" /> : 
                            <X className="h-4 w-4" />
                          }
                        </Button>
                      </div>
                    ) : (
                      <ImageUpload 
                        productId={editingProduct._id}
                        useBase64={false}
                        onImageUploaded={(success) => handleImageUploaded(success, editingProduct._id)}
                      />
                    )}
                  </div>
                ) : (
                  // Para nuevos productos, mantenemos la UI original
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
                            Haz clic para subir una imagen
                          </p>
                          <p className="text-xs text-[#7AA79C]">
                            Máximo 5MB
                          </p>
                        </div>
                        <input 
                          ref={fileInputRef}
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
                setShowModal(false);
                resetForm();
              }}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
              disabled={productMutation.isLoading || imageLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              disabled={productMutation.isLoading || imageLoading}
            >
              {productMutation.isLoading || imageLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {imageLoading ? 'Procesando imagen...' : 'Guardando...'}
                </>
              ) : (
                editingProduct ? 'Guardar Cambios' : 'Crear Producto'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    
    {/* Modal para agregar producto al combo */}
    <Dialog open={showComboModal} onOpenChange={setShowComboModal}>
      <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
        <DialogHeader>
          <DialogTitle className="text-[#29696B]">Agregar Producto al Combo</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="comboItem" className="text-sm text-[#29696B]">Producto</Label>
            <Select 
              value={selectedComboItem}
              onValueChange={setSelectedComboItem}
            >
              <SelectTrigger id="comboItem" className="border-[#91BEAD] focus:ring-[#29696B]/20">
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {/* Filtramos para excluir combos y también productos ya añadidos */}
                {products
                  .filter(p => !p.esCombo) // Excluir combos
                  .filter(p => !formData.itemsCombo?.some(item => 
                    item.productoId.toString() === p._id.toString()
                  )) // Excluir productos ya añadidos
                  .map(product => (
                  <SelectItem key={product._id} value={product._id}>
                    {product.nombre} - ${product.precio.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Contador de disponibilidad */}
            <div className="mt-1 text-xs text-[#7AA79C]">
              {products.filter(p => !p.esCombo).filter(p => !formData.itemsCombo?.some(item => 
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
              value={comboItemQuantity}
              onChange={(e) => setComboItemQuantity(parseInt(e.target.value) || 1)}
              className="border-[#91BEAD] focus:ring-[#29696B]/20 focus:border-[#29696B]"
            />
            
            {/* Mostrar información sobre stock disponible */}
            {selectedComboItem && (
              <div className="mt-2 text-xs">
                {(() => {
                  const selectedProduct = products.find(p => p._id === selectedComboItem);
                  if (!selectedProduct) return null;
                  
                  return (
                    <div className={`${
                      selectedProduct.stock < comboItemQuantity 
                        ? 'text-amber-600' 
                        : 'text-[#7AA79C]'
                    }`}>
                      Stock disponible: {selectedProduct.stock} unidades
                      {selectedProduct.stock < comboItemQuantity && (
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
            onClick={() => setShowComboModal(false)}
            className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleAddComboItem}
            className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
            disabled={!selectedComboItem || comboItemQuantity <= 0}
          >
            Agregar al Combo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Diálogo de confirmación de eliminación */}
    <ConfirmationDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      title="Eliminar producto"
      description="¿Está seguro de que desea eliminar este producto? Esta acción no se puede deshacer."
      confirmText="Eliminar"
      cancelText="Cancelar" 
      onConfirm={() => productToDelete && handleDelete(productToDelete)}
      variant="destructive"
    />

    {/* Diálogo de confirmación de eliminación de imagen */}
    <ConfirmationDialog
      open={deleteImageDialogOpen}
      onOpenChange={setDeleteImageDialogOpen}
      title="Eliminar imagen"
      description="¿Está seguro de que desea eliminar la imagen de este producto?"
      confirmText="Eliminar"
      cancelText="Cancelar" 
      onConfirm={() => productToDelete && handleDeleteProductImage(productToDelete)}
      variant="destructive"
    />
  </div>
);
};

export default InventorySection;