import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  RefreshCw,
  PackagePlus,
  ShoppingBag,
  Minus,
  Filter,
  HelpCircle,
  Building,
  Tag
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import EnhancedPagination from "./components/Pagination";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useNotification } from '@/context/NotificationContext';
import { inventoryObservable, getAuthToken } from '@/utils/inventoryUtils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Product,
  ComboItemType,
  ProveedorType,
  PaginatedResponse
} from '@/types/inventory';

// Importar el componente ProductImage y las utilidades de imagen
import ProductImage from './components/ProductImage';
import { getProductImageUrl as utilsGetProductImageUrl, hasProductImage } from '@/utils/image-utils';
import ImageActionButton from './components/ImageActionButton';

// Definir URL base para la API
const API_URL = "http://localhost:3000/api/";

/**
 * Obtiene la URL de la imagen para un producto
 * @param productId - ID del producto o objeto producto completo
 * @param addTimestamp - Si se debe agregar timestamp para evitar caché (default: true)
 * @returns URL de la imagen o imagen por defecto si no existe
 */
export const getProductImageUrl = (product: string | Product, addTimestamp = true): string => {
  // Caso 1: Si es null, undefined o vacío, devolver logo
  if (!product) return '/lyme.png';
  
  // Caso 2: Si product es un string (ID)
  if (typeof product === 'string') {
    if (!product.trim()) return '/lyme.png';
    const url = `/images/products/${product}.webp`;
    return addTimestamp ? `${url}?t=${Date.now()}` : url;
  }
  
  // Caso 3: Si product es un objeto Product
  
  // Si no tiene ID o hasImage es explícitamente false, devolver logo
  if (!product._id || product.hasImage === false) return '/lyme.png';
  
  // Prioridad 1: Si tiene imageUrl explícita, usarla
  if (product.imageUrl) {
    return addTimestamp ? `${product.imageUrl}?t=${Date.now()}` : product.imageUrl;
  }
  
  // Prioridad 2: Construir URL basada en ID
  const url = `/images/products/${product._id}.webp`;
  return addTimestamp ? `${url}?t=${Date.now()}` : url;
};

/**
 * Manejador de errores de carga de imágenes unificado
 */
const handleImageError = (
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  productName?: string,
  isThumbnail = true
): void => {
  console.warn(`Error al cargar imagen${productName ? ` para ${productName}` : ''}`);
  const target = event.target as HTMLImageElement;
  target.src = "/lyme.png";
  target.className = isThumbnail ? "h-8 w-8 object-contain" : "w-full h-full object-contain p-4";
  target.alt = "Imagen no disponible";
};

// Definir umbral de stock bajo
const LOW_STOCK_THRESHOLD = 10;

// Interface para el formulario de producto
interface FormDataType {
  nombre: string;
  descripcion: string;
  categoria: string;
  subCategoria: string;
  marca: string;
  precio: string;
  stock: string;
  stockMinimo: string;
  proveedor: {
    nombre: string;
    contacto: string;
    telefono: string;
    email: string;
  };
  estado: string;
  imagen: File | null;
  imagenPreview: string | ArrayBuffer | null;
}

/**
 * Componente principal de la sección de inventario
 * Permite visualizar, crear, editar y eliminar productos
 */
const InventorySection = () => {
  const { addNotification } = useNotification();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteImageDialogOpen, setDeleteImageDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCombo, setIsCombo] = useState(false);
  const [comboSearchTerm, setComboSearchTerm] = useState('');
  const [selectedComboItems, setSelectedComboItems] = useState<ComboItemType[]>([]);
  const [showComboSelectionModal, setShowComboSelectionModal] = useState(false);
  const [tempSelectedItems, setTempSelectedItems] = useState<ComboItemType[]>([]);
  const initialFetchDone = useRef(false);
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [hasStockIssues, setHasStockIssues] = useState(false);
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);

  // Estado para la paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Estado para productos con stock bajo
  const [lowStockCount, setLowStockCount] = useState(0);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isLowStockLoading, setIsLowStockLoading] = useState(false);

  // Estado para productos sin stock
  const [noStockCount, setNoStockCount] = useState(0);
  const [showNoStockOnly, setShowNoStockOnly] = useState(false);
  const [isNoStockLoading, setIsNoStockLoading] = useState(false);

  // Referencias para el scroll en móvil
  const mobileListRef = useRef<HTMLDivElement>(null);

  // IMPORTANTE: Tamaños fijos para cada tipo de dispositivo
  const ITEMS_PER_PAGE_MOBILE = 5;
  const ITEMS_PER_PAGE_DESKTOP = 10;

  // Estado para controlar el ancho de la ventana
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Calculamos dinámicamente itemsPerPage basado en el ancho de la ventana
  const itemsPerPage = windowWidth < 768 ? ITEMS_PER_PAGE_MOBILE : ITEMS_PER_PAGE_DESKTOP;

  // Estado para almacenar todos los productos disponibles para combos
  const [allAvailableProducts, setAllAvailableProducts] = useState<Product[]>([]);

  // === NUEVA IMPLEMENTACIÓN: BÚSQUEDA DEL LADO DEL CLIENTE ===
  // Esta mejora permite una búsqueda progresiva B -> Bo -> Bot -> Botin sin depender del servidor
  const [useClientSideSearch, setUseClientSideSearch] = useState(true); // Habilitar la búsqueda en el lado del cliente
  const [allProductsForSearch, setAllProductsForSearch] = useState<Product[]>([]);
  const [isInitialDataFetched, setIsInitialDataFetched] = useState(false);

  /**
   * Función para filtrar productos por búsqueda del lado del cliente
   * Permite la búsqueda progresiva por letra (B -> Bo -> Bot -> Botin)
   * @param products - Lista de productos a filtrar
   * @param searchTerm - Término de búsqueda
   * @returns Lista de productos filtrados
   */
  const filterProductsBySearch = (products: Product[], searchTerm: string): Product[] => {
    if (!searchTerm) return products;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return products.filter(product => {
      // Buscar coincidencias en múltiples campos para mejores resultados
      return (
        (product.nombre && product.nombre.toLowerCase().includes(lowerSearchTerm)) ||
        (product.descripcion && product.descripcion.toLowerCase().includes(lowerSearchTerm)) ||
        (product.marca && product.marca.toLowerCase().includes(lowerSearchTerm)) ||
        (product.proveedor?.nombre && product.proveedor.nombre.toLowerCase().includes(lowerSearchTerm))
      );
    });
  };

  /**
   * Hook personalizado para retrasar la búsqueda mientras se escribe
   * @param value - Valor a debounce
   * @param delay - Tiempo de espera en milisegundos
   */
  const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  };

  const debouncedSearchTerm = useDebounce(searchTerm, 200); // 200ms de delay para mejor experiencia de búsqueda por letra

  // Estado inicial del formulario
  const [formData, setFormData] = useState<FormDataType>({
    nombre: '',
    descripcion: '',
    categoria: '',
    subCategoria: '',
    marca: '',
    precio: '',
    stock: '',
    stockMinimo: '5', // Valor predeterminado para stock mínimo
    proveedor: {
      nombre: '',
      contacto: '',
      telefono: '',
      email: ''
    },
    estado: 'activo', // Valor predeterminado para estado
    imagen: null,
    imagenPreview: null
  });

  // Subcategorías organizadas por categoría
  const subCategorias: Record<string, { value: string; label: string }[]> = {
    limpieza: [
      { value: 'accesorios', label: 'Accesorios' },
      { value: 'aerosoles', label: 'Aerosoles' },
      { value: 'bolsas', label: 'Bolsas' },
      { value: 'estandar', label: 'Estándar' },
      { value: 'indumentaria', label: 'Indumentaria' },
      { value: 'liquidos', label: 'Líquidos' },
      { value: 'papeles', label: 'Papeles' },
      { value: 'calzado', label: 'Calzado' },
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

  // Usar productos directamente de la respuesta de la API en lugar de filtrar localmente
  const currentProducts = products;

  /**
   * Maneja la edición de un producto, cargando sus datos en el formulario
   * @param product - Producto a editar
   */
  const handleEdit = async (product: Product) => {
    try {
      console.log("Editando producto:", product);
      
      // Obtener la información más actualizada del producto
      const freshProduct = await fetchProductById(product._id);
      if (freshProduct) {
        product = freshProduct;
        console.log("Datos actualizados del producto:", product);
      }
      
      setEditingProduct(product);
  
      // Detectar si es un combo
      const isProductCombo = product.esCombo || false;
      setIsCombo(isProductCombo);
  
      // Resetear el modo de adición de stock al editar
      setIsAddingStock(false);
  
      // Si es combo, cargar los ítems del combo
      if (isProductCombo && Array.isArray(product.itemsCombo)) {
        const comboItems = product.itemsCombo.map(item => {
          // Si el item está poblado
          if (item.productoId && typeof item.productoId === 'object') {
            return {
              productoId: item.productoId._id,
              nombre: item.productoId.nombre,
              cantidad: item.cantidad,
              precio: item.productoId.precio
            };
          }
          // Si no está poblado, intentar recuperar la información
          else {
            const productId = typeof item.productoId === 'string' ? item.productoId : String(item.productoId);
            const matchedProduct = products.find(p => p._id === productId);
  
            return {
              productoId: productId,
              nombre: matchedProduct ? matchedProduct.nombre : 'Producto no disponible',
              cantidad: item.cantidad,
              precio: matchedProduct ? matchedProduct.precio : 0
            };
          }
        });
  
        setSelectedComboItems(comboItems);
      } else {
        setSelectedComboItems([]);
      }
  
      // Detección mejorada de imágenes usando la utilidad hasProductImage
      const hasImage = hasProductImage(product);
      console.log("¿El producto tiene imagen?", hasImage);
      console.log("URL de imagen:", product.imageUrl);
      console.log("hasImage flag:", product.hasImage);
      
      let imagePreview = null;
      
      if (hasImage) {
        // Si tiene imageUrl explícita, usarla
        if (product.imageUrl) {
          imagePreview = product.imageUrl;
          console.log("Usando URL explícita:", imagePreview);
        } else {
          // Usar la función utilitaria para obtener la URL de la imagen con timestamp
          imagePreview = getProductImageUrl(product, true);
          console.log("Usando URL generada:", imagePreview);
        }
      }
  
      // Preparar datos del formulario para la edición
      setFormData({
        nombre: product.nombre || '',
        descripcion: product.descripcion || '',
        categoria: product.categoria || '',
        subCategoria: product.subCategoria || '',
        marca: '', // Campo vacío como solicitado
        precio: product.precio ? product.precio.toString() : '',
        stock: product.stock ? product.stock.toString() : '0',
        stockMinimo: (product.stockMinimo || 5).toString(),
        proveedor: {
          nombre: '',
          contacto: '',
          telefono: '',
          email: ''
        }, // Campos vacíos
        estado: 'activo', // Valor por defecto
        imagen: null,
        imagenPreview: imagePreview
      });
  
      setShowModal(true);
    } catch (error) {
      console.error("Error al preparar edición:", error);
      addNotification("Error al preparar edición del producto", "error");
    }
  };

  /**
   * Editar la imagen de un producto
   * @param product - Producto cuya imagen se va a editar
   */
  const handleEditImage = (product: Product) => {
    // Implementar la lógica para editar la imagen
    // Esta función debería existir en tu código pero no está definida en el fragmento proporcionado
    handleEdit(product);
  };

  /**
   * Función mejorada para cargar productos con filtros y paginación
   * Incorpora la búsqueda del lado del cliente para una experiencia más fluida
   * @param forceRefresh - Forzar recarga de productos
   * @param page - Número de página
   * @param limit - Límite de productos por página
   */
  const fetchProducts = async (forceRefresh = false, page = currentPage, limit = itemsPerPage) => {
    try {
      // Solo evitamos la carga si ya está cargando y no es forzada
      if (loading && !forceRefresh) {
        console.log('Ya se está cargando productos, evitando otra carga');
        return;
      }
  
      console.log(`Cargando productos desde el servidor para página ${page}, límite ${limit}...`);
      setLoading(true);
      setRefreshing(forceRefresh);
      setError('');
  
      const token = getAuthToken();
      if (!token) {
        console.error('No se encontró token de autenticación');
        throw new Error('No hay token de autenticación');
      }
  
      // Si usamos búsqueda del lado del cliente y necesitamos cargar todos los productos
      if (useClientSideSearch && (!isInitialDataFetched || forceRefresh)) {
        try {
          // Cargar todos los productos para búsqueda (con un límite razonable)
          const allProductsResponse = await fetch(`${API_URL}producto?limit=1000`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            }
          });
  
          if (allProductsResponse.ok) {
            const allProductsData = await allProductsResponse.json();
            
            // Extraer productos de la respuesta
            let allProducts: Product[] = [];
            if (Array.isArray(allProductsData)) {
              allProducts = allProductsData;
            } else if (allProductsData && Array.isArray(allProductsData.items)) {
              allProducts = allProductsData.items;
            }
            
            // Normalizar propiedades de imagen
            const productsWithImages = allProducts.map(product => ({
              ...product,
              hasImage: (
                product.hasImage === true || 
                !!product.imageUrl || 
                (product.imagenInfo && !!product.imagenInfo.rutaArchivo)
              )
            }));
            
            setAllProductsForSearch(productsWithImages);
            setIsInitialDataFetched(true);
            console.log(`Cargados ${productsWithImages.length} productos para búsqueda del lado del cliente`);
          }
        } catch (error) {
          console.error('Error al cargar todos los productos para búsqueda:', error);
          // Continuar con búsqueda del lado del servidor como respaldo
        }
      }
  
      // Continuar con consulta de paginación regular
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());
  
      // Prioridad de filtros: Sin Stock > Stock Bajo > Filtros normales
      if (showNoStockOnly) {
        queryParams.append('noStock', 'true');
        console.log("Filtrando productos sin stock...");
      } else if (showLowStockOnly) {
        queryParams.append('lowStock', 'true');
        queryParams.append('threshold', LOW_STOCK_THRESHOLD.toString());
        console.log("Filtrando productos con stock bajo...");
      } else {
        // Aplicamos los filtros normales
        if (debouncedSearchTerm && !useClientSideSearch) {
          // Solo aplicar búsqueda del lado del servidor si la búsqueda del cliente está desactivada
          queryParams.append('regex', debouncedSearchTerm);
          queryParams.append('regexFields', 'nombre,descripcion,marca');
          queryParams.append('regexOptions', 'i');
          console.log(`Buscando productos que coincidan con: "${debouncedSearchTerm}"`);
        }
  
        if (selectedCategory !== 'all') {
          if (selectedCategory === 'combos') {
            queryParams.append('esCombo', 'true');
            console.log("Filtrando solo combos...");
          } else {
            queryParams.append('category', selectedCategory);
            console.log(`Filtrando por categoría: ${selectedCategory}`);
          }
        }
      }
  
      // Agregar cache buster para evitar resultados en caché del servidor
      queryParams.append('_', Date.now().toString());
  
      const urlWithParams = `${API_URL}producto?${queryParams.toString()}`;
      console.log(`Consultando API: ${urlWithParams}`);
  
      const response = await fetch(urlWithParams, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
  
      if (!response.ok) {
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            window.location.href = '/login';
          }
          return;
        }
        throw new Error(`Error al cargar productos (${response.status})`);
      }
  
      // Procesar la respuesta
      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        console.error("Error al parsear JSON:", jsonError);
        throw new Error('Error al procesar datos de productos');
      }
  
      // Manejar correctamente el formato de respuesta paginada o array simple
      let extractedProducts: Product[] = [];
      let totalItems = 0;
  
      if (responseData && typeof responseData === 'object') {
        if (Array.isArray(responseData)) {
          extractedProducts = responseData;
          totalItems = responseData.length;
        } else if (Array.isArray(responseData.items)) {
          extractedProducts = responseData.items;
          totalItems = responseData.totalItems || responseData.items.length;
        }
      }
  
      // Normalizar propiedades de imagen
      const productsWithImages = extractedProducts.map(product => ({
        ...product,
        hasImage: (
          product.hasImage === true || 
          !!product.imageUrl || 
          (product.imagenInfo && !!product.imagenInfo.rutaArchivo)
        )
      }));
  
      // Aplicar búsqueda del lado del cliente si está habilitada y tenemos término de búsqueda
      if (useClientSideSearch && debouncedSearchTerm && allProductsForSearch.length > 0) {
        const filteredProducts = filterProductsBySearch(allProductsForSearch, debouncedSearchTerm);
        
        // Aplicar otros filtros (categoría, etc.) a los resultados de búsqueda
        const finalFilteredProducts = filteredProducts.filter(product => {
          if (selectedCategory === 'all') return true;
          if (selectedCategory === 'combos') return product.esCombo === true;
          return product.categoria === selectedCategory;
        });
        
        // Paginar los resultados filtrados
        const startIndex = (page - 1) * limit;
        const paginatedProducts = finalFilteredProducts.slice(startIndex, startIndex + limit);
        
        setProducts(paginatedProducts);
        setTotalCount(finalFilteredProducts.length);
      } else {
        // Usar resultados del servidor directamente
        setProducts(productsWithImages);
        setTotalCount(totalItems);
      }
  
      // Marcar carga inicial como completada
      initialFetchDone.current = true;
  
      // Si hay pocos productos, mostrar una alerta
      if (extractedProducts.length === 0) {
        addNotification('No se encontraron productos', 'info');
      }
  
    } catch (err: any) {
      const errorMsg = 'Error al cargar productos: ' + err.message;
      console.error(errorMsg);
      setError(errorMsg);
  
      if (typeof addNotification === 'function') {
        addNotification(errorMsg, 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Resetear formulario a sus valores iniciales
   */
  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      categoria: '',
      subCategoria: '',
      marca: '',
      precio: '',
      stock: '',
      stockMinimo: '5',
      proveedor: {
        nombre: '',
        contacto: '',
        telefono: '',
        email: ''
      },
      estado: 'activo',
      imagen: null,
      imagenPreview: null
    });
    setEditingProduct(null);
    setIsCombo(false);
    setSelectedComboItems([]);
    setIsAddingStock(false);
    setHasStockIssues(false);
    setStockWarnings([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Función para contar productos con stock bajo
   */
  const countLowStockProducts = async () => {
    try {
      setIsLowStockLoading(true);

      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Usar el endpoint específico para estadísticas de stock bajo
      const response = await fetch(`${API_URL}producto/stats/stock?threshold=${LOW_STOCK_THRESHOLD}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener estadísticas de stock bajo');
      }

      const data = await response.json();

      // El endpoint debe devolver un objeto con la propiedad 'count'
      if (data && typeof data.count === 'number') {
        console.log(`Se encontraron ${data.count} productos con stock bajo`);
        setLowStockCount(data.count);
      } else {
        throw new Error('Formato de respuesta no válido');
      }
    } catch (error) {
      console.error("Error al contar productos con stock bajo:", error);

      // En caso de error, intentamos una estimación basada en los productos cargados
      try {
        const authToken = getAuthToken();
        // Consultar el endpoint normal con filtro de stock bajo
        if (authToken) {
          const altResponse = await fetch(
            `${API_URL}producto?lowStock=true&threshold=${LOW_STOCK_THRESHOLD}&limit=1`,
            {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Cache-Control': 'no-cache'
              }
            }
          );

          if (altResponse.ok) {
            const altData = await altResponse.json();
            if (altData && altData.totalItems) {
              console.log(`Obtenido conteo alternativo: ${altData.totalItems} productos con stock bajo`);
              setLowStockCount(altData.totalItems);
              return;
            }
          }
        }
      } catch (altError) {
        console.error("Error en método alternativo:", altError);
      }

      // Si todo lo demás falla, usamos una estimación local
      const lowStockEstimate = products.filter(
        product => product.stock <= LOW_STOCK_THRESHOLD && product.stock > 0
      ).length;
      console.log(`Estimando localmente: al menos ${lowStockEstimate} productos con stock bajo`);
      setLowStockCount(lowStockEstimate);
    } finally {
      setIsLowStockLoading(false);
    }
  };

  /**
   * Función para contar productos sin stock
   */
  const countNoStockProducts = async () => {
    try {
      setIsNoStockLoading(true);

      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Usar el endpoint para obtener productos sin stock
      const response = await fetch(`${API_URL}producto?noStock=true&limit=1`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener estadísticas de productos sin stock');
      }

      const data = await response.json();

      // Verificar si hay datos paginados
      if (data && typeof data.totalItems === 'number') {
        console.log(`Se encontraron ${data.totalItems} productos sin stock`);
        setNoStockCount(data.totalItems);
      } else {
        // Contar productos si es un array
        const count = Array.isArray(data) ? data.length : 0;
        console.log(`Se encontraron ${count} productos sin stock`);
        setNoStockCount(count);
      }
    } catch (error) {
      console.error("Error al contar productos sin stock:", error);

      // Estimación local como fallback
      const noStockEstimate = products.filter(product => product.stock === 0).length;
      console.log(`Estimando localmente: al menos ${noStockEstimate} productos sin stock`);
      setNoStockCount(noStockEstimate);
    } finally {
      setIsNoStockLoading(false);
    }
  };

  /**
   * Obtener un producto por ID (para actualizar después de cambios)
   * @param productId - ID del producto a obtener
   */
  const fetchProductById = async (productId: string): Promise<Product | null> => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${API_URL}producto/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Error al obtener producto (${response.status})`);
      }

      const productData = await response.json();
      
      // Determinar si el producto tiene imagen basado en múltiples criterios
      const hasImage = (
        productData.hasImage === true || 
        !!productData.imageUrl || 
        (productData.imagenInfo && !!productData.imagenInfo.rutaArchivo)
      );
      
      return {
        ...productData,
        hasImage: hasImage
      };
    } catch (error) {
      console.error(`Error al obtener producto ${productId}:`, error);
      return null;
    }
  };

  /**
   * Cargar todos los productos sin paginación para los combos
   */
  const fetchAllProducts = async (): Promise<Product[]> => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Para obtener todos los productos, usamos un límite alto
      const response = await fetch(`${API_URL}producto?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar todos los productos');
      }

      const responseData = await response.json();
      let allProducts: Product[] = [];

      if (responseData && typeof responseData === 'object') {
        if (Array.isArray(responseData)) {
          allProducts = responseData;
        } else if (Array.isArray(responseData.items)) {
          allProducts = responseData.items;
        }
      }

      // Asegurar hasImage en todos los productos usando la utilidad mejorada
      return allProducts.map(product => ({
        ...product,
        hasImage: hasProductImage(product)
      }));
    } catch (error) {
      console.error('Error al cargar todos los productos:', error);
      return [];
    }
  };

  /**
   * Actualizar un producto específico en el estado
   * @param updatedProduct - Producto actualizado
   */
  const updateProductInState = (updatedProduct: Product) => {
    if (!updatedProduct || !updatedProduct._id) return;

    setProducts(prevProducts => {
      // Verificar que prevProducts sea un array
      if (!Array.isArray(prevProducts)) return [updatedProduct];

      return prevProducts.map(product =>
        product._id === updatedProduct._id ? { ...product, ...updatedProduct } : product
      );
    });
  };

  /**
   * Verificar la disponibilidad de stock para un combo
   * @param comboItems - Items del combo
   */
  const validateComboStock = (comboItems: ComboItemType[]): { valid: boolean; warnings: string[] } => {
    const warnings: string[] = [];
    let isValid = true;

    // Si no hay items en el combo, es válido
    if (!comboItems || comboItems.length === 0) {
      return { valid: true, warnings: [] };
    }

    // Verificar cada item del combo
    comboItems.forEach(item => {
      // Buscar el producto en la lista de productos disponibles
      const product = allAvailableProducts.find(p =>
        typeof item.productoId === 'string'
          ? p._id === item.productoId
          : p._id === item.productoId._id
      );

      if (product) {
        // Si el stock es menor que la cantidad requerida
        if (product.stock < item.cantidad) {
          isValid = false;
          warnings.push(`No hay suficiente stock de "${product.nombre}". Disponible: ${product.stock}, Requerido: ${item.cantidad}`);
        }
        // Si el stock es bajo (pero suficiente)
        else if (product.stock <= LOW_STOCK_THRESHOLD) {
          warnings.push(`Stock bajo de "${product.nombre}". Disponible: ${product.stock}, Requerido: ${item.cantidad}`);
        }
      } else {
        isValid = false;
        warnings.push(`No se pudo encontrar el producto para validar su stock`);
      }
    });

    return { valid: isValid, warnings };
  };

  // Cargar productos al montar el componente, suscribirse al observable y contar productos
  useEffect(() => {
    console.log('InventorySection: Componente montado, iniciando carga de productos...');

    // Cargar productos inmediatamente al montar el componente
    fetchProducts(true);

    // Contar productos con stock bajo y sin stock
    countLowStockProducts();
    countNoStockProducts();

    // Suscribirse a actualizaciones
    const unsubscribe = inventoryObservable.subscribe(() => {
      console.log('InventorySection: Actualización de inventario notificada por observable');
      fetchProducts(true);
      // También actualizamos los contadores
      countLowStockProducts();
      countNoStockProducts();
    });

    // Limpiar suscripción al desmontar
    return () => {
      unsubscribe();
    };
  }, []); // Este efecto solo debe ejecutarse al montar el componente

  // Efecto para detectar el tamaño de la ventana y ajustar la visualización
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

  // Manejar actualizaciones de filtros
  useEffect(() => {
    if (initialFetchDone.current) {
      // Cuando cambian los filtros, volver a la primera página y recargar
      console.log("Filtros cambiados, recargando productos...");
      setCurrentPage(1);
      fetchProducts(true, 1, itemsPerPage);
    }
  }, [debouncedSearchTerm, selectedCategory, showLowStockOnly, showNoStockOnly]);

  // Cargar todos los productos al abrir el modal de combos
  useEffect(() => {
    if (showComboSelectionModal) {
      const loadAllProducts = async () => {
        const allProducts = await fetchAllProducts();
        setAllAvailableProducts(allProducts);
      };

      loadAllProducts();
    }
  }, [showComboSelectionModal]);

  // Efecto para validar stock de combos cuando cambian los items seleccionados
  useEffect(() => {
    if (isCombo && tempSelectedItems.length > 0) {
      const { valid, warnings } = validateComboStock(tempSelectedItems);
      setHasStockIssues(!valid);
      setStockWarnings(warnings);
    } else {
      setHasStockIssues(false);
      setStockWarnings([]);
    }
  }, [tempSelectedItems, isCombo, allAvailableProducts]);

  /**
   * Función segura para obtener productos filtrados
   */
  const getFilteredProducts = () => {
    // Protección contra productos indefinidos o no array
    if (!products || !Array.isArray(products)) {
      return [];
    }

    return products.filter(product => {
      // Verificación de seguridad para producto
      if (!product || typeof product !== 'object') return false;

      // Buscar coincidencias en nombre, descripción y proveedor (con verificación segura)
      const matchesSearch =
        searchTerm === '' || (
          (product.nombre && product.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (product.descripcion && product.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (product.proveedor?.nombre && product.proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (product.marca && product.marca.toLowerCase().includes(searchTerm.toLowerCase()))
        );

      // Verificar categoría
      const matchesCategory =
        selectedCategory === 'all' ||
        (selectedCategory === 'combos' && product.esCombo === true) ||
        (product.categoria && product.categoria === selectedCategory) ||
        (product.subCategoria && product.subCategoria === selectedCategory);

      // Verificar stock bajo si el filtro está activado
      const matchesLowStock = !showLowStockOnly || (
        product.stock <= LOW_STOCK_THRESHOLD && product.stock > 0
      );

      // Verificar sin stock si el filtro está activado
      const matchesNoStock = !showNoStockOnly || product.stock === 0;

      return matchesSearch && matchesCategory && matchesLowStock && matchesNoStock;
    });
  };

  /**
   * Función para filtrar productos para combos
   */
  const getFilteredComboProducts = () => {
    // No mostrar productos que ya son combos
    const productsToFilter = showComboSelectionModal ? allAvailableProducts : products;

    return productsToFilter.filter(product => {
      if (!product || product.esCombo) return false;

      // Buscar de forma incremental por término de búsqueda (si existe)
      // Esto permite resultados mientras se escribe B -> Bo -> Bot -> Botin
      if (comboSearchTerm === '') return true;

      // Buscar en nombre (prioridad principal)
      if (product.nombre && product.nombre.toLowerCase().includes(comboSearchTerm.toLowerCase())) {
        return true;
      }

      // Buscar también en otros campos relevantes
      if (product.marca && product.marca.toLowerCase().includes(comboSearchTerm.toLowerCase())) {
        return true;
      }

      if (product.descripcion && product.descripcion.toLowerCase().includes(comboSearchTerm.toLowerCase())) {
        return true;
      }

      // Si llega aquí, no coincide con ningún campo
      return false;
    });
  };

  /**
   * Manejar cambio de imagen en el formulario
   * @param e - Evento de cambio
   */
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

      // Crear URL para vista previa
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          imagen: file,
          imagenPreview: reader.result
        });
      };

      reader.readAsDataURL(file);
    }
  };

  /**
   * Eliminar imagen del formulario
   */
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

  /**
   * Eliminar imagen del producto ya guardado
   * @param productId - ID del producto
   */
  const handleDeleteProductImage = async (productId: string) => {
    try {
      setImageLoading(true);

      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      console.log(`Eliminando imagen para producto ID: ${productId}`);

      const response = await fetch(`${API_URL}producto/${productId}/imagen`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        // Intentar obtener más información sobre el error
        let errorDetail = '';
        try {
          const errorData = await response.json();
          errorDetail = errorData.message || errorData.error || '';
        } catch (e) {
          errorDetail = `Error ${response.status}`;
        }
        
        throw new Error(`Error al eliminar imagen: ${errorDetail}`);
      }

      // Actualizar la vista del formulario para permitir subir una nueva imagen
      setFormData(prev => ({
        ...prev,
        imagen: null,
        imagenPreview: null
      }));

      // Actualizar el producto específico en el estado
      const updatedProduct = await fetchProductById(productId);
      if (updatedProduct) {
        // Asegurar explícitamente que TODAS las propiedades relacionadas con la imagen sean nulas
        updateProductInState({
          ...updatedProduct,
          hasImage: false,
          imageUrl: null,
          imagenInfo: null
        });
      }

      // Notificar éxito
      addNotification('Imagen eliminada correctamente', 'success');
      setDeleteImageDialogOpen(false);
      
      // Si el modal está abierto y es el mismo producto, actualizar la vista previa
      if (showModal && editingProduct && editingProduct._id === productId) {
        setFormData(prev => ({
          ...prev,
          imagen: null,
          imagenPreview: null
        }));
      }
      
      // Refrescar la lista de productos para mantener todo consistente
      fetchProducts(true, currentPage, itemsPerPage);
    } catch (error: any) {
      console.error('Error al eliminar la imagen:', error);
      addNotification(`Error al eliminar la imagen: ${error.message}`, 'error');
    } finally {
      setImageLoading(false);
    }
  };

  /**
   * Manejar subida de imagen después de crear/editar producto
   * @param productId - ID del producto
   */
  const handleImageUpload = async (productId: string): Promise<boolean> => {
    if (!formData.imagen) return true;

    try {
      setImageLoading(true);

      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Crear FormData para enviar la imagen
      const formDataObj = new FormData();
      formDataObj.append('imagen', formData.imagen);
      
      // Añadir registro para depuración
      console.log(`Subiendo imagen para producto ID: ${productId}`);

      const response = await fetch(`${API_URL}producto/${productId}/imagen`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataObj
      });

      if (!response.ok) {
        // Intentar obtener más detalles del error
        let errorDetail = '';
        try {
          const errorData = await response.json();
          errorDetail = errorData.message || errorData.error || '';
        } catch (e) {
          // Si no podemos parsear el error, usar el status
          errorDetail = `Error ${response.status}`;
        }
        
        throw new Error(`Error al subir imagen: ${errorDetail}`);
      }

      // Obtener la respuesta para verificar la URL de la imagen
      const imageResponse = await response.json();
      
      console.log('Respuesta del servidor:', imageResponse);
      
      // Actualizar el producto específico en el estado con la nueva imagen
      const updatedProduct = await fetchProductById(productId);
      if (updatedProduct) {
        // Asegurarnos de que las propiedades de imagen estén actualizadas
        updateProductInState({
          ...updatedProduct,
          hasImage: true,
          imageUrl: imageResponse.imageUrl || `${API_URL}images/products/${productId}.webp`
        });
      }

      addNotification('Imagen subida correctamente', 'success');
      return true;
    } catch (error: any) {
      console.error('Error al subir imagen:', error);
      addNotification(`Error al subir imagen: ${error.message}`, 'error');
      return false;
    } finally {
      setImageLoading(false);
    }
  };

  /**
   * Agregar un ítem al combo
   * @param product - Producto a agregar
   */
  const handleAddComboItem = (product: Product) => {
    // Verificar si ya existe
    const existingItem = tempSelectedItems.find(item =>
      typeof item.productoId === 'string'
        ? item.productoId === product._id
        : item.productoId._id === product._id
    );

    if (existingItem) {
      // Si ya existe, solo actualizar la cantidad
      setTempSelectedItems(prevItems =>
        prevItems.map(item => {
          const itemId = typeof item.productoId === 'string'
            ? item.productoId
            : item.productoId._id;

          return itemId === product._id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item;
        })
      );
    } else {
      // Si no existe, agregarlo
      setTempSelectedItems(prevItems => [
        ...prevItems,
        {
          productoId: product._id,
          nombre: product.nombre,
          cantidad: 1,
          precio: product.precio
        }
      ]);
    }
  };

  /**
   * Actualizar cantidad de un ítem en el combo
   * @param productId - ID del producto
   * @param newQuantity - Nueva cantidad
   */
  const handleUpdateComboItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      // Si la cantidad es 0 o menos, eliminar el ítem
      setTempSelectedItems(prevItems =>
        prevItems.filter(item => {
          const itemId = typeof item.productoId === 'string'
            ? item.productoId
            : item.productoId._id;
          return itemId !== productId;
        })
      );
    } else {
      // Actualizar la cantidad
      setTempSelectedItems(prevItems =>
        prevItems.map(item => {
          const itemId = typeof item.productoId === 'string'
            ? item.productoId
            : item.productoId._id;

          return itemId === productId
            ? { ...item, cantidad: newQuantity }
            : item;
        })
      );
    }
  };

  /**
   * Calcular precio total del combo
   * @param items - Items del combo
   */
  const calculateComboTotal = (items: ComboItemType[]) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((total, item) => {
      const precio = item.precio || 0;
      const cantidad = item.cantidad || 0;
      return total + (precio * cantidad);
    }, 0);
  };

  /**
   * Confirmar selección de ítems para el combo
   */
  const confirmComboSelection = () => {
    setSelectedComboItems(tempSelectedItems);
    setShowComboSelectionModal(false);

    // Actualizar el precio del combo automáticamente (suma de precios individuales)
    const comboTotal = calculateComboTotal(tempSelectedItems);
    setFormData(prev => ({
      ...prev,
      precio: comboTotal.toFixed(2)
    }));
  };

  /**
   * Abrir modal de selección de ítems para el combo
   */
  const openComboSelectionModal = () => {
    // Inicializar con los ítems ya seleccionados
    setTempSelectedItems(selectedComboItems);
    setComboSearchTerm('');
    setShowComboSelectionModal(true);
  };

  /**
   * Manejar envío del formulario (crear/editar)
   * @param e - Evento de formulario
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Validar que se haya seleccionado una categoría y subcategoría
      if (!formData.categoria) {
        throw new Error('Debe seleccionar una categoría');
      }

      if (!formData.subCategoria) {
        throw new Error('Debe seleccionar una subcategoría');
      }

      // Si es un combo, validar que tenga items y que haya stock suficiente
      if (isCombo) {
        if (selectedComboItems.length === 0) {
          throw new Error('Un combo debe tener al menos un producto');
        }

        const { valid, warnings } = validateComboStock(selectedComboItems);
        if (!valid) {
          throw new Error(`No hay suficiente stock para crear el combo: ${warnings.join(', ')}`);
        }
      }

      const url = editingProduct
        ? `${API_URL}producto/${editingProduct._id}`
        : `${API_URL}producto`;

      const method = editingProduct ? 'PUT' : 'POST';

      // Procesar el stock basado en si es adición o reemplazo
      let finalStock = parseInt(formData.stock || '0');

      // Si estamos editando y agregando stock, sumamos al stock existente
      if (editingProduct && isAddingStock) {
        finalStock = editingProduct.stock + finalStock;
      }

      // Datos básicos del producto
      const payload = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        categoria: formData.categoria,
        subCategoria: formData.subCategoria,
        marca: "", // Campo vacío como solicitado
        precio: Number(formData.precio),
        stock: finalStock,
        stockMinimo: Number(formData.stockMinimo),
        proveedor: {
          nombre: "",
          contacto: "",
          telefono: "",
          email: ""
        }, // Objeto proveedor con valores vacíos
        estado: "activo", // Valor por defecto
        // Si es combo, incluir los ítems del combo
        esCombo: isCombo,
        itemsCombo: isCombo ? selectedComboItems.map(item => ({
          productoId: typeof item.productoId === 'string' ? item.productoId : item.productoId._id,
          cantidad: item.cantidad
        })) : []
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.mensaje || 'Error al procesar la solicitud');
      }

      // Parsear la respuesta JSON
      let savedProduct: Product;
      try {
        savedProduct = await response.json();
      } catch (jsonError) {
        console.error("Error al parsear JSON:", jsonError);
        throw new Error('Error al procesar datos del producto guardado');
      }

      // Manejar la subida de imagen de manera unificada
      if (formData.imagen) {
        // Si tenemos un archivo, usar handleImageUpload mejorado
        const imageUploaded = await handleImageUpload(savedProduct._id);
        if (!imageUploaded) {
          console.log('Hubo un problema al subir la imagen, pero el producto se guardó correctamente');
        }
      } else if (formData.imagenPreview && typeof formData.imagenPreview === 'string' && formData.imagenPreview.startsWith('data:image')) {
        // Si tenemos una imagen en base64, convertir y usar el mismo método
        const imageUploaded = await handleImageUpload(savedProduct._id);
        if (!imageUploaded) {
          console.log('Hubo un problema al subir la imagen, pero el producto se guardó correctamente');
        }
      }

      setShowModal(false);
      resetForm();

      // Establecer explícitamente la página a 1 después de editar
      setCurrentPage(1);

      // Actualizar el producto específico en el estado o agregar si es nuevo
      if (editingProduct) {
        // Obtener la versión actualizada del producto
        const updatedProduct = await fetchProductById(savedProduct._id);
        if (updatedProduct) {
          updateProductInState(updatedProduct);
        }

        // Recargar productos para la página 1
        fetchProducts(true, 1, itemsPerPage);
      } else {
        // Añadir el nuevo producto al inicio de la lista o recargar todos
        setProducts(prevProducts => {
          // Asegurarnos de que prevProducts sea un array
          if (!Array.isArray(prevProducts)) return [savedProduct];
          return [savedProduct, ...prevProducts];
        });

        // Recargar productos para la página 1
        fetchProducts(true, 1, itemsPerPage);
      }

      // Notificar a otros componentes que deben actualizarse
      inventoryObservable.notify();

      // Actualizar contadores
      countLowStockProducts();
      countNoStockProducts();

      const successMsg = `Producto ${editingProduct ? 'actualizado' : 'creado'} correctamente`;
      setSuccessMessage(successMsg);

      addNotification(successMsg, 'success');

      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      const errorMsg = 'Error al guardar producto: ' + err.message;
      setError(errorMsg);

      addNotification(errorMsg, 'error');
    }
  };

  /**
   * Iniciar el proceso de eliminación mostrando el diálogo de confirmación
   * @param id - ID del producto a eliminar
   */
  const confirmDelete = (id: string) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  /**
   * Confirmar eliminación de imagen
   * @param id - ID del producto
   */
  const confirmDeleteImage = (id: string) => {
    setProductToDelete(id);
    setDeleteImageDialogOpen(true);
  };

  /**
   * Eliminar producto (después de confirmación)
   * @param id - ID del producto
   */
  const handleDelete = async (id: string) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${API_URL}producto/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.mensaje || 'Error al eliminar producto');
      }

      // Eliminar el producto del estado local
      setProducts(prevProducts => {
        if (!Array.isArray(prevProducts)) return [];
        return prevProducts.filter(product => product._id !== id);
      });

      // Actualizar contadores
      countLowStockProducts();
      countNoStockProducts();

      const successMsg = 'Producto eliminado correctamente';
      setSuccessMessage(successMsg);

      addNotification(successMsg, 'success');

      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      const errorMsg = 'Error al eliminar producto: ' + err.message;
      setError(errorMsg);

      addNotification(errorMsg, 'error');
    } finally {
      // Cerrar diálogo de confirmación
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  /**
   * Manejar cambio de categoría
   * @param value - Valor de la categoría seleccionada
   */
  const handleCategoryChange = (value: string) => {
    try {
      if (value === 'not-selected') {
        // Si se selecciona "Seleccionar categoría", limpiar categoría y subcategoría
        setFormData(prevState => ({
          ...prevState,
          categoria: '',
          subCategoria: ''
        }));
        return;
      }

      // Verificar si la categoría existe en subCategorias
      if (!subCategorias[value]) {
        console.error(`Categoría no válida: ${value}`);
        addNotification(`Error: Categoría '${value}' no válida`, 'error');
        return;
      }

      // Actualizar el estado con la nueva categoría y limpiar subcategoría
      setFormData(prevState => ({
        ...prevState,
        categoria: value,
        subCategoria: ''
      }));
    } catch (error) {
      console.error("Error al cambiar categoría:", error);
      addNotification("Error al cambiar categoría", 'error');
    }
  };

  /**
   * Función para renderizar indicador de stock
   * @param stock - Cantidad de stock
   * @param alertaStockBajo - Flag que indica si el stock es bajo
   */
  const renderStockIndicator = (stock: number, alertaStockBajo?: boolean) => {
    // Usar el flag alertaStockBajo del backend si está disponible
    const isLowStock = alertaStockBajo !== undefined
      ? alertaStockBajo
      : (stock <= LOW_STOCK_THRESHOLD && stock > 0);

    if (stock <= 0) {
      return (
        <div className="flex items-center gap-1">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            Sin stock
          </span>
        </div>
      );
    } else if (isLowStock) {
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

  // Obtener productos filtrados de manera segura
  const filteredProducts = getFilteredProducts();

  // Obtener productos disponibles para combos
  const comboProducts = getFilteredComboProducts();

  // Calcular el total de páginas
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  /**
   * Función para cambiar de página
   * @param pageNumber - Número de página
   */
  const handlePageChange = (pageNumber: number) => {
    // Actualizar el estado de la página actual
    setCurrentPage(pageNumber);

    // Volver a cargar los productos con la nueva página
    fetchProducts(true, pageNumber, itemsPerPage);

    // Al cambiar de página, hacemos scroll hacia arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Hacer scroll al inicio de la lista en móvil
    if (windowWidth < 768 && mobileListRef.current) {
      mobileListRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Comprobar si la página actual es mayor que el total de páginas
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  /**
   * Función para recargar manualmente los productos
   */
  const handleManualRefresh = () => {
    fetchProducts(true);
    countLowStockProducts();
    countNoStockProducts();
  };

  /**
   * Función para alternar mostrar solo productos con stock bajo
   */
  const toggleLowStockFilter = () => {
    // Si el filtro de sin stock está activo, lo desactivamos primero
    if (showNoStockOnly) {
      setShowNoStockOnly(false);
    }

    // Invertir el estado del filtro de stock bajo
    const newState = !showLowStockOnly;
    setShowLowStockOnly(newState);

    // Volver a la primera página al cambiar el filtro
    setCurrentPage(1);

    // Recargar productos con el filtro aplicado
    fetchProducts(true, 1, itemsPerPage);
  };

  /**
   * Función para alternar mostrar solo productos sin stock
   */
  const toggleNoStockFilter = () => {
    // Si el filtro de stock bajo está activo, lo desactivamos primero
    if (showLowStockOnly) {
      setShowLowStockOnly(false);
    }

    // Invertir el estado del filtro de sin stock
    const newState = !showNoStockOnly;
    setShowNoStockOnly(newState);

    // Volver a la primera página al cambiar el filtro
    setCurrentPage(1);

    // Recargar productos con el filtro aplicado
    fetchProducts(true, 1, itemsPerPage);
  };

  // Calcular valores para fines de visualización
  const indexOfLastProduct = currentPage * itemsPerPage;
  const indexOfFirstProduct = (currentPage - 1) * itemsPerPage + 1;

  // Mostrar información detallada sobre la paginación
  const showingFromTo = totalCount > 0
    ? `${indexOfFirstProduct}-${Math.min(indexOfLastProduct, totalCount)} de ${totalCount}`
    : '0 de 0';

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
              >
                Limpieza
              </TabsTrigger>
              <TabsTrigger
                value="mantenimiento"
                className="flex-1 data-[state=active]:bg-[#29696B] data-[state=active]:text-white"
              >
                Mantenimiento
              </TabsTrigger>
              <TabsTrigger
                value="combos"
                className="flex-1 data-[state=active]:bg-[#00888A] data-[state=active]:text-white"
              >
                Combos
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="w-full md:w-auto flex flex-wrap gap-2">
          {/* Botón para filtrar por stock bajo */}
          <Button
            onClick={toggleLowStockFilter}
            variant={showLowStockOnly ? "default" : "outline"}
            className={`
              relative 
              ${showLowStockOnly
                ? 'bg-yellow-500 hover:bg-yellow-600 border-yellow-500 text-white'
                : 'border-yellow-500 text-yellow-700 hover:bg-yellow-50'
              }
            `}
            disabled={isLowStockLoading}
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Stock bajo</span>
            {!isLowStockLoading && lowStockCount > 0 && !showLowStockOnly && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {lowStockCount > 99 ? '99+' : lowStockCount}
              </span>
            )}
            {isLowStockLoading && (
              <Loader2 className="w-4 h-4 ml-1 animate-spin" />
            )}
          </Button>

          {/* Botón para filtrar productos sin stock */}
          <Button
            onClick={toggleNoStockFilter}
            variant={showNoStockOnly ? "default" : "outline"}
            className={`
              relative 
              ${showNoStockOnly
                ? 'bg-red-500 hover:bg-red-600 border-red-500 text-white'
                : 'border-red-500 text-red-700 hover:bg-red-50'
              }
            `}
            disabled={isNoStockLoading}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Sin stock</span>
            {!isNoStockLoading && noStockCount > 0 && !showNoStockOnly && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {noStockCount > 99 ? '99+' : noStockCount}
              </span>
            )}
            {isNoStockLoading && (
              <Loader2 className="w-4 h-4 ml-1 animate-spin" />
            )}
          </Button>

          <Button
            onClick={handleManualRefresh}
            variant="outline"
            className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            disabled={loading || refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          <Button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Nuevo Producto</span>
            <span className="sm:hidden">Producto</span>
          </Button>

          <Button
            onClick={() => {
              resetForm();
              setIsCombo(true);
              setShowModal(true);
            }}
            className="bg-[#00888A] hover:bg-[#00888A]/90 text-white"
          >
            <PackagePlus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Nuevo Combo</span>
            <span className="sm:hidden">Combo</span>
          </Button>
        </div>
      </div>

      {/* Indicador de filtro activo */}
      {(showLowStockOnly || showNoStockOnly) && (
        <Alert className={`${showLowStockOnly ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-red-50 border-red-200 text-red-800'} rounded-lg`}>
          {showLowStockOnly ? (
            <>
              <HelpCircle className="h-4 w-4 text-yellow-600 mr-2" />
              <AlertDescription className="flex-1">
                Mostrando solo productos con stock bajo (≤ {LOW_STOCK_THRESHOLD} unidades)
                {totalCount > 0 && (
                  <span className="ml-2 font-medium">
                    Se encontraron {totalCount} productos con stock bajo.
                  </span>
                )}
              </AlertDescription>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLowStockFilter}
                className="ml-2 h-7 text-xs border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                Mostrar todos
              </Button>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
              <AlertDescription className="flex-1">
                Mostrando solo productos sin stock (0 unidades)
                {totalCount > 0 && (
                  <span className="ml-2 font-medium">
                    Se encontraron {totalCount} productos sin stock.
                  </span>
                )}
              </AlertDescription>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleNoStockFilter}
                className="ml-2 h-7 text-xs border-red-300 text-red-700 hover:bg-red-100"
              >
                Mostrar todos
              </Button>
            </>
          )}
        </Alert>
      )}
      {/* Indicador de carga */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-[#91BEAD]/20">
          <div className="inline-flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#29696B] animate-spin mr-2" />
            <p className="text-[#29696B]">Cargando productos...</p>
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay productos */}
      {!loading && totalCount === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-[#91BEAD]/20">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
            <Search className="w-6 h-6 text-[#29696B]" />
          </div>
          <p className="text-[#7AA79C]">
            {searchTerm || selectedCategory !== 'all' || showLowStockOnly || showNoStockOnly
              ? 'No se encontraron productos que coincidan con la búsqueda'
              : 'No hay productos disponibles'}
          </p>
        </div>
      )}

      {/* Contador de resultados con información detallada */}
      {!loading && filteredProducts.length > 0 && (
        <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm text-[#29696B] flex flex-col sm:flex-row sm:justify-between items-center">
          <span>
            Total: {totalCount} {totalCount === 1 ? 'producto' : 'productos'}
          </span>
          <span className="text-[#29696B] font-medium">
            Mostrando: {showingFromTo}
          </span>
        </div>
      )}

      {/* Tabla para pantallas medianas y grandes */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-[#91BEAD]/20">
        {!loading && currentProducts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#DFEFE6]/50 border-b border-[#91BEAD]/20">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                    Categoría/Subcategoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#29696B] uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#91BEAD]/20">
                {products.map((product) => (
                  <tr
                    key={product._id}
                    className={`hover:bg-[#DFEFE6]/20 transition-colors ${product.stock > 0 && product.alertaStockBajo
                      ? 'bg-yellow-50 hover:bg-yellow-100'
                      : product.stock <= 0
                        ? 'bg-red-50 hover:bg-red-100'
                        : ''
                      }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <ProductImage 
                          product={product} 
                          size="small" 
                          className="mr-3" 
                        />
                        <div className="min-w-0 max-w-[200px]">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-[#29696B] truncate">
                              {product.nombre}
                            </div>
                            {product.esCombo && (
                              <Badge variant="outline" className="ml-2 bg-[#00888A]/10 border-[#00888A] text-[#00888A] text-xs">
                                Combo
                              </Badge>
                            )}
                            {hasProductImage(product) && (
                              <div className="ml-2 w-2 h-2 rounded-full bg-blue-500" title="Tiene imagen"></div>
                            )}
                          </div>
                          {product.descripcion && (
                            <div className="text-sm text-[#7AA79C] truncate">
                              {product.descripcion}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#7AA79C]">
                      <Badge variant="outline" className="capitalize border-[#91BEAD] text-[#29696B]">
                        {product.esCombo ? 'Combo' : product.categoria}
                      </Badge>
                      <div className="text-xs mt-1 capitalize text-[#7AA79C]">{product.subCategoria}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[#29696B]">
                      ${product.precio.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {renderStockIndicator(product.stock, product.alertaStockBajo)}
                      {product.stockMinimo && product.stockMinimo > 0 && (
                        <div className="text-xs text-[#7AA79C] mt-1">
                          Mínimo: {product.stockMinimo} unidades
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {/* Botón específico para gestionar imagen (solo aparece si hay imagen) */}
                        <ImageActionButton
                          product={product}
                          onEdit={() => handleEditImage(product)}
                          onDelete={() => confirmDeleteImage(product._id)}
                          className="mr-1"
                        />
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(product)}
                          className="text-[#29696B] hover:text-[#29696B] hover:bg-[#DFEFE6]"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDelete(product._id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalCount > itemsPerPage && (
          <div className="py-4 border-t border-[#91BEAD]/20">
            <EnhancedPagination
              totalItems={totalCount}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              className="px-6"
            />
          </div>
        )}
      </div>

      {/* Vista de Tarjetas para dispositivos móviles */}
      <div ref={mobileListRef} id="mobile-products-list" className="md:hidden grid grid-cols-1 gap-4">
        {/* Paginación visible en la parte superior para móvil */}
        {!loading && totalCount > itemsPerPage && (
          <div className="py-4 border-t border-[#91BEAD]/20">
            <EnhancedPagination
              totalItems={totalCount}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={handlePageChange}
            />
          </div>
        )}

        {!loading && currentProducts.map(product => (
          <Card
            key={product._id}
            className={`overflow-hidden shadow-sm border ${product.stock > 0 && product.alertaStockBajo
              ? 'border-yellow-300 bg-yellow-50'
              : product.stock <= 0
                ? 'border-red-300 bg-red-50'
                : product.esCombo
                  ? 'border-[#00888A]/50 bg-[#00888A]/5'
                  : 'border-[#91BEAD]/20 bg-white'
              }`}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-base truncate mr-2 text-[#29696B] max-w-[200px]">{product.nombre}</CardTitle>
                  {product.esCombo && (
                    <Badge variant="outline" className="bg-[#00888A]/10 border-[#00888A] text-[#00888A] text-xs">
                      Combo
                    </Badge>
                  )}
                  {hasProductImage(product) && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" title="Tiene imagen"></div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 pb-3">
              <div className="flex gap-4 mb-3">
                <ProductImage 
                  product={product} 
                  size="medium" 
                  className="flex-shrink-0"
                />
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
                      <span className={`font-medium ${product.stock <= 0
                        ? 'text-red-600'
                        : product.alertaStockBajo
                          ? 'text-yellow-600 flex items-center gap-1'
                          : 'text-[#29696B]'
                        }`}>
                        {product.alertaStockBajo && product.stock > 0 && (
                          <AlertTriangle className="w-3 h-3 text-yellow-500 animate-pulse" />
                        )}
                        {product.stock <= 0 ? 'Sin stock' : `${product.stock} unid.`}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-[#7AA79C]">
                    <div className="flex justify-between">
                      <span className="block">
                        <Badge variant="outline" className="capitalize text-xs border-[#91BEAD] text-[#29696B]">
                          {product.esCombo ? 'Combo' : product.categoria}
                        </Badge>
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-1">
                      <span className="capitalize">{product.subCategoria}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mostrar elementos del combo si es un combo */}
              {product.esCombo && product.itemsCombo && product.itemsCombo.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#91BEAD]/10">
                  <p className="text-xs font-medium text-[#29696B] mb-1">Productos en el combo:</p>
                  <div className="text-xs text-[#7AA79C] max-h-24 overflow-y-auto pr-1">
                    {product.itemsCombo.map((item, index) => {
                       const productoNombre = item.productoId && typeof item.productoId === 'object'
                         ? item.productoId.nombre
                         : 'Producto';

                     return (
                       <div key={index} className="flex justify-between py-1 border-b border-[#91BEAD]/10 last:border-0">
                         <span>{productoNombre}</span>
                         <span>x{item.cantidad}</span>
                       </div>
                     );
                   })}
                 </div>
               </div>
             )}
           </CardContent>
           <CardFooter className="p-2 flex justify-end gap-2 bg-[#DFEFE6]/20 border-t border-[#91BEAD]/10">
             {/* Botón específico para gestionar imagen (solo aparece si hay imagen) */}
             <ImageActionButton
               product={product}
               onEdit={() => handleEditImage(product)}
               onDelete={() => confirmDeleteImage(product._id)}
               size="md"
             />
             
             <Button
               variant="ghost"
               size="sm"
               onClick={() => handleEdit(product)}
               className="text-[#29696B] hover:bg-[#DFEFE6]"
             >
               <Edit className="w-4 h-4" />
             </Button>
             
             <Button
               variant="ghost"
               size="sm"
               onClick={() => confirmDelete(product._id)}
               className="text-red-600 hover:text-red-800 hover:bg-red-50"
             >
               <Trash2 className="w-4 h-4" />
             </Button>
           </CardFooter>
         </Card>
       ))}

       {/* Mensaje que muestra la página actual y el total */}
       {!loading && totalCount > itemsPerPage && (
         <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm">
           <span className="text-[#29696B] font-medium">
             Página {currentPage} de {totalPages}
           </span>
         </div>
       )}

       {/* Paginación duplicada al final de la lista para mayor visibilidad */}
       {!loading && totalCount > itemsPerPage && (
         <div className="py-4 border-t border-[#91BEAD]/20">
           <EnhancedPagination
             totalItems={totalCount}
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
           <DialogTitle className="text-[#29696B] flex items-center">
             {editingProduct ? 'Editar Producto' : (isCombo ? 'Nuevo Combo' : 'Nuevo Producto')}
             {isCombo && (
               <Badge className="ml-2 bg-[#00888A]/10 border-[#00888A] text-[#00888A]">
                 Combo
               </Badge>
             )}
           </DialogTitle>
           <DialogDescription>
             {isCombo ? 'Los combos son agrupaciones de productos individuales' : 'Complete la información del producto'}
           </DialogDescription>
         </DialogHeader>

         <form onSubmit={handleSubmit} className="space-y-4 py-2">
           <div className="grid gap-3">
             {/* Checkbox para marcar como combo */}
             {!editingProduct && (
               <div className="flex items-center space-x-2">
                 <Checkbox
                   id="is-combo"
                   checked={isCombo}
                   onCheckedChange={(checked) => {
                     setIsCombo(!!checked);
                     if (!checked) {
                       setSelectedComboItems([]);
                     }
                   }}
                 />
                 <label
                   htmlFor="is-combo"
                   className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-[#29696B]"
                 >
                   Este producto es un combo
                 </label>
               </div>
             )}

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
                   value={formData.categoria || 'not-selected'}
                   onValueChange={(value) => {
                     handleCategoryChange(value);
                   }}
                 >
                   <SelectTrigger id="categoria" className="mt-1 border-[#91BEAD] focus:ring-[#29696B]/20">
                     <SelectValue placeholder="Seleccionar categoría" />
                   </SelectTrigger>
                   <SelectContent className="border-[#91BEAD]">
                     <SelectItem value="not-selected">Seleccionar categoría</SelectItem>
                     <SelectItem value="limpieza">Limpieza</SelectItem>
                     <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                   </SelectContent>
                 </Select>
               </div>

               <div>
                 <Label htmlFor="subCategoria" className="text-sm text-[#29696B]">Subcategoría</Label>
                 <Select
                   value={formData.subCategoria || 'not-selected'}
                   onValueChange={(value) => {
                     if (value !== 'not-selected') {
                       setFormData(prevState => ({
                         ...prevState,
                         subCategoria: value
                       }));
                     }
                   }}
                   disabled={!formData.categoria}
                 >
                   <SelectTrigger id="subCategoria" className="mt-1 border-[#91BEAD] focus:ring-[#29696B]/20">
                     <SelectValue placeholder="Seleccionar subcategoría" />
                   </SelectTrigger>
                   <SelectContent className="border-[#91BEAD]">
                     <SelectItem value="not-selected">Seleccionar subcategoría</SelectItem>
                     {formData.categoria && subCategorias[formData.categoria]?.map((sub) => (
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
                   readOnly={isCombo} /* Campo de precio de solo lectura para combos */
                   disabled={isCombo} /* Deshabilitado visualmente para combos */
                 />
                 {isCombo && (
                   <p className="text-xs text-[#7AA79C] mt-1">
                     Precio calculado automáticamente de los productos seleccionados
                   </p>
                 )}
               </div>

               <div>
               <Label htmlFor="stock" className="text-sm text-[#29696B]">
                   {editingProduct
                     ? (isAddingStock ? "Agregar al stock" : "Stock")
                     : "Stock"}
                 </Label>
                 {editingProduct && (
                   <div className="mb-2 px-1">
                     <div className="flex items-center gap-2 bg-[#DFEFE6]/30 p-2 rounded-md border border-[#91BEAD]/30">
                       <Checkbox
                         id="stock-checkbox"
                         checked={isAddingStock}
                         onCheckedChange={(checked) => setIsAddingStock(!!checked)}
                       />
                       <label
                         htmlFor="stock-checkbox"
                         className="text-sm text-[#29696B] cursor-pointer font-medium"
                       >
                         Añadir al stock existente
                       </label>
                     </div>
                   </div>
                 )}

                 {/* Input directo como el de precio */}
                 <Input
                   id="stock"
                   type="number"
                   min="0"
                   value={formData.stock}
                   onChange={(e) => {
                     // Usar la misma estructura exacta que el campo de precio
                     setFormData({ ...formData, stock: e.target.value });
                   }}
                   required
                   className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
                 />

                 {/* Información adicional */}
                 {isAddingStock && editingProduct && (
                   <div className="mt-1 text-xs text-[#29696B] bg-[#DFEFE6]/20 p-2 rounded border border-[#91BEAD]/30">
                     <span className="font-medium">Stock actual:</span> {editingProduct.stock} unidades
                     <span className="mx-1">→</span>
                     <span className="font-medium">Stock final:</span> {editingProduct.stock + parseInt(formData.stock || '0')} unidades
                   </div>
                 )}

                 <p className="text-xs text-[#7AA79C]">
                   Máximo: {(999999999).toLocaleString()}
                 </p>
               </div>
             </div>

             {/* Campo de stock mínimo */}
             <div>
               <Label htmlFor="stockMinimo" className="text-sm text-[#29696B]">Stock Mínimo</Label>
               <Input
                 id="stockMinimo"
                 type="number"
                 min="0"
                 value={formData.stockMinimo}
                 onChange={(e) => setFormData({ ...formData, stockMinimo: e.target.value })}
                 className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
               />
               <p className="text-xs text-[#7AA79C] mt-1">
                 El sistema alertará cuando el stock sea igual o menor a este valor
               </p>
             </div>

             {/* Sección de selección de productos para el combo */}
             {isCombo && (
               <div className="mt-4 border rounded-md p-3 border-[#91BEAD]/30 bg-[#DFEFE6]/10">
                 <div className="flex items-center justify-between mb-2">
                   <Label className="text-sm font-medium text-[#29696B]">Productos en el combo</Label>
                   <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={openComboSelectionModal}
                     className="text-xs h-8 border-[#00888A] text-[#00888A] hover:bg-[#00888A]/10"
                   >
                     <ShoppingBag className="w-3 h-3 mr-1" />
                     Seleccionar productos
                   </Button>
                 </div>

                 {selectedComboItems.length === 0 ? (
                   <div className="text-center py-4 text-sm text-[#7AA79C]">
                     <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-[#7AA79C]/50" />
                     <p>No hay productos seleccionados</p>
                     <p className="text-xs">Haga clic en "Seleccionar productos" para agregar elementos al combo</p>
                   </div>
                 ) : (
                   <div className="space-y-2">
                     <div className="text-xs text-[#7AA79C] grid grid-cols-5 py-1 font-medium">
                       <div className="col-span-2 pl-2">Producto</div>
                       <div className="text-center">Precio</div>
                       <div className="text-center">Cant.</div>
                       <div className="text-right pr-2">Subtotal</div>
                     </div>
                     <div className="max-h-40 overflow-y-auto pr-1">
                       {selectedComboItems.map((item, index) => (
                         <div key={index} className="text-sm text-[#29696B] grid grid-cols-5 py-2 border-b border-[#91BEAD]/10 last:border-0 items-center">
                           <div className="col-span-2 truncate pl-2">{item.nombre}</div>
                           <div className="text-center">${(item.precio || 0).toFixed(2)}</div>
                           <div className="text-center">{item.cantidad}</div>
                           <div className="text-right font-medium pr-2">${((item.precio || 0) * item.cantidad).toFixed(2)}</div>
                         </div>
                       ))}
                     </div>
                     <div className="pt-2 flex justify-between text-sm font-medium text-[#29696B]">
                       <span>Precio total de los productos:</span>
                       <span>${calculateComboTotal(selectedComboItems).toFixed(2)}</span>
                     </div>

                     {/* Alertas de stock para combos */}
                     {stockWarnings.length > 0 && (
                       <div className="mt-2 bg-yellow-50 border border-yellow-300 rounded-md p-2">
                         <p className="text-xs font-medium text-yellow-800 mb-1">
                           Advertencias de disponibilidad:
                         </p>
                         <ul className="text-xs text-yellow-700 list-disc pl-4 space-y-1">
                           {stockWarnings.map((warning, index) => (
                             <li key={index}>{warning}</li>
                           ))}
                         </ul>
                       </div>
                     )}
                   </div>
                 )}
               </div>
             )}

             {/* Campo de imagen */}
             <div data-image-section>
               <Label className="text-sm text-[#29696B] block mb-2">Imagen del Producto</Label>

               {/* Componente mejorado de subida de imágenes */}
               {editingProduct ? (
                 <div className="mt-1 flex flex-col space-y-2">
                   {formData.imagenPreview ? (
                     <div className="relative w-full h-32 bg-[#DFEFE6]/20 rounded-md overflow-hidden border border-[#91BEAD]/30">
                       {typeof formData.imagenPreview === 'string' && (
                         <img
                           src={formData.imagenPreview}
                           alt="Vista previa"
                           className="w-full h-full object-contain"
                           onError={(e) => {
                             console.log("Error al cargar imagen de vista previa", e);
                             const target = e.target as HTMLImageElement;
                             target.src = "/lyme.png";
                             target.className = "w-full h-full object-contain p-4";
                           }}
                         />
                       )}

                       <Button
                         type="button"
                         variant="destructive"
                         size="sm"
                         onClick={() => confirmDeleteImage(editingProduct._id)}
                         className="absolute top-2 right-2 h-8 w-8 p-0 bg-red-500 hover:bg-red-600"
                       >
                         <X className="h-4 w-4" />
                       </Button>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center justify-center w-full">
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
               ) : (
                 <div className="flex items-center justify-center w-full">
                   {formData.imagenPreview ? (
                     <div className="relative w-full h-32 bg-[#DFEFE6]/20 rounded-md overflow-hidden border border-[#91BEAD]/30">
                       <img
                         src={formData.imagenPreview as string}
                         alt="Vista previa"
                         className="w-full h-full object-contain"
                         onError={(e) => {
                           console.log("Error al cargar imagen de vista previa (nuevo)", e);
                           const target = e.target as HTMLImageElement;
                           target.src = "/lyme.png";
                           target.className = "w-full h-full object-contain p-4";
                         }}
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
               className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30">
               Cancelar
             </Button>
             <Button
               type="submit"
               className={`${isCombo ? 'bg-[#00888A] hover:bg-[#00888A]/90' : 'bg-[#29696B] hover:bg-[#29696B]/90'} text-white`}
               disabled={imageLoading || (isCombo && selectedComboItems.length === 0) || !formData.categoria || !formData.subCategoria || hasStockIssues}
             >
               {imageLoading ? (
                 <>
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   Procesando imagen...
                 </>
               ) : (
                 editingProduct ? 'Guardar Cambios' : (isCombo ? 'Crear Combo' : 'Crear Producto')
               )}
             </Button>
           </DialogFooter>
         </form>
       </DialogContent>
     </Dialog>

     {/* Modal de selección de productos para el combo - Mejorado para responsividad */}
     <Dialog open={showComboSelectionModal} onOpenChange={setShowComboSelectionModal}>
       <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-auto">
         <DialogHeader>
           <DialogTitle className="text-[#29696B]">Seleccionar productos para el combo</DialogTitle>
           <DialogDescription>
             Agregue los productos que formarán parte del combo.
           </DialogDescription>
         </DialogHeader>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Panel izquierdo: Lista de productos disponibles */}
           <div className="space-y-4">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
               <Input
                 type="text"
                 placeholder="Buscar productos..."
                 value={comboSearchTerm}
                 onChange={(e) => setComboSearchTerm(e.target.value)}
                 className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
               />
             </div>

             <div className="border rounded-md border-[#91BEAD]/30">
               <div className="bg-[#DFEFE6]/30 p-3 text-[#29696B] font-medium text-sm">
                 Productos disponibles
               </div>
               <div className="max-h-[300px] overflow-y-auto">
                 <div className="divide-y divide-[#91BEAD]/20">
                   {comboProducts.length === 0 ? (
                     <div className="p-4 text-center text-[#7AA79C]">
                       No hay productos disponibles
                     </div>
                   ) : (
                     comboProducts.map((product) => (
                       <div key={product._id} className="p-3 flex justify-between items-center hover:bg-[#DFEFE6]/20">
                         <div className="flex-1 min-w-0">
                           <div className="font-medium text-sm text-[#29696B] truncate">{product.nombre}</div>
                           <div className="text-xs text-[#7AA79C] flex items-center gap-1 mt-1">
                             <span>${product.precio.toFixed(2)}</span>
                             <span>•</span>
                             <span className={`inline-flex px-1 py-0.5 text-xs rounded-full ${product.stock <= 0
                               ? 'bg-red-100 text-red-800'
                               : product.alertaStockBajo
                                 ? 'bg-yellow-100 text-yellow-800'
                                 : 'bg-[#DFEFE6] text-[#29696B]'
                               }`}>
                               Stock: {product.stock}
                             </span>
                           </div>
                         </div>
                         <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           onClick={() => handleAddComboItem(product)}
                           className="h-8 text-[#29696B] border-[#91BEAD] hover:bg-[#DFEFE6]/30 whitespace-nowrap ml-2"
                           disabled={product.stock <= 0}
                         >
                           <Plus className="w-3 h-3 mr-1" />
                           Agregar
                         </Button>
                       </div>
                     ))
                   )}
                 </div>
               </div>
             </div>
           </div>

           {/* Panel derecho: Productos seleccionados */}
           <div className="space-y-4">
             <div>
               <h4 className="font-medium text-[#29696B] mb-2">Productos seleccionados</h4>
               {tempSelectedItems.length === 0 ? (
                 <div className="text-center py-6 text-sm text-[#7AA79C] border rounded-md border-[#91BEAD]/30">
                   No hay productos seleccionados
                 </div>
               ) : (
                 <div className="border rounded-md border-[#91BEAD]/30">
                   <div className="bg-[#DFEFE6]/30 p-3 text-[#29696B] font-medium text-sm">
                     Lista de productos para el combo
                   </div>
                   <div className="max-h-[300px] overflow-y-auto">
                     <div className="divide-y divide-[#91BEAD]/20">
                       {tempSelectedItems.map((item, index) => (
                         <div key={index} className="p-3">
                           <div className="flex justify-between items-center mb-2">
                             <div className="font-medium text-sm text-[#29696B] truncate max-w-[200px]">
                               {item.nombre}
                               {stockWarnings.some(w => w.includes(item.nombre)) && (
                                 <span className="ml-2">
                                   <AlertTriangle className="inline-block w-4 h-4 text-yellow-500" />
                                 </span>
                               )}
                             </div>
                             <Button
                               type="button"
                               variant="ghost"
                               size="sm"
                               onClick={() => handleUpdateComboItemQuantity(
                                 typeof item.productoId === 'string' ? item.productoId : item.productoId._id,
                                 0
                               )}
                               className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           </div>
                           <div className="flex justify-between items-center">
                             <div className="text-xs text-[#7AA79C]">
                               <span>${(item.precio || 0).toFixed(2)} x {item.cantidad}</span>
                               <span className="ml-2 text-[#29696B] font-medium">= ${((item.precio || 0) * item.cantidad).toFixed(2)}</span>
                             </div>
                             <div className="flex items-center border rounded border-[#91BEAD]">
                               <Button
                                 type="button"
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handleUpdateComboItemQuantity(
                                   typeof item.productoId === 'string' ? item.productoId : item.productoId._id,
                                   item.cantidad - 1
                                 )}
                                 className="h-7 w-7 p-0 text-[#29696B] hover:bg-[#DFEFE6]/30"
                               >
                                 <Minus className="w-3 h-3" />
                               </Button>
                               <span className="w-8 text-center text-sm">{item.cantidad}</span>
                               <Button
                                 type="button"
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handleUpdateComboItemQuantity(
                                   typeof item.productoId === 'string' ? item.productoId : item.productoId._id,
                                   item.cantidad + 1
                                 )}
                                 className="h-7 w-7 p-0 text-[#29696B] hover:bg-[#DFEFE6]/30"
                               >
                                 <Plus className="w-3 h-3" />
                               </Button>
                             </div>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                   <div className="p-3 border-t border-[#91BEAD]/20 bg-[#DFEFE6]/20">
                     <div className="flex justify-between items-center font-medium text-[#29696B]">
                       <span>Total:</span>
                       <span>${calculateComboTotal(tempSelectedItems).toFixed(2)}</span>
                     </div>

                     {/* Alertas de stock para combos */}
                     {stockWarnings.length > 0 && (
                       <div className="mt-2 bg-yellow-50 border border-yellow-300 rounded-md p-2">
                         <p className="text-xs font-medium text-yellow-800 mb-1">
                           Advertencias de disponibilidad:
                         </p>
                         <ul className="text-xs text-yellow-700 list-disc pl-4 space-y-1">
                           {stockWarnings.map((warning, index) => (
                             <li key={index}>{warning}</li>
                           ))}
                         </ul>
                       </div>
                     )}
                   </div>
                 </div>
               )}
             </div>
           </div>
         </div>

         <DialogFooter className="gap-2 mt-4">
           <Button
             type="button"
             variant="outline"
             onClick={() => setShowComboSelectionModal(false)}
             className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
           >
             Cancelar
           </Button>
           <Button
             type="button"
             onClick={confirmComboSelection}
             className="bg-[#00888A] hover:bg-[#00888A]/90 text-white"
             disabled={tempSelectedItems.length === 0 || hasStockIssues}
           >
             Confirmar selección
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

     {/* Botones flotantes para filtros en móviles */}
     {!loading && (lowStockCount > 0 || noStockCount > 0) && !showLowStockOnly && !showNoStockOnly && windowWidth < 768 && (
       <div className="fixed bottom-6 right-6 z-10 flex flex-col gap-2">
         <TooltipProvider>
           {lowStockCount > 0 && (
             <Tooltip>
               <TooltipTrigger asChild>
                 <Button
                   onClick={toggleLowStockFilter}
                   className="rounded-full h-14 w-14 shadow-lg bg-yellow-500 hover:bg-yellow-600 text-white"
                 >
                   <div className="relative">
                     <HelpCircle className="h-6 w-6" />
                     <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                       {lowStockCount > 99 ? '99+' : lowStockCount}
                     </span>
                   </div>
                 </Button>
               </TooltipTrigger>
               <TooltipContent side="left">
                 <p>Hay {lowStockCount} productos con stock bajo</p>
                 <p className="text-xs">Toca para ver solo estos productos</p>
               </TooltipContent>
             </Tooltip>
           )}

           {noStockCount > 0 && (
             <Tooltip>
               <TooltipTrigger asChild>
                 <Button
                   onClick={toggleNoStockFilter}
                   className="rounded-full h-14 w-14 shadow-lg bg-red-500 hover:bg-red-600 text-white"
                 >
                   <div className="relative">
                     <AlertCircle className="h-6 w-6" />
                     <span className="absolute -top-2 -right-2 bg-white text-red-500 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                       {noStockCount > 99 ? '99+' : noStockCount}
                     </span>
                   </div>
                 </Button>
               </TooltipTrigger>
               <TooltipContent side="left">
                 <p>Hay {noStockCount} productos sin stock</p>
                 <p className="text-xs">Toca para ver solo estos productos</p>
               </TooltipContent>
             </Tooltip>
           )}
         </TooltipProvider>
       </div>
     )}
   </div>
);
};

export default InventorySection;