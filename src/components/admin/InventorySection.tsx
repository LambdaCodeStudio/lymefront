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

// Import the optimized ProductImage component
import OptimizedProductImage from './components/ProductImage';

// Define interfaces according to the backend
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
  productoId: string | any; // Allow objects for easier manipulation
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

// Subcategories organized by category
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

// Define low stock threshold
const LOW_STOCK_THRESHOLD = 10;
// Key for products cache
const PRODUCTS_CACHE_KEY = 'products';

// Component for stock input with maximum limit
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
    
    // For cleaning products, minimum stock is 1
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

  // Show warning for cleaning products
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

// OPTIMIZED PRODUCT ROW COMPONENT
const ProductRow = React.memo(({ 
  product, 
  onEdit, 
  onDelete, 
  userSections,
  isInViewport = false // New prop to optimize image loading
}) => {
  // Check permissions
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
            <OptimizedProductImage
              productId={product._id}
              alt={product.nombre}
              width={40}
              height={40}
              quality={60} // Reduced quality for better performance
              className="h-10 w-10 rounded-full object-cover border border-[#91BEAD]/30"
              fallbackClassName="h-10 w-10 rounded-full bg-[#DFEFE6]/50 flex items-center justify-center border border-[#91BEAD]/30"
              containerClassName="h-10 w-10"
              useBase64={false}
              priority={isInViewport} // Load with priority only if visible
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

// Function to render stock indicator
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

// VIRTUALIZED TABLE COMPONENT
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
    estimateSize: () => 70, // Estimated row height
    overscan: 5 // How many items to render before/after the visible area
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

// OPTIMIZED MOBILE VIEW COMPONENT
const MobileProductList = React.memo(({ products, onEdit, onDelete, userSections }) => {
  const parentRef = useRef(null);
  
  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated card height
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

// PRODUCT CARD COMPONENT FOR MOBILE
const ProductCard = React.memo(({ product, onEdit, onDelete, userSections, isInViewport }) => {
  // Check permissions
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
            <OptimizedProductImage
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
  // Initialize React Query
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

  // State for selected combo item
  const [selectedComboItem, setSelectedComboItem] = useState<string>('');
  const [comboItemQuantity, setComboItemQuantity] = useState<number>(1);

  // State for pagination
  const [currentPage, setCurrentPage] = useState<number>(1);

  // References for scrolling in mobile
  const mobileListRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Fixed sizes for each device type
  const ITEMS_PER_PAGE_MOBILE = 5;
  const ITEMS_PER_PAGE_DESKTOP = 10;

  // State to control window width
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Dynamically calculate itemsPerPage based on window width
  const itemsPerPage = windowWidth < 768 ? ITEMS_PER_PAGE_MOBILE : ITEMS_PER_PAGE_DESKTOP;

  // Create cache to avoid repeated requests to image API
  const imageCache = useRef<Map<string, boolean>>(new Map());

  // Reference to abort controller to cancel pending requests
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

  // Get auth token
  const getAuthToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }, []);

  // Function to generate products cache key
  const getProductsCacheKey = useCallback(
    (page: number, category: string, search: string) => {
      return [PRODUCTS_CACHE_KEY, page, itemsPerPage, category, search];
    },
    [itemsPerPage]
  );

  // Function to fetch products with React Query - Optimized
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

      // Abort previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller
      abortControllerRef.current = new AbortController();

      // Pagination and filter parameters
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
      // Don't report error if it was cancelled
      if (error.name === 'AbortError') {
        console.log('Request cancelled');
        // Return empty state instead of throwing an error
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
      throw new Error(`Error loading products: ${error.message}`);
    } finally {
      // Clear abort controller if request completed or failed
      if (abortControllerRef.current?.signal.aborted) {
        abortControllerRef.current = null;
      }
    }
  }, [getAuthToken]);

  // Improve fetch function with retries to handle "failed to fetch"
  const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 2) => {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
          // If authentication error, don't retry
          if (response.status === 401) {
            throw new Error('Authentication error');
          }
          
          throw new Error(`HTTP Error: ${response.status}`);
        }
        
        return response;
      } catch (error: any) {
        // If request was cancelled, don't retry
        if (error.name === 'AbortError') {
          throw error;
        }
        
        retries++;
        console.warn(`Attempt ${retries}/${maxRetries} failed: ${error.message}`);
        
        // If it's the last attempt, throw the error
        if (retries >= maxRetries) {
          throw error;
        }
        
        // Wait before retrying (shorter and faster wait)
        const delay = Math.min(500 * retries, 3000);
        console.log(`Waiting ${delay}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // For safety, although it should never get here
    throw new Error(`Failed after ${maxRetries} retries`);
  };

  // Use React Query to load products - Optimized configuration
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
      staleTime: 300000, // Increased to 5 minutes
      cacheTime: 3600000, // 1 hour - to keep data in cache longer
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false, // Disable auto refresh on reconnect
      onSuccess: (data) => {
        setProducts(data.items);
        setTotalItems(data.totalItems);
        setTotalPages(data.totalPages);
        
        // Extract non-combo products for selector
        const productOptionsFiltered = data.items.filter(p => !p.esCombo);
        setProductOptions(productOptionsFiltered);
        
        // No longer in initial load after first load
        setIsInitialLoad(false);
        
        // Pre-fetch next page if it exists
        if (data.hasNextPage) {
          queryClient.prefetchQuery(
            getProductsCacheKey(currentPage + 1, selectedCategory, debouncedSearchTerm),
            () => fetchProductsData(currentPage + 1, itemsPerPage, selectedCategory, debouncedSearchTerm)
          );
        }
      },
      onError: (err: any) => {
        // Don't show errors if request was cancelled
        if (err.name === 'AbortError') return;
        
        const errorMsg = `Error loading products: ${err.message}`;
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

  // Mutation to delete product
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
        throw new Error(error.error || 'Error deleting product');
      }
      
      return id;
    },
    {
      // Optimistic update of cache
      onMutate: async (deletedId) => {
        // Cancel ongoing queries
        await queryClient.cancelQueries(getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm));
        
        // Save previous state
        const previousProducts = queryClient.getQueryData(
          getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm)
        );
        
        // Update cache with optimistic update
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
        
        // Return previous state for rollback if needed
        return { previousProducts };
      },
      onError: (err, id, context: any) => {
        // Restore previous state in case of error
        if (context?.previousProducts) {
          queryClient.setQueryData(
            getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm),
            context.previousProducts
          );
        }
        
        const errorMsg = `Error deleting product: ${err instanceof Error ? err.message : 'Unknown error'}`;
        setError(errorMsg);
        addNotification(errorMsg, 'error');
      },
      onSuccess: (deletedId) => {
        // Invalidate all product queries to ensure synchronization
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === PRODUCTS_CACHE_KEY,
        });
        
        // Remove image from image caches
        imageService.invalidateCache(deletedId);
        imageCache.current.delete(deletedId);
        
        const successMsg = 'Product deleted successfully';
        setSuccessMessage(successMsg);
        addNotification(successMsg, 'success');
        
        // Clear message after a few seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      },
      onSettled: () => {
        // Close dialog
        setDeleteDialogOpen(false);
        setProductToDelete(null);
      }
    }
  );

  // Mutation to delete image
  const deleteImageMutation = useMutation(
    async (productId: string) => {
      return await imageService.deleteImage(productId);
    },
    {
      // Optimistic update of cache for image
      onMutate: async (productId) => {
        setIsFetching(true);
        
        // Cancel ongoing queries
        await queryClient.cancelQueries(getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm));
        
        // Save previous state
        const previousProducts = queryClient.getQueryData(
          getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm)
        );
        
        // Optimistically update cache to show that image was deleted
        queryClient.setQueryData(
          getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm),
          (old: any) => {
            if (!old || !old.items) return old;
            
            const newData = { ...old };
            newData.items = old.items.map((p: ProductExtended) => {
              if (p._id === productId) {
                // Mark that it no longer has an image
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
        
        // Clear any existing image cache
        imageService.invalidateCache(productId);
        imageCache.current.delete(productId);
        
        // Update form if it's open
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
        // Restore previous state in case of error
        if (context?.previousProducts) {
          queryClient.setQueryData(
            getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm),
            context.previousProducts
          );
        }
        
        // Show error
        console.error('Error deleting image:', err);
        addNotification('Error deleting image', 'error');
      },
      onSuccess: (_, productId) => {
        // Clear image references
        if (editingProduct && editingProduct._id === productId) {
          setFormData(prev => ({
            ...prev,
            imagen: null,
            imagenPreview: null
          }));
          
          // Update editingProduct state to reflect image change
          setEditingProduct(prev => prev ? {...prev, hasImage: false} : null);
        }
        
        // Invalidate image caches
        imageService.invalidateCache(productId);
        imageCache.current.delete(productId);
        
        // Update local products state to show change immediately
        setProducts(prevProducts => 
          prevProducts.map(p => 
            p._id === productId 
              ? {...p, hasImage: false} 
              : p
          )
        );
        
        // Invalidate all product queries to ensure synchronization
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === PRODUCTS_CACHE_KEY,
        });
        
        addNotification('Image deleted successfully', 'success');
      },
      onSettled: () => {
        setDeleteImageDialogOpen(false);
        setImageLoading(false);
        setIsFetching(false);
      }
    }
  );

  // Mutation to create/update product
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
      
      // Make request to create/update product
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
        throw new Error(error.error || 'Error processing request');
      }
      
      const savedProduct = await response.json();
      
      // If there's an image, upload it
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
        
        // Force immediate refresh of data
        refetch();
        
        // Invalidate all product queries to ensure synchronization
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === PRODUCTS_CACHE_KEY,
        });
        
        const successMsg = `Product ${editingProduct ? 'updated' : 'created'} successfully`;
        setSuccessMessage(successMsg);
        addNotification(successMsg, 'success');
        
        // Clear message after a few seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      },
      onError: (error: any) => {
        const errorMsg = 'Error saving product: ' + error.message;
        setError(errorMsg);
        addNotification(errorMsg, 'error');
      },
      onSettled: () => {
        setIsFetching(false);
      }
    }
  );

  // Debounced search - optimized with useCallback
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearchTerm(value);
      setCurrentPage(1); // Reset to first page
      setIsFetching(true);
    }, 300),
    []
  );

  // Check for low stock products and send notification - optimized with useMemo
  const lowStockProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter(product => 
      product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD
    );
  }, [products]);

  // Function to compress images using Canvas - optimized
  const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<File> => {
    return new Promise((resolve, reject) => {
      try {
        // Create elements for image manipulation
        const reader = new FileReader();
        const img = new Image();
        
        reader.onload = (event) => {
          if (!event.target?.result) {
            return resolve(file);
          }
          
          img.onload = () => {
            try {
              // Use OffscreenCanvas if available for better performance
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
                console.warn('Could not get 2D context from canvas');
                return resolve(file);
              }

              // Calculate dimensions
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
              
              // Configure canvas with new dimensions
              if (canvas instanceof HTMLCanvasElement) {
                canvas.width = width;
                canvas.height = height;
              } else {
                // For OffscreenCanvas
                canvas.width = width;
                canvas.height = height;
              }
              
              // Draw image
              ctx.drawImage(img, 0, 0, width, height);
              
              // Determine output type
              const outputType = file.type === 'image/png' ? 'image/png' : 'image/webp';
              
              // Create blob
              const canvasToBlob = (canvas: HTMLCanvasElement | OffscreenCanvas, callback: (blob: Blob | null) => void) => {
                if (canvas instanceof HTMLCanvasElement) {
                  canvas.toBlob(callback, outputType, quality);
                } else {
                  // For OffscreenCanvas
                  canvas.convertToBlob({ type: outputType, quality }).then(callback);
                }
              };
              
              canvasToBlob(canvas, (blob) => {
                if (!blob) {
                  return resolve(file);
                }
                
                // Create filename with appropriate extension
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
              console.error('Error during compression:', err);
              resolve(file);
            }
          };
          
          img.onerror = () => resolve(file);
          img.src = event.target.result as string;
        };
        
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
        
      } catch (err) {
        console.error('General error in compression:', err);
        resolve(file);
      }
    });
  };

  // Helper function to format file sizes
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Show notification for products with low stock
  useEffect(() => {
    if (lowStockProducts.length > 0 && !loading && !isInitialLoad) {
      const productNames = lowStockProducts.slice(0, 3).map(p => p.nombre).join(', ');
      const moreText = lowStockProducts.length > 3 ? ` and ${lowStockProducts.length - 3} more` : '';
      const message = `Alert: ${lowStockProducts.length} product${lowStockProducts.length > 1 ? 's' : ''} with low stock: ${productNames}${moreText}`;
      
      if (addNotification) {
        addNotification(message, 'warning');
      }
    }
  }, [lowStockProducts, loading, addNotification, isInitialLoad]);

  // Get user section permissions
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
          throw new Error('Error getting user information');
        }

        const data = await response.json();
        // Save the sections the user has access to
        if (data.secciones) {
          setUserSections(data.secciones);
          console.log(`User with access to sections: ${data.secciones}`);
        }
      } catch (err) {
        console.error('Error getting user sections:', err);
      }
    };
    
    fetchCurrentUser();
  }, [getAuthToken]);

  // Effect for handling search
  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  // Effect to detect window size
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
      
      // If we change between mobile and desktop, go back to first page
      if ((newWidth < 768 && windowWidth >= 768) || (newWidth >= 768 && windowWidth < 768)) {
        setCurrentPage(1);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [windowWidth]);

  // Clean up abort controllers when unmounting
  useEffect(() => {
    return () => {
      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Handle image change with automatic compression
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file size (5MB maximum)
      if (file.size > 5 * 1024 * 1024) {
        console.log('Image must not exceed 5MB');
        addNotification('Image must not exceed 5MB', 'error');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.log('File must be an image');
        addNotification('File must be an image', 'error');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      // Show message if we will compress
      if (file.size > 1024 * 1024) {
        addNotification(
          `Image will be optimized for better performance (${formatFileSize(file.size)})`,
          'info'
        );
      }
      
      // Create URL for preview
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

  // Remove image from form
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

  // Delete image from already saved product
  const handleDeleteProductImage = (productId: string) => {
    // Use mutation instead of direct implementation
    deleteImageMutation.mutate(productId);
  };

  // Handle image upload after creating/editing product with compression and retries
  const handleImageUpload = async (productId: string, imageFile?: File) => {
    const imageToProcess = imageFile || formData.imagen;
    if (!imageToProcess) return true;
    
    try {
      setImageLoading(true);
      setIsFetching(true);
      
      // Compress image before converting to base64
      let imageToUpload = imageToProcess;
      
      if (imageToUpload.size > 1024 * 1024) {
        console.log(`Compressing large image (${formatFileSize(imageToUpload.size)})...`);
        
        // Quality level based on file size
        let quality = 0.7; // Default value
        
        // Adjust quality based on size
        if (imageToUpload.size > 3 * 1024 * 1024) quality = 0.5; // Very large images
        else if (imageToUpload.size > 2 * 1024 * 1024) quality = 0.6; // Large images
        
        // Compress image
        imageToUpload = await compressImage(imageToUpload, 1200, 1200, quality);
      }
      
      // Convert to base64 and upload
      const base64Data = await imageService.fileToBase64(imageToUpload);
      
      // Implement retry system to handle "failed to fetch"
      const MAX_RETRIES = 3;
      let retryCount = 0;
      let success = false;
      
      while (retryCount < MAX_RETRIES && !success) {
        try {
          // If not the first attempt, wait before retrying
          if (retryCount > 0) {
            const waitTime = Math.pow(2, retryCount) * 1000; // Exponential wait
            console.log(`Retrying image upload (attempt ${retryCount + 1}/${MAX_RETRIES}) after ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          
          await imageService.uploadImageBase64(productId, base64Data);
          success = true;
          
          // Update cache directly after uploading image
          queryClient.setQueryData(
            getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm),
            (old: any) => {
              if (!old || !old.items) return old;
              
              return {
                ...old,
                items: old.items.map((p: ProductExtended) => {
                  if (p._id === productId) {
                    // Update product to indicate it now has an image
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
          
          // Update local products state to show change immediately
          setProducts(prevProducts => 
            prevProducts.map(p => 
              p._id === productId 
                ? {...p, hasImage: true} 
                : p
            )
          );
          
          // If we're editing this product, update its state
          if (editingProduct && editingProduct._id === productId) {
            setEditingProduct(prev => prev ? {...prev, hasImage: true} : null);
          }
          
          // Invalidate image cache to force a reload
          imageService.invalidateCache(productId);
          imageCache.current.delete(productId);
          
          // Force data refresh
          queryClient.invalidateQueries({
            predicate: (query) => query.queryKey[0] === PRODUCTS_CACHE_KEY,
          });
        } catch (error: any) {
          retryCount++;
          
          if (retryCount >= MAX_RETRIES) {
            console.error(`Error after ${MAX_RETRIES} attempts:`, error);
            throw error;
          } else {
            console.warn(`Error uploading image (attempt ${retryCount}/${MAX_RETRIES}):`, error.message);
          }
        }
      }
      
      return success;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      addNotification(`Error uploading image: ${error.message || 'Unknown error'}`, 'error');
      return false;
    } finally {
      setImageLoading(false);
      setIsFetching(false);
    }
  };

  // Handle form submission (create/edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      // Specific validations for combos
      if (formData.esCombo) {
        // Verify that there is at least one product in the combo
        if (!formData.itemsCombo || formData.itemsCombo.length === 0) {
          throw new Error('A combo must contain at least one product');
        }
        
        // Verify that all products exist in the product list
        const invalidProducts = formData.itemsCombo.filter(item => 
          !productOptions.some(p => p._id === item.productoId)
        );
        
        if (invalidProducts.length > 0) {
          throw new Error('The combo contains invalid products');
        }
      }
      
      // IMPORTANT: Make sure productoId are valid strings
      let itemsComboFixed = [];
      if (formData.esCombo && formData.itemsCombo && formData.itemsCombo.length > 0) {
        itemsComboFixed = formData.itemsCombo.map(item => {
          // Explicitly ensure ID is a valid string
          return {
            productoId: item.productoId.toString(), // Explicitly convert to string
            cantidad: item.cantidad
          };
        });
      }
      
      // Basic product data (without the image which will be handled separately)
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
      
      // Use mutation to create/edit product
      productMutation.mutate({
        id: editingProduct?._id,
        payload,
        image: formData.imagen || undefined
      });
    } catch (err: any) {
      const errorMsg = 'Error saving product: ' + err.message;
      setError(errorMsg);
      addNotification(errorMsg, 'error');
    }
  };

  // Start deletion process by showing confirmation dialog
  const confirmDelete = (id: string) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Confirm image deletion
  const confirmDeleteImage = (id: string) => {
    setProductToDelete(id);
    setDeleteImageDialogOpen(true);
  };

  // Delete product (after confirmation)
  const handleDelete = (id: string) => {
    // Check if this product is in any combo before trying to delete
    const combosWithProduct = products.filter(
      p => p.esCombo && p.itemsCombo?.some(item => {
        // Handle both if productoId is a string or an object
        const itemId = typeof item.productoId === 'object' 
          ? item.productoId._id 
          : item.productoId;
        return itemId === id;
      })
    );
    
    if (combosWithProduct.length > 0) {
      const comboNames = combosWithProduct.map(c => c.nombre).join(', ');
      const errorMsg = `Cannot delete this product because it is included in the following combos: ${comboNames}`;
      setError(errorMsg);
      addNotification(errorMsg, 'error');
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      return;
    }
    
    // Use mutation to delete
    deleteProductMutation.mutate(id);
  };

  // Prepare product editing
  const handleEdit = async (product: ProductExtended) => {
    setEditingProduct(product);
    
    // When editing an existing combo, make sure all references to products
    // in itemsCombo are correctly configured
    let itemsComboFixed = [];
    
    if (product.esCombo && product.itemsCombo && product.itemsCombo.length > 0) {
      // Verify product IDs inside the combo and fix them if necessary
      itemsComboFixed = product.itemsCombo.map(item => {
        const productId = typeof item.productoId === 'object' 
          ? item.productoId._id 
          : item.productoId;
          
        // Validate that ID exists in product list
        const productExists = productOptions.some(p => p._id === productId);
        
        if (!productExists) {
          console.warn(`Product with ID ${productId} not found in list of available products`);
        }
        
        return {
          productoId: productId,
          cantidad: item.cantidad
        };
      });
    }
    
    // Configure formData for editing
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
    
    // Try to load image if it exists
    if (product.hasImage) {
      try {
        // Load image for preview
        // Add version parameter to force reload
        const timestamp = new Date().getTime();
        const imageUrl = `${imageService.getImageUrl(product._id)}?v=${timestamp}`;
        setFormData(prev => ({
          ...prev,
          imagenPreview: imageUrl
        }));
      } catch (error) {
        console.error('Error loading image for preview:', error);
      }
    }
    
    setShowModal(true);
  };

  // Reset form
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

  // Handle category change
  const handleCategoryChange = (value: 'limpieza' | 'mantenimiento') => {
    try {
      if (!subCategorias[value]) {
        console.error(`Invalid category: ${value}`);
        addNotification(`Error: Category '${value}' not valid`, 'error');
        return;
      }
      
      const defaultSubcategoria = subCategorias[value][0].value;
      
      setFormData(prevState => ({
        ...prevState,
        categoria: value,
        subCategoria: defaultSubcategoria
      }));
    } catch (error) {
      console.error("Error changing category:", error);
      addNotification("Error changing category", 'error');
    }
  };

  // Handle esCombo state change
  const handleComboChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      esCombo: checked,
      // If not combo, empty the product list
      itemsCombo: checked ? prev.itemsCombo : []
    }));
  };

  // Add item to combo - Optimized with validations and checks
  const handleAddComboItem = () => {
    if (!selectedComboItem || selectedComboItem === "none" || comboItemQuantity <= 0) {
      addNotification('Select a product and valid quantity', 'warning');
      return;
    }

    // Check if product is already in the combo
    const productExists = formData.itemsCombo?.some(
      item => item.productoId === selectedComboItem
    );

    if (productExists) {
      addNotification('This product is already in the combo', 'warning');
      return;
    }

    // Check that product is not a combo (combos inside combos not allowed)
    const selectedProduct = products.find(p => p._id === selectedComboItem);
    if (!selectedProduct) {
      addNotification('Product not found', 'error');
      return;
    }
    
    if (selectedProduct.esCombo) {
      addNotification('Cannot add combos inside combos', 'error');
      return;
    }

    // Validate available stock
    if (selectedProduct.stock < comboItemQuantity) {
      addNotification(`Only ${selectedProduct.stock} units available for this product`, 'warning');
      // Don't block action, just warn
    }

    // Add to combo
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

    // Reset selection
    setSelectedComboItem('');
    setComboItemQuantity(1);
    setShowComboModal(false);
  };

  // Remove item from combo
  const handleRemoveComboItem = (index: number) => {
    const updatedItems = [...(formData.itemsCombo || [])];
    updatedItems.splice(index, 1);
    
    setFormData(prev => ({
      ...prev,
      itemsCombo: updatedItems
    }));
  };

  // Function to change page
  const handlePageChange = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
    setIsFetching(true);
    
    // When changing page, scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Scroll to beginning of list on mobile
    if (windowWidth < 768 && mobileListRef.current) {
      mobileListRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [windowWidth]);

  // Handle image upload with new component
  const handleImageUploaded = (success: boolean, productId?: string) => {
    if (success && productId) {
      setIsFetching(true);
      
      // Update cache directly
      queryClient.setQueryData(
        getProductsCacheKey(currentPage, selectedCategory, debouncedSearchTerm),
        (old: any) => {
          if (!old || !old.items) return old;
          
          return {
            ...old,
            items: old.items.map((p: ProductExtended) => {
              if (p._id === productId) {
                // Update product to indicate it now has an image
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
      
      // Update local products state to show change immediately
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p._id === productId 
            ? {...p, hasImage: true} 
            : p
        )
      );
      
      // Invalidate image cache to force a reload
      imageService.invalidateCache(productId);
      imageCache.current.delete(productId);
      
      // Force refresh to ensure updated data
      refetch().then(() => {
        setIsFetching(false);
      });
    }
  };

  // Get product name by ID for combos - Improved with additional validation
  const getProductNameById = (id: string) => {
    if (!id) {
      console.warn('Invalid product ID in combo:', id);
      return 'Invalid ID';
    }
    
    // Search by exact ID
    const product = products.find(p => p._id === id);
    if (product) {
      return product.nombre;
    }
    
    // If not found, try searching regardless of format (to handle possible data type problems)
    const productByStringComp = products.find(p => 
      p._id.toString() === id.toString()
    );
    
    if (productByStringComp) {
      return productByStringComp.nombre;
    }
    
    console.warn('Product not found for ID:', id);
    return 'Product not found';
  };

  // Calculate total combo price
  const calculateComboTotal = useCallback(() => {
    if (!formData.itemsCombo || formData.itemsCombo.length === 0) return 0;
    
    return formData.itemsCombo.reduce((total, item) => {
      if (!Array.isArray(products)) return total;
      
      // Handle both if productoId is a string or an object
      const productId = typeof item.productoId === 'object'
        ? item.productoId._id
        : item.productoId;
        
      const product = products.find(p => p._id === productId);
      if (!product) return total;
      
      return total + (product.precio * item.cantidad);
    }, 0);
  }, [formData.itemsCombo, products]);

  // Show detailed information about pagination
  const indexOfLastProduct = currentPage * itemsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - itemsPerPage;
  const showingFromTo = totalItems > 0 
    ? `${indexOfFirstProduct + 1}-${Math.min(indexOfLastProduct, totalItems)} of ${totalItems}`
    : '0 of 0';

  // Get non-combo products for selector - Optimized with useMemo
  const nonComboProducts = useMemo(() => {
    if (!Array.isArray(productOptions)) return [];
    return productOptions.filter(p => !p.esCombo);
  }, [productOptions]);

  // When selected category changes, update UI
  useEffect(() => {
    setIsFetching(true);
  }, [selectedCategory]);

  return (
    <div className="p-4 md:p-6 space-y-6 bg-[#DFEFE6]/30">
      {/* Alerts */}
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

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 bg-white rounded-xl shadow-sm p-4 border border-[#91BEAD]/20">
        <div className="w-full md:w-64">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
            <Input
              type="text"
              placeholder="Search products..."
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
                All
              </TabsTrigger>
              <TabsTrigger 
                value="limpieza" 
                className="flex-1 data-[state=active]:bg-[#29696B] data-[state=active]:text-white"
                disabled={userSections === 'mantenimiento'}
              >
                Cleaning
              </TabsTrigger>
              <TabsTrigger 
                value="mantenimiento" 
                className="flex-1 data-[state=active]:bg-[#29696B] data-[state=active]:text-white"
                disabled={userSections === 'limpieza'}
              >
                Maintenance
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
            New Product
          </Button>
        </div>
      </div>

      {/* Alert for products with low stock */}
      {!isLoading && lowStockProducts.length > 0 && (
        <Alert className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="ml-2">
            There are {lowStockProducts.length} products with low stock. Please review the inventory.
          </AlertDescription>
        </Alert>
      )}

      {/* Message when there are no products */}
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
              ? 'Loading products...'
              : 'No products found matching the search'
            }
          </p>
        </div>
      )}

      {/* Results counter with detailed information */}
      {!isLoading && products.length > 0 && (
        <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm text-[#29696B] flex flex-col sm:flex-row sm:justify-between items-center">
          <span>
            Total: {totalItems} {totalItems === 1 ? 'product' : 'products'}
          </span>
          <span className="text-[#29696B] font-medium">
            Showing: {showingFromTo}
          </span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-[#91BEAD]/20">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
            <Loader2 className="w-6 h-6 text-[#29696B] animate-spin" />
          </div>
          <p className="text-[#7AA79C]">Loading products...</p>
        </div>
      )}

      {/* Table for medium and large screens - VIRTUALIZED IMPLEMENTATION */}
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
        
        {/* Pagination for table */}
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

      {/* Card View for mobile devices - VIRTUALIZED IMPLEMENTATION */}
      <div ref={mobileListRef} id="mobile-products-list" className="md:hidden">
        {/* Pagination visible at top for mobile */}
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
        
        {/* Loading indicator on mobile */}
        {isFetching && (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="w-5 h-5 text-[#29696B] animate-spin mr-2" />
            <span className="text-[#29696B] text-sm">Updating...</span>
          </div>
        )}
        
        {/* Message showing current page and total */}
        {!isLoading && totalPages > 1 && (
          <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm">
            <span className="text-[#29696B] font-medium">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
        
        {/* Duplicated pagination at end of list for better visibility */}
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

      {/* Product Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto bg-white border border-[#91BEAD]/20">
          <DialogHeader className="sticky top-0 bg-white pt-4 pb-2 z-10">
            <DialogTitle className="text-[#29696B]">
              {editingProduct ? 'Edit Product' : 'New Product'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid gap-3">
              <div>
                <Label htmlFor="nombre" className="text-sm text-[#29696B]">Name</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
                />
              </div>

              <div>
                <Label htmlFor="descripcion" className="text-sm text-[#29696B]">Description</Label>
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
                  <Label htmlFor="categoria" className="text-sm text-[#29696B]">Category</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value: 'limpieza' | 'mantenimiento') => handleCategoryChange(value)}
                    disabled={
                      // Disable if user doesn't have permission for this category
                      userSections !== 'ambos' && formData.categoria !== userSections
                    }
                  >
                    <SelectTrigger id="categoria" className="mt-1 border-[#91BEAD] focus:ring-[#29696B]/20">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="border-[#91BEAD]">
                    <SelectItem value="limpieza" disabled={userSections === 'mantenimiento'}>Cleaning</SelectItem>
                      <SelectItem value="mantenimiento" disabled={userSections === 'limpieza'}>Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subCategoria" className="text-sm text-[#29696B]">Subcategory</Label>
                  <Select
                    value={formData.subCategoria}
                    onValueChange={(value) => setFormData({ ...formData, subCategoria: value })}
                  >
                    <SelectTrigger id="subCategoria" className="mt-1 border-[#91BEAD] focus:ring-[#29696B]/20">
                      <SelectValue placeholder="Select subcategory" />
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
                  <Label htmlFor="precio" className="text-sm text-[#29696B]">Price</Label>
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
                <Label htmlFor="proovedorInfo" className="text-sm text-[#29696B]">Supplier Information</Label>
                <Input
                  id="proovedorInfo"
                  value={formData.proovedorInfo}
                  onChange={(e) => setFormData({ ...formData, proovedorInfo: e.target.value })}
                  className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
                />
              </div>
              
              {/* Switch for combos */}
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="isCombo"
                  checked={formData.esCombo}
                  onCheckedChange={handleComboChange}
                />
                <Label htmlFor="isCombo" className="text-sm text-[#29696B]">Is this a combo?</Label>
              </div>
              
              {/* Combo products section */}
              {formData.esCombo && (
                <div className="space-y-3 p-3 border border-[#91BEAD]/30 rounded-lg bg-[#DFEFE6]/10">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm text-[#29696B] font-medium">Products in combo</Label>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setShowComboModal(true)}
                      className="bg-[#29696B] hover:bg-[#29696B]/90 text-white text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add
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
                        <span className="text-sm text-[#7AA79C]">Calculated total:</span>
                        <span className="font-medium text-[#29696B]">${calculateComboTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-3 text-sm text-[#7AA79C] bg-[#DFEFE6]/20 rounded">
                      No products in combo
                    </div>
                  )}
                  
                  <div className="text-xs text-amber-600">
                    Remember that the combo price can be different from the calculated total.
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm text-[#29696B] block mb-2">Product Image</Label>
                
                {/* Show image upload component when editing */}
                {editingProduct ? (
                  <div className="mt-2">
                    {formData.imagenPreview ? (
                      <div className="relative w-full h-32 bg-[#DFEFE6]/20 rounded-md overflow-hidden border border-[#91BEAD]/30">
                        <img 
                          src={formData.imagenPreview} 
                          alt="Preview" 
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
                  // For new products, keep original UI
                  <div className="mt-1 flex flex-col space-y-2">
                    {formData.imagenPreview ? (
                      <div className="relative w-full h-32 bg-[#DFEFE6]/20 rounded-md overflow-hidden border border-[#91BEAD]/30">
                        <img 
                          src={formData.imagenPreview} 
                          alt="Preview" 
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
                              Click to upload an image
                            </p>
                            <p className="text-xs text-[#7AA79C]">
                              Maximum 5MB
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