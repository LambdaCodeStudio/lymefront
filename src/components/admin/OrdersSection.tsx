// OrdersSection.tsx - Componente optimizado
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

// ======== TIPOS E INTERFACES ========

export interface User {
  _id: string;
  usuario?: string;
  nombre?: string;
  apellido?: string;
  role: string;
  secciones?: 'limpieza' | 'mantenimiento' | 'ambos';
  isActive?: boolean;
  expiresAt?: string | Date;
}

interface Client {
  _id: string;
  servicio: string;
  seccionDelServicio: string;
  userId: string | User;
  requiereAsignacion?: boolean;
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
  descripcion?: string;
}

interface OrderProduct {
  productoId: string | Product;
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

// ======== CONFIGURACIÓN ========

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

//Limpiar cache
const clearClientCache = () => {
  // Limpiar cache de clientes al cambiar entre supervisores
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(STORAGE_KEYS.CLIENTS)) {
      localStorage.removeItem(key);
    }
  });
};

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
      // Extraer el ID del producto de forma segura
      const productId = typeof item.productoId === 'object' && item.productoId
        ? item.productoId._id
        : (typeof item.productoId === 'string' ? item.productoId : '');

      if (!productId) {
        if (mountedRef.current) {
          setProductDetail({
            nombre: "ID de producto no válido",
            precio: 0,
            loaded: true
          });
        }
        return;
      }

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
        } else if (mountedRef.current) {
          setProductDetail({
            nombre: "Producto no encontrado",
            precio: 0,
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

  const cantidad = typeof item.cantidad === 'number' ? item.cantidad : 0;

  return (
    <>
      <td className="px-4 py-2 whitespace-nowrap text-[#29696B]">{productDetail.nombre}</td>
      <td className="px-4 py-2 whitespace-nowrap text-center text-[#7AA79C]">{cantidad}</td>
      <td className="px-4 py-2 whitespace-nowrap text-right text-[#7AA79C]">${productDetail.precio.toFixed(2)}</td>
      <td className="px-4 py-2 whitespace-nowrap text-right font-medium text-[#29696B]">
        ${(productDetail.precio * cantidad).toFixed(2)}
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
      // Extraer el ID del producto de forma segura
      const productId = typeof item.productoId === 'object' && item.productoId
        ? item.productoId._id
        : (typeof item.productoId === 'string' ? item.productoId : '');

      if (!productId) {
        if (mountedRef.current) {
          setProductDetail({
            nombre: "ID de producto no válido",
            precio: 0,
            loaded: true
          });
        }
        return;
      }

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
        } else if (mountedRef.current) {
          setProductDetail({
            nombre: "Producto no encontrado",
            precio: 0,
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

  const cantidad = typeof item.cantidad === 'number' ? item.cantidad : 0;

  return (
    <div className="py-2 flex justify-between items-center border-b border-[#91BEAD]/20">
      <div>
        <div className="font-medium text-[#29696B]">{productDetail.nombre}</div>
        <div className="text-xs text-[#7AA79C]">
          {cantidad} x ${productDetail.precio.toFixed(2)}
        </div>
      </div>
      <div className="text-sm font-medium text-[#29696B]">
        ${(productDetail.precio * cantidad).toFixed(2)}
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
        const productId = typeof item.productoId === 'object' && item.productoId
          ? item.productoId._id
          : (typeof item.productoId === 'string' ? item.productoId : '');

        if (!productId) continue;

        // Si el item ya tiene precio, usarlo
        if (typeof item.precio === 'number') {
          sum += item.precio * (typeof item.cantidad === 'number' ? item.cantidad : 0);
          continue;
        }

        // Si el producto está en el mapa, usar su precio
        if (productsMap[productId]) {
          sum += productsMap[productId].precio * (typeof item.cantidad === 'number' ? item.cantidad : 0);
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
                  const itemId = typeof p.productoId === 'object' && p.productoId
                    ? p.productoId._id
                    : (typeof p.productoId === 'string' ? p.productoId : '');
                  return itemId === productId;
                });

                if (item) {
                  sum += product.precio * (typeof item.cantidad === 'number' ? item.cantidad : 0);
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
  const apiUrl = 'http://localhost:4000/api'

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
  const [isAdminOrSuperSupervisor, setIsAdminOrSuperSupervisor] = useState(false);
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState<string | null>(null);
  const [supervisorSelectOpen, setSupervisorSelectOpen] = useState(false);
  const [isFetchingSupervisors, setIsFetchingSupervisors] = useState(false);

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

  // Configuración de items por página según tamaño de pantalla
  const itemsPerPage = useMemo(() => {
    if (windowWidth < 640) return 4; // Móvil
    if (windowWidth < 1024) return 8; // Tablet
    return 12; // Desktop
  }, [windowWidth]);

  // ======== CACHÉ Y PERSISTENCIA ========

  // Verificar si el caché ha expirado
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


  const groupClientsByService = (clientsData: any): Record<string, Client[]> => {
    // Verificar que clientsData sea un array
    if (!Array.isArray(clientsData)) return {};

    return clientsData.reduce((map: Record<string, Client[]>, client: Client) => {
      if (client && client.servicio) {
        if (!map[client.servicio]) {
          map[client.servicio] = [];
        }
        map[client.servicio].push(client);
      }
      return map;
    }, {});
  };

  // ======== CARGA DE DATOS ========

  //Supervisores
  const fetchSupervisors = async () => {
    try {

      if (supervisors.length > 0 && !forceRefresh) {
        console.log("Usando supervisores en caché");
        return supervisors;
      }
      
      setIsFetchingSupervisors(true);
      
      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");
      
      console.log(`Obteniendo supervisores desde: ${apiUrl}/auth/supervisors`);
      
      const response = await fetch(`${apiUrl}/auth/supervisors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error al obtener supervisores: ${response.status}`);
      }
      
      const supervisorsData = await response.json();
      
      if (!mountedRef.current) return;

      if (Array.isArray(supervisorsData)) {
        setSupervisors(supervisorsData);
      } else {
        console.warn("Formato incorrecto en respuesta de supervisores:", supervisorsData);
        setSupervisors([]);
      }
    } catch (error) {
      console.error("Error obteniendo supervisores:", error);
      addNotification && addNotification("No se pudieron cargar los supervisores", "error");
      setSupervisors([]);
    } finally {
      setIsFetchingSupervisors(false);
    }
  };

  // Cargar información del usuario actual
  const fetchUserData = async (forceRefresh = false) => {
    // Verificar si ya tenemos datos en caché y no ha expirado
    if (currentUser && !forceRefresh && !isCacheExpired(STORAGE_KEYS.CURRENT_USER, CACHE_EXPIRATION.USER_DATA)) {
      return currentUser;
    }

    try {
      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");

      const response = await fetch(`${apiUrl}/auth/me`, {
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

      if (userData) {
        // Verificar si es admin o supervisor de supervisores
        const isAdmin = userData.role === 'admin';
        const isSuperSupervisor = userData.role === 'supervisor_de_supervisores';
        setIsAdminOrSuperSupervisor(isAdmin || isSuperSupervisor);

        // Si es admin o supervisor de supervisores, cargar la lista de supervisores
        if (isAdmin || isSuperSupervisor) {
          fetchSupervisors();
        }
      }

      if (!mountedRef.current) return null;

      // Actualizar estado
      setCurrentUser(userData);

      // Actualizar caché
      saveToLocalStorage(STORAGE_KEYS.CURRENT_USER, userData);

      // Actualizar ID de usuario en formulario
      setOrderForm(prev => ({
        ...prev,
        userId: userData._id || ''
      }));

      // Cargar clientes del usuario
      if (userData._id) {
        await fetchClients(userData._id);
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
    // Verificar si ya tenemos datos en caché y no ha expirado
    if (orders.length > 0 && !forceRefresh && !isCacheExpired(STORAGE_KEYS.ORDERS, CACHE_EXPIRATION.ORDERS)) {
      return orders;
    }

    try {
      setIsRefreshing(true);

      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");

      // Determinar URL según filtros de fecha
      let url = `${apiUrl}/pedido`;

      if (dateFilter.from && dateFilter.to) {
        url = `${apiUrl}/pedido/fecha?fechaInicio=${encodeURIComponent(dateFilter.from)}&fechaFin=${encodeURIComponent(dateFilter.to)}`;
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

      // Verificar que los datos sean un array
      const validOrdersData = Array.isArray(ordersData) ? ordersData : [];

      // Actualizar estado
      setOrders(validOrdersData);

      // Actualizar caché
      saveToLocalStorage(STORAGE_KEYS.ORDERS, validOrdersData);

      // Volver a la primera página cuando se cargan nuevos datos
      setCurrentPage(1);

      // Cargar productos incluidos en los pedidos
      if (validOrdersData.length > 0) {
        prefetchProductsFromOrders(validOrdersData);
      }

      return validOrdersData;
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
    // Verificar si ya tenemos datos en caché y no ha expirado
    if (products.length > 0 && !forceRefresh && !isCacheExpired(STORAGE_KEYS.PRODUCTS, CACHE_EXPIRATION.PRODUCTS)) {
      return products;
    }

    try {
      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");

      const response = await fetch(`${apiUrl}/producto`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Error al obtener productos: ${response.status}`);
      }

      const responseData = await response.json();

      // Determinar formato de respuesta (array o paginado)
      let productsData: Product[] = [];

      if (Array.isArray(responseData)) {
        productsData = responseData;
      } else if (responseData && Array.isArray(responseData.items)) {
        productsData = responseData.items;
      } else {
        console.warn("Formato de respuesta de productos no reconocido:", responseData);
      }

      if (!mountedRef.current) return products;

      // Actualizar estado
      setProducts(productsData);

      // Crear mapa para acceso rápido
      const newProductsMap: Record<string, Product> = {};
      productsData.forEach(product => {
        if (product && product._id) {
          newProductsMap[product._id] = product;
        }
      });
      setProductsMap(newProductsMap);

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
    // Verificar si ya tenemos datos en caché y no ha expirado
    if (users.length > 0 && !forceRefresh && !isCacheExpired(STORAGE_KEYS.USERS, CACHE_EXPIRATION.USERS)) {
      return users;
    }

    try {
      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");

      const response = await fetch(`${apiUrl}/auth/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Error al obtener usuarios: ${response.status}`);
      }

      const usersData = await response.json();

      // Verificar que la respuesta sea un array
      if (!Array.isArray(usersData)) {
        console.warn("La respuesta de usuarios no es un array:", usersData);
        return users;
      }

      if (!mountedRef.current) return users;

      // Actualizar estado
      setUsers(usersData);

      // Crear mapa para acceso rápido
      const newUsersMap: Record<string, User> = {};
      usersData.forEach(user => {
        if (user && user._id) {
          newUsersMap[user._id] = user;
        }
      });
      setUsersMap(newUsersMap);

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
    // Verificar si es el mismo usuario actual o un supervisor seleccionado
    const isSupervisorSelected = isAdminOrSuperSupervisor && selectedSupervisor === userId;

    // Clave de caché personalizada para este usuario
    const clientCacheKey = `${STORAGE_KEYS.CLIENTS}_${userId}`;

    // Verificar si tenemos datos en caché y no ha expirado
    if (!isSupervisorSelected && clients.length > 0 && !forceRefresh && !isCacheExpired(clientCacheKey, CACHE_EXPIRATION.CLIENTS)) {
      return clients;
    }

    try {
      // Mostrar indicador de carga si es un supervisor
      if (isSupervisorSelected) {
        setIsLoading(true);
      }

      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");

      // Log para depuración
      console.log(`Obteniendo clientes para el usuario ${userId} desde: ${apiUrl}/cliente/user/${userId}`);

      const response = await fetch(`${apiUrl}/cliente/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Error al obtener clientes: ${response.status}`);
      }

      const clientsData = await response.json();

      // Verificar que la respuesta sea un array
      if (!Array.isArray(clientsData)) {
        console.warn("La respuesta de clientes no es un array:", clientsData);
        return isSupervisorSelected ? [] : clients;
      }

      if (!mountedRef.current) return isSupervisorSelected ? [] : clients;

      // NUEVO: Extraer información del supervisor de los clientes si es posible
      if (isSupervisorSelected && clientsData.length > 0 && clientsData[0].userId) {
        // El campo userId podría ser un objeto con la información del usuario
        const supervisorData = clientsData[0].userId;
        if (typeof supervisorData === 'object' && supervisorData !== null) {
          console.log("Datos del supervisor extraídos:", supervisorData);

          // Actualizar la lista de supervisores con esta información
          setSupervisors(prev =>
            prev.map(s =>
              s._id === userId
                ? { ...s, ...supervisorData }
                : s
            )
          );
        }
      }

      // Actualizar estado
      if (isSupervisorSelected) {
        setClients(clientsData);

        // Agrupar por servicio
        const sections = {};
        clientsData.forEach(client => {
          if (client && client.servicio) {
            if (!sections[client.servicio]) {
              sections[client.servicio] = [];
            }
            sections[client.servicio].push(client);
          }
        });
        setClientSections(sections);
      } else {
        setClients(clientsData);
        setClientSections(groupClientsByService(clientsData));
        saveToLocalStorage(clientCacheKey, clientsData);
      }

      return clientsData;
    } catch (error) {
      console.error(`Error cargando clientes para el usuario ${userId}:`, error);
      if (addNotification) {
        addNotification("No se pudieron cargar los clientes", "warning");
      }
      return isSupervisorSelected ? [] : clients;
    } finally {
      if (isSupervisorSelected && mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Cargar un producto específico
  const fetchProductById = async (productId: string): Promise<Product | null> => {
    // Verificar si ya tenemos el producto en caché
    if (productsMap[productId]) {
      return productsMap[productId];
    }

    try {
      // Verificar si el ID es válido
      if (!productId) {
        console.error("ID de producto no válido");
        return null;
      }

      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");

      const response = await fetch(`${apiUrl}/producto/${productId}`, {
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

      if (product && product._id) {
        // Actualizar mapa de productos
        setProductsMap(prev => {
          const updated = { ...prev };
          updated[productId] = product;
          return updated;
        });

        return product;
      }

      return null;
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
      addNotification && addNotification("Debe seleccionar un cliente", "warning");
      return;
    }

    if (!orderForm.productos || orderForm.productos.length === 0) {
      setError("Debe agregar al menos un producto");
      addNotification && addNotification("Debe agregar al menos un producto", "warning");
      return;
    }

    // Validar que haya un usuario asignado (supervisor seleccionado o usuario actual)
    if (!orderForm.userId) {
      setError("No hay usuario asignado para el pedido");
      addNotification && addNotification("Error: No hay usuario asignado", "error");
      return;
    }

    let supervisorInfo = null;
    if (isAdminOrSuperSupervisor && selectedSupervisor) {
      supervisorInfo = supervisors.find(s => s._id === selectedSupervisor);
      
      // AÑADIR: Registrar el supervisor en el mapa de usuarios si no existe
      if (supervisorInfo && !usersMap[selectedSupervisor]) {
        setUsersMap(prev => ({
          ...prev,
          [selectedSupervisor]: supervisorInfo
        }));
      }
    }

    setLoadingActionId("create-order");
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");

      // Obtener información del supervisor si está seleccionado
      let supervisorInfo = null;
      if (isAdminOrSuperSupervisor && selectedSupervisor) {
        supervisorInfo = supervisors.find(s => s._id === selectedSupervisor);
      }

      // Preparar datos del pedido
      const orderData = {
        // Si es admin y hay supervisor seleccionado, usar el userId del supervisor
        userId: orderForm.userId,
        servicio: orderForm.servicio,
        seccionDelServicio: orderForm.seccionDelServicio || "",
        detalle: orderForm.detalle || " ",
        productos: orderForm.productos.map(p => ({
          productoId: typeof p.productoId === 'object' && p.productoId ? p.productoId._id : p.productoId,
          cantidad: p.cantidad
        }))
      };

      // Log para depuración
      console.log("Creando pedido con datos:", orderData);
      if (supervisorInfo) {
        console.log("Supervisor seleccionado:", {
          id: supervisorInfo._id,
          usuario: supervisorInfo.usuario,
          nombre: supervisorInfo.nombre,
          apellido: supervisorInfo.apellido
        });
      }

      const response = await fetch(`${apiUrl}/pedido`, {
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
        fetchProducts(true),
        fetchUsers(true) // Añadir esta línea
      ]);
      
      // Notificar cambio de inventario
      try {
        await refreshInventory();
      } catch (error) {
        console.error("Error al refrescar inventario:", error);
      }

      // Resetear formulario y cerrar modal
      resetOrderForm();
      setCreateOrderModalOpen(false);

      // Si es admin, también limpiar el supervisor seleccionado
      if (isAdminOrSuperSupervisor) {
        setSelectedSupervisor(null);
      }

      // Mostrar mensaje de éxito
      setSuccessMessage("Pedido creado correctamente");
      addNotification && addNotification("Pedido creado correctamente", "success");

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error creando pedido:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Error al crear pedido: ${errorMessage}`);
      addNotification && addNotification(`Error al crear pedido: ${errorMessage}`, "error");
    } finally {
      setLoadingActionId(null);
    }
  };

  // Actualizar un pedido existente
  const handleUpdateOrder = async () => {
    if (!currentOrderId) {
      setError("No se ha seleccionado un pedido para actualizar");
      return;
    }

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
          productoId: typeof p.productoId === 'object' && p.productoId ? p.productoId._id : p.productoId,
          cantidad: p.cantidad
        }))
      };

      const response = await fetch(`${apiUrl}/pedido/${currentOrderId}`, {
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
      try {
        await refreshInventory();
      } catch (error) {
        console.error("Error al refrescar inventario:", error);
      }

      // Resetear formulario y cerrar modal
      resetOrderForm();
      setCreateOrderModalOpen(false);

      // Mostrar mensaje de éxito
      setSuccessMessage("Pedido actualizado correctamente");
      addNotification && addNotification("Pedido actualizado correctamente", "success");

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error actualizando pedido:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Error al actualizar pedido: ${errorMessage}`);
      addNotification && addNotification(`Error al actualizar pedido: ${errorMessage}`, "error");
    } finally {
      setLoadingActionId(null);
    }
  };

  // Eliminar un pedido
  const handleDeleteOrder = async (orderId: string) => {
    if (!orderId) {
      setError("ID de pedido no válido");
      return;
    }

    setLoadingActionId(`delete-${orderId}`);

    try {
      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");

      const response = await fetch(`${apiUrl}/pedido/${orderId}`, {
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
      try {
        await refreshInventory();
      } catch (error) {
        console.error("Error al refrescar inventario:", error);
      }

      // Mostrar mensaje de éxito
      setSuccessMessage("Pedido eliminado correctamente");
      addNotification && addNotification("Pedido eliminado correctamente", "success");

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error eliminando pedido:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Error al eliminar pedido: ${errorMessage}`);
      addNotification && addNotification(`Error al eliminar pedido: ${errorMessage}`, "error");
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
 // handleEditOrder - versión completa y mejorada
const handleEditOrder = async (order: Order) => {
  setCurrentOrderId(order._id);

  try {
    // Determinar userId de forma segura
    const userId = typeof order.userId === 'object' && order.userId
      ? order.userId._id
      : (typeof order.userId === 'string' ? order.userId : '');

    // Si es un pedido de supervisor y no es el usuario actual
    if (userId && userId !== currentUser?._id) {
      // Comprobar si es un supervisor
      const isSupervisor = supervisors.some(s => s._id === userId);
      
      // Si no tenemos los datos del supervisor, intentar obtenerlos
      if (isSupervisor && !usersMap[userId]) {
        // Buscar y registrar el supervisor
        const supervisor = supervisors.find(s => s._id === userId);
        if (supervisor) {
          setUsersMap(prev => ({
            ...prev,
            [userId]: supervisor
          }));
        }
      }

      // Cargar clientes del supervisor para edición
      if (isAdminOrSuperSupervisor) {
        console.log(`Cargando clientes del supervisor ${userId} para edición`);
        await fetchClients(userId);
        
        // Registrar como supervisor seleccionado temporalmente
        setSelectedSupervisor(userId);
      }
    }

    // Preparar productos con nombres y precios
    const productos = await Promise.all(
      order.productos.map(async (p) => {
        const productId = typeof p.productoId === 'object' && p.productoId
          ? p.productoId._id
          : (typeof p.productoId === 'string' ? p.productoId : '');

        if (!productId) {
          return {
            productoId: '',
            cantidad: typeof p.cantidad === 'number' ? p.cantidad : 0,
            nombre: "ID de producto no válido",
            precio: 0
          };
        }

        let nombre = p.nombre;
        let precio = p.precio;

        // Si falta nombre o precio, intentar obtenerlos
        if (!nombre || typeof precio !== 'number') {
          // Primero buscar en el mapa de productos
          if (productsMap[productId]) {
            nombre = nombre || productsMap[productId].nombre;
            precio = typeof precio === 'number' ? precio : productsMap[productId].precio;
          } else {
            // Si no está en el mapa, cargar del servidor
            try {
              const product = await fetchProductById(productId);
              if (product) {
                nombre = nombre || product.nombre;
                precio = typeof precio === 'number' ? precio : product.precio;
              }
            } catch (error) {
              console.error(`Error cargando producto ${productId}:`, error);
            }
          }
        }

        return {
          productoId: productId,
          cantidad: typeof p.cantidad === 'number' ? p.cantidad : 0,
          nombre: nombre || "Producto no encontrado",
          precio: typeof precio === 'number' ? precio : 0
        };
      })
    );

    // Actualizar formulario
    setOrderForm({
      servicio: order.servicio || '',
      seccionDelServicio: order.seccionDelServicio || '',
      userId: userId,
      productos: productos,
      detalle: order.detalle || " "
    });

    // Abrir modal
    setCreateOrderModalOpen(true);
    
    // Log de depuración
    console.log("Orden cargada para edición:", {
      orderId: order._id,
      userId: userId,
      userInfo: getUserInfo(userId),
      isSupervisor: supervisors.some(s => s._id === userId),
      clientesDisponibles: clients.length
    });
  } catch (error) {
    console.error("Error preparando edición de pedido:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    setError(`Error al preparar la edición del pedido: ${errorMessage}`);
    addNotification && addNotification(`Error al preparar la edición del pedido: ${errorMessage}`, "error");
  }
};

  // Seleccionar cliente
  const handleClientChange = (clientId: string) => {
    if (!clientId || clientId === "none") return;

    const selectedClient = clients.find(c => c._id === clientId);
    if (!selectedClient) {
      console.error(`Cliente no encontrado: ${clientId}`);
      addNotification && addNotification("Cliente seleccionado no encontrado", "warning");
      return;
    }

    // Actualizar formulario con cliente seleccionado
    setOrderForm(prev => ({
      ...prev,
      servicio: selectedClient.servicio || '',
      seccionDelServicio: '',
      userId: currentUser?._id || ''
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
      addNotification && addNotification("Seleccione un producto y una cantidad válida", "warning");
      return;
    }

    const product = productsMap[selectedProduct];
    if (!product) {
      setError("Producto no encontrado");
      addNotification && addNotification("Producto no encontrado", "warning");
      return;
    }

    // Verificar stock
    if (product.stock < productQuantity) {
      setError(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`);
      addNotification && addNotification(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`, "warning");
      return;
    }

    // Buscar si el producto ya está en el pedido
    const existingIndex = orderForm.productos.findIndex(p => {
      const id = typeof p.productoId === 'object' && p.productoId ? p.productoId._id : p.productoId;
      return id === selectedProduct;
    });

    if (existingIndex >= 0) {
      // Actualizar cantidad
      const newQuantity = orderForm.productos[existingIndex].cantidad + productQuantity;

      // Verificar stock para la cantidad total
      if (product.stock < newQuantity) {
        setError(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`);
        addNotification && addNotification(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`, "warning");
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

      addNotification && addNotification(`Cantidad actualizada: ${product.nombre} (${newQuantity})`, "success");
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

      addNotification && addNotification(`Producto agregado: ${product.nombre} (${productQuantity})`, "success");
    }

    // Resetear selección
    setSelectedProduct("none");
    setProductQuantity(1);
    setSelectProductModalOpen(false);
  };

  // Eliminar producto del pedido
  const handleRemoveProduct = (index: number) => {
    if (index < 0 || index >= orderForm.productos.length) {
      console.error(`Índice de producto inválido: ${index}`);
      return;
    }

    const productToRemove = orderForm.productos[index];
    const productId = typeof productToRemove.productoId === 'object' && productToRemove.productoId
      ? productToRemove.productoId._id
      : (typeof productToRemove.productoId === 'string' ? productToRemove.productoId : '');

    const productName = productToRemove.nombre ||
      (productId && productsMap[productId] ? productsMap[productId].nombre : "Producto desconocido");

    const updatedProducts = [...orderForm.productos];
    updatedProducts.splice(index, 1);

    setOrderForm(prev => ({
      ...prev,
      productos: updatedProducts
    }));

    addNotification && addNotification(`Producto eliminado: ${productName}`, "info");
  };

  // Resetear formulario de pedido
  const resetOrderForm = () => {
    if (isAdminOrSuperSupervisor && selectedSupervisor) {
      // Si es admin y hay un supervisor seleccionado, mantener el userId del supervisor
      setOrderForm({
        servicio: '',
        seccionDelServicio: '',
        userId: selectedSupervisor,
        productos: [],
        detalle: ' '
      });
    } else {
      // Reseteo normal
      setOrderForm({
        servicio: '',
        seccionDelServicio: '',
        userId: currentUser?._id || '',
        productos: [],
        detalle: ' '
      });
    }

    setCurrentOrderId(null);
    setSelectedProduct("none");
    setProductQuantity(1);
  };

  const clearClientCache = () => {
    // Limpiar cache de clientes al cambiar entre supervisores
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(STORAGE_KEYS.CLIENTS)) {
        localStorage.removeItem(key);
      }
    });
  };

  {/* Función clearSelectedSupervisor que debe ser agregada */ }
  const clearSelectedSupervisor = () => {
    if (isAdminOrSuperSupervisor) {
      setSelectedSupervisor(null);
      // Volver a cargar los clientes del usuario actual si es necesario
      if (currentUser?._id) {
        fetchClients(currentUser._id);
      }

      // Limpiar caché de clientes para evitar problemas
      clearClientCache();
    }
  };

  // Calcular total de un pedido
  const calculateOrderTotal = useCallback((productos: OrderProduct[]): number => {
    if (!productos || !Array.isArray(productos)) return 0;

    return productos.reduce((total, item) => {
      let precio = 0;
      let cantidad = 0;

      // Extraer precio de forma segura
      if (typeof item.precio === 'number') {
        precio = item.precio;
      } else {
        const productId = typeof item.productoId === 'object' && item.productoId
          ? item.productoId._id
          : (typeof item.productoId === 'string' ? item.productoId : '');

        if (productId && productsMap[productId]) {
          precio = productsMap[productId].precio;
        }
      }

      // Extraer cantidad de forma segura
      cantidad = typeof item.cantidad === 'number' ? item.cantidad : 0;

      return total + (precio * cantidad);
    }, 0);
  }, [productsMap]);

  // Filtrar pedidos por fecha
  const handleDateFilter = async () => {
    if (!dateFilter.from || !dateFilter.to) {
      setError("Debe seleccionar fechas de inicio y fin");
      addNotification && addNotification("Seleccione ambas fechas para filtrar", "warning");
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

    addNotification && addNotification("Filtros eliminados", "info");
  };

  // Alternar vista de detalles del pedido
  const toggleOrderDetails = useCallback((orderId: string) => {
    setOrderDetailsOpen(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));

    // Cargar productos en el pedido
    const order = orders.find(o => o._id === orderId);
    if (order && Array.isArray(order.productos)) {
      order.productos.forEach(item => {
        const productId = typeof item.productoId === 'object' && item.productoId
          ? item.productoId._id
          : (typeof item.productoId === 'string' ? item.productoId : '');

        if (productId && !productsMap[productId]) {
          productLoadQueue.current.add(productId);
          processProductQueue();
        }
      });
    }
  }, [orders, productsMap]);

  // Precarga de productos en los pedidos
  const prefetchProductsFromOrders = useCallback((ordersData: Order[]) => {
    if (!Array.isArray(ordersData) || ordersData.length === 0) return;

    // Limitar a los primeros 20 pedidos para no sobrecargar
    const ordersToProcess = ordersData.slice(0, 20);

    ordersToProcess.forEach(order => {
      if (Array.isArray(order.productos)) {
        order.productos.forEach(item => {
          const productId = typeof item.productoId === 'object' && item.productoId
            ? item.productoId._id
            : (typeof item.productoId === 'string' ? item.productoId : '');

          if (productId && !productsMap[productId]) {
            productLoadQueue.current.add(productId);
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

  //Seleccionar un supervisor
  const handleSupervisorSelect = async (supervisorId: string) => {
    // Encontrar el supervisor en la lista 
    const supervisor = supervisors.find(s => s._id === supervisorId);
  
    setSelectedSupervisor(supervisorId);
    setOrderForm(prev => ({
      ...prev,
      userId: supervisorId,
      servicio: '',
      seccionDelServicio: '',
      productos: []
    }));
  
    // AÑADIR: Registrar el supervisor en el mapa de usuarios
    if (supervisor) {
      setUsersMap(prev => ({
        ...prev,
        [supervisorId]: supervisor
      }));
    }
  
    // Cerrar modal de selección
    setSupervisorSelectOpen(false);
  
    // Log para mostrar información detallada del supervisor
    console.log("Supervisor seleccionado:", {
      id: supervisorId,
      usuario: supervisor?.usuario || "Sin usuario",
      nombre: supervisor?.nombre || "Sin nombre",
      apellido: supervisor?.apellido || "Sin apellido"
    });
  
    // Cargar clientes del supervisor seleccionado
    try {
      setIsLoading(true);
      await fetchClients(supervisorId);
  
      // Abrir el modal de creación después de cargar los clientes
      setCreateOrderModalOpen(true);
    } catch (error) {
      console.error("Error cargando clientes del supervisor:", error);
      addNotification && addNotification("Error al cargar clientes del supervisor", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Obtener información de usuario
  const getUserInfo = useCallback((userId: string | User): { usuario: string; name: string } => {
    // Si es un objeto con usuario y nombre
    if (typeof userId === 'object' && userId) {
      return {
        usuario: userId.usuario || "Usuario no disponible",
        name: userId.nombre
          ? `${userId.nombre} ${userId.apellido || ''}`
          : userId.usuario || "Usuario no disponible"
      };
    }
    
    // Si es un string (ID), buscar en múltiples fuentes
    if (typeof userId === 'string') {
      // 1. Buscar primero en la lista de supervisores (prioritario)
      const supervisorMatch = supervisors.find(s => s._id === userId);
      if (supervisorMatch) {
        // Registrar supervisor en el mapa si no existe
        if (!usersMap[userId]) {
          // Usar setTimeout para evitar actualizar estado durante renderizado
          setTimeout(() => {
            setUsersMap(prev => ({
              ...prev,
              [userId]: supervisorMatch
            }));
          }, 0);
        }
        
        return {
          usuario: supervisorMatch.usuario || "Supervisor",
          name: supervisorMatch.nombre
            ? `${supervisorMatch.nombre} ${supervisorMatch.apellido || ''}`
            : supervisorMatch.usuario || "Supervisor"
        };
      }
    
      // 2. Buscar en el mapa de usuarios
      const userMatch = usersMap[userId];
      if (userMatch) {
        return {
          usuario: userMatch.usuario || "Usuario no disponible",
          name: userMatch.nombre
            ? `${userMatch.nombre} ${userMatch.apellido || ''}`
            : userMatch.usuario || "Usuario no disponible"
        };
      }
    
      // 3. Si es el usuario actual
      if (currentUser && currentUser._id === userId) {
        return {
          usuario: currentUser.usuario || "Usuario actual",
          name: currentUser.nombre
            ? `${currentUser.nombre} ${currentUser.apellido || ''}`
            : currentUser.usuario || "Usuario actual"
        };
      }
      
      // Si aún no encontramos, pero estamos seguros de que es un supervisor (basado en contexto)
      if (isAdminOrSuperSupervisor && selectedSupervisor === userId) {
        console.log("Supervisor seleccionado pero sin datos completos:", userId);
        return {
          usuario: "Supervisor",
          name: "Supervisor seleccionado"
        };
      }
    }
    
    // Si no se encuentra información
    console.warn(`No se encontró información de usuario para: ${typeof userId === 'string' ? userId : 'objeto usuario'}`);
    return { usuario: "Usuario no disponible", name: "Usuario no disponible" };
  }, [usersMap, supervisors, currentUser, isAdminOrSuperSupervisor, selectedSupervisor]);


  // Función para cambiar de página
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);

    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // En móvil, scroll al inicio de la lista
    if (windowWidth < 640 && mobileListRef.current) {
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

      addNotification && addNotification("Datos actualizados correctamente", "success");
    } catch (error) {
      console.error("Error actualizando datos:", error);
      addNotification && addNotification("Error al actualizar los datos", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Gestionar el PDF de pedido
  const handleDownloadRemito = (pedidoId: string) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error("No hay token de autenticación");

      addNotification && addNotification("Generando PDF del remito...", "info");

      // Abrir en una nueva pestaña
      window.open(`${apiUrl}/downloads/remito/${pedidoId}`, '_blank');
    } catch (error) {
      console.error("Error al generar remito:", error);
      addNotification && addNotification("Error al generar el remito", "error");
    }
  };

  //Nueva orden
  const handleNewOrderClick = () => {
    resetOrderForm();

    // Si es admin o supervisor de supervisores, mostrar primero el selector de supervisor
    if (isAdminOrSuperSupervisor) {
      // Si no hay supervisores cargados, cargarlos
      if (supervisors.length === 0) {
        fetchSupervisors();
      }
      setSupervisorSelectOpen(true);
    } else {
      // Para usuarios normales, abrir directamente el modal de creación
      setCreateOrderModalOpen(true);
    }
  };

  // ======== EFECTOS ========

  // Inicializar datos desde localStorage al montar
  useEffect(() => {
    // Cargar datos de caché
    const cachedUser = loadFromLocalStorage(STORAGE_KEYS.CURRENT_USER);
    if (cachedUser) {
      setCurrentUser(cachedUser);
      setOrderForm(prev => ({ ...prev, userId: cachedUser._id || "" }));
    }

    const cachedProducts = loadFromLocalStorage(STORAGE_KEYS.PRODUCTS);
    if (Array.isArray(cachedProducts) && cachedProducts.length > 0) {
      setProducts(cachedProducts);

      // Crear mapa de productos
      const newProductsMap: Record<string, Product> = {};
      cachedProducts.forEach(product => {
        if (product && product._id) {
          newProductsMap[product._id] = product;
        }
      });
      setProductsMap(newProductsMap);
    }

    const cachedUsers = loadFromLocalStorage(STORAGE_KEYS.USERS);
    if (Array.isArray(cachedUsers) && cachedUsers.length > 0) {
      setUsers(cachedUsers);

      // Crear mapa de usuarios
      const newUsersMap: Record<string, User> = {};
      cachedUsers.forEach(user => {
        if (user && user._id) {
          newUsersMap[user._id] = user;
        }
      });
      setUsersMap(newUsersMap);
    }

    const cachedClients = loadFromLocalStorage(STORAGE_KEYS.CLIENTS);
    if (Array.isArray(cachedClients) && cachedClients.length > 0) {
      setClients(cachedClients);

      // Agrupar por servicio
      const sections: Record<string, Client[]> = {};
      cachedClients.forEach(client => {
        if (client && client.servicio) {
          if (!sections[client.servicio]) {
            sections[client.servicio] = [];
          }
          sections[client.servicio].push(client);
        }
      });
      setClientSections(sections);
    }

    const cachedOrders = loadFromLocalStorage(STORAGE_KEYS.ORDERS);
    if (Array.isArray(cachedOrders)) {
      setOrders(cachedOrders);
    }

    // Marcar componente como montado
    mountedRef.current = true;

    // Cleanup
    return () => {
      mountedRef.current = false;
    };
  }, [loadFromLocalStorage]);

  // Cargar datos después de la primera renderización
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

        addNotification && addNotification("Error cargando los datos iniciales", "error");
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
      setWindowWidth(window.innerWidth);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // ======== FILTRADO Y PAGINACIÓN ========

  // Filtrar pedidos según términos de búsqueda
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];

    return orders.filter(order => {
      if (!searchTerm) return true;

      const searchLower = searchTerm.toLowerCase();

      return (
        (order.servicio || '').toLowerCase().includes(searchLower) ||
        String(order.nPedido || '').includes(searchTerm) ||
        (order.seccionDelServicio || '').toLowerCase().includes(searchLower) ||
        getUserInfo(order.userId).usuario.toLowerCase().includes(searchLower) ||
        getUserInfo(order.userId).name.toLowerCase().includes(searchLower)
      );
    });
  }, [orders, searchTerm, getUserInfo]);

  // Calcular paginación
  const paginatedOrders = useMemo(() => {
    if (!Array.isArray(filteredOrders)) return [];

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
              onClick={handleNewOrderClick}
              className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              disabled={products.length === 0 || (isAdminOrSuperSupervisor ? supervisors.length === 0 : clients.length === 0)}
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
            onClick={handleNewOrderClick}
            className="flex-shrink-0 bg-[#29696B] hover:bg-[#29696B]/90 text-white"
            disabled={!isAdminOrSuperSupervisor && (clients.length === 0 || products.length === 0)}
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
                              {order.servicio || "Sin cliente"}
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
                          <div className="text-sm text-[#29696B]" />
                          {getUserInfo(order.userId).usuario}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-[#91BEAD] text-[#29696B] bg-[#DFEFE6]/30">
                              {order.productos && Array.isArray(order.productos)
                                ? `${order.productos.length} producto${order.productos.length !== 1 ? 's' : ''}`
                                : '0 productos'}
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
                                    {Array.isArray(order.productos) && order.productos.map((item, index) => (
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
                          {order.servicio || "Sin cliente"}
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
                        <span className="text-[#29696B]">{getUserInfo(order.userId).usuario}</span>
                      </div>

                      <div className="flex items-center">
                        <ShoppingCart className="w-3 h-3 text-[#7AA79C] mr-1" />
                        <span className="text-[#29696B]">
                          {Array.isArray(order.productos)
                            ? `${order.productos.length} producto${order.productos.length !== 1 ? 's' : ''}`
                            : '0 productos'}
                        </span>
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
                              {Array.isArray(order.productos) && order.productos.map((item, index) => (
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
      <Dialog
        open={createOrderModalOpen}
        onOpenChange={(open) => {
          setCreateOrderModalOpen(open);
          if (!open) {
            // Limpiar supervisor seleccionado al cerrar modal
            clearSelectedSupervisor();
          }
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">
              {currentOrderId
                ? `Editar Pedido #${orders.find(o => o._id === currentOrderId)?.nPedido || ''}`
                : isAdminOrSuperSupervisor && selectedSupervisor
                  ? `Nuevo Pedido (Para: ${supervisors.find(s => s._id === selectedSupervisor)?.nombre || 'Supervisor'})`
                  : 'Nuevo Pedido'
              }
            </DialogTitle>
            {currentOrderId && (
              <DialogDescription className="text-[#7AA79C]">
                Modificar los detalles del pedido
              </DialogDescription>
            )}
            {isAdminOrSuperSupervisor && selectedSupervisor && !currentOrderId && (
              <DialogDescription className="text-[#7AA79C]">
                Creando pedido para el supervisor: {
                  supervisors.find(s => s._id === selectedSupervisor)?.usuario ||
                  'Supervisor seleccionado'
                }
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Indicador de supervisor seleccionado */}
          {isAdminOrSuperSupervisor && selectedSupervisor && (
            <div className="bg-[#DFEFE6]/30 p-3 rounded-md border border-[#91BEAD]/30 mb-4">
              <div className="flex items-center text-[#29696B]">
                <User className="w-4 h-4 text-[#7AA79C] mr-2" />
                <span className="font-medium">
                  {(() => {
                    // Buscar el supervisor en la lista de supervisores
                    const supervisor = supervisors.find(s => s._id === selectedSupervisor);
                    if (!supervisor) return "Supervisor seleccionado";

                    if (supervisor.nombre || supervisor.apellido) {
                      return `${supervisor.nombre || ''} ${supervisor.apellido || ''}`.trim();
                    }
                    return supervisor.usuario || "Supervisor seleccionado";
                  })()}
                </span>
              </div>
              <div className="text-xs text-[#7AA79C] ml-6 mt-1">
                @{(() => {
                  const supervisor = supervisors.find(s => s._id === selectedSupervisor);
                  return supervisor?.usuario || "usuario";
                })()}
              </div>
            </div>
          )}

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
                    {isAdminOrSuperSupervisor && selectedSupervisor
                      ? "El supervisor seleccionado no tiene clientes asignados."
                      : "No tiene clientes asignados o no se pudieron cargar. Contacte a un administrador para que le asigne clientes."
                    }
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
                      <SelectTrigger id="cliente" className="border-[#91BEAD] focus:ring-[#29696B]/20">
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" disabled>Seleccione un cliente</SelectItem>
                        {Array.isArray(clients) && clients.length > 0 ? (
                          Object.entries(clientSections).map(([servicio, serviceClients]) => (
                            <SelectItem
                              key={servicio}
                              value={serviceClients[0]._id}
                            >
                              {servicio}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-clients" disabled>No hay clientes disponibles</SelectItem>
                        )}
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

              {!orderForm.productos || orderForm.productos.length === 0 ? (
                <div className="text-center py-8 text-[#7AA79C] border border-dashed border-[#91BEAD]/40 rounded-md bg-[#DFEFE6]/10">
                  No hay productos en el pedido
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {orderForm.productos.map((item, index) => {
                    const productId = typeof item.productoId === 'object' && item.productoId
                      ? item.productoId._id
                      : (typeof item.productoId === 'string' ? item.productoId : '');

                    const product = productId ? productsMap[productId] : undefined;
                    const nombre = item.nombre || (product?.nombre || 'Producto no encontrado');
                    const precio = typeof item.precio === 'number' ? item.precio : (product?.precio || 0);
                    const cantidad = typeof item.cantidad === 'number' ? item.cantidad : 0;

                    return (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-[#DFEFE6]/20 rounded-md border border-[#91BEAD]/30"
                      >
                        <div>
                          <div className="font-medium text-[#29696B]">{nombre}</div>
                          <div className="text-sm text-[#7AA79C]">
                            Cantidad: {cantidad} x ${precio.toFixed(2)}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="font-medium text-[#29696B]">
                            ${(precio * cantidad).toFixed(2)}
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
              {orderForm.productos && orderForm.productos.length > 0 && (
                <div className="flex justify-between items-center p-3 bg-[#DFEFE6]/40 rounded-md mt-4 border border-[#91BEAD]/30">
                  <div className="font-medium text-[#29696B]">Total</div>
                  <div className="font-bold text-lg text-[#29696B]">${calculateOrderTotal(orderForm.productos).toFixed(2)}</div>
                </div>
              )}
            </div>

            {/* Observaciones */}
            <div>
              <Label htmlFor="detalle" className="text-[#29696B]">Observaciones (opcional)</Label>
              <textarea
                id="detalle"
                value={orderForm.detalle === ' ' ? '' : orderForm.detalle}
                onChange={(e) => setOrderForm(prev => ({ ...prev, detalle: e.target.value }))}
                className="w-full border-[#91BEAD] rounded-md p-2 mt-1 focus:ring-[#29696B]/20 focus:border-[#29696B]"
                rows={3}
                placeholder="Agregue notas adicionales aquí..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCreateOrderModalOpen(false);
                resetOrderForm();
                if (isAdminOrSuperSupervisor) {
                  clearSelectedSupervisor();
                }
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
                !orderForm.productos ||
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


      {/* Modal para seleccionar supervisor */}
      <Dialog open={supervisorSelectOpen} onOpenChange={setSupervisorSelectOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">Seleccionar Supervisor</DialogTitle>
            <DialogDescription className="text-[#7AA79C]">
              Elija el supervisor para el cual desea crear el pedido.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {isFetchingSupervisors ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-8 w-8 text-[#29696B] animate-spin" />
              </div>
            ) : supervisors.length === 0 ? (
              <Alert className="bg-[#DFEFE6]/30 border border-[#91BEAD] text-[#29696B]">
                <AlertDescription>
                  No hay supervisores disponibles. Contacte al administrador del sistema.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {supervisors.map((supervisor) => (
                  <div
                    key={supervisor._id}
                    className="p-3 border border-[#91BEAD] rounded-md hover:bg-[#DFEFE6]/30 cursor-pointer transition-colors"
                    onClick={() => handleSupervisorSelect(supervisor._id)}
                  >
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-[#7AA79C] mr-2" />
                      <span className="text-[#29696B] font-medium">
                        {supervisor.nombre && supervisor.apellido
                          ? `${supervisor.nombre} ${supervisor.apellido}`
                          : supervisor.usuario || "Supervisor"}
                      </span>
                    </div>
                    {supervisor.usuario && (
                      <div className="text-xs text-[#7AA79C] ml-6 mt-1">
                        @{supervisor.usuario}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSupervisorSelectOpen(false)}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Cancelar
            </Button>

            <Button
              className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              onClick={() => {
                setSupervisorSelectOpen(false);
                if (supervisors.length > 0) {
                  // Si solo hay un supervisor, seleccionarlo automáticamente
                  const firstSupervisor = supervisors[0];
                  handleSupervisorSelect(firstSupervisor._id);
                }
              }}
              disabled={supervisors.length === 0}
            >
              Seleccionar Automáticamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para seleccionar sección */}
      <Dialog open={selectSectionModalOpen} onOpenChange={setSelectSectionModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">Seleccionar Sección</DialogTitle>
            <DialogDescription className="text-[#7AA79C]">
              Seleccione la sección específica para este cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {orderForm.servicio && clientSections[orderForm.servicio] &&
                clientSections[orderForm.servicio].map((client) => (
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
            <DialogDescription className="text-[#7AA79C]">
              Seleccione el producto y la cantidad que desea agregar.
            </DialogDescription>
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
                <SelectTrigger id="producto" className="border-[#91BEAD] focus:ring-[#29696B]/20">
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="none" disabled>Seleccione un producto</SelectItem>
                  {Array.isArray(products) && products.length > 0 ? (
                    products.map(product => (
                      <SelectItem
                        key={product._id}
                        value={product._id}
                        disabled={product.stock <= 0}
                      >
                        {product.nombre} - ${product.precio.toFixed(2)} {product.stock <= 0 ? '(Sin stock)' : `(Stock: ${product.stock})`}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-products" disabled>No hay productos disponibles</SelectItem>
                  )}
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
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setProductQuantity(isNaN(value) || value < 1 ? 1 : value);
                }}
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