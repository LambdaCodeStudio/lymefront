// OrdersSection.tsx - VERSIÓN OPTIMIZADA
// Implementa:
// 1. Sistema de caché avanzado con validación inteligente
// 2. Carga de datos bajo demanda y prefetching inteligente
// 3. Reducción de consultas redundantes
// 4. UI totalmente responsive con optimizaciones específicas
// 5. Componentes virtualizados para rendimiento en listas largas

import React, { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
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
  RefreshCw,
  Info
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Pagination from "@/components/ui/pagination";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { refreshInventory, getAuthToken } from '@/utils/inventoryUtils';

// ======== TIPOS Y INTERFACES ========

interface User {
  _id: string;
  id?: string;
  email: string;
  nombre?: string;
  apellido?: string;
  role: string;
  isActive?: boolean;
}

interface Client {
  _id: string;
  servicio: string;
  seccionDelServicio: string;
  userId: string | User;
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

interface OrderForm {
  servicio: string;
  seccionDelServicio: string;
  userId: string;
  productos: OrderProduct[];
  detalle?: string;
}

// ======== CONSTANTES DE CONFIGURACIÓN ========

// Tiempo en MS para considerar que el cache necesita actualización
const CACHE_EXPIRATION = {
  ORDERS: 60 * 1000, // 1 minuto
  PRODUCTS: 5 * 60 * 1000, // 5 minutos
  USERS: 15 * 60 * 1000, // 15 minutos
  CLIENTS: 15 * 60 * 1000, // 15 minutos
  USER_DATA: 30 * 60 * 1000, // 30 minutos
};

// Claves para localStorage
const STORAGE_KEYS = {
  ORDERS: 'lyme_orders_cache',
  PRODUCTS: 'lyme_products_cache',
  USERS: 'lyme_users_cache',
  CLIENTS: 'lyme_clients_cache',
  CURRENT_USER: 'lyme_current_user',
  LAST_FETCH: 'lyme_last_fetch_',
};

// Items por página según tamaño de pantalla
const ITEMS_PER_PAGE = {
  MOBILE: 4,
  TABLET: 8,
  DESKTOP: 12,
};

// Umbrales para tamaños de pantalla
const SCREEN_SIZES = {
  MOBILE: 640,
  TABLET: 1024,
};

// ======== COMPONENTES AUXILIARES ========

// Esqueleto de carga para los pedidos
const OrdersSkeleton = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array(count).fill(0).map((_, i) => (
      <div key={i} className="bg-white rounded-xl shadow-sm p-4 border border-[#91BEAD]/20">
        <div className="flex justify-between items-start mb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Componente para detalles de un producto en un pedido
const ProductDetail = React.memo(({ 
  item, 
  productsMap,
  onProductLoad 
}: { 
  item: OrderProduct; 
  productsMap: Record<string, Product>; 
  onProductLoad: (productId: string) => Promise<Product | null>; 
}) => {
  const [productDetail, setProductDetail] = useState<{
    nombre: string;
    precio: number;
    loaded: boolean;
  }>({
    nombre: "Cargando...",
    precio: 0,
    loaded: false
  });
  
  const mountedRef = useRef(true);
  
  useEffect(() => {
    const fetchProductDetails = async () => {
      // Extraer el ID del producto
      const productId = typeof item.productoId === 'object' 
        ? item.productoId._id 
        : item.productoId as string;
      
      // Si ya tenemos información directamente en el item
      if (item.nombre && typeof item.precio === 'number') {
        if (mountedRef.current) {
          setProductDetail({
            nombre: item.nombre,
            precio: item.precio,
            loaded: true
          });
        }
        return;
      }
      
      // Si el producto está en el mapa de productos
      if (productsMap[productId]) {
        if (mountedRef.current) {
          setProductDetail({
            nombre: productsMap[productId].nombre,
            precio: productsMap[productId].precio,
            loaded: true
          });
        }
        return;
      }
      
      // Si no lo tenemos, cargar del servidor
      try {
        const product = await onProductLoad(productId);
        if (mountedRef.current && product) {
          setProductDetail({
            nombre: product.nombre,
            precio: product.precio,
            loaded: true
          });
        }
      } catch (error) {
        console.error("Error cargando detalles del producto:", error);
        if (mountedRef.current) {
          setProductDetail({
            nombre: "Error al cargar",
            precio: 0,
            loaded: true
          });
        }
      }
    };
    
    fetchProductDetails();
    
    return () => {
      mountedRef.current = false;
    };
  }, [item, productsMap, onProductLoad]);
  
  if (!productDetail.loaded) {
    return (
      <>
        <td className="px-4 py-2 whitespace-nowrap">
          <Skeleton className="h-5 w-32" />
        </td>
        <td className="px-4 py-2 whitespace-nowrap text-center">
          <Skeleton className="h-5 w-12 mx-auto" />
        </td>
        <td className="px-4 py-2 whitespace-nowrap text-right">
          <Skeleton className="h-5 w-16 ml-auto" />
        </td>
        <td className="px-4 py-2 whitespace-nowrap text-right">
          <Skeleton className="h-5 w-20 ml-auto" />
        </td>
      </>
    );
  }
  
  return (
    <>
      <td className="px-4 py-2 whitespace-nowrap text-[#29696B]">{productDetail.nombre}</td>
      <td className="px-4 py-2 whitespace-nowrap text-center text-[#7AA79C]">{item.cantidad}</td>
      <td className="px-4 py-2 whitespace-nowrap text-right text-[#7AA79C]">${productDetail.precio.toFixed(2)}</td>
      <td className="px-4 py-2 whitespace-nowrap text-right font-medium text-[#29696B]">
        ${(productDetail.precio * item.cantidad).toFixed(2)}
      </td>
    </>
  );
});

// Componente para detalles de un producto en la vista móvil
const ProductDetailMobile = React.memo(({ 
  item, 
  productsMap,
  onProductLoad 
}: { 
  item: OrderProduct; 
  productsMap: Record<string, Product>; 
  onProductLoad: (productId: string) => Promise<Product | null>; 
}) => {
  const [productDetail, setProductDetail] = useState<{
    nombre: string;
    precio: number;
    loaded: boolean;
  }>({
    nombre: "Cargando...",
    precio: 0,
    loaded: false
  });
  
  const mountedRef = useRef(true);
  
  useEffect(() => {
    const fetchProductDetails = async () => {
      // Extraer el ID del producto
      const productId = typeof item.productoId === 'object' 
        ? item.productoId._id 
        : item.productoId as string;
      
      // Si ya tenemos información directamente en el item
      if (item.nombre && typeof item.precio === 'number') {
        if (mountedRef.current) {
          setProductDetail({
            nombre: item.nombre,
            precio: item.precio,
            loaded: true
          });
        }
        return;
      }
      
      // Si el producto está en el mapa de productos
      if (productsMap[productId]) {
        if (mountedRef.current) {
          setProductDetail({
            nombre: productsMap[productId].nombre,
            precio: productsMap[productId].precio,
            loaded: true
          });
        }
        return;
      }
      
      // Si no lo tenemos, cargar del servidor
      try {
        const product = await onProductLoad(productId);
        if (mountedRef.current && product) {
          setProductDetail({
            nombre: product.nombre,
            precio: product.precio,
            loaded: true
          });
        }
      } catch (error) {
        console.error("Error cargando detalles del producto:", error);
        if (mountedRef.current) {
          setProductDetail({
            nombre: "Error al cargar",
            precio: 0,
            loaded: true
          });
        }
      }
    };
    
    fetchProductDetails();
    
    return () => {
      mountedRef.current = false;
    };
  }, [item, productsMap, onProductLoad]);
  
  if (!productDetail.loaded) {
    return (
      <div className="py-2 flex justify-between items-center border-b border-[#91BEAD]/20">
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>
    );
  }
  
  return (
    <div className="py-2 flex justify-between items-center border-b border-[#91BEAD]/20">
      <div>
        <div className="font-medium text-[#29696B]">{productDetail.nombre}</div>
        <div className="text-xs text-[#7AA79C]">
          {item.cantidad} x ${productDetail.precio.toFixed(2)}
        </div>
      </div>
      <div className="text-sm font-medium text-[#29696B]">
        ${(productDetail.precio * item.cantidad).toFixed(2)}
      </div>
    </div>
  );
});

// Componente para calcular el total de un pedido
const OrderTotal = React.memo(({ 
  order, 
  productsMap,
  onProductLoad 
}: { 
  order: Order; 
  productsMap: Record<string, Product>; 
  onProductLoad: (productId: string) => Promise<Product | null>; 
}) => {
  const [total, setTotal] = useState<number | null>(null);
  const mountedRef = useRef(true);
  
  useEffect(() => {
    const calculateTotal = async () => {
      if (!order.productos || !Array.isArray(order.productos) || order.productos.length === 0) {
        if (mountedRef.current) setTotal(0);
        return;
      }
      
      let sum = 0;
      let pendingProducts = [];
      
      // Primero calcular con los datos que ya tenemos
      for (const item of order.productos) {
        const productId = typeof item.productoId === 'object' 
          ? item.productoId._id 
          : item.productoId as string;
        
        // Si el item ya tiene precio, usarlo
        if (typeof item.precio === 'number') {
          sum += item.precio * item.cantidad;
          continue;
        }
        
        // Si el producto está en el mapa, usar su precio
        if (productsMap[productId]) {
          sum += productsMap[productId].precio * item.cantidad;
          continue;
        }
        
        // Si no tenemos el precio, agregar a pendientes
        pendingProducts.push(productId);
      }
      
      // Si hay productos pendientes, cargarlos
      if (pendingProducts.length > 0) {
        // Cargamos en paralelo, pero con un límite de 5 a la vez
        const batchSize = 5;
        for (let i = 0; i < pendingProducts.length; i += batchSize) {
          const batch = pendingProducts.slice(i, i + batchSize);
          const productPromises = batch.map(id => onProductLoad(id));
          
          try {
            const products = await Promise.all(productPromises);
            
            // Actualizar suma con productos cargados
            for (let j = 0; j < products.length; j++) {
              const product = products[j];
              const productId = batch[j];
              
              if (product) {
                // Encontrar el item correspondiente
                const item = order.productos.find(p => {
                  const itemId = typeof p.productoId === 'object' ? p.productoId._id : p.productoId;
                  return itemId === productId;
                });
                
                if (item) {
                  sum += product.precio * item.cantidad;
                }
              }
            }
          } catch (error) {
            console.error("Error cargando productos para cálculo:", error);
          }
        }
      }
      
      if (mountedRef.current) setTotal(sum);
    };
    
    calculateTotal();
    
    return () => {
      mountedRef.current = false;
    };
  }, [order, productsMap, onProductLoad]);
  
  if (total === null) {
    return <Skeleton className="h-5 w-20 inline-block" />;
  }
  
  return <span>${total.toFixed(2)}</span>;
});

// ======== COMPONENTE PRINCIPAL ========

const OrdersSection = () => {
  const { addNotification } = useNotification();
  
  // ======== ESTADOS ========
  
  // Estado de carga
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  
  // Datos principales
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Mapas para acceso rápido (como índices)
  const [productsMap, setProductsMap] = useState<Record<string, Product>>({});
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [clientSections, setClientSections] = useState<Record<string, Client[]>>({});
  
  // Estados de UI
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState<Record<string, boolean>>({});
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Estados de modales
  const [createOrderModalOpen, setCreateOrderModalOpen] = useState(false);
  const [selectProductModalOpen, setSelectProductModalOpen] = useState(false);
  const [selectSectionModalOpen, setSelectSectionModalOpen] = useState(false);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  // Estados de formulario para crear/editar pedidos
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState<OrderForm>({
    servicio: '',
    seccionDelServicio: '',
    userId: '',
    productos: [],
    detalle: ''
  });
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productQuantity, setProductQuantity] = useState(1);
  
  // Estado de error/éxito
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Referencias
  const initialLoadComplete = useRef(false);
  const mountedRef = useRef(true);
  const lastFetchTimestamps = useRef<Record<string, number>>({});
  const mobileListRef = useRef<HTMLDivElement>(null);
  const productLoadQueue = useRef<Set<string>>(new Set());
  const isProcessingQueue = useRef(false);
  
  // ======== CACHÉ Y PERSISTENCIA ========
  
  // Función para verificar si el caché ha expirado
  const isCacheExpired = useCallback((key: string, expirationTime: number) => {
    const lastFetch = lastFetchTimestamps.current[key] || 0;
    return Date.now() - lastFetch > expirationTime;
  }, []);
  
  // Guardar datos en localStorage con manejo de errores
  const saveToLocalStorage = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      lastFetchTimestamps.current[key] = Date.now();
      return true;
    } catch (error) {
      console.warn(`Error almacenando datos en localStorage (${key}):`, error);
      return false;
    }
  }, []);
  
  // Cargar datos de localStorage con manejo de errores
  const loadFromLocalStorage = useCallback((key: string) => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      
      const { data, timestamp } = JSON.parse(stored);
      lastFetchTimestamps.current[key] = timestamp;
      return data;
    } catch (error) {
      console.warn(`Error cargando datos de localStorage (${key}):`, error);
      return null;
    }
  }, []);
  
  // ======== CARGA DE DATOS INICIAL ========
  
  // Inicializar datos desde localStorage al montar el componente
  useEffect(() => {
    // Función para cargar datos de localStorage
    const loadCachedData = () => {
      // Intentar cargar datos de usuario
      const cachedUser = loadFromLocalStorage(STORAGE_KEYS.CURRENT_USER);
      if (cachedUser) {
        setCurrentUser(cachedUser);
        
        // Actualizar el ID de usuario en el formulario de pedido
        setOrderForm(prev => ({
          ...prev,
          userId: cachedUser._id || cachedUser.id || ""
        }));
      }
      
      // Intentar cargar productos
      const cachedProducts = loadFromLocalStorage(STORAGE_KEYS.PRODUCTS);
      if (cachedProducts) {
        setProducts(cachedProducts);
        
        // Crear mapa para acceso rápido
        const productMap = cachedProducts.reduce((map: Record<string, Product>, product: Product) => {
          map[product._id] = product;
          return map;
        }, {});
        setProductsMap(productMap);
      }
      
      // Intentar cargar usuarios
      const cachedUsers = loadFromLocalStorage(STORAGE_KEYS.USERS);
      if (cachedUsers) {
        setUsers(cachedUsers);
        
        // Crear mapa para acceso rápido
        const userMap = cachedUsers.reduce((map: Record<string, User>, user: User) => {
          map[user._id] = user;
          return map;
        }, {});
        setUsersMap(userMap);
      }
      
      // Intentar cargar clientes
      const cachedClients = loadFromLocalStorage(STORAGE_KEYS.CLIENTS);
      if (cachedClients) {
        setClients(cachedClients);
        
        // Agrupar por servicio
        const sectionMap = cachedClients.reduce((map: Record<string, Client[]>, client: Client) => {
          if (!map[client.servicio]) {
            map[client.servicio] = [];
          }
          map[client.servicio].push(client);
          return map;
        }, {});
        setClientSections(sectionMap);
      }
      
      // Intentar cargar pedidos
      const cachedOrders = loadFromLocalStorage(STORAGE_KEYS.ORDERS);
      if (cachedOrders) {
        setOrders(cachedOrders);
      }
    };
    
    // Cargar datos de caché
    loadCachedData();
    
    // Marcar componente como montado y configurar efecto de cleanup
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
    };
  }, [loadFromLocalStorage]);
  
  // Efecto para cargar datos después de la primera renderización
  useEffect(() => {
    const fetchInitialData = async () => {
      if (initialLoadComplete.current) return;
      initialLoadComplete.current = true;
      
      setIsLoading(true);
      
      try {
        // Cargar datos en secuencia
        await fetchUserData();
        await fetchUsers();
        await fetchProducts();
        await fetchOrders();
        
        if (currentUser?._id) {
          await fetchClients(currentUser._id);
        }
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
        setError("Error cargando los datos iniciales. Por favor, recargue la página.");
        
        if (addNotification) {
          addNotification("Error cargando los datos iniciales", "error");
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };
    
    fetchInitialData();
  }, []);
  
  // Efecto para detectar cambios de tamaño de ventana
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  
  // Determinar número de items por página según tamaño de pantalla
  const itemsPerPage = useMemo(() => {
    if (windowWidth < SCREEN_SIZES.MOBILE) return ITEMS_PER_PAGE.MOBILE;
    if (windowWidth < SCREEN_SIZES.TABLET) return ITEMS_PER_PAGE.TABLET;
    return ITEMS_PER_PAGE.DESKTOP;
  }, [windowWidth]);
  
  // ======== FUNCIONES DE CARGA DE DATOS ========
  
  // Cargar información del usuario actual
  const fetchUserData = async (forceRefresh = false) => {
    // Verificar si debemos recargar o usar caché
    if (currentUser && !forceRefresh && !isCacheExpired(STORAGE_KEYS.CURRENT_USER, CACHE_EXPIRATION.USER_DATA)) {
      return currentUser;
    }
    
    try {
      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");
      
      const response = await fetch('https://lyme-back.vercel.app/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        // Si es error de autenticación, redirigir a login
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          window.location.href = '/login';
          return null;
        }
        
        throw new Error(`Error al obtener datos del usuario: ${response.status}`);
      }
      
      const userData = await response.json();
      
      if (!mountedRef.current) return null;
      
      // Actualizar estado
      setCurrentUser(userData);
      
      // Actualizar caché
      saveToLocalStorage(STORAGE_KEYS.CURRENT_USER, userData);
      
      // Actualizar ID de usuario en formulario
      const userId = userData._id || userData.id;
      if (userId) {
        setOrderForm(prev => ({ ...prev, userId }));
        
        // Cargar clientes del usuario
        await fetchClients(userId);
      }
      
      return userData;
    } catch (error) {
      console.error("Error cargando datos del usuario:", error);
      setError("Error al cargar la información del usuario");
      
      if (addNotification) {
        addNotification("No se pudo cargar la información del usuario", "error");
      }
      
      return null;
    }
  };
  
  // Cargar pedidos
  const fetchOrders = async (forceRefresh = false) => {
    // Verificar si debemos recargar o usar caché
    if (orders.length > 0 && !forceRefresh && !isCacheExpired(STORAGE_KEYS.ORDERS, CACHE_EXPIRATION.ORDERS)) {
      return orders;
    }
    
    try {
      setIsRefreshing(true);
      
      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");
      
      // Determinar URL según filtros de fecha
      let url = 'https://lyme-back.vercel.app/api/pedido';
      
      if (dateFilter.from && dateFilter.to) {
        url = `https://lyme-back.vercel.app/api/pedido/fecha?fechaInicio=${encodeURIComponent(dateFilter.from)}&fechaFin=${encodeURIComponent(dateFilter.to)}`;
      }
      
      const response = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache' 
        }
      });
      
      if (!response.ok) {
        // Si es error de autenticación, redirigir a login
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          window.location.href = '/login';
          return [];
        }
        
        throw new Error(`Error al obtener pedidos: ${response.status}`);
      }
      
      const ordersData = await response.json();
      
      if (!mountedRef.current) return [];
      
      // Actualizar estado
      setOrders(ordersData);
      
      // Actualizar caché
      saveToLocalStorage(STORAGE_KEYS.ORDERS, ordersData);
      
      // Volver a la primera página cuando se cargan nuevos datos
      setCurrentPage(1);
      
      // Prefetch de productos en los pedidos
      if (Array.isArray(ordersData) && ordersData.length > 0) {
        prefetchProductsFromOrders(ordersData);
      }
      
      return ordersData;
    } catch (error) {
      console.error("Error cargando pedidos:", error);
      setError("Error al cargar los pedidos");
      
      if (addNotification) {
        addNotification("No se pudieron cargar los pedidos", "error");
      }
      
      return [];
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  };
  
  // Cargar productos
  const fetchProducts = async (forceRefresh = false) => {
    // Verificar si debemos recargar o usar caché
    if (products.length > 0 && !forceRefresh && !isCacheExpired(STORAGE_KEYS.PRODUCTS, CACHE_EXPIRATION.PRODUCTS)) {
      return products;
    }
    
    try {
      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");
      
      const response = await fetch('https://lyme-back.vercel.app/api/producto', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache' 
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error al obtener productos: ${response.status}`);
      }
      
      let productsData: Product[] = [];
      const responseData = await response.json();
      
      // Determinar formato de respuesta (array o paginado)
      if (Array.isArray(responseData)) {
        productsData = responseData;
      } else if (responseData && Array.isArray(responseData.items)) {
        productsData = responseData.items;
      }
      
      if (!mountedRef.current) return products;
      
      // Actualizar estado
      setProducts(productsData);
      
      // Crear mapa para acceso rápido
      const productMap = productsData.reduce((map: Record<string, Product>, product: Product) => {
        map[product._id] = product;
        return map;
      }, {});
      setProductsMap(productMap);
      
      // Actualizar caché
      saveToLocalStorage(STORAGE_KEYS.PRODUCTS, productsData);
      
      return productsData;
    } catch (error) {
      console.error("Error cargando productos:", error);
      
      if (addNotification) {
        addNotification("No se pudieron cargar los productos", "warning");
      }
      
      return products;
    }
  };
  
  // Cargar usuarios
  const fetchUsers = async (forceRefresh = false) => {
    // Verificar si debemos recargar o usar caché
    if (users.length > 0 && !forceRefresh && !isCacheExpired(STORAGE_KEYS.USERS, CACHE_EXPIRATION.USERS)) {
      return users;
    }
    
    try {
      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");
      
      const response = await fetch('https://lyme-back.vercel.app/api/auth/users', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache' 
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error al obtener usuarios: ${response.status}`);
      }
      
      const usersData = await response.json();
      
      if (!mountedRef.current) return users;
      
      // Actualizar estado
      setUsers(usersData);
      
      // Crear mapa para acceso rápido
      const userMap = usersData.reduce((map: Record<string, User>, user: User) => {
        map[user._id] = user;
        return map;
      }, {});
      setUsersMap(userMap);
      
      // Actualizar caché
      saveToLocalStorage(STORAGE_KEYS.USERS, usersData);
      
      return usersData;
    } catch (error) {
      console.error("Error cargando usuarios:", error);
      
      if (addNotification) {
        addNotification("No se pudieron cargar los usuarios", "warning");
      }
      
      return users;
    }
  };
  
  // Cargar clientes de un usuario
  const fetchClients = async (userId: string, forceRefresh = false) => {
    // Verificar si debemos recargar o usar caché
    const clientCacheKey = `${STORAGE_KEYS.CLIENTS}_${userId}`;
    if (clients.length > 0 && !forceRefresh && !isCacheExpired(clientCacheKey, CACHE_EXPIRATION.CLIENTS)) {
      return clients;
    }
    
    try {
      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");
      
      const response = await fetch(`https://lyme-back.vercel.app/api/cliente/user/${userId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache' 
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error al obtener clientes: ${response.status}`);
      }
      
      const clientsData = await response.json();
      
      if (!mountedRef.current) return clients;
      
      // Actualizar estado
      setClients(clientsData);
      
      // Agrupar por servicio
      const sectionMap = clientsData.reduce((map: Record<string, Client[]>, client: Client) => {
        if (!map[client.servicio]) {
          map[client.servicio] = [];
        }
        map[client.servicio].push(client);
        return map;
      }, {});
      setClientSections(sectionMap);
      
      // Actualizar caché
      saveToLocalStorage(clientCacheKey, clientsData);
      
      return clientsData;
    } catch (error) {
      console.error("Error cargando clientes:", error);
      
      if (addNotification) {
        addNotification("No se pudieron cargar los clientes", "warning");
      }
      
      return clients;
    }
  };
  
  // Cargar un producto específico
  const fetchProductById = async (productId: string): Promise<Product | null> => {
    // Si ya tenemos el producto en caché, devolverlo
    if (productsMap[productId]) {
      return productsMap[productId];
    }
    
    try {
      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");
      
      const response = await fetch(`https://lyme-back.vercel.app/api/producto/${productId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache' 
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error al obtener producto: ${response.status}`);
      }
      
      const product = await response.json();
      
      if (!mountedRef.current) return null;
      
      // Actualizar mapa de productos
      setProductsMap(prev => {
        const updated = { ...prev, [productId]: product };
        return updated;
      });
      
      return product;
    } catch (error) {
      console.error(`Error cargando producto ${productId}:`, error);
      return null;
    }
  };
  
  // ======== FUNCIONES DE NEGOCIO ========
  
  // Crear un nuevo pedido
  const handleCreateOrder = async () => {
    // Validaciones
    if (!orderForm.servicio) {
      setError("Debe seleccionar un cliente");
      addNotification("Debe seleccionar un cliente", "warning");
      return;
    }
    
    if (orderForm.productos.length === 0) {
      setError("Debe agregar al menos un producto");
      addNotification("Debe agregar al menos un producto", "warning");
      return;
    }
    
    setLoadingActionId("create-order");
    setError(null);
    
    try {
      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");
      
      // Preparar datos del pedido
      const orderData = {
        userId: orderForm.userId || (currentUser?._id || currentUser?.id || ""),
        servicio: orderForm.servicio,
        seccionDelServicio: orderForm.seccionDelServicio || "",
        detalle: orderForm.detalle || " ",
        productos: orderForm.productos.map(p => ({
          productoId: typeof p.productoId === 'object' ? p.productoId._id : p.productoId,
          cantidad: p.cantidad
        }))
      };
      
      const response = await fetch('https://lyme-back.vercel.app/api/pedido', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || `Error al crear pedido: ${response.status}`);
      }
      
      // Recargar pedidos y productos
      await Promise.all([
        fetchOrders(true),
        fetchProducts(true)
      ]);
      
      // Notificar cambio de inventario
      await refreshInventory();
      
      // Resetear formulario y cerrar modal
      resetOrderForm();
      setCreateOrderModalOpen(false);
      
      // Mostrar mensaje de éxito
      setSuccessMessage("Pedido creado correctamente");
      addNotification("Pedido creado correctamente", "success");
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error creando pedido:", error);
      setError(`Error al crear pedido: ${error instanceof Error ? error.message : String(error)}`);
      addNotification(`Error al crear pedido: ${error instanceof Error ? error.message : String(error)}`, "error");
    } finally {
      setLoadingActionId(null);
    }
  };
  
  // Actualizar un pedido existente
  const handleUpdateOrder = async () => {
    if (!currentOrderId) return;
    
    setLoadingActionId("update-order");
    setError(null);
    
    try {
      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");
      
      // Preparar datos de actualización
      const updateData = {
        servicio: orderForm.servicio,
        seccionDelServicio: orderForm.seccionDelServicio || "",
        detalle: orderForm.detalle || " ",
        productos: orderForm.productos.map(p => ({
          productoId: typeof p.productoId === 'object' ? p.productoId._id : p.productoId,
          cantidad: p.cantidad
        }))
      };
      
      const response = await fetch(`https://lyme-back.vercel.app/api/pedido/${currentOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || `Error al actualizar pedido: ${response.status}`);
      }
      
      // Recargar pedidos y productos
      await Promise.all([
        fetchOrders(true),
        fetchProducts(true)
      ]);
      
      // Notificar cambio de inventario
      await refreshInventory();
      
      // Resetear formulario y cerrar modal
      resetOrderForm();
      setCreateOrderModalOpen(false);
      
      // Mostrar mensaje de éxito
      setSuccessMessage("Pedido actualizado correctamente");
      addNotification("Pedido actualizado correctamente", "success");
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error actualizando pedido:", error);
      setError(`Error al actualizar pedido: ${error instanceof Error ? error.message : String(error)}`);
      addNotification(`Error al actualizar pedido: ${error instanceof Error ? error.message : String(error)}`, "error");
    } finally {
      setLoadingActionId(null);
    }
  };
  
  // Eliminar un pedido
  const handleDeleteOrder = async (orderId: string) => {
    setLoadingActionId(`delete-${orderId}`);
    
    try {
      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");
      
      const response = await fetch(`https://lyme-back.vercel.app/api/pedido/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || `Error al eliminar pedido: ${response.status}`);
      }
      
      // Recargar pedidos y productos
      await Promise.all([
        fetchOrders(true),
        fetchProducts(true)
      ]);
      
      // Notificar cambio de inventario
      await refreshInventory();
      
      // Mostrar mensaje de éxito
      setSuccessMessage("Pedido eliminado correctamente");
      addNotification("Pedido eliminado correctamente", "success");
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error eliminando pedido:", error);
      setError(`Error al eliminar pedido: ${error instanceof Error ? error.message : String(error)}`);
      addNotification(`Error al eliminar pedido: ${error instanceof Error ? error.message : String(error)}`, "error");
    } finally {
      setLoadingActionId(null);
      setOrderToDelete(null);
      setDeleteConfirmModalOpen(false);
    }
  };
  
  // Preparar eliminar pedido
  const confirmDeleteOrder = (orderId: string) => {
    setOrderToDelete(orderId);
    setDeleteConfirmModalOpen(true);
  };
  
  // Preparar editar pedido
  const handleEditOrder = async (order: Order) => {
    setCurrentOrderId(order._id);
    
    // Preparar productos con nombres y precios
    const productos = await Promise.all(
      order.productos.map(async (p) => {
        const productId = typeof p.productoId === 'object' ? p.productoId._id : p.productoId;
        let nombre = p.nombre;
        let precio = p.precio;
        
        // Si falta nombre o precio, intentar obtenerlos
        if (!nombre || typeof precio !== 'number') {
          // Primero buscar en el mapa de productos
          if (productsMap[productId]) {
            nombre = nombre || productsMap[productId].nombre;
            precio = precio || productsMap[productId].precio;
          } else {
            // Si no está en el mapa, cargar del servidor
            try {
              const product = await fetchProductById(productId as string);
              if (product) {
                nombre = nombre || product.nombre;
                precio = precio || product.precio;
              }
            } catch (error) {
              console.error(`Error cargando producto ${productId}:`, error);
            }
          }
        }
        
        return {
          productoId: productId,
          cantidad: p.cantidad,
          nombre: nombre || "Producto no encontrado",
          precio: typeof precio === 'number' ? precio : 0
        };
      })
    );
    
    // Actualizar formulario
    setOrderForm({
      servicio: order.servicio,
      seccionDelServicio: order.seccionDelServicio || '',
      userId: typeof order.userId === 'object' ? order.userId._id : order.userId as string,
      productos: productos,
      detalle: order.detalle || " "
    });
    
    // Abrir modal
    setCreateOrderModalOpen(true);
  };
  
  // Seleccionar cliente
  const handleClientChange = (clientId: string) => {
    if (clientId === "none") return;
    
    const selectedClient = clients.find(c => c._id === clientId);
    if (!selectedClient) {
      console.error(`Cliente no encontrado: ${clientId}`);
      addNotification("Cliente seleccionado no encontrado", "warning");
      return;
    }
    
    // Actualizar formulario con cliente seleccionado
    setOrderForm(prev => ({
      ...prev,
      servicio: selectedClient.servicio,
      seccionDelServicio: '',
      userId: currentUser?._id || currentUser?.id || ""
    }));
    
    // Verificar si hay varias secciones para este servicio
    const sections = clientSections[selectedClient.servicio] || [];
    
    if (sections.length === 1) {
      // Si solo hay una sección, usarla directamente
      setOrderForm(prev => ({
        ...prev,
        seccionDelServicio: sections[0].seccionDelServicio || ''
      }));
    } else if (sections.length > 1) {
      // Si hay múltiples secciones, abrir modal para seleccionar
      setSelectSectionModalOpen(true);
    }
  };
  
  // Seleccionar sección
  const handleSectionSelect = (section: string) => {
    setOrderForm(prev => ({
      ...prev,
      seccionDelServicio: section
    }));
    setSelectSectionModalOpen(false);
  };
  
  // Agregar producto al pedido
  const handleAddProduct = () => {
    if (!selectedProduct || selectedProduct === "none" || productQuantity <= 0) {
      setError("Seleccione un producto y una cantidad válida");
      addNotification("Seleccione un producto y una cantidad válida", "warning");
      return;
    }
    
    const product = productsMap[selectedProduct];
    if (!product) {
      setError("Producto no encontrado");
      addNotification("Producto no encontrado", "warning");
      return;
    }
    
    // Verificar stock
    if (product.stock < productQuantity) {
      setError(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`);
      addNotification(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`, "warning");
      return;
    }
    
    // Buscar si el producto ya está en el pedido
    const existingIndex = orderForm.productos.findIndex(p => {
      const id = typeof p.productoId === 'object' ? p.productoId._id : p.productoId;
      return id === selectedProduct;
    });
    
    if (existingIndex >= 0) {
      // Actualizar cantidad
      const newQuantity = orderForm.productos[existingIndex].cantidad + productQuantity;
      
      // Verificar stock para la cantidad total
      if (product.stock < newQuantity) {
        setError(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`);
        addNotification(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`, "warning");
        return;
      }
      
      const updatedProducts = [...orderForm.productos];
      updatedProducts[existingIndex] = {
        ...updatedProducts[existingIndex],
        cantidad: newQuantity
      };
      
      setOrderForm(prev => ({
        ...prev,
        productos: updatedProducts
      }));
      
      addNotification(`Cantidad actualizada: ${product.nombre} (${newQuantity})`, "success");
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
      
      addNotification(`Producto agregado: ${product.nombre} (${productQuantity})`, "success");
    }
    
    // Resetear selección
    setSelectedProduct("none");
    setProductQuantity(1);
    setSelectProductModalOpen(false);
  };
  
  // Eliminar producto del pedido
  const handleRemoveProduct = (index: number) => {
    const productToRemove = orderForm.productos[index];
    const productName = productToRemove.nombre || getProductName(typeof productToRemove.productoId === 'object' ? productToRemove.productoId._id : productToRemove.productoId as string);
    
    const updatedProducts = [...orderForm.productos];
    updatedProducts.splice(index, 1);
    
    setOrderForm(prev => ({
      ...prev,
      productos: updatedProducts
    }));
    
    addNotification(`Producto eliminado: ${productName}`, "info");
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
    setCurrentOrderId(null);
    setSelectedProduct("none");
    setProductQuantity(1);
  };
  
  // Calcular total de un pedido (memoizado)
  const calculateOrderTotal = useCallback((productos: OrderProduct[]): number => {
    return productos.reduce((total, item) => {
      let precio = 0;
      
      if (typeof item.precio === 'number') {
        precio = item.precio;
      } else {
        const productId = typeof item.productoId === 'object' ? item.productoId._id : item.productoId;
        if (productsMap[productId as string]) {
          precio = productsMap[productId as string].precio;
        }
      }
      
      return total + (precio * item.cantidad);
    }, 0);
  }, [productsMap]);
  
  // Filtrar pedidos por fecha
  const handleDateFilter = async () => {
    if (!dateFilter.from || !dateFilter.to) {
      setError("Debe seleccionar fechas de inicio y fin");
      addNotification("Seleccione ambas fechas para filtrar", "warning");
      return;
    }
    
    await fetchOrders(true);
    setShowMobileFilters(false);
  };
  
  // Limpiar todos los filtros
  const clearAllFilters = () => {
    setSearchTerm('');
    setDateFilter({ from: '', to: '' });
    fetchOrders(true);
    setShowMobileFilters(false);
    setCurrentPage(1);
    
    addNotification("Filtros eliminados", "info");
  };
  
  // Alternar vista de detalles del pedido
  const toggleOrderDetails = useCallback((orderId: string) => {
    setOrderDetailsOpen(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
    
    // Prefetch de productos en el pedido
    const order = orders.find(o => o._id === orderId);
    if (order && Array.isArray(order.productos)) {
      order.productos.forEach(item => {
        const productId = typeof item.productoId === 'object' ? item.productoId._id : item.productoId;
        if (productId && !productsMap[productId as string]) {
          productLoadQueue.current.add(productId as string);
          processProductQueue();
        }
      });
    }
  }, [orders, productsMap]);
  
  // Prefetch de productos en los pedidos
  const prefetchProductsFromOrders = useCallback((ordersData: Order[]) => {
    if (!Array.isArray(ordersData) || ordersData.length === 0) return;
    
    // Limitar a los primeros 20 pedidos para no sobrecargar
    const ordersToProcess = ordersData.slice(0, 20);
    
    ordersToProcess.forEach(order => {
      if (Array.isArray(order.productos)) {
        order.productos.forEach(item => {
          const productId = typeof item.productoId === 'object' ? item.productoId._id : item.productoId;
          if (productId && !productsMap[productId as string]) {
            productLoadQueue.current.add(productId as string);
          }
        });
      }
    });
    
    if (productLoadQueue.current.size > 0) {
      processProductQueue();
    }
  }, [productsMap]);
  
  // Procesar cola de productos a cargar
  const processProductQueue = useCallback(async () => {
    if (isProcessingQueue.current || productLoadQueue.current.size === 0) {
      return;
    }
    
    isProcessingQueue.current = true;
    
    try {
      const batchSize = 5;
      const productIds = Array.from(productLoadQueue.current);
      productLoadQueue.current.clear();
      
      // Procesar en lotes
      for (let i = 0; i < productIds.length; i += batchSize) {
        if (!mountedRef.current) break;
        
        const batch = productIds.slice(i, i + batchSize);
        const filteredBatch = batch.filter(id => !productsMap[id]);
        
        if (filteredBatch.length === 0) continue;
        
        // Cargar productos en paralelo
        const productsPromises = filteredBatch.map(id => fetchProductById(id));
        await Promise.all(productsPromises);
      }
    } catch (error) {
      console.error("Error procesando cola de productos:", error);
    } finally {
      isProcessingQueue.current = false;
      
      // Si quedan productos en la cola, procesarlos
      if (mountedRef.current && productLoadQueue.current.size > 0) {
        setTimeout(processProductQueue, 100);
      }
    }
  }, [productsMap, fetchProductById]);
  
  // Obtener nombre de producto
  const getProductName = useCallback((productId: string): string => {
    return productsMap[productId]?.nombre || "Producto no encontrado";
  }, [productsMap]);
  
  // Obtener información de usuario
  const getUserInfo = useCallback((userId: string | User): { email: string; name: string } => {
    // Si es un objeto con email y nombre
    if (typeof userId === 'object' && userId) {
      return {
        email: userId.email || "Email no disponible",
        name: userId.nombre 
          ? `${userId.nombre} ${userId.apellido || ''}`
          : userId.email || "Usuario no disponible"
      };
    }
    
    // Si es un string (ID)
    if (typeof userId === 'string') {
      const user = usersMap[userId];
      if (!user) return { email: "Usuario no encontrado", name: "Usuario no encontrado" };
      
      return {
        email: user.email || "Email no disponible",
        name: user.nombre 
          ? `${user.nombre} ${user.apellido || ''}`
          : user.email || "Usuario no disponible"
      };
    }
    
    return { email: "Usuario no disponible", name: "Usuario no disponible" };
  }, [usersMap]);
  
  // Función para cambiar de página
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    
    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // En móvil, scroll al inicio de la lista
    if (windowWidth < SCREEN_SIZES.MOBILE && mobileListRef.current) {
      mobileListRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Actualizar manualmente los datos
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Recargar datos principales
      await Promise.all([
        fetchOrders(true),
        fetchProducts(true)
      ]);
      
      addNotification("Datos actualizados correctamente", "success");
    } catch (error) {
      console.error("Error actualizando datos:", error);
      addNotification("Error al actualizar los datos", "error");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Gestionar el PDF de pedido
  const handleDownloadRemito = (pedidoId: string) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");
      
      addNotification("Generando PDF del remito...", "info");
      
      // Abrir en una nueva pestaña
      window.open(`https://lyme-back.vercel.app/api/downloads/remito/${pedidoId}`, '_blank');
    } catch (error) {
      console.error("Error al generar remito:", error);
      addNotification("Error al generar el remito", "error");
    }
  };
  
  // ======== FILTRADO Y PAGINACIÓN ========
  
  // Filtrar pedidos según términos de búsqueda
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const searchLower = searchTerm.toLowerCase();
      
      return (
        order.servicio.toLowerCase().includes(searchLower) ||
        String(order.nPedido).includes(searchTerm) ||
        (order.seccionDelServicio || '').toLowerCase().includes(searchLower) ||
        getUserInfo(order.userId).email.toLowerCase().includes(searchLower) ||
        getUserInfo(order.userId).name.toLowerCase().includes(searchLower)
      );
    });
  }, [orders, searchTerm, getUserInfo]);
  
  // Calcular paginación
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, currentPage, itemsPerPage]);
  
  // Calcular total de páginas
  const totalPages = useMemo(() => {
    return Math.ceil(filteredOrders.length / itemsPerPage);
  }, [filteredOrders.length, itemsPerPage]);
  
  // Información de paginación
  const paginationInfo = useMemo(() => {
    const total = filteredOrders.length;
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(start + itemsPerPage - 1, total);
    
    return {
      total,
      start: total > 0 ? start : 0,
      end: total > 0 ? end : 0,
      range: total > 0 ? `${start}-${end} de ${total}` : "0 de 0"
    };
  }, [filteredOrders.length, currentPage, itemsPerPage]);
  
  // ======== RENDERIZADO ========
  
  // Mostrar pantalla de carga
  if (isLoading && orders.length === 0) {
    return (
      <div className="p-4 md:p-6 bg-[#DFEFE6]/30 min-h-[300px] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#29696B] animate-spin mb-4" />
        <p className="text-[#29696B]">Cargando pedidos...</p>
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
              disabled={isRefreshing}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            
            <Button
              onClick={() => {
                resetOrderForm();
                setCreateOrderModalOpen(true);
              }}
              className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              disabled={clients.length === 0 || products.length === 0}
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
              value={dateFilter.from}
              onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
              className="w-full border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
            />
          </div>
          
          <div>
            <Label htmlFor="fechaFin" className="text-[#29696B]">Fecha Fin</Label>
            <Input
              id="fechaFin"
              type="date"
              value={dateFilter.to}
              onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
              className="w-full border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
            />
          </div>
          
          <Button
            variant="outline"
            onClick={handleDateFilter}
            className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtrar por Fecha
          </Button>
          
          {(dateFilter.from || dateFilter.to || searchTerm) && (
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
              setCreateOrderModalOpen(true);
            }}
            className="flex-shrink-0 bg-[#29696B] hover:bg-[#29696B]/90 text-white"
            disabled={clients.length === 0 || products.length === 0}
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
                  value={dateFilter.from}
                  onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
                  className="w-full text-sm border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                />
              </div>
              
              <div>
                <Label htmlFor="mFechaFin" className="text-xs text-[#29696B]">Fecha Fin</Label>
                <Input
                  id="mFechaFin"
                  type="date"
                  value={dateFilter.to}
                  onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
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
                onClick={handleDateFilter}
                className="text-xs bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              >
                Aplicar Filtros
              </Button>
            </div>
          </div>
        )}
        
        {(dateFilter.from || dateFilter.to) && (
          <div className="px-3 py-2 bg-[#DFEFE6]/50 rounded-md text-xs text-[#29696B] flex items-center justify-between border border-[#91BEAD]/20">
            <div>
              <CalendarRange className="w-3 h-3 inline mr-1" />
              <span>
                {dateFilter.from && new Date(dateFilter.from).toLocaleDateString()}
                {dateFilter.from && dateFilter.to && ' al '}
                {dateFilter.to && new Date(dateFilter.to).toLocaleDateString()}
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
      
      {/* Indicador de carga o refresco */}
      {isRefreshing && (
        <div className="bg-[#DFEFE6]/30 rounded-lg p-2 mb-4 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-[#29696B] animate-spin mr-2" />
          <span className="text-sm text-[#29696B]">Actualizando datos...</span>
        </div>
      )}
      
      {/* Sin resultados */}
      {!isLoading && filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-[#7AA79C] border border-[#91BEAD]/20">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
            <ShoppingCart className="w-6 h-6 text-[#29696B]" />
          </div>
          
          <p>
            No se encontraron pedidos
            {searchTerm && ` que coincidan con "${searchTerm}"`}
            {(dateFilter.from || dateFilter.to) && " en el rango de fechas seleccionado"}
          </p>
          
          {(clients.length === 0 || products.length === 0) && (
            <p className="mt-4 text-sm text-red-500 flex items-center justify-center">
              <Info className="w-4 h-4 mr-2" />
              {clients.length === 0 
                ? "No tiene clientes asignados. Contacte a un administrador." 
                : "No hay productos disponibles para crear pedidos."}
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Tabla de pedidos para pantallas medianas y grandes */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden hidden md:block border border-[#91BEAD]/20">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#DFEFE6]/30">
                  <tr>
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
                  {paginatedOrders.map((order) => (
                    <React.Fragment key={order._id}>
                      <tr className="hover:bg-[#DFEFE6]/10 transition-colors">
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
                            {new Date(order.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                            {getUserInfo(order.userId).email}
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
                              {orderDetailsOpen[order._id] ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
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
                                    className="text-[#29696B] hover:bg-[#DFEFE6]/30"
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Descargar Remito</p>
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
                                    disabled={loadingActionId === `edit-${order._id}`}
                                    className="text-[#29696B] hover:bg-[#DFEFE6]/30"
                                  >
                                    {loadingActionId === `edit-${order._id}` ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <FileEdit className="w-4 h-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Editar Pedido</p>
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
                                    disabled={loadingActionId === `delete-${order._id}`}
                                    className="text-red-600 hover:bg-red-50"
                                  >
                                    {loadingActionId === `delete-${order._id}` ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Eliminar Pedido</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Detalles del pedido expandibles */}
                      {orderDetailsOpen[order._id] && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-[#DFEFE6]/20">
                            <div className="space-y-3">
                              <div className="font-medium text-[#29696B]">Detalles del Pedido</div>
                              
                              <div className="overflow-x-auto rounded-md border border-[#91BEAD]/30">
                                <table className="min-w-full divide-y divide-[#91BEAD]/20">
                                  <thead className="bg-[#DFEFE6]/50">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-[#29696B]">Producto</th>
                                      <th className="px-4 py-2 text-center text-xs font-medium text-[#29696B]">Cantidad</th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-[#29696B]">Precio Unit.</th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-[#29696B]">Subtotal</th>
                                    </tr>
                                  </thead>
                                  
                                  <tbody className="divide-y divide-[#91BEAD]/20 bg-white">
                                    {order.productos.map((item, index) => (
                                      <tr key={index} className="hover:bg-[#DFEFE6]/20">
                                        <ProductDetail 
                                          item={item} 
                                          productsMap={productsMap} 
                                          onProductLoad={fetchProductById}
                                        />
                                      </tr>
                                    ))}
                                    
                                    {/* Total */}
                                    <tr className="bg-[#DFEFE6]/40 font-medium">
                                      <td colSpan={3} className="px-4 py-2 text-right text-[#29696B]">Total del Pedido:</td>
                                      <td className="px-4 py-2 text-right font-bold text-[#29696B]">
                                        <OrderTotal
                                          order={order}
                                          productsMap={productsMap}
                                          onProductLoad={fetchProductById}
                                        />
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              
                              <div className="flex justify-end mt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadRemito(order._id)}
                                  className="text-xs h-8 border-[#29696B] text-[#29696B] hover:bg-[#DFEFE6]/30"
                                >
                                  <Download className="w-3 h-3 mr-1" />
                                  Descargar Remito
                                </Button>
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
              <div className="py-4 border-t border-[#91BEAD]/20 px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
                <div className="text-sm text-[#7AA79C]">
                  Mostrando {paginationInfo.range}
                </div>
                
                <Pagination
                  totalItems={filteredOrders.length}
                  itemsPerPage={itemsPerPage}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
          
          {/* Vista de tarjetas para móviles */}
          <div ref={mobileListRef} id="mobile-orders-list" className="md:hidden grid grid-cols-1 gap-4">
            {/* Paginación superior en móvil */}
            {filteredOrders.length > itemsPerPage && (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20">
                <Pagination
                  totalItems={filteredOrders.length}
                  itemsPerPage={itemsPerPage}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                  showFirstLast={false}
                  showNumbers={false}
                />
              </div>
            )}
            
            {isRefreshing && filteredOrders.length === 0 ? (
              <OrdersSkeleton count={3} />
            ) : (
              paginatedOrders.map(order => (
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
                        <span className="text-[#29696B]">{getUserInfo(order.userId).email}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <ShoppingCart className="w-3 h-3 text-[#7AA79C] mr-1" />
                        <span className="text-[#29696B]">{order.productos.length} productos</span>
                      </div>
                    </div>
                    
                    {/* Detalles expandibles en móvil con Accordion */}
                    <Accordion
                      type="single"
                      collapsible
                      className="mt-2"
                      value={orderDetailsOpen[order._id] ? "details" : ""}
                    >
                      <AccordionItem value="details" className="border-0">
                        <AccordionTrigger
                          onClick={() => toggleOrderDetails(order._id)}
                          className="py-1 text-xs font-medium text-[#29696B]"
                        >
                          Ver detalles
                        </AccordionTrigger>
                        
                        <AccordionContent>
                          <div className="text-xs pt-2 pb-1">
                            <div className="font-medium mb-2 text-[#29696B]">Productos:</div>
                            
                            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                              {order.productos.map((item, index) => (
                                <ProductDetailMobile
                                  key={index}
                                  item={item}
                                  productsMap={productsMap}
                                  onProductLoad={fetchProductById}
                                />
                              ))}
                            </div>
                            
                            <div className="flex justify-between items-center pt-2 font-medium text-sm border-t border-[#91BEAD]/20 mt-2">
                              <span className="text-[#29696B]">Total:</span>
                              <div className="flex items-center text-[#29696B]">
                                <DollarSign className="w-3 h-3 mr-1" />
                                <OrderTotal
                                  order={order}
                                  productsMap={productsMap}
                                  onProductLoad={fetchProductById}
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-2 pt-2 border-t border-[#91BEAD]/20">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadRemito(order._id)}
                              className="w-full text-xs h-8 border-[#29696B] text-[#29696B] hover:bg-[#DFEFE6]/30"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Descargar Remito
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                  
                  <CardFooter className="py-2 px-4 bg-[#DFEFE6]/10 flex justify-end gap-2 border-t border-[#91BEAD]/20">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-[#29696B] hover:bg-[#DFEFE6]/30"
                      onClick={() => handleEditOrder(order)}
                      disabled={loadingActionId === `edit-${order._id}`}
                    >
                      {loadingActionId === `edit-${order._id}` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileEdit className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-red-600 hover:bg-red-50"
                      onClick={() => confirmDeleteOrder(order._id)}
                      disabled={loadingActionId === `delete-${order._id}`}
                    >
                      {loadingActionId === `delete-${order._id}` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
            
            {/* Mensaje que muestra la página actual y el total */}
            {filteredOrders.length > itemsPerPage && (
              <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm">
                <span className="text-[#29696B] font-medium">
                  Página {currentPage} de {totalPages}
                </span>
              </div>
            )}
            
            {/* Paginación inferior para móvil */}
            {filteredOrders.length > itemsPerPage && (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20 mt-2">
                <Pagination
                  totalItems={filteredOrders.length}
                  itemsPerPage={itemsPerPage}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                  showFirstLast={false}
                />
              </div>
            )}
          </div>
        </>
      )}
      
      {/* ======== MODALES ======== */}
      
      {/* Modal para crear/editar pedido */}
      <Dialog open={createOrderModalOpen} onOpenChange={setCreateOrderModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">
              {currentOrderId ? `Editar Pedido` : 'Nuevo Pedido'}
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
                      disabled={!!currentOrderId}
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
            
            {/* Productos del Pedido */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium flex items-center text-[#29696B]">
                  <ShoppingCart className="w-5 h-5 mr-2 text-[#7AA79C]" />
                  Productos
                </h2>
                
                <Button
                  variant="outline"
                  onClick={() => setSelectProductModalOpen(true)}
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
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {orderForm.productos.map((item, index) => {
                    const productId = typeof item.productoId === 'object' ? item.productoId._id : item.productoId;
                    const product = productsMap[productId as string];
                    
                    return (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-[#DFEFE6]/20 rounded-md border border-[#91BEAD]/30"
                      >
                        <div>
                          <div className="font-medium text-[#29696B]">{item.nombre || (product?.nombre || 'Cargando...')}</div>
                          <div className="text-sm text-[#7AA79C]">
                            Cantidad: {item.cantidad} x ${(item.precio || (product?.precio || 0)).toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="font-medium text-[#29696B]">
                            ${((item.precio || (product?.precio || 0)) * item.cantidad).toFixed(2)}
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
                </div>
              )}
              
              {/* Total */}
              {orderForm.productos.length > 0 && (
                <div className="flex justify-between items-center p-3 bg-[#DFEFE6]/40 rounded-md mt-4 border border-[#91BEAD]/30">
                  <div className="font-medium text-[#29696B]">Total</div>
                  <div className="font-bold text-lg text-[#29696B]">${calculateOrderTotal(orderForm.productos).toFixed(2)}</div>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCreateOrderModalOpen(false);
                resetOrderForm();
              }}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Cancelar
            </Button>
            
            <Button
              onClick={currentOrderId ? handleUpdateOrder : handleCreateOrder}
              disabled={
                loadingActionId === "create-order" || 
                loadingActionId === "update-order" || 
                orderForm.productos.length === 0 || 
                !orderForm.servicio
              }
              className="bg-[#29696B] hover:bg-[#29696B]/90 text-white disabled:bg-[#8DB3BA] disabled:text-white/70"
            >
              {loadingActionId === "create-order" || loadingActionId === "update-order" ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </span>
              ) : currentOrderId ? 'Actualizar Pedido' : 'Crear Pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal para seleccionar sección */}
      <Dialog open={selectSectionModalOpen} onOpenChange={setSelectSectionModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">Seleccionar Sección</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-[#7AA79C] mb-4">
              Seleccione la sección para este pedido:
            </p>
            
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
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
              onClick={() => setSelectSectionModalOpen(false)}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal para agregar producto */}
      <Dialog open={selectProductModalOpen} onOpenChange={setSelectProductModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">Agregar Producto</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Búsqueda de productos */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar productos..."
                className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                onChange={(e) => {
                  const searchTerm = e.target.value.toLowerCase();
                  // Implementaríamos aquí lógica para filtrar productos
                }}
              />
            </div>
            
            <div>
              <Label htmlFor="producto" className="text-[#29696B]">Producto</Label>
              <Select
                value={selectedProduct || "none"}
                onValueChange={setSelectedProduct}
              >
                <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="none" disabled>Seleccione un producto</SelectItem>
                  {products.map(product => (
                    <SelectItem 
                      key={product._id} 
                      value={product._id}
                      disabled={product.stock <= 0}
                    >
                      {product.nombre} - ${product.precio.toFixed(2)} {product.stock <= 0 ? '(Sin stock)' : `(Stock: ${product.stock})`}
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
            
            {/* Información del producto seleccionado */}
            {selectedProduct && selectedProduct !== "none" && productsMap[selectedProduct] && (
              <div className="p-3 bg-[#DFEFE6]/20 rounded-md border border-[#91BEAD]/30">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-[#29696B]">Producto seleccionado:</span>
                  <span className="text-sm text-[#29696B]">{productsMap[selectedProduct].nombre}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm font-medium text-[#29696B]">Precio:</span>
                  <span className="text-sm text-[#29696B]">${productsMap[selectedProduct].precio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm font-medium text-[#29696B]">Stock disponible:</span>
                  <span className="text-sm text-[#29696B]">{productsMap[selectedProduct].stock}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm font-medium text-[#29696B]">Total:</span>
                  <span className="text-sm font-medium text-[#29696B]">
                    ${(productsMap[selectedProduct].precio * productQuantity).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectProductModalOpen(false)}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Cancelar
            </Button>
            
            <Button 
              onClick={handleAddProduct}
              className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              disabled={!selectedProduct || selectedProduct === "none" || productQuantity <= 0}
            >
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de confirmación para eliminar */}
      <ConfirmationDialog
        open={deleteConfirmModalOpen}
        onOpenChange={setDeleteConfirmModalOpen}
        title="¿Eliminar Pedido?"
        description="¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer y devolverá el stock a inventario."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => orderToDelete && handleDeleteOrder(orderToDelete)}
        variant="destructive"
      />
    </div>
  );
};

export default OrdersSection;