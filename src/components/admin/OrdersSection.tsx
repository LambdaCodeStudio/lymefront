// OrdersSection.tsx - VERSIÓN OPTIMIZADA
// Cambios principales implementados:
// 1. Sistema de caché persistente usando localStorage
// 2. Carga en lotes de detalles de productos
// 3. Prefetching inteligente
// 4. Reducción de solicitudes redundantes
// 5. Optimización de filtros usando el backend directamente

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNotification } from '@/context/NotificationContext';
import {
  Plus,
  Search,
  FileEdit,
  Trash2,
  Loader2,
  AlertCircle,
  CalendarRange,
  Filter,
  ShoppingCart,
  Building,
  MapPin,
  Check,
  X,
  Eye,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  DollarSign,
  Hash,
  Download,
  RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Pagination from "@/components/ui/pagination";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
// Importamos la función de actualización del inventario
import { refreshInventory, getAuthToken } from '@/utils/inventoryUtils';

// Tipos
interface User {
  _id: string;
  id?: string;
  email: string;
  nombre?: string;
  apellido?: string;
  role: string;
}

interface Client {
  _id: string;
  servicio: string;
  seccionDelServicio: string;
  userId: string;
}

interface Product {
  _id: string;
  nombre: string;
  precio: number;
  stock: number;
  categoria: string;
  subCategoria: string;
  esCombo?: boolean;
  hasImage?: boolean;
}

interface OrderProduct {
  productoId: string | { _id: string; [key: string]: any };
  cantidad: number;
  nombre?: string;
  precio?: number;
}

interface Order {
  _id: string;
  nPedido: number;
  servicio: string;
  seccionDelServicio: string;
  userId: string | User;
  fecha: string;
  productos: OrderProduct[];
  detalle?: string;
}

interface CreateOrderData {
  servicio: string;
  seccionDelServicio: string;
  userId: string;
  productos: OrderProduct[];
  detalle?: string;
}

// Cache constants
const CACHE_KEYS = {
  PRODUCTS: 'lyme_products_cache',
  USERS: 'lyme_users_cache',
  CLIENTS: 'lyme_clients_cache',
  CURRENT_USER: 'lyme_current_user',
  LAST_PRODUCTS_FETCH: 'lyme_last_products_fetch',
  LAST_USERS_FETCH: 'lyme_last_users_fetch',
  LAST_CLIENTS_FETCH: 'lyme_last_clients_fetch'
};

// Cache expiration times (in milliseconds)
const CACHE_EXPIRATION = {
  PRODUCTS: 15 * 60 * 1000, // 15 minutes
  USERS: 30 * 60 * 1000, // 30 minutes
  CLIENTS: 30 * 60 * 1000, // 30 minutes
  CURRENT_USER: 60 * 60 * 1000 // 1 hour
};

// Utility functions for cache management
const CacheManager = {
  // Store data in cache with timestamp
  set: (key, data) => {
    try {
      const cacheItem = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(cacheItem));
      return true;
    } catch (error) {
      console.error(`Error storing cache for ${key}:`, error);
      return false;
    }
  },

  // Get data from cache if not expired
  get: (key, expirationTime = 0) => {
    try {
      const cachedItem = localStorage.getItem(key);
      if (!cachedItem) return null;

      const { data, timestamp } = JSON.parse(cachedItem);
      const now = Date.now();

      // Return null if expired
      if (expirationTime > 0 && now - timestamp > expirationTime) {
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Error retrieving cache for ${key}:`, error);
      return null;
    }
  },

  // Remove item from cache
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing cache for ${key}:`, error);
      return false;
    }
  },

  // Check if cache is expired
  isExpired: (key, expirationTime) => {
    try {
      const cachedItem = localStorage.getItem(key);
      if (!cachedItem) return true;

      const { timestamp } = JSON.parse(cachedItem);
      const now = Date.now();

      return now - timestamp > expirationTime;
    } catch (error) {
      console.error(`Error checking expiration for ${key}:`, error);
      return true;
    }
  }
};

// Componente ProductDetail mejorado con mejor manejo de caché
const ProductDetail = ({ item, cachedProducts, products, getProductDetails }) => {
  const [productName, setProductName] = useState("Cargando...");
  const [productPrice, setProductPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    // Función para cargar detalles del producto con gestión de cancelación
    const fetchProductDetails = async () => {
      if (!mountedRef.current) return;
      setIsLoading(true);
      
      try {
        // Extraer el ID del producto de manera segura
        const productId = typeof item.productoId === 'object' && item.productoId && item.productoId._id 
          ? item.productoId._id 
          : typeof item.productoId === 'string' 
            ? item.productoId 
            : null;
            
        if (!productId) {
          if (mountedRef.current) {
            setProductName("ID de producto inválido");
            setProductPrice(0);
            setIsLoading(false);
          }
          return;
        }
        
        // Si ya tenemos nombre y precio en el item, usarlos
        if (item.nombre && typeof item.precio === 'number') {
          if (mountedRef.current) {
            setProductName(item.nombre);
            setProductPrice(item.precio);
            setIsLoading(false);
          }
          return;
        }

        // Si el producto está en caché, usar esa información
        if (cachedProducts[productId]) {
          if (mountedRef.current) {
            setProductName(cachedProducts[productId].nombre);
            setProductPrice(cachedProducts[productId].precio);
            setIsLoading(false);
          }
          return;
        }

        // Si el producto está en la lista de productos, usar esa información
        const localProduct = products.find((p) => p._id === productId);
        if (localProduct) {
          if (mountedRef.current) {
            setProductName(localProduct.nombre);
            setProductPrice(localProduct.precio);
            setIsLoading(false);
          }
          return;
        }

        // Si no tenemos la información, obtenerla del servidor
        const productDetails = await getProductDetails(productId);
        if (productDetails && mountedRef.current) {
          setProductName(productDetails.nombre);
          setProductPrice(productDetails.precio);
        } else if (mountedRef.current) {
          setProductName("Producto no encontrado");
          setProductPrice(0);
        }
      } catch (error) {
        console.error("Error al cargar detalles del producto:", error);
        if (mountedRef.current) {
          setProductName("Error al cargar");
          setProductPrice(0);
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchProductDetails();

    // Cleanup function to prevent memory leaks and state updates after unmount
    return () => {
      mountedRef.current = false;
    };
  }, [item, cachedProducts, products, getProductDetails]);

  // Mostrar un indicador de carga mientras se obtienen los datos
  if (isLoading) {
    return (
      <>
        <td className="px-4 py-2 text-sm text-[#7AA79C]">Cargando...</td>
        <td className="px-4 py-2 text-sm text-[#7AA79C]">{item.cantidad}</td>
        <td className="px-4 py-2 text-sm text-[#7AA79C]">$0.00</td>
        <td className="px-4 py-2 text-sm font-medium text-[#7AA79C]">$0.00</td>
      </>
    );
  }

  return (
    <>
      <td className="px-4 py-2 text-sm text-[#29696B]">{productName}</td>
      <td className="px-4 py-2 text-sm text-[#7AA79C]">{item.cantidad}</td>
      <td className="px-4 py-2 text-sm text-[#7AA79C]">${productPrice.toFixed(2)}</td>
      <td className="px-4 py-2 text-sm font-medium text-[#29696B]">
        ${(productPrice * item.cantidad).toFixed(2)}
      </td>
    </>
  );
};

// Componente ProductDetailCard para visualización móvil
const ProductDetailCard = ({ item, cachedProducts, products, getProductDetails }) => {
  const [productName, setProductName] = useState("Cargando...");
  const [productPrice, setProductPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!mountedRef.current) return;
      setIsLoading(true);
      
      try {
        // Extraer el ID del producto de manera segura
        const productId = typeof item.productoId === 'object' && item.productoId && item.productoId._id 
          ? item.productoId._id 
          : typeof item.productoId === 'string' 
            ? item.productoId 
            : null;
            
        if (!productId) {
          if (mountedRef.current) {
            setProductName("ID de producto inválido");
            setProductPrice(0);
            setIsLoading(false);
          }
          return;
        }
        
        // Si ya tenemos nombre y precio en el item, usarlos
        if (item.nombre && typeof item.precio === 'number') {
          if (mountedRef.current) {
            setProductName(item.nombre);
            setProductPrice(item.precio);
            setIsLoading(false);
          }
          return;
        }

        // Si el producto está en caché, usar esa información
        if (cachedProducts[productId]) {
          if (mountedRef.current) {
            setProductName(cachedProducts[productId].nombre);
            setProductPrice(cachedProducts[productId].precio);
            setIsLoading(false);
          }
          return;
        }

        // Si el producto está en la lista de productos, usar esa información
        const localProduct = products.find((p) => p._id === productId);
        if (localProduct) {
          if (mountedRef.current) {
            setProductName(localProduct.nombre);
            setProductPrice(localProduct.precio);
            setIsLoading(false);
          }
          return;
        }

        // Si no tenemos la información, obtenerla del servidor
        const productDetails = await getProductDetails(productId);
        if (productDetails && mountedRef.current) {
          setProductName(productDetails.nombre);
          setProductPrice(productDetails.precio);
        } else if (mountedRef.current) {
          setProductName("Producto no encontrado");
          setProductPrice(0);
        }
      } catch (error) {
        console.error("Error al cargar detalles del producto:", error);
        if (mountedRef.current) {
          setProductName("Error al cargar");
          setProductPrice(0);
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchProductDetails();

    // Cleanup function
    return () => {
      mountedRef.current = false;
    };
  }, [item, cachedProducts, products, getProductDetails]);

  if (isLoading) {
    return (
      <div className="py-2 flex justify-between items-center border-b border-[#91BEAD]/20">
        <div>
          <div className="font-medium text-[#7AA79C]">Cargando...</div>
          <div className="text-xs text-[#91BEAD]">Cantidad: {item.cantidad}</div>
        </div>
        <div className="text-sm font-medium text-[#7AA79C]">$0.00</div>
      </div>
    );
  }

  return (
    <div className="py-2 flex justify-between items-center border-b border-[#91BEAD]/20">
      <div>
        <div className="font-medium text-[#29696B]">{productName}</div>
        <div className="text-xs text-[#7AA79C]">Cantidad: {item.cantidad} x ${productPrice.toFixed(2)}</div>
      </div>
      <div className="text-sm font-medium text-[#29696B]">${(productPrice * item.cantidad).toFixed(2)}</div>
    </div>
  );
};

// Componente para calcular el total del pedido, mejorado para ser más eficiente
const OrderTotalCalculator = ({ order, cachedProducts, products, getProductDetails }) => {
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const calculationCompleted = useRef(false);
  const pendingProducts = useRef(new Set());
  const mountedRef = useRef(true);

  // Usamos useEffect con mejor manejo del ciclo de vida
  useEffect(() => {
    pendingProducts.current = new Set();
    calculationCompleted.current = false;
    
    const calculateTotal = async () => {
      if (!mountedRef.current) return;
      setIsLoading(true);
      let calculatedTotal = 0;
      
      if (!order || !Array.isArray(order.productos)) {
        if (mountedRef.current) {
          setTotal(0);
          setIsLoading(false);
          calculationCompleted.current = true;
        }
        return;
      }
      
      // Si no hay productos, establecer el total en 0
      if (order.productos.length === 0) {
        if (mountedRef.current) {
          setTotal(0);
          setIsLoading(false);
          calculationCompleted.current = true;
        }
        return;
      }
      
      // Lista de IDs de productos que necesitamos cargar
      const productIdsToLoad = [];
      
      // Primero intentamos calcular con la información que ya tenemos
      for (const item of order.productos) {
        if (!item) continue;
        
        // Obtener el ID del producto de manera segura
        const productId = typeof item.productoId === 'object' && item.productoId && item.productoId._id 
          ? item.productoId._id 
          : typeof item.productoId === 'string' 
            ? item.productoId 
            : null;
            
        if (!productId) continue;
        
        // Si ya tenemos el precio en el item, lo usamos
        if (typeof item.precio === 'number') {
          calculatedTotal += item.precio * (item.cantidad || 1);
          continue;
        }
        
        // Si el producto está en caché, usamos su precio
        if (cachedProducts[productId] && typeof cachedProducts[productId].precio === 'number') {
          calculatedTotal += cachedProducts[productId].precio * (item.cantidad || 1);
          continue;
        }
        
        // Si el producto está en la lista de productos, usamos su precio
        const localProduct = products.find((p) => p._id === productId);
        if (localProduct && typeof localProduct.precio === 'number') {
          calculatedTotal += localProduct.precio * (item.cantidad || 1);
          continue;
        }
        
        // Si no tenemos el precio, agregamos el ID a la lista para cargar
        productIdsToLoad.push(productId);
        pendingProducts.current.add(productId);
      }
      
      // Si ya calculamos todos los productos, actualizamos el estado
      if (productIdsToLoad.length === 0) {
        if (mountedRef.current) {
          setTotal(calculatedTotal);
          setIsLoading(false);
          calculationCompleted.current = true;
        }
        return;
      }
      
      // Cargamos los productos que faltan en paralelo (pero en lotes para no sobrecargar)
      const batchSize = 5;
      for (let i = 0; i < productIdsToLoad.length; i += batchSize) {
        const batch = productIdsToLoad.slice(i, i + batchSize);
        const promises = batch.map(productId => getProductDetails(productId));
        
        try {
          const results = await Promise.all(promises);
          
          // Actualizamos el total con los resultados
          for (let j = 0; j < results.length; j++) {
            const productDetails = results[j];
            const productId = batch[j];
            
            if (productDetails && typeof productDetails.precio === 'number') {
              // Encontrar la cantidad correcta para este producto
              const item = order.productos.find(p => {
                const itemId = typeof p.productoId === 'object' ? p.productoId._id : p.productoId;
                return itemId === productId;
              });
              
              if (item) {
                calculatedTotal += productDetails.precio * (item.cantidad || 1);
              }
            }
            
            // Marcar este producto como procesado
            pendingProducts.current.delete(productId);
          }
          
          // Actualizamos el total parcial para mostrar progreso
          if (mountedRef.current && pendingProducts.current.size === 0) {
            setTotal(calculatedTotal);
            setIsLoading(false);
            calculationCompleted.current = true;
          }
        } catch (error) {
          console.error(`Error al cargar lote de productos:`, error);
        }
      }
    };
    
    calculateTotal();

    // Cleanup function
    return () => {
      mountedRef.current = false;
    };
  }, [order, cachedProducts, products, getProductDetails]);
  
  if (isLoading) {
    return <span className="text-[#7AA79C]">Calculando...</span>;
  }
  
  return <span className="text-[#29696B]">${total.toFixed(2)}</span>;
};

// Componente principal
const OrdersSection = () => {
  // Usar el hook de notificaciones
  const { addNotification } = useNotification();
  
  // Estados
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSections, setClientSections] = useState<{ [key: string]: Client[] }>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [cachedProducts, setCachedProducts] = useState<{ [key: string]: Product }>({});
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState<string | null>(null);
  const [mobileOrderDetailsOpen, setMobileOrderDetailsOpen] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Referencias para el scroll en móvil
  const mobileListRef = useRef<HTMLDivElement>(null);
  
  // Referencia para control de montaje/desmontaje
  const mountedRef = useRef(true);
  
  // Referencia para la solicitud pendiente de productos
  const pendingProductsRequest = useRef<boolean>(false);
  
  // Cola de productos a cargar
  const productLoadQueue = useRef<Set<string>>(new Set());

  // IMPORTANTE: Tamaños fijos para cada tipo de dispositivo
  const ITEMS_PER_PAGE_MOBILE = 5;
  const ITEMS_PER_PAGE_DESKTOP = 10;

  // Calculamos dinámicamente itemsPerPage basado en el ancho de la ventana
  const itemsPerPage = windowWidth < 768 ? ITEMS_PER_PAGE_MOBILE : ITEMS_PER_PAGE_DESKTOP;

  // Estados para filtros
  const [dateFilter, setDateFilter] = useState({
    fechaInicio: '',
    fechaFin: ''
  });

  // Estados para modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);

  // Estados para el formulario de pedido
  const [orderForm, setOrderForm] = useState<CreateOrderData>({
    servicio: '',
    seccionDelServicio: '',
    userId: '',
    productos: []
  });

  // Estados para selección de productos
  const [selectedProduct, setSelectedProduct] = useState<string>("none");
  const [productQuantity, setProductQuantity] = useState<number>(1);

  // Estados para el usuario actual
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Flag de primera carga completada
  const initialLoadComplete = useRef(false);

  // Función memoizada para cargar productos en lotes desde la cola
  const processProductQueue = useCallback(async () => {
    // Si ya hay una solicitud pendiente o la cola está vacía, no hacer nada
    if (pendingProductsRequest.current || productLoadQueue.current.size === 0) {
      return;
    }
    
    try {
      pendingProductsRequest.current = true;
      
      // Convertir el Set a array
      const productIds = Array.from(productLoadQueue.current);
      // Limpiar la cola
      productLoadQueue.current.clear();
      
      // Agrupar en lotes de 10 para no sobrecargar el servidor
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < productIds.length; i += batchSize) {
        batches.push(productIds.slice(i, i + batchSize));
      }
      
      // Procesar cada lote
      for (const batch of batches) {
        if (!mountedRef.current) break;
        
        const token = getAuthToken();
        if (!token) break;
        
        // Filtrar IDs ya en caché o productos locales
        const idsToFetch = batch.filter(id => {
          return !cachedProducts[id] && !products.find(p => p._id === id);
        });
        
        if (idsToFetch.length === 0) continue;
        
        // Hacer una sola petición por lote - idealmente el backend tendría un endpoint para obtener múltiples productos
        // De momento, hacemos solicitudes en paralelo
        const promises = idsToFetch.map(id => 
          fetch(`https://lyme-back.vercel.app/api/producto/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(resp => resp.ok ? resp.json() : null)
        );
        
        const results = await Promise.allSettled(promises);
        
        // Procesar resultados y actualizar caché
        const newCachedProducts = { ...cachedProducts };
        let cacheUpdated = false;
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            const product = result.value;
            newCachedProducts[product._id] = product;
            cacheUpdated = true;
          }
        });
        
        // Actualizar estado solo si hay cambios y el componente sigue montado
        if (cacheUpdated && mountedRef.current) {
          setCachedProducts(newCachedProducts);
          
          // Actualizar caché persistente
          CacheManager.set(CACHE_KEYS.PRODUCTS, {
            ...newCachedProducts,
            ...Object.fromEntries(products.map(p => [p._id, p]))
          });
        }
      }
    } catch (error) {
      console.error('Error procesando cola de productos:', error);
    } finally {
      pendingProductsRequest.current = false;
      
      // Si quedan productos en la cola, procesarlos
      if (mountedRef.current && productLoadQueue.current.size > 0) {
        setTimeout(processProductQueue, 100);
      }
    }
  }, [cachedProducts, products]);

  // Agregar a la cola de carga de productos
  const queueProductForLoading = useCallback((productId: string) => {
    if (!productId || cachedProducts[productId] || products.find(p => p._id === productId)) {
      return;
    }
    
    productLoadQueue.current.add(productId);
    
    // Iniciar procesamiento si no hay solicitud pendiente
    if (!pendingProductsRequest.current) {
      processProductQueue();
    }
  }, [cachedProducts, products, processProductQueue]);

  // Cargar datos de caché al montar el componente
  useEffect(() => {
    // Cargar productos de caché
    const cachedProductsData = CacheManager.get(CACHE_KEYS.PRODUCTS, CACHE_EXPIRATION.PRODUCTS);
    if (cachedProductsData) {
      setCachedProducts(cachedProductsData);
    }
    
    // Cargar usuarios de caché
    const cachedUsers = CacheManager.get(CACHE_KEYS.USERS, CACHE_EXPIRATION.USERS);
    if (cachedUsers) {
      setUsers(cachedUsers);
    }
    
    // Cargar usuario actual de caché
    const cachedCurrentUser = CacheManager.get(CACHE_KEYS.CURRENT_USER, CACHE_EXPIRATION.CURRENT_USER);
    if (cachedCurrentUser) {
      setCurrentUser(cachedCurrentUser);
      
      // Actualizar el formulario con el userId correcto
      setOrderForm(prev => ({
        ...prev,
        userId: cachedCurrentUser._id || cachedCurrentUser.id || ""
      }));
      
      // Cargar clientes si tenemos el ID del usuario
      const userId = cachedCurrentUser._id || cachedCurrentUser.id;
      if (userId) {
        // Cargar clientes de caché
        const cachedClients = CacheManager.get(
          `${CACHE_KEYS.CLIENTS}_${userId}`, 
          CACHE_EXPIRATION.CLIENTS
        );
        
        if (cachedClients) {
          setClients(cachedClients);
          
          // Agrupar clientes por servicio
          const grouped = cachedClients.reduce((acc, client) => {
            if (!acc[client.servicio]) {
              acc[client.servicio] = [];
            }
            acc[client.servicio].push(client);
            return acc;
          }, {});
          
          setClientSections(grouped);
        }
      }
    }
    
    // Cargar productos del backend
    fetchProducts();
    
    // Configurar flag de componente montado
    mountedRef.current = true;
    
    // Limpieza al desmontar
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Efecto para iniciar carga de datos después de obtener el usuario
  useEffect(() => {
    // Solo ejecutar una vez
    if (!initialLoadComplete.current && currentUser) {
      initialLoadComplete.current = true;
      
      // Fetch data in sequence to reduce concurrent requests
      const loadData = async () => {
        await fetchCurrentUser();
        await fetchUsers();
        await fetchOrders();
      };
      
      loadData();
    }
  }, [currentUser]);

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

  // Resetear la página actual cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter.fechaInicio, dateFilter.fechaFin]);

  // Cargar usuario actual - optimizado para usar caché
  const fetchCurrentUser = async () => {
    // Si ya tenemos el usuario actual en caché y no está expirado, no lo volvemos a cargar
    if (currentUser && !CacheManager.isExpired(CACHE_KEYS.CURRENT_USER, CACHE_EXPIRATION.CURRENT_USER)) {
      return currentUser;
    }
    
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

      const userData = await response.json();
      
      if (!mountedRef.current) return null;
      
      console.log("Usuario cargado:", userData);
      setCurrentUser(userData);
      
      // Guardar en caché
      CacheManager.set(CACHE_KEYS.CURRENT_USER, userData);

      // Usamos _id en lugar de id para cargar los clientes
      if (userData._id) {
        // Actualizamos también el formulario con el userId correcto
        setOrderForm(prev => ({
          ...prev,
          userId: userData._id
        }));
        fetchClients(userData._id);
      } else if (userData.id) {
        // Por compatibilidad, si no hay _id pero sí id
        setOrderForm(prev => ({
          ...prev,
          userId: userData.id
        }));
        fetchClients(userData.id);
      }
      
      return userData;
    } catch (err) {
      const errorMsg = 'Error al cargar información del usuario: ' + 
        (err instanceof Error ? err.message : String(err));
      setError(errorMsg);
      
      // Notificación para error de información de usuario
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
      
      return null;
    }
  };

  // Cargar pedidos - optimizado para reducir peticiones
  const fetchOrders = async (force = false) => {
    if (loading && !force) return; // Evitar solicitudes múltiples
    
    try {
      setLoading(true);
      setRefreshing(true);
      
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Verificar si estamos filtrando por fecha
      let url = 'https://lyme-back.vercel.app/api/pedido';
      
      if (dateFilter.fechaInicio && dateFilter.fechaFin) {
        url = `https://lyme-back.vercel.app/api/pedido/fecha?fechaInicio=${encodeURIComponent(dateFilter.fechaInicio)}&fechaFin=${encodeURIComponent(dateFilter.fechaFin)}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          return [];
        }
        throw new Error('Error al cargar los pedidos');
      }

      const data = await response.json();
      
      if (!mountedRef.current) return [];
      
      console.log("Pedidos recibidos:", data);
      setOrders(data);
      setError(null);
      setCurrentPage(1); // Resetear a la primera página al obtener nuevos datos
      
      // Notificación opcional para indicar que los pedidos se cargaron correctamente
      if (addNotification && data.length > 0 && force) {
        addNotification(`Se cargaron ${data.length} pedidos correctamente`, 'info');
      }
      
      // Prefetch de productos relevantes
      prefetchProductsFromOrders(data);
      
      return data;
    } catch (err) {
      const errorMsg = 'Error al cargar los pedidos: ' +
        (err instanceof Error ? err.message : String(err));
      setError(errorMsg);
      
      // Notificación para error de carga de pedidos
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
      
      return [];
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  // Prefetch de productos relevantes para los pedidos visibles
  const prefetchProductsFromOrders = useCallback((ordersData: Order[]) => {
    // Si no hay pedidos, no hacer nada
    if (!Array.isArray(ordersData) || ordersData.length === 0) return;
    
    // Recopilar todos los IDs de productos en los pedidos
    const productIds = new Set<string>();
    
    // Sólo prefetch para los primeros 50 pedidos (para no sobrecargar)
    const ordersToProcess = ordersData.slice(0, 50);
    
    for (const order of ordersToProcess) {
      if (Array.isArray(order.productos)) {
        for (const product of order.productos) {
          if (!product) continue;
          
          const productId = typeof product.productoId === 'object' && product.productoId 
            ? product.productoId._id 
            : typeof product.productoId === 'string'
              ? product.productoId
              : null;
              
          if (productId) {
            productIds.add(productId);
          }
        }
      }
    }
    
    // Quedar a cargar productos que no están en caché ni en productos locales
    for (const productId of productIds) {
      queueProductForLoading(productId);
    }
  }, [queueProductForLoading]);

  // Obtener detalles de producto por ID - versión optimizada
  const getProductDetails = useCallback(async (productId: string | { _id: string;[key: string]: any }) => {
    // Extraer el ID de manera segura
    const id = typeof productId === 'object' ? productId._id : productId;

    // Validar que el ID sea una cadena no vacía
    if (!id || typeof id !== 'string') {
      console.error("ID de producto inválido", productId);
      return null;
    }

    // Primero revisar si ya tenemos este producto en caché
    if (cachedProducts[id]) {
      return cachedProducts[id];
    }

    // Luego revisar en la lista de productos cargados
    const localProduct = products.find(p => p._id === id);
    if (localProduct) {
      // Agregar a caché
      setCachedProducts(prev => {
        const updated = { ...prev, [id]: localProduct };
        // Actualizar caché persistente
        CacheManager.set(CACHE_KEYS.PRODUCTS, {
          ...updated,
          ...Object.fromEntries(products.map(p => [p._id, p]))
        });
        return updated;
      });
      return localProduct;
    }

    try {
      const token = getAuthToken();
      if (!token) return null;

      const response = await fetch(`https://lyme-back.vercel.app/api/producto/${id}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache' 
        }
      });

      if (!response.ok) {
        console.error(`Error al obtener producto. Status: ${response.status}`);
        return null;
      }

      const product = await response.json();
      
      if (!mountedRef.current) return null;

      // Agregar a caché
      setCachedProducts(prev => {
        const updated = { ...prev, [id]: product };
        // Actualizar caché persistente
        CacheManager.set(CACHE_KEYS.PRODUCTS, {
          ...updated,
          ...Object.fromEntries(products.map(p => [p._id, p]))
        });
        return updated;
      });

      return product;
    } catch (error) {
      console.error("Error obteniendo producto:", error);
      
      // Notificación opcional para errores críticos
      if (addNotification) {
        addNotification(`Error al obtener detalles del producto: ${error instanceof Error ? error.message : 'Desconocido'}`, 'error');
      }
      
      return null;
    }
  }, [cachedProducts, products, addNotification]);

  // Función para toggleOrderDetails - versión escritorio (optimizada)
  const toggleOrderDetails = useCallback(async (orderId: string) => {
    if (orderDetailsOpen === orderId) {
      setOrderDetailsOpen(null);
    } else {
      setOrderDetailsOpen(orderId);
      
      // Cargar los detalles de los productos en lote
      const order = orders.find(o => o._id === orderId);
      if (order && Array.isArray(order.productos)) {
        // Recopilar IDs de productos a cargar
        for (const item of order.productos) {
          // Extraer ID de manera segura
          const productId = typeof item.productoId === 'object' && item.productoId && item.productoId._id 
            ? item.productoId._id 
            : typeof item.productoId === 'string' 
              ? item.productoId 
              : null;
              
          if (productId) {
            queueProductForLoading(productId);
          }
        }
      }
    }
  }, [orderDetailsOpen, orders, queueProductForLoading]);

  // Función para toggleMobileOrderDetails - versión móvil (optimizada)
  const toggleMobileOrderDetails = useCallback(async (orderId: string) => {
    if (mobileOrderDetailsOpen === orderId) {
      setMobileOrderDetailsOpen(null);
    } else {
      setMobileOrderDetailsOpen(orderId);
      
      // Cargar los detalles de los productos en lote
      const order = orders.find(o => o._id === orderId);
      if (order && Array.isArray(order.productos)) {
        // Recopilar IDs de productos a cargar
        for (const item of order.productos) {
          // Extraer ID de manera segura
          const productId = typeof item.productoId === 'object' && item.productoId && item.productoId._id 
            ? item.productoId._id 
            : typeof item.productoId === 'string' 
              ? item.productoId 
              : null;
              
          if (productId) {
            queueProductForLoading(productId);
          }
        }
      }
    }
  }, [mobileOrderDetailsOpen, orders, queueProductForLoading]);

  // Función para formatear fecha
  const formatDateForAPI = (dateString) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString; // Si la fecha no es válida, devolver el string original
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Cargar pedidos por rango de fechas
  const fetchOrdersByDate = async () => {
    if (!dateFilter.fechaInicio || !dateFilter.fechaFin) {
      const errorMsg = 'Por favor seleccione ambas fechas';
      setError(errorMsg);
      
      // Notificación para campos faltantes
      if (addNotification) {
        addNotification(errorMsg, 'warning');
      }
      
      return;
    }

    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Obtenemos las fechas del input del usuario
      let fechaInicio = dateFilter.fechaInicio;
      let fechaFin = dateFilter.fechaFin;
      
      console.log("Fechas originales del formulario:", fechaInicio, fechaFin);
      
      try {
        // Los input type="date" ya proporcionan fechas en formato YYYY-MM-DD, 
        // que es justo lo que necesitamos para el backend
        // Verificamos si necesitamos hacer algún ajuste en la zona horaria
        const fechaInicioObj = new Date(fechaInicio);
        const fechaFinObj = new Date(fechaFin);
        
        if (!isNaN(fechaInicioObj.getTime()) && !isNaN(fechaFinObj.getTime())) {
          console.log("Objetos de fecha parseados correctamente:",
            fechaInicioObj.toISOString(), fechaFinObj.toISOString());
        } else {
          console.warn("No se pudieron parsear las fechas como objetos Date válidos");
        }
      } catch (e) {
        console.error("Error al manipular fechas:", e);
      }

      console.log(`Filtrando pedidos desde ${fechaInicio} hasta ${fechaFin}`);
      
      // Construimos la URL con las fechas originales del formulario
      // Los inputs type="date" ya dan el formato YYYY-MM-DD que necesitamos
      const url = `https://lyme-back.vercel.app/api/pedido/fecha?fechaInicio=${encodeURIComponent(fechaInicio)}&fechaFin=${encodeURIComponent(fechaFin)}`;
      console.log("URL de solicitud:", url);
      
      // Opciones de la solicitud con el token de autenticación
      const requestOptions = {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      };

      console.log("Enviando solicitud GET a la API...");
      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        // Intentar obtener el mensaje de error del cuerpo de la respuesta
        try {
          const errorText = await response.text();
          console.error("Respuesta de error completa:", errorText);
          
          try {
            // Intentar parsear como JSON si es posible
            const errorData = JSON.parse(errorText);
            console.error("Datos de error:", errorData);
            throw new Error(errorData.mensaje || errorData.error || `Error al filtrar pedidos por fecha (status: ${response.status})`);
          } catch (jsonError) {
            // Si no es JSON, usar el texto como está
            throw new Error(`Error al filtrar pedidos por fecha (status: ${response.status}): ${errorText.substring(0, 100)}`);
          }
        } catch (e) {
          console.error("Error al procesar la respuesta:", e);
          throw new Error(`Error al filtrar pedidos por fecha (status: ${response.status})`);
        }
      }

      const data = await response.json();
      
      if (!mountedRef.current) return;
      
      console.log(`Pedidos obtenidos en el rango de fechas: ${data.length}`);
      setOrders(data);
      setError(null);
      setCurrentPage(1); // Resetear a la primera página al cambiar los datos

      // Mensaje de éxito mostrando cuántos pedidos se encontraron
      let successMsg = '';
      if (data.length === 0) {
        successMsg = 'No se encontraron pedidos en el rango de fechas seleccionado';
      } else {
        successMsg = `Se encontraron ${data.length} pedidos en el rango seleccionado`;
      }
      
      setSuccessMessage(successMsg);
      
      // Notificación de filtro aplicado
      if (addNotification) {
        addNotification(successMsg, data.length === 0 ? 'info' : 'success');
      }
      
      // Eliminar mensaje después de 3 segundos
      setTimeout(() => {
        if (mountedRef.current) {
          setSuccessMessage('');
        }
      }, 3000);
      
      // Cerrar filtros móviles si están abiertos
      setShowMobileFilters(false);
      
      // Prefetch de productos para los pedidos
      prefetchProductsFromOrders(data);
    } catch (err) {
      const errorMsg = 'Error al filtrar por fecha: ' +
        (err instanceof Error ? err.message : String(err));
      console.error(errorMsg, err);
      setError(errorMsg);
      
      // Notificación para error de filtro por fecha
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Cargar productos - optimizado con caché
  const fetchProducts = async (forceRefresh = false) => {
    // Si ya tenemos productos en caché y no está expirado, no volvemos a cargar
    const cachedLastFetch = CacheManager.get(CACHE_KEYS.LAST_PRODUCTS_FETCH);
    const hasRecentFetch = cachedLastFetch && Date.now() - cachedLastFetch < CACHE_EXPIRATION.PRODUCTS;
    
    if (!forceRefresh && products.length > 0 && hasRecentFetch) {
      return products;
    }
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('https://lyme-back.vercel.app/api/producto', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar productos');
      }

      const productsData = await response.json();
      
      if (!mountedRef.current) return products;
      
      // Determinar el formato de la respuesta
      let productsList = [];
      if (Array.isArray(productsData)) {
        productsList = productsData;
      } else if (productsData && Array.isArray(productsData.items)) {
        productsList = productsData.items;
      }
      
      // Filtrar productos con stock > 0
      const availableProducts = productsList.filter((p: Product) => p.stock > 0);
      setProducts(availableProducts);

      // También añadirlos al caché (aunque estén fuera de stock)
      const productsCache = productsList.reduce((cache: { [key: string]: Product }, product: Product) => {
        cache[product._id] = product;
        return cache;
      }, {});
      
      setCachedProducts(prevCache => {
        const combined = { ...prevCache, ...productsCache };
        
        // Actualizar caché persistente
        CacheManager.set(CACHE_KEYS.PRODUCTS, combined);
        
        return combined;
      });
      
      // Actualizar timestamp de la última carga
      CacheManager.set(CACHE_KEYS.LAST_PRODUCTS_FETCH, Date.now());

      console.log(`Productos cargados: ${productsList.length}, con stock > 0: ${availableProducts.length}`);
      
      // Notificación opcional para productos disponibles
      if (addNotification && availableProducts.length === 0) {
        addNotification('No hay productos con stock disponible para crear pedidos', 'warning');
      }
      
      return availableProducts;
    } catch (err) {
      console.error('Error al cargar productos:', err);
      
      // Notificación para error crítico de carga de productos
      if (addNotification) {
        addNotification('Error al cargar productos. Algunas funcionalidades pueden estar limitadas.', 'error');
      }
      
      return products;
    }
  };

  // Cargar usuarios - optimizado con caché
  const fetchUsers = async (forceRefresh = false) => {
    // Si ya tenemos usuarios en caché y no está expirado, no volvemos a cargar
    const cachedLastFetch = CacheManager.get(CACHE_KEYS.LAST_USERS_FETCH);
    const hasRecentFetch = cachedLastFetch && Date.now() - cachedLastFetch < CACHE_EXPIRATION.USERS;
    
    if (!forceRefresh && users.length > 0 && hasRecentFetch) {
      return users;
    }
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('https://lyme-back.vercel.app/api/auth/users', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }

      const data = await response.json();
      
      if (!mountedRef.current) return users;
      
      setUsers(data);
      
      // Guardar en caché
      CacheManager.set(CACHE_KEYS.USERS, data);
      CacheManager.set(CACHE_KEYS.LAST_USERS_FETCH, Date.now());
      
      console.log("Usuarios cargados:", data.length);
      
      return data;
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      
      // Notificación para error de carga de usuarios
      if (addNotification) {
        addNotification('Error al cargar usuarios. Algunas funcionalidades pueden estar limitadas.', 'warning');
      }
      
      return users;
    }
  };

  // Cargar clientes del usuario - optimizado con caché
  const fetchClients = async (userId: string, forceRefresh = false) => {
    // Si ya tenemos clientes en caché y no está expirado, no volvemos a cargar
    const cachedClientsKey = `${CACHE_KEYS.CLIENTS}_${userId}`;
    const cachedLastFetch = CacheManager.get(`${cachedClientsKey}_last_fetch`);
    const hasRecentFetch = cachedLastFetch && Date.now() - cachedLastFetch < CACHE_EXPIRATION.CLIENTS;
    
    if (!forceRefresh && clients.length > 0 && hasRecentFetch) {
      return clients;
    }
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      console.log(`Cargando clientes para usuario ID: ${userId}`);
      const response = await fetch(`https://lyme-back.vercel.app/api/cliente/user/${userId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Error al cargar clientes del usuario (status: ${response.status})`);
      }

      const clientsData = await response.json();
      
      if (!mountedRef.current) return clients;
      
      console.log(`Clientes cargados: ${clientsData.length}`);
      setClients(clientsData);

      // Agrupar clientes por servicio (para las secciones)
      const grouped = clientsData.reduce((acc: { [key: string]: Client[] }, client: Client) => {
        if (!acc[client.servicio]) {
          acc[client.servicio] = [];
        }
        acc[client.servicio].push(client);
        return acc;
      }, {});

      setClientSections(grouped);
      
      // Guardar en caché
      CacheManager.set(cachedClientsKey, clientsData);
      CacheManager.set(`${cachedClientsKey}_last_fetch`, Date.now());
      
      return clientsData;
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      
      // Notificación para error de carga de clientes
      if (addNotification) {
        addNotification('Error al cargar clientes. No podrá crear nuevos pedidos.', 'error');
      }
      
      return clients;
    }
  };

  // Crear pedido
  const handleCreateOrder = async () => {
    // Validaciones
    if (!orderForm.servicio) {
      const errorMsg = 'Debe seleccionar un cliente';
      setError(errorMsg);
      
      // Notificación para validación
      if (addNotification) {
        addNotification(errorMsg, 'warning');
      }
      
      return;
    }

    if (orderForm.productos.length === 0) {
      const errorMsg = 'Debe agregar al menos un producto';
      setError(errorMsg);
      
      // Notificación para validación
      if (addNotification) {
        addNotification(errorMsg, 'warning');
      }
      
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Preparar datos del pedido - Enviamos solo lo que requiere la API
      // IMPORTANTE: Solo enviamos productoId y cantidad en el array de productos
      const pedidoData = {
        userId: orderForm.userId || (currentUser?._id || currentUser?.id || ""),
        servicio: orderForm.servicio,
        seccionDelServicio: orderForm.seccionDelServicio || "",
        detalle: orderForm.detalle || " ",
        productos: orderForm.productos.map(p => ({
          productoId: typeof p.productoId === 'object' ? p.productoId._id : p.productoId,
          cantidad: p.cantidad
        }))
      };

      console.log("Enviando pedido:", JSON.stringify(pedidoData));

      const response = await fetch('https://lyme-back.vercel.app/api/pedido', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pedidoData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || `Error al crear el pedido (status: ${response.status})`);
      }

      // Éxito
      await fetchOrders(true);
      await fetchProducts(true); // Recargar productos para actualizar stock
      
      // Notificar a todos los componentes sobre el cambio en el inventario
      await refreshInventory();
      console.log("Notificación de actualización de inventario enviada después de crear pedido");

      setShowCreateModal(false);
      resetOrderForm();
      
      const successMsg = 'Pedido creado correctamente';
      setSuccessMessage(successMsg);
      
      // Notificación de éxito para creación de pedido
      if (addNotification) {
        addNotification(successMsg, 'success');
      }
      
      setTimeout(() => {
        if (mountedRef.current) {
          setSuccessMessage('');
        }
      }, 3000);
    } catch (err) {
      const errorMsg = 'Error al crear pedido: ' +
        (err instanceof Error ? err.message : String(err));
      setError(errorMsg);
      
      // Notificación para error de creación de pedido
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Actualizar pedido
  const handleUpdateOrder = async () => {
    if (!currentOrder?._id) return;

    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Solo enviamos los campos necesarios y en el formato correcto
      const updateData = {
        servicio: orderForm.servicio,
        seccionDelServicio: orderForm.seccionDelServicio || "",
        detalle: orderForm.detalle || " ",
        // Importante: solo enviar productoId y cantidad
        productos: orderForm.productos.map(p => ({
          productoId: typeof p.productoId === 'object' ? p.productoId._id : p.productoId,
          cantidad: p.cantidad
        }))
      };

      console.log("Actualizando pedido:", currentOrder._id, "con datos:", updateData);

      const response = await fetch(`https://lyme-back.vercel.app/api/pedido/${currentOrder._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || 'Error al actualizar el pedido');
      }

      await fetchOrders(true);
      await fetchProducts(true); // Recargar productos para actualizar stock
      
      // Notificar a todos los componentes sobre el cambio en el inventario
      await refreshInventory();
      console.log("Notificación de actualización de inventario enviada después de actualizar pedido");
      
      setShowCreateModal(false);
      resetOrderForm();
      
      const successMsg = 'Pedido actualizado correctamente';
      setSuccessMessage(successMsg);
      
      // Notificación de éxito para actualización de pedido
      if (addNotification) {
        addNotification(successMsg, 'success');
      }
      
      setTimeout(() => {
        if (mountedRef.current) {
          setSuccessMessage('');
        }
      }, 3000);
    } catch (err) {
      const errorMsg = 'Error al actualizar pedido: ' +
        (err instanceof Error ? err.message : String(err));
      setError(errorMsg);
      
      // Notificación para error de actualización de pedido
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Eliminar pedido
  const handleDeleteOrder = async (id: string) => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`https://lyme-back.vercel.app/api/pedido/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || 'Error al eliminar el pedido');
      }

      await fetchOrders(true);
      await fetchProducts(true); // Recargar productos para actualizar stock
      
      // Notificar a todos los componentes sobre el cambio en el inventario
      await refreshInventory();
      console.log("Notificación de actualización de inventario enviada después de eliminar pedido");
      
      const successMsg = 'Pedido eliminado correctamente';
      setSuccessMessage(successMsg);
      
      // Notificación de éxito para eliminación de pedido
      if (addNotification) {
        addNotification(successMsg, 'success');
      }
      
      setTimeout(() => {
        if (mountedRef.current) {
          setSuccessMessage('');
        }
      }, 3000);
    } catch (err) {
      const errorMsg = 'Error al eliminar pedido: ' +
        (err instanceof Error ? err.message : String(err));
      setError(errorMsg);
      
      // Notificación para error de eliminación de pedido
      if (addNotification) {
        addNotification(errorMsg, 'error');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setOrderToDelete(null);
        setDeleteConfirmOpen(false);
      }
    }
  };

  // Preparar eliminación de pedido
  const confirmDeleteOrder = (id: string) => {
    setOrderToDelete(id);
    setDeleteConfirmOpen(true);
  };

  // Preparar edición de pedido
  const handleEditOrder = (order: Order) => {
    setCurrentOrder(order);

    // Preparar los productos para edición
    const preppedProductos = Array.isArray(order.productos)
      ? order.productos.map(async (p) => {
        // Intentar obtener nombre y precio si no están en el producto
        try {
          const productId = typeof p.productoId === 'object' && p.productoId 
            ? p.productoId._id 
            : p.productoId;
            
          if (!p.nombre || !p.precio) {
            const details = await getProductDetails(productId);
            return {
              productoId: productId,
              cantidad: p.cantidad,
              nombre: p.nombre || (details?.nombre || "Producto no encontrado"),
              precio: p.precio || (details?.precio || 0)
            };
          }
          return {
            productoId: productId,
            cantidad: p.cantidad,
            nombre: p.nombre,
            precio: p.precio
          };
        } catch (err) {
          console.error("Error al obtener detalles del producto:", err);
          return {
            productoId: typeof p.productoId === 'object' ? p.productoId._id : p.productoId,
            cantidad: p.cantidad,
            nombre: p.nombre || "Error al cargar",
            precio: p.precio || 0
          };
        }
      })
      : [];

    // Resolver las promesas para obtener los productos con sus detalles
    Promise.all(preppedProductos).then(productos => {
      setOrderForm({
        servicio: order.servicio,
        seccionDelServicio: order.seccionDelServicio || '',
        userId: typeof order.userId === 'object' ? order.userId._id : order.userId,
        productos: productos,
        detalle: order.detalle || " "
      });

      setShowCreateModal(true);
      console.log("Editando orden:", order);
      
      // Notificación informativa opcional para edición
      if (addNotification) {
        addNotification(`Editando pedido #${order.nPedido}`, 'info');
      }
    });
  };

  // Manejar selección de cliente
  const handleClientChange = (clienteId: string) => {
    if (clienteId === "none") return;

    const selectedClient = clients.find(c => c._id === clienteId);
    if (!selectedClient) {
      console.log(`Cliente no encontrado: ${clienteId}`);
      
      // Notificación para cliente no encontrado
      if (addNotification) {
        addNotification('Cliente seleccionado no encontrado', 'warning');
      }
      
      return;
    }

    console.log(`Cliente seleccionado: ${selectedClient.servicio}, ID: ${selectedClient._id}`);

    // Actualizar el formulario con el cliente seleccionado
    setOrderForm(prev => ({
      ...prev,
      servicio: selectedClient.servicio,
      seccionDelServicio: selectedClient.seccionDelServicio || '',  // Usar sección del cliente por defecto
      userId: currentUser?._id || currentUser?.id || ""
    }));

    // Si hay varias secciones para este servicio, verificamos
    const sections = clientSections[selectedClient.servicio] || [];
    console.log(`Secciones encontradas: ${sections.length}`);

    if (sections.length === 1) {
      setOrderForm(prev => ({
        ...prev,
        seccionDelServicio: sections[0].seccionDelServicio
      }));
    } else if (sections.length > 1) {
      // Si hay más de una sección, abrimos el modal para que elija
      setShowSectionModal(true);
    }
  };

  // Manejar selección de sección
  const handleSectionSelect = (seccion: string) => {
    setOrderForm(prev => ({
      ...prev,
      seccionDelServicio: seccion
    }));
    setShowSectionModal(false);
    
    // Notificación opcional para selección de sección
    if (addNotification) {
      addNotification(`Sección "${seccion}" seleccionada`, 'info');
    }
  };

  // Agregar producto al pedido
  const handleAddProduct = () => {
    if (!selectedProduct || selectedProduct === "none" || productQuantity <= 0) {
      const errorMsg = 'Seleccione un producto y una cantidad válida';
      setError(errorMsg);
      
      // Notificación para validación
      if (addNotification) {
        addNotification(errorMsg, 'warning');
      }
      
      return;
    }

    const product = products.find(p => p._id === selectedProduct);
    if (!product) return;

    // Verificar si hay suficiente stock
    if (product.stock < productQuantity) {
      const errorMsg = `Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`;
      setError(errorMsg);
      
      // Notificación para stock insuficiente
      if (addNotification) {
        addNotification(errorMsg, 'warning');
      }
      
      return;
    }

    // Verificar si ya existe este producto en el pedido
    const existingProductIndex = orderForm.productos.findIndex(
      item => (typeof item.productoId === 'object' ? item.productoId._id : item.productoId) === selectedProduct
    );

    if (existingProductIndex >= 0) {
      // Verificar stock para la cantidad total
      const currentQuantity = orderForm.productos[existingProductIndex].cantidad;
      const newQuantity = currentQuantity + productQuantity;
      
      if (product.stock < newQuantity) {
        const errorMsg = `Stock insuficiente. Solo hay ${product.stock} unidades disponibles y ya tienes ${currentQuantity} en el pedido.`;
        setError(errorMsg);
        
        // Notificación para stock insuficiente
        if (addNotification) {
          addNotification(errorMsg, 'warning');
        }
        
        return;
      }
      
      // Actualizar cantidad si ya existe
      const updatedProducts = [...orderForm.productos];
      updatedProducts[existingProductIndex].cantidad = newQuantity;

      setOrderForm(prev => ({
        ...prev,
        productos: updatedProducts
      }));
      
      // Notificación para producto actualizado
      if (addNotification) {
        addNotification(`Cantidad actualizada: ${product.nombre} (${newQuantity})`, 'success');
      }
    } else {
      // Agregar nuevo producto
      setOrderForm(prev => ({
        ...prev,
        productos: [
          ...prev.productos,
          {
            productoId: selectedProduct,
            cantidad: productQuantity,
            nombre: product.nombre,
            precio: product.precio
          }
        ]
      }));
      
      // Notificación para producto agregado
      if (addNotification) {
        addNotification(`Producto agregado: ${product.nombre} (${productQuantity})`, 'success');
      }
    }

    // Resetear selección
    setSelectedProduct("none");
    setProductQuantity(1);
    setShowProductModal(false);
  };

  // Eliminar producto del pedido
  const handleRemoveProduct = (index: number) => {
    // Guardar una referencia al producto antes de eliminarlo para mostrar en la notificación
    const product = orderForm.productos[index];
    const productName = product.nombre || 
      getProductName(typeof product.productoId === 'object' ? product.productoId._id : product.productoId);
    
    const updatedProducts = [...orderForm.productos];
    updatedProducts.splice(index, 1);

    setOrderForm(prev => ({
      ...prev,
      productos: updatedProducts
    }));
    
    // Notificación para producto eliminado
    if (addNotification) {
      addNotification(`Producto eliminado: ${productName}`, 'info');
    }
  };

  // Resetear formulario de pedido
  const resetOrderForm = () => {
    setOrderForm({
      servicio: '',
      seccionDelServicio: '',
      userId: currentUser?._id || currentUser?.id || '',
      productos: [],
      detalle: ' '
    });
    setCurrentOrder(null);
  };

  // Calcular total del pedido
  const calculateTotal = useCallback((productos: OrderProduct[]) => {
    return productos.reduce((total, item) => {
      let precio = 0;
      
      // Primero usar precio del item si existe
      if (typeof item.precio === 'number') {
        precio = item.precio;
      } else {
        // Obtener id del producto
        const productId = typeof item.productoId === 'object' ? item.productoId._id : item.productoId;
        
        // Buscar en caché
        if (cachedProducts[productId]) {
          precio = cachedProducts[productId].precio;
        } else {
          // Buscar en lista de productos
          const product = products.find(p => p._id === productId);
          if (product) {
            precio = product.precio;
          }
        }
      }
      
      return total + (precio * item.cantidad);
    }, 0);
  }, [cachedProducts, products]);

  // Obtener nombre de producto por ID - memoizado
  const getProductName = useCallback((id: string) => {
    const product = cachedProducts[id] || products.find(p => p._id === id);
    return product?.nombre || 'Producto no encontrado';
  }, [cachedProducts, products]);

  // Obtener precio de producto por ID - memoizado
  const getProductPrice = useCallback((id: string) => {
    const product = cachedProducts[id] || products.find(p => p._id === id);
    return product?.precio || 0;
  }, [cachedProducts, products]);

  // Obtener email de usuario por ID - memoizado
  const getUserEmail = useCallback((userId: any) => {
    // Si userId es un objeto con email
    if (typeof userId === 'object' && userId !== null && userId.email) {
      return userId.email;
    }

    // Si userId es un string (ID)
    if (typeof userId === 'string') {
      const user = users.find(u => u._id === userId);
      return user?.email || 'Usuario no encontrado';
    }

    return 'Usuario no encontrado';
  }, [users]);
  
  // Obtener nombre completo del usuario - memoizado
  const getUserFullName = useCallback((userId: string) => {
    if (!userId) return 'No asignado';
    
    const user = users.find(u => u._id === userId);
    
    if (!user) return 'Usuario no encontrado';
    
    // Si tiene nombre y apellido, mostrar ambos
    if (user.nombre) {
      if (user.nombre && typeof user.nombre === 'string') {
        // Verificar si tiene apellido (asumiendo que puede estar en otra propiedad)
        const apellido = user.apellido || '';
        return `${user.nombre} ${apellido}`.trim();
      }
      return user.nombre;
    }
    
    // Si no tiene nombre, mostrar el email
    if (user.email) {
      return user.email;
    }
    
    // Si no tiene nombre ni email, mostrar el ID acortado
    return `ID: ${userId.substring(0, 8)}...`;
  }, [users]);

  // Limpiar todos los filtros
  const clearAllFilters = () => {
    setSearchTerm('');
    setDateFilter({ fechaInicio: '', fechaFin: '' });
    fetchOrders(true);
    setShowMobileFilters(false);
    setCurrentPage(1); // Resetear a la primera página
    
    // Notificación para filtros limpiados
    if (addNotification) {
      addNotification('Filtros eliminados. Mostrando todos los pedidos.', 'info');
    }
  };

  // Función para cambiar de página
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    
    // Al cambiar de página, hacemos scroll hacia arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Hacer scroll al inicio de la lista en móvil
    if (windowWidth < 768 && mobileListRef.current) {
      mobileListRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Función para descargar recibo en PDF
  const handleDownloadRemito = async (pedidoId: string) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      // Notificación para indicar que se está generando
      if (addNotification) {
        addNotification('Generando recibo PDF, por favor espere...', 'info');
      }
      
      // Generar URL para descargar remito
      const url = `https://lyme-back.vercel.app/api/downloads/remito/${pedidoId}`;
      
      // Abrir en una nueva pestaña
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error al descargar remito:', error);
      // Notificación para error
      if (addNotification) {
        addNotification(`Error al generar el recibo PDF: ${error instanceof Error ? error.message : 'Desconocido'}`, 'error');
      }
    }
  };
  
  // Función para actualizar manualmente los datos
  const handleManualRefresh = async () => {
    setRefreshing(true);
    
    // Recargar pedidos y productos
    await Promise.all([
      fetchOrders(true),
      fetchProducts(true)
    ]);
    
    setRefreshing(false);
    
    // Notificación de actualización
    if (addNotification) {
      addNotification('Datos actualizados correctamente', 'success');
    }
  };

  // Filtrar pedidos por término de búsqueda - memoizado
  const filteredOrders = useMemo(() => {
    return orders.filter(order =>
      order.servicio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(order.nPedido).includes(searchTerm) ||
      (order.seccionDelServicio || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserEmail(order.userId).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [orders, searchTerm, getUserEmail]);

  // Calcular paginación
  const indexOfLastOrder = currentPage * itemsPerPage;
  const indexOfFirstOrder = indexOfLastOrder - itemsPerPage;
  const currentOrders = useMemo(() => {
    return filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  }, [filteredOrders, indexOfFirstOrder, indexOfLastOrder]);
  
  // Calcular el total de páginas
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  // Información de paginación
  const showingFromTo = filteredOrders.length > 0 
    ? `${indexOfFirstOrder + 1}-${Math.min(indexOfLastOrder, filteredOrders.length)} de ${filteredOrders.length}`
    : '0 de 0';

  // Asegurarse de que la página actual es válida
  useEffect(() => {
    const maxPage = Math.max(1, totalPages);
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredOrders.length, itemsPerPage, currentPage, totalPages]);

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#29696B]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-[#DFEFE6]/30">
      {/* Alertas */}
      {error && (
        <Alert className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="mb-4 bg-[#DFEFE6] border-[#91BEAD] text-[#29696B] rounded-lg">
          <Check className="h-4 w-4 text-[#29696B]" />
          <AlertDescription className="ml-2">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Barra de filtros y acciones para escritorio */}
      <div className="mb-6 space-y-4 hidden md:block bg-white p-4 rounded-xl shadow-sm border border-[#91BEAD]/20">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar por cliente, sección, usuario o número..."
              className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            
            <Button
              onClick={() => {
                resetOrderForm();
                setShowCreateModal(true);
              }}
              className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Nuevo Pedido
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <Label htmlFor="fechaInicio" className="text-[#29696B]">Fecha Inicio</Label>
            <Input
              id="fechaInicio"
              type="date"
              value={dateFilter.fechaInicio}
              onChange={(e) => setDateFilter({ ...dateFilter, fechaInicio: e.target.value })}
              className="w-full border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
            />
          </div>
          <div>
            <Label htmlFor="fechaFin" className="text-[#29696B]">Fecha Fin</Label>
            <Input
              id="fechaFin"
              type="date"
              value={dateFilter.fechaFin}
              onChange={(e) => setDateFilter({ ...dateFilter, fechaFin: e.target.value })}
              className="w-full border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
            />
          </div>
          <Button
            variant="outline"
            onClick={fetchOrdersByDate}
            className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtrar por Fecha
          </Button>
          {(dateFilter.fechaInicio || dateFilter.fechaFin || searchTerm) && (
            <Button
              variant="ghost"
              onClick={clearAllFilters}
              className="text-[#7AA79C] hover:text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Barra de filtros y acciones para móvil */}
      <div className="mb-6 space-y-4 md:hidden">
        <div className="flex items-center gap-2 bg-white p-3 rounded-xl shadow-sm border border-[#91BEAD]/20">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar pedidos..."
              className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="flex-shrink-0 border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
          >
            <Filter className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            onClick={() => {
              resetOrderForm();
              setShowCreateModal(true);
            }}
            className="flex-shrink-0 bg-[#29696B] hover:bg-[#29696B]/90 text-white"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {showMobileFilters && (
          <div className="p-4 bg-[#DFEFE6]/30 rounded-lg border border-[#91BEAD]/20 space-y-4">
            <h3 className="font-medium text-sm text-[#29696B]">Filtrar por fecha</h3>
            <div className="space-y-2">
              <div>
                <Label htmlFor="mFechaInicio" className="text-xs text-[#29696B]">Fecha Inicio</Label>
                <Input
                  id="mFechaInicio"
                  type="date"
                  value={dateFilter.fechaInicio}
                  onChange={(e) => setDateFilter({ ...dateFilter, fechaInicio: e.target.value })}
                  className="w-full text-sm border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                />
              </div>
              <div>
                <Label htmlFor="mFechaFin" className="text-xs text-[#29696B]">Fecha Fin</Label>
                <Input
                  id="mFechaFin"
                  type="date"
                  value={dateFilter.fechaFin}
                  onChange={(e) => setDateFilter({ ...dateFilter, fechaFin: e.target.value })}
                  className="w-full text-sm border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
              >
                Limpiar
              </Button>
              <Button
                size="sm"
                onClick={fetchOrdersByDate}
                className="text-xs bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              >
                Aplicar Filtros
              </Button>
            </div>
          </div>
        )}

        {(dateFilter.fechaInicio || dateFilter.fechaFin) && (
          <div className="px-3 py-2 bg-[#DFEFE6]/50 rounded-md text-xs text-[#29696B] flex items-center justify-between border border-[#91BEAD]/20">
            <div>
              <CalendarRange className="w-3 h-3 inline mr-1" />
              <span>
                {dateFilter.fechaInicio && new Date(dateFilter.fechaInicio).toLocaleDateString()}
                {dateFilter.fechaInicio && dateFilter.fechaFin && ' al '}
                {dateFilter.fechaFin && new Date(dateFilter.fechaFin).toLocaleDateString()}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-6 text-xs px-2 text-[#7AA79C] hover:text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Sin resultados */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-[#7AA79C] border border-[#91BEAD]/20">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
            <ShoppingCart className="w-6 h-6 text-[#29696B]" />
          </div>
          <p>
            No se encontraron pedidos
            {searchTerm && ` que coincidan con "${searchTerm}"`}
            {(dateFilter.fechaInicio || dateFilter.fechaFin) && " en el rango de fechas seleccionado"}
          </p>
        </div>
      ) : (
        <>
          {/* Estadísticas de resultados y paginación */}
          <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm text-[#29696B] flex flex-col sm:flex-row sm:justify-between items-center mb-4">
            <span className="mb-2 sm:mb-0">
              Total: {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'}
            </span>
            <span className="text-[#29696B] font-medium">
              Mostrando: {showingFromTo}
            </span>
          </div>

          {/* Tabla de pedidos para pantallas medianas y grandes */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden hidden md:block border border-[#91BEAD]/20">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#DFEFE6]/30">
                  <tr>
                    {/* Nueva columna para número de pedido */}
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                      Nº Pedido
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                      Sección
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                      Productos
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#29696B] uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#91BEAD]/20">
                  {currentOrders.map((order) => (
                    <React.Fragment key={order._id}>
                      <tr className="hover:bg-[#DFEFE6]/10 transition-colors">
                        {/* Celda para el número de pedido */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Hash className="w-4 h-4 text-[#7AA79C] mr-2" />
                            <div className="text-sm font-medium text-[#29696B]">
                              {order.nPedido}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[#29696B]">
                            {new Date(order.fecha).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-[#7AA79C]">
                            {new Date(order.fecha).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Building className="w-4 h-4 text-[#7AA79C] mr-2" />
                            <div className="text-sm font-medium text-[#29696B]">
                              {order.servicio}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {order.seccionDelServicio ? (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 text-[#7AA79C] mr-2" />
                              <div className="text-sm text-[#29696B]">
                                {order.seccionDelServicio}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-[#7AA79C]">Sin sección</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[#29696B]">
                            {getUserEmail(order.userId)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-[#91BEAD] text-[#29696B] bg-[#DFEFE6]/30">
                              {order.productos.length} producto{order.productos.length !== 1 ? 's' : ''}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleOrderDetails(order._id)}
                              className="text-[#7AA79C] hover:text-[#29696B] hover:bg-[#DFEFE6]/30"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end space-x-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownloadRemito(order._id)}
                                    className="text-[#7AA79C] hover:text-[#29696B] hover:bg-[#DFEFE6]/30"
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Descargar remito</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditOrder(order)}
                                    className="text-[#29696B] hover:bg-[#DFEFE6]/30"
                                  >
                                    <FileEdit className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Editar pedido</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => confirmDeleteOrder(order._id)}
                                    className="text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Eliminar pedido</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </td>
                      </tr>

                      {/* Detalles del pedido (expandible) */}
                      {orderDetailsOpen === order._id && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-[#DFEFE6]/20">
                            <div className="space-y-3">
                              <div className="font-medium text-[#29696B]">Detalles del Pedido #{order.nPedido}</div>
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-[#91BEAD]/20">
                                  <thead className="bg-[#DFEFE6]/50">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-[#29696B]">Producto</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-[#29696B]">Cantidad</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-[#29696B]">Precio</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-[#29696B]">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#91BEAD]/20">
                                    {order.productos.map((item, index) => (
                                      <tr key={index} className="hover:bg-[#DFEFE6]/20">
                                        <ProductDetail 
                                          item={item} 
                                          cachedProducts={cachedProducts} 
                                          products={products} 
                                          getProductDetails={getProductDetails} 
                                        />
                                      </tr>
                                    ))}

                                    {/* Total */}
                                    <tr className="bg-[#DFEFE6]/40">
                                      <td colSpan={3} className="px-4 py-2 text-right font-medium text-[#29696B]">Total del Pedido:</td>
                                      <td className="px-4 py-2 font-bold text-[#29696B]">
                                        <OrderTotalCalculator 
                                          order={order} 
                                          cachedProducts={cachedProducts} 
                                          products={products} 
                                          getProductDetails={getProductDetails} 
                                        />
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación para la tabla */}
            {filteredOrders.length > itemsPerPage && (
              <div className="py-4 border-t border-[#91BEAD]/20">
                <Pagination
                  totalItems={filteredOrders.length}
                  itemsPerPage={itemsPerPage}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                  className="px-6"
                />
              </div>
            )}
          </div>

          {/* Vista de tarjetas para móviles */}
          <div ref={mobileListRef} id="mobile-orders-list" className="md:hidden grid grid-cols-1 gap-4">
            {/* Paginación visible en la parte superior para móvil */}
            {!loading && filteredOrders.length > itemsPerPage && (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20">
                <Pagination
                  totalItems={filteredOrders.length}
                  itemsPerPage={itemsPerPage}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
            
            {!loading && currentOrders.map(order => (
              <Card key={order._id} className="overflow-hidden shadow-sm border border-[#91BEAD]/20">
                <CardHeader className="pb-2 bg-[#DFEFE6]/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-sm font-medium flex items-center text-[#29696B]">
                        <Building className="w-4 h-4 text-[#7AA79C] mr-1" />
                        {order.servicio}
                      </CardTitle>
                      {order.seccionDelServicio && (
                        <div className="text-xs text-[#7AA79C] flex items-center mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {order.seccionDelServicio}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {/* Badge para el número de pedido */}
                      <Badge variant="outline" className="text-xs border-[#91BEAD] text-[#29696B] bg-[#DFEFE6]/20">
                        <Hash className="w-3 h-3 mr-1" />
                        {order.nPedido}
                      </Badge>
                      {/* Badge para la fecha */}
                      <Badge variant="outline" className="text-xs border-[#91BEAD] text-[#29696B] bg-[#DFEFE6]/20">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(order.fecha).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="text-xs space-y-1">
                    <div className="flex items-center">
                      <User className="w-3 h-3 text-[#7AA79C] mr-1" />
                      <span className="text-[#29696B]">{getUserEmail(order.userId)}</span>
                    </div>
                    <div className="flex items-center">
                      <ShoppingCart className="w-3 h-3 text-[#7AA79C] mr-1" />
                      <span className="text-[#29696B]">{order.productos.length} productos</span>
                    </div>
                  </div>

                  {/* Detalles expandibles en móvil */}
                  <Accordion
                    type="single"
                    collapsible
                    className="mt-2"
                    value={mobileOrderDetailsOpen === order._id ? "details" : ""}
                  >
                    <AccordionItem value="details" className="border-0">
                      <AccordionTrigger
                        onClick={() => toggleMobileOrderDetails(order._id)}
                        className="py-1 text-xs font-medium text-[#29696B]"
                      >
                        Ver detalles
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="text-xs pt-2 pb-1">
                          <div className="font-medium mb-2 text-[#29696B]">Productos:</div>
                          <div className="space-y-1">
                            {order.productos.map((item, index) => (
                              <ProductDetailCard
                                key={index}
                                item={item}
                                cachedProducts={cachedProducts}
                                products={products}
                                getProductDetails={getProductDetails}
                              />
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-2 font-medium text-sm">
                            <span className="text-[#29696B]">Total:</span>
                            <div className="flex items-center text-[#29696B]">
                              <DollarSign className="w-3 h-3 mr-1" />
                              <OrderTotalCalculator
                                order={order}
                                cachedProducts={cachedProducts}
                                products={products}
                                getProductDetails={getProductDetails}
                              />
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
                <CardFooter className="py-2 px-4 bg-[#DFEFE6]/10 flex justify-end gap-2 border-t border-[#91BEAD]/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-[#7AA79C] hover:bg-[#DFEFE6]/30"
                    onClick={() => handleDownloadRemito(order._id)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-[#29696B] hover:bg-[#DFEFE6]/30"
                    onClick={() => handleEditOrder(order)}
                  >
                    <FileEdit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-red-600 hover:bg-red-50"
                    onClick={() => confirmDeleteOrder(order._id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}

            {/* Mensaje que muestra la página actual y el total */}
            {!loading && filteredOrders.length > itemsPerPage && (
              <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm">
                <span className="text-[#29696B] font-medium">
                  Página {currentPage} de {totalPages}
                </span>
              </div>
            )}
            
            {/* Paginación duplicada al final de la lista para mayor visibilidad */}
            {!loading && filteredOrders.length > itemsPerPage && (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20 mt-2">
                <Pagination
                  totalItems={filteredOrders.length}
                  itemsPerPage={itemsPerPage}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal de Producto */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">
              {currentOrder ? `Editar Pedido #${currentOrder.nPedido}` : 'Nuevo Pedido'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* Sección de Cliente */}
            <div>
              <h2 className="text-lg font-medium mb-4 flex items-center text-[#29696B]">
                <Building className="w-5 h-5 mr-2 text-[#7AA79C]" />
                Selección de Cliente
              </h2>

              {clients.length === 0 ? (
                <Alert className="bg-[#DFEFE6]/30 border border-[#91BEAD] text-[#29696B]">
                  <AlertDescription>
                    No tiene clientes asignados o no se pudieron cargar. Contacte a un administrador para que le asigne clientes.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cliente" className="text-[#29696B]">Cliente</Label>
                    <Select
                      value={
                        clients.find(c => c.servicio === orderForm.servicio)?._id ||
                        "none"
                      }
                      onValueChange={handleClientChange}
                    >
                      <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" disabled>Seleccione un cliente</SelectItem>
                        {Object.entries(clientSections).map(([servicio, serviceClients]) => (
                          <SelectItem
                            key={servicio}
                            value={serviceClients[0]._id}
                          >
                            {servicio}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {orderForm.seccionDelServicio && (
                    <div className="flex items-center p-3 bg-[#DFEFE6]/30 rounded-md border border-[#91BEAD]/30">
                      <MapPin className="w-4 h-4 text-[#7AA79C] mr-2" />
                      <span className="text-[#29696B]">Sección: {orderForm.seccionDelServicio || 'Principal'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Estado del formulario para debug - Actualizado para mostrar email en lugar de ID */}
            {orderForm.servicio && (
              <div className="p-3 bg-[#DFEFE6]/20 rounded-md text-xs text-[#7AA79C] border border-[#91BEAD]/30">
                <div><strong className="text-[#29696B]">Cliente:</strong> {orderForm.servicio}</div>
                <div><strong className="text-[#29696B]">Sección:</strong> {orderForm.seccionDelServicio || "No especificada"}</div>
                <div><strong className="text-[#29696B]">Usuario:</strong> {getUserEmail(orderForm.userId) || "No asignado"}</div>
              </div>
            )}

            {/* Productos del Pedido */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium flex items-center text-[#29696B]">
                  <ShoppingCart className="w-5 h-5 mr-2 text-[#7AA79C]" />
                  Productos
                </h2>

                <Button
                  variant="outline"
                  onClick={() => {
                    setShowProductModal(true);
                    console.log("Productos disponibles:", products.length);
                  }}
                  disabled={!orderForm.servicio || products.length === 0}
                  className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Producto
                </Button>
              </div>

              {orderForm.productos.length === 0 ? (
                <div className="text-center py-8 text-[#7AA79C] border border-dashed border-[#91BEAD]/40 rounded-md bg-[#DFEFE6]/10">
                  No hay productos en el pedido
                </div>
              ) : (
                <div className="space-y-2">
                  {orderForm.productos.map((item, index) => {
                    const productId = typeof item.productoId === 'object' ? item.productoId._id : item.productoId;
                    const product = products.find(p => p._id === productId) || cachedProducts[productId];
                    return (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-[#DFEFE6]/20 rounded-md border border-[#91BEAD]/30"
                      >
                        <div>
                          <div className="font-medium text-[#29696B]">{item.nombre || product?.nombre || getProductName(productId)}</div>
                          <div className="text-sm text-[#7AA79C]">
                            Cantidad: {item.cantidad} x ${item.precio || product?.precio || getProductPrice(productId)}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="font-medium text-[#29696B]">
                            ${((item.precio || product?.precio || getProductPrice(productId) || 0) * item.cantidad).toFixed(2)}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveProduct(index)}
                            className="text-red-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Total */}
                  <div className="flex justify-between items-center p-3 bg-[#DFEFE6]/40 rounded-md mt-4 border border-[#91BEAD]/30">
                    <div className="font-medium text-[#29696B]">Total</div>
                    <div className="font-bold text-lg text-[#29696B]">${calculateTotal(orderForm.productos).toFixed(2)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                resetOrderForm();
              }}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Cancelar
            </Button>
            <Button
              onClick={currentOrder ? handleUpdateOrder : handleCreateOrder}
              disabled={loading || orderForm.productos.length === 0 || !orderForm.servicio}
              className="bg-[#29696B] hover:bg-[#29696B]/90 text-white disabled:bg-[#8DB3BA] disabled:text-white/70"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </span>
              ) : currentOrder ? 'Actualizar Pedido' : 'Crear Pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para seleccionar sección */}
      <Dialog open={showSectionModal} onOpenChange={setShowSectionModal}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">Seleccionar Sección</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-[#7AA79C] mb-4">
              Seleccione la sección para este pedido:
            </p>

            <div className="space-y-2">
              {orderForm.servicio &&
                clientSections[orderForm.servicio]?.map((client) => (
                  <div
                    key={client._id}
                    className="p-3 border border-[#91BEAD] rounded-md hover:bg-[#DFEFE6]/30 cursor-pointer transition-colors"
                    onClick={() => handleSectionSelect(client.seccionDelServicio || "")}
                  >
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-[#7AA79C] mr-2" />
                      <span className="text-[#29696B]">{client.seccionDelServicio || 'Principal'}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSectionModal(false)}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para agregar producto */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">Agregar Producto</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="producto" className="text-[#29696B]">Producto</Label>
              <Select
                value={selectedProduct}
                onValueChange={setSelectedProduct}
              >
                <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Seleccione un producto</SelectItem>
                  {products.map(product => (
                    <SelectItem key={product._id} value={product._id}>
                      {product.nombre} - ${product.precio.toFixed(2)} (Stock: {product.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cantidad" className="text-[#29696B]">Cantidad</Label>
              <Input
                id="cantidad"
                type="number"
                min="1"
                value={productQuantity}
                onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)}
                className="border-[#91BEAD] focus:ring-[#29696B]/20 focus:border-[#29696B]"
              />
            </div>

            {/* Información de productos disponibles */}
            <div className="text-xs text-[#7AA79C]">
              Productos disponibles: {products.length}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowProductModal(false)}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAddProduct}
              className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
            >
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Eliminar pedido"
        description="¿Está seguro de que desea eliminar este pedido? Esta acción ajustará el inventario y no puede deshacerse."
        confirmText="Eliminar"
        cancelText="Cancelar" 
        onConfirm={() => orderToDelete && handleDeleteOrder(orderToDelete)}
        variant="destructive"
      />
    </div>
  );
};

export default OrdersSection;