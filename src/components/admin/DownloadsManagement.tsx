import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Loader2,
  Search,
  SlidersHorizontal,
  Hash,
  MapPin,
  Package,
  User,
  Building,
  X,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Store
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import Pagination from "@/components/ui/pagination";
import api from '../../services/api';
// Importamos (o creamos) el observable para actualizaciones en tiempo real
import { inventoryObservable } from '@/utils/inventoryUtils';

// Creamos un observable específico para pedidos si no existe
const pedidosObservable = {
  observers: [],
  subscribe(callback) {
    this.observers.push(callback);
    return () => {
      this.observers = this.observers.filter(obs => obs !== callback);
    };
  },
  notify() {
    this.observers.forEach(callback => callback());
  }
};

// Interface definitions
interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface SubUbicacion {
  _id: string;
  nombre: string;
  descripcion?: string;
}

interface SubServicio {
  _id: string;
  nombre: string;
  descripcion?: string;
  subUbicaciones: SubUbicacion[];
}

interface Cliente {
  _id: string;
  nombre: string;
  descripcion?: string;
  servicio: string;
  seccionDelServicio: string;
  userId: {
    _id: string;
    nombre?: string;
    email?: string;
    isActive?: boolean;
  } | string;
  subServicios: SubServicio[];
  direccion?: string;
  telefono?: string;
  email?: string;
  activo: boolean;
}

interface Usuario {
  _id: string;
  nombre?: string;
  apellido?: string;
  usuario: string;
  role: string;
  isActive: boolean;
  displayName?: string;
}

interface Producto {
  _id: string;
  nombre: string;
  categoria: string;
  precio: number;
  stock: number;
}

interface ProductoEnPedido {
  productoId: string | Producto;
  cantidad: number;
  precioUnitario?: number;
}

interface ClienteEnPedido {
  clienteId: string;
  subServicioId?: string;
  subUbicacionId?: string;
  nombreCliente: string;
  nombreSubServicio?: string;
  nombreSubUbicacion?: string;
}

interface Pedido {
  _id: string;
  fecha: string;
  nPedido?: number; // Campo específico para número de pedido (backend)
  numero?: string;  // Campo de compatibilidad anterior
  servicio: string;
  seccionDelServicio: string;
  cliente?: ClienteEnPedido;
  productos: ProductoEnPedido[];
  total?: number;
  displayNumber?: string; // Campo para mostrar consistentemente
  userId?: string | Usuario; // Supervisor/Usuario asignado
  supervisorId?: string | Usuario;
  clienteId?: string;
}

interface FilterOptions {
  servicio: string;
  fechaInicio: string;
  fechaFin: string;
  productoId: string;
  supervisorId: string;
  clienteId: string;
  subServicioId: string;
  subUbicacionId: string;
}

interface CacheState {
  productos: Producto[];
  supervisores: Usuario[];
  clientes: Cliente[];
  pedidos: Pedido[];
  lastRefreshed: {
    productos: number;
    supervisores: number;
    clientes: number;
    pedidos: number;
  };
  lastUpdated: {
    productos: number;
    supervisores: number;
    clientes: number;
    pedidos: number;
  };
}

// Incrementamos el tiempo de caché (30 minutos) para reducir peticiones innecesarias
const CACHE_EXPIRY_TIME = 30 * 60 * 1000;
// Tiempo más corto para datos que cambian con más frecuencia como pedidos (5 minutos)
const PEDIDOS_CACHE_EXPIRY_TIME = 5 * 60 * 1000;
// Tiempo máximo sin actualizar, incluso si no hay eventos (1 hora)
const MAX_TIME_WITHOUT_UPDATE = 60 * 60 * 1000;

const DownloadsManagement: React.FC = () => {
  // Estados para Excel
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  });
  
  // Estados para Remitos
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [selectedSubServicio, setSelectedSubServicio] = useState<string>('');
  const [selectedSubUbicacion, setSelectedSubUbicacion] = useState<string>('');
  const [selectedPedido, setSelectedPedido] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para tabla de pedidos
  const [allPedidos, setAllPedidos] = useState<Pedido[]>([]);
  const [filteredPedidos, setFilteredPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [loadingCacheData, setLoadingCacheData] = useState(false);
  
  // Estados para los nuevos filtros
  const [productos, setProductos] = useState<Producto[]>([]);
  const [supervisores, setSupervisores] = useState<Usuario[]>([]);
  const [allClientes, setAllClientes] = useState<Cliente[]>([]);
  
  // Estado para la búsqueda en filtros
  const [filterSearch, setFilterSearch] = useState({
    producto: '',
    supervisor: '',
    cliente: ''
  });
  
  // Estado para el cache mejorado
  const [cacheState, setCacheState] = useState<CacheState>({
    productos: [],
    supervisores: [],
    clientes: [],
    pedidos: [],
    lastRefreshed: {
      productos: 0,
      supervisores: 0,
      clientes: 0,
      pedidos: 0
    },
    lastUpdated: {
      productos: 0,
      supervisores: 0,
      clientes: 0,
      pedidos: 0
    }
  });

  // Referencia para controlar si la pantalla ya ha sido inicializada
  const initialLoadDone = useRef(false);
  
  // Filtros
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    servicio: 'todos',
    fechaInicio: '',
    fechaFin: '',
    productoId: '',
    supervisorId: '',
    clienteId: '',
    subServicioId: '',
    subUbicacionId: ''
  });
  
  // Estado temporal para formulario de filtros
  const [tempFilterOptions, setTempFilterOptions] = useState<FilterOptions>({
    servicio: 'todos',
    fechaInicio: '',
    fechaFin: '',
    productoId: '',
    supervisorId: '',
    clienteId: '',
    subServicioId: '',
    subUbicacionId: ''
  });
  
  // Estado para controlar el diálogo de filtros
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  
  // Estado para controlar qué selector de filtro está abierto
  const [activeFilterSelector, setActiveFilterSelector] = useState<string | null>(null);
  
  // Estado compartido
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const mobileListRef = useRef<HTMLDivElement>(null);

  // IMPORTANTE: Tamaños fijos para cada tipo de dispositivo
  const ITEMS_PER_PAGE_MOBILE = 5;
  const ITEMS_PER_PAGE_DESKTOP = 10;
  const itemsPerPage = windowWidth < 768 ? ITEMS_PER_PAGE_MOBILE : ITEMS_PER_PAGE_DESKTOP;

  // Formatear fechas
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  
  const formatDisplayDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

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

  // Función para verificar si el caché está actualizado con lógica mejorada
  const isCacheValid = useCallback((cacheType: 'productos' | 'supervisores' | 'clientes' | 'pedidos') => {
    const lastRefreshed = cacheState.lastRefreshed[cacheType];
    const lastUpdated = cacheState.lastUpdated[cacheType];
    const now = Date.now();
    
    // Si nunca se ha refrescado, no es válido
    if (lastRefreshed === 0) return false;
    
    // Tiempos de expiración diferentes según el tipo de dato
    const expiryTime = cacheType === 'pedidos' ? PEDIDOS_CACHE_EXPIRY_TIME : CACHE_EXPIRY_TIME;
    
    // Si ha pasado demasiado tiempo sin actualizar, el caché ya no es válido
    if (now - lastRefreshed > MAX_TIME_WITHOUT_UPDATE) return false;
    
    // Si ha habido una actualización reciente, el caché no es válido
    if (lastUpdated > lastRefreshed) return false;
    
    // Si no ha pasado el tiempo de expiración, el caché sigue siendo válido
    return (now - lastRefreshed) < expiryTime;
  }, [cacheState.lastRefreshed, cacheState.lastUpdated]);

  // Resetear la página actual cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [filterOptions]);

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

  // Cargar datos de productos (con caché mejorado)
  const loadProductos = useCallback(async (forceRefresh = false) => {
    // Si ya tenemos productos en caché y no forzamos actualización, usamos el caché
    if (!forceRefresh && isCacheValid('productos') && cacheState.productos.length > 0) {
      setProductos(cacheState.productos);
      return cacheState.productos;
    }
    
    try {
      // Indicamos que estamos cargando datos
      setLoadingCacheData(true);
      
      // Llamada a la API para obtener todos los productos
      const response = await api.getClient().get('/producto');
      
      let processedProductos: Producto[] = [];
      
      if (response.data && Array.isArray(response.data.items)) {
        // Si estamos usando la estructura paginada
        processedProductos = response.data.items.map((prod: any) => ({
          _id: prod._id,
          nombre: prod.nombre,
          categoria: prod.categoria,
          precio: prod.precio,
          stock: prod.stock
        }));
      } else if (response.data && Array.isArray(response.data)) {
        // Si estamos usando la estructura de array simple
        processedProductos = response.data.map((prod: any) => ({
          _id: prod._id,
          nombre: prod.nombre,
          categoria: prod.categoria,
          precio: prod.precio,
          stock: prod.stock
        }));
      }
      
      // Actualizar el estado y el caché
      setProductos(processedProductos);
      
      // Actualizar caché con timestamp
      setCacheState(prev => ({
        ...prev,
        productos: processedProductos,
        lastRefreshed: {
          ...prev.lastRefreshed,
          productos: Date.now()
        }
      }));
      
      return processedProductos;
    } catch (error) {
      console.error('Error al cargar productos:', error);
      return cacheState.productos; // Devolver caché anterior en caso de error
    } finally {
      setLoadingCacheData(false);
    }
  }, [cacheState.productos, isCacheValid]);

  // Cargar supervisores (usuarios con rol de supervisor)
  const loadSupervisores = useCallback(async (forceRefresh = false) => {
    // Si ya tenemos supervisores en caché y no forzamos actualización, usamos el caché
    if (!forceRefresh && isCacheValid('supervisores') && cacheState.supervisores.length > 0) {
      setSupervisores(cacheState.supervisores);
      return cacheState.supervisores;
    }
    
    try {
      // Llamada a la API para obtener todos los usuarios
      const response = await api.getClient().get('/auth/users');
      
      let filteredUsers: Usuario[] = [];
      
      if (response.data && response.data.users && Array.isArray(response.data.users)) {
        // Filtrar solo usuarios activos con roles relevantes (supervisor, admin, etc.)
        filteredUsers = response.data.users
          .filter((user: any) => user.isActive)
          .map((user: any) => ({
            _id: user._id,
            nombre: user.nombre || '',
            apellido: user.apellido || '',
            usuario: user.usuario,
            role: user.role,
            isActive: user.isActive,
            // Crear un nombre para mostrar
            displayName: `${user.nombre || ''} ${user.apellido || ''}`.trim() || user.usuario
          }));
        
        setSupervisores(filteredUsers);
        
        // Actualizar caché
        setCacheState(prev => ({
          ...prev,
          supervisores: filteredUsers,
          lastRefreshed: {
            ...prev.lastRefreshed,
            supervisores: Date.now()
          }
        }));
      }
      
      return filteredUsers;
    } catch (error) {
      console.error('Error al cargar supervisores:', error);
      return cacheState.supervisores; // Devolver caché anterior en caso de error
    }
  }, [cacheState.supervisores, isCacheValid]);

  // Cargar todos los clientes (con caché)
  const loadAllClientes = useCallback(async (forceRefresh = false) => {
    // Si ya tenemos clientes en caché y no forzamos actualización, usamos el caché
    if (!forceRefresh && isCacheValid('clientes') && cacheState.clientes.length > 0) {
      setAllClientes(cacheState.clientes);
      setClientes(cacheState.clientes);
      return cacheState.clientes;
    }
    
    try {
      const response = await api.getClient().get('/cliente');
      
      if (response.data && Array.isArray(response.data)) {
        const clientesData = response.data.map((cliente: any) => {
          // Asegurar que todos los campos necesarios estén presentes
          return {
            ...cliente,
            servicio: cliente.servicio || cliente.nombre, // Mantener compatibilidad
            seccionDelServicio: cliente.seccionDelServicio || '',
            subServicios: cliente.subServicios || []
          };
        });
        
        setAllClientes(clientesData);
        setClientes(clientesData);
        
        // Actualizar caché
        setCacheState(prev => ({
          ...prev,
          clientes: clientesData,
          lastRefreshed: {
            ...prev.lastRefreshed,
            clientes: Date.now()
          }
        }));
        
        return clientesData;
      }
      
      return [];
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      // Devolver caché anterior en caso de error
      return cacheState.clientes;
    }
  }, [cacheState.clientes, isCacheValid]);

  // Cargar todos los pedidos para la tabla (con caché optimizado)
  const loadAllPedidos = useCallback(async (forceRefresh = false) => {
    // Verificar si podemos usar el caché
    if (!forceRefresh && isCacheValid('pedidos') && cacheState.pedidos.length > 0) {
      setAllPedidos(cacheState.pedidos);
      setFilteredPedidos(cacheState.pedidos);
      return cacheState.pedidos;
    }
    
    setLoadingPedidos(true);
    try {
      const response = await api.getClient().get('/pedido');
      
      // Verificar que response.data exista y sea un array
      if (response.data && Array.isArray(response.data)) {
        // Calcular total para cada pedido y agregar displayNumber
        const pedidosConTotal = response.data.map((pedido: any) => {
          let total = 0;
          if (pedido.productos && Array.isArray(pedido.productos)) {
            total = pedido.productos.reduce((sum: number, prod: any) => {
              // Primero usar precioUnitario (si está disponible) o el precio del producto
              const precio = prod.precioUnitario || 
                (prod.productoId && typeof prod.productoId === 'object' ? 
                 prod.productoId.precio : 0);
              const cantidad = prod.cantidad || 0;
              return sum + (precio * cantidad);
            }, 0);
          }
          
          // Añadir displayNumber que prioriza nPedido
          const displayNumber = pedido.nPedido?.toString() || pedido.numero || 'S/N';
          
          return { ...pedido, total, displayNumber };
        });
        
        setAllPedidos(pedidosConTotal);
        setFilteredPedidos(pedidosConTotal);
        
        // Actualizar caché
        setCacheState(prev => ({
          ...prev,
          pedidos: pedidosConTotal,
          lastRefreshed: {
            ...prev.lastRefreshed,
            pedidos: Date.now()
          }
        }));
        
        // Inicializar las opciones de filtro temporales
        setTempFilterOptions({
          servicio: 'todos',
          fechaInicio: '',
          fechaFin: '',
          productoId: '',
          supervisorId: '',
          clienteId: '',
          subServicioId: '',
          subUbicacionId: ''
        });
        
        return pedidosConTotal;
      }
      
      // Si la respuesta no es un array, mantener el estado actual
      return cacheState.pedidos;
    } catch (err) {
      console.error('Error al cargar todos los pedidos:', err);
      return cacheState.pedidos; // Devolver caché anterior en caso de error
    } finally {
      setLoadingPedidos(false);
    }
  }, [cacheState.pedidos, isCacheValid]);

  // Función para limpiar los filtros de estructura jerárquica cuando cambia el cliente
  const resetJerarquiaSelections = useCallback(() => {
    setSelectedSubServicio('');
    setSelectedSubUbicacion('');
  }, []);

  // Cargar pedidos específicos por cliente (y opcionalmente subServicio y subUbicacion)
  const loadPedidosByCliente = useCallback(async (clienteId: string, subServicioId?: string, subUbicacionId?: string) => {
    if (!clienteId) {
      setPedidos([]);
      return [];
    }
    
    let url = `/pedido/cliente/${clienteId}`;
    const params: Record<string, string> = {};
    
    // Añadir parámetros opcionales para la estructura jerárquica
    if (subServicioId) {
      params.subServicioId = subServicioId;
      
      if (subUbicacionId) {
        params.subUbicacionId = subUbicacionId;
      }
    }
    
    try {
      setError('');
      const pedidosResponse = await api.getClient().get(url, { params });
      
      if (pedidosResponse.data && Array.isArray(pedidosResponse.data)) {
        // Procesar los pedidos para asegurar que displayNumber esté definido
        const processedPedidos = pedidosResponse.data.map((pedido: any) => {
          return {
            ...pedido,
            displayNumber: pedido.nPedido?.toString() || pedido.numero || 'S/N'
          };
        });
        
        setPedidos(processedPedidos);
        return processedPedidos;
      } else {
        setPedidos([]);
        return [];
      }
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
      setPedidos([]);
      setError('Error al cargar pedidos para este cliente');
      return [];
    }
  }, []);

  // Efecto para cargar pedidos cuando se selecciona un cliente o estructura jerárquica
  useEffect(() => {
    if (selectedCliente) {
      loadPedidosByCliente(selectedCliente, selectedSubServicio, selectedSubUbicacion);
    }
  }, [selectedCliente, selectedSubServicio, selectedSubUbicacion, loadPedidosByCliente]);

  // Cargar datos iniciales solo una vez al montar el componente
  useEffect(() => {
    if (!initialLoadDone.current) {
      // Cargar datos iniciales
      Promise.all([
        loadProductos(),
        loadSupervisores(),
        loadAllClientes(),
        loadAllPedidos()
      ]).then(() => {
        initialLoadDone.current = true;
      });
    }
  }, [loadProductos, loadSupervisores, loadAllClientes, loadAllPedidos]);

  // Suscribirse a eventos de actualización
  useEffect(() => {
    // Suscribirse a actualizaciones de inventario (productos)
    const unsubscribeInventory = inventoryObservable.subscribe(() => {
      console.log('DownloadsManagement: Actualización de inventario notificada');
      
      // Marcar productos como actualizados
      setCacheState(prev => ({
        ...prev,
        lastUpdated: {
          ...prev.lastUpdated,
          productos: Date.now()
        }
      }));
      
      // Cargar los productos actualizados
      loadProductos(true);
    });
    
    // Suscribirse a actualizaciones de pedidos
    const unsubscribePedidos = pedidosObservable.subscribe(() => {
      console.log('DownloadsManagement: Actualización de pedidos notificada');
      
      // Marcar pedidos como actualizados
      setCacheState(prev => ({
        ...prev,
        lastUpdated: {
          ...prev.lastUpdated,
          pedidos: Date.now()
        }
      }));
      
      // Actualizar los pedidos
      loadAllPedidos(true);
      
      // Si hay un cliente seleccionado, actualizar sus pedidos también
      if (selectedCliente) {
        loadPedidosByCliente(selectedCliente, selectedSubServicio, selectedSubUbicacion);
      }
    });
    
    // Limpiar suscripciones al desmontar
    return () => {
      unsubscribeInventory();
      unsubscribePedidos();
    };
  }, [loadProductos, loadAllPedidos, loadPedidosByCliente, selectedCliente, selectedSubServicio, selectedSubUbicacion]);

  // Función para forzar la recarga de todos los datos (usada solo en casos especiales)
  const forceRefreshAllData = useCallback(() => {
    setLoadingCacheData(true);
    Promise.all([
      loadProductos(true),
      loadSupervisores(true),
      loadAllClientes(true),
      loadAllPedidos(true)
    ]).then(() => {
      // Si hay un cliente seleccionado, actualizar sus pedidos también
      if (selectedCliente) {
        return loadPedidosByCliente(selectedCliente, selectedSubServicio, selectedSubUbicacion);
      }
    }).finally(() => {
      setLoadingCacheData(false);
      // Mostrar mensaje de éxito
      setSuccessMessage('Datos actualizados correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    });
  }, [loadProductos, loadSupervisores, loadAllClientes, loadAllPedidos, loadPedidosByCliente, selectedCliente, selectedSubServicio, selectedSubUbicacion]);

  // Función para aplicar filtros
  const applyFilters = useCallback(() => {
    if (!allPedidos.length) return;
    
    let filtered = [...allPedidos];
    
    // Filtrar por servicio
    if (filterOptions.servicio && filterOptions.servicio !== 'todos') {
      filtered = filtered.filter(pedido => 
        pedido.servicio === filterOptions.servicio
      );
    }
    
    // Filtrar por fecha inicio
    if (filterOptions.fechaInicio) {
      const fechaInicio = new Date(filterOptions.fechaInicio);
      fechaInicio.setHours(0, 0, 0, 0);
      filtered = filtered.filter(pedido => {
        const fechaPedido = new Date(pedido.fecha);
        return fechaPedido >= fechaInicio;
      });
    }
    
    // Filtrar por fecha fin
    if (filterOptions.fechaFin) {
      const fechaFin = new Date(filterOptions.fechaFin);
      fechaFin.setHours(23, 59, 59, 999);
      filtered = filtered.filter(pedido => {
        const fechaPedido = new Date(pedido.fecha);
        return fechaPedido <= fechaFin;
      });
    }
    
    // Filtrar por producto
    if (filterOptions.productoId) {
      filtered = filtered.filter(pedido => {
        if (!pedido.productos || !Array.isArray(pedido.productos)) return false;
        
        return pedido.productos.some(productoItem => {
          // Manejar casos donde productoId es objeto o string
          if (typeof productoItem.productoId === 'object') {
            return productoItem.productoId && productoItem.productoId._id === filterOptions.productoId;
          } else {
            return productoItem.productoId === filterOptions.productoId;
          }
        });
      });
    }
    
    // Filtrar por supervisor
    if (filterOptions.supervisorId) {
      filtered = filtered.filter(pedido => {
        // Primero buscar en el campo supervisorId (nuevo)
        if (typeof pedido.supervisorId === 'object') {
          return pedido.supervisorId && pedido.supervisorId._id === filterOptions.supervisorId;
        } else if (pedido.supervisorId) {
          return pedido.supervisorId === filterOptions.supervisorId;
        }
        
        // Si no, buscar en userId (compatibilidad)
        if (typeof pedido.userId === 'object') {
          return pedido.userId && pedido.userId._id === filterOptions.supervisorId;
        } else {
          return pedido.userId === filterOptions.supervisorId;
        }
      });
    }
    
    // Filtrar por cliente (ahora usando la estructura jerárquica)
    if (filterOptions.clienteId) {
      filtered = filtered.filter(pedido => {
        // Primero revisar la nueva estructura cliente
        if (pedido.cliente && pedido.cliente.clienteId === filterOptions.clienteId) {
          // Si hay subServicioId en el filtro, también filtrar por eso
          if (filterOptions.subServicioId && 
              pedido.cliente.subServicioId !== filterOptions.subServicioId) {
            return false;
          }
          
          // Si hay subUbicacionId en el filtro, también filtrar por eso
          if (filterOptions.subUbicacionId && 
              pedido.cliente.subUbicacionId !== filterOptions.subUbicacionId) {
            return false;
          }
          
          return true;
        }
        
        // Para compatibilidad con la estructura antigua
        // Buscar el cliente seleccionado
        const selectedCliente = allClientes.find(c => c._id === filterOptions.clienteId);
        
        if (selectedCliente) {
          // Un pedido coincide con un cliente si tiene el mismo servicio
          const servicioMatch = pedido.servicio === selectedCliente.servicio;
          
          // Y la misma sección de servicio (si está especificada)
          const seccionMatch = !selectedCliente.seccionDelServicio || 
                          pedido.seccionDelServicio === selectedCliente.seccionDelServicio;
                          
          return servicioMatch && seccionMatch;
        }
        
        return false;
      });
    }
    
    setFilteredPedidos(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [allPedidos, allClientes, filterOptions]);
  
  // Reaccionar a cambios en filterOptions
  useEffect(() => {
    applyFilters();
  }, [filterOptions, applyFilters]);
  
  // Manejar confirmación de filtros
  const handleApplyFilters = () => {
    // Aplicar los filtros temporales
    setFilterOptions(tempFilterOptions);
    // Cerrar el diálogo
    setIsFilterDialogOpen(false);
  };

  // Función para descargar Excel
  const handleExcelDownload = async () => {
    if (!dateRange.from || !dateRange.to) {
      setError('Por favor selecciona un rango de fechas');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const response = await api.getClient().get('/downloads/excel', {
        params: {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_${formatDate(dateRange.from)}_${formatDate(dateRange.to)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      setSuccessMessage('Excel descargado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error downloading Excel:', err);
      setError(err.response?.data?.mensaje || 'Error al descargar el Excel');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para descargar Remito
  const handleRemitoDownload = async (pedidoId = selectedPedido) => {
    if (!pedidoId) {
      setError('Por favor selecciona un pedido');
      return;
    }
  
    try {
      setIsLoading(true);
      setError('');
      setSuccessMessage('');
  
      console.log(`Iniciando descarga de remito para pedido: ${pedidoId}`);
      
      // Aumentar el timeout para dar tiempo al servidor
      const response = await api.getClient().get(`/downloads/remito/${pedidoId}`, {
        responseType: 'blob',
        timeout: 60000 // Incrementar a 60 segundos
      });
      
      // Verificar que la respuesta sea válida
      if (!response.data || response.data.size === 0) {
        throw new Error('La respuesta del servidor está vacía');
      }
  
      // Revisar el tipo de contenido
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        // Si el servidor envió un JSON en lugar de un PDF, probablemente sea un mensaje de error
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorObj = JSON.parse(reader.result as string);
            setError(errorObj.mensaje || 'Error al generar el PDF');
          } catch (parseErr) {
            setError('Error al procesar la respuesta del servidor');
          }
        };
        reader.readAsText(response.data);
        return;
      }
      
      // Todo bien, crear el blob y descargar
      console.log(`PDF recibido: ${response.data.size} bytes`);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const pedido = pedidos.find(p => p._id === pedidoId) || 
                    allPedidos.find(p => p._id === pedidoId);
                    
      // Usar nPedido prioritariamente para el nombre del archivo
      const fileName = `remito_${pedido?.nPedido || pedido?.numero || pedidoId}.pdf`;
      link.setAttribute('download', fileName);
      
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      setSuccessMessage('Remito descargado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error downloading remito:', err);
      
      // Proporcionar mensaje de error más específico
      let errorMessage = 'Error al descargar el remito';
      
      if (err.response) {
        // El servidor respondió con error
        if (err.response.data instanceof Blob) {
          // Intentar leer el blob como texto
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const errorObj = JSON.parse(reader.result as string);
              setError(errorObj.mensaje || errorMessage);
            } catch (parseErr) {
              // No se puede parsear como JSON
              setError(errorMessage);
            }
          };
          reader.readAsText(err.response.data);
          return;
        } else if (err.response.status === 404) {
          errorMessage = 'No se encontró el pedido solicitado';
        } else if (err.response.status === 500) {
          errorMessage = 'Error en el servidor al generar el PDF. Intente nuevamente.';
        }
      } else if (err.request) {
        // No se recibió respuesta
        errorMessage = 'No se recibió respuesta del servidor. Verifique su conexión.';
      } else {
        // Otro error
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para restablecer filtros
  const resetFilters = () => {
    const emptyFilters = {
      servicio: 'todos',
      fechaInicio: '',
      fechaFin: '',
      productoId: '',
      supervisorId: '',
      clienteId: '',
      subServicioId: '',
      subUbicacionId: ''
    };
    setTempFilterOptions(emptyFilters);
    setFilterOptions(emptyFilters);
    
    // Limpiar búsquedas de filtros
    setFilterSearch({
      producto: '',
      supervisor: '',
      cliente: ''
    });
    
    // Limpiar selecciones jerárquicas
    resetJerarquiaSelections();
  };

  // Función para obtener el nombre completo del cliente según la nueva estructura
  const getClientName = (cliente: Cliente): string => {
    if (!cliente) return "Cliente no disponible";
    
    // Usar el nombre (campo principal) o mantener compatibilidad con servicio
    return cliente.nombre || cliente.servicio;
  };

  // Función para obtener la sección del cliente (para compatibilidad)
  const getClientSection = (cliente: Cliente): string => {
    return cliente.seccionDelServicio || '';
  };

  // Filtrar clientes por búsqueda
  const filteredClientes = clientes.filter(cliente => {
    // Verificar que cliente tenga la estructura esperada
    if (!cliente || typeof cliente !== 'object') return false;
    
    // Obtener el nombre del cliente
    const nombreCliente = getClientName(cliente);
    
    // Filtrar si el término de búsqueda está en el nombre
    return nombreCliente.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  // Obtener subservicios del cliente seleccionado
  const getSubServicios = () => {
    if (!selectedCliente) return [];
    
    const cliente = clientes.find(c => c._id === selectedCliente);
    if (!cliente) return [];
    
    return cliente.subServicios || [];
  };
  
  // Obtener sububicaciones del subservicio seleccionado
  const getSubUbicaciones = () => {
    if (!selectedCliente || !selectedSubServicio) return [];
    
    const cliente = clientes.find(c => c._id === selectedCliente);
    if (!cliente) return [];
    
    const subServicio = cliente.subServicios.find(s => s._id === selectedSubServicio);
    if (!subServicio) return [];
    
    return subServicio.subUbicaciones || [];
  };
  
  // Obtener clientes filtrados para el selector de filtros
  const getFilteredClientesForSelector = () => {
    return allClientes.filter(cliente => {
      const nombreCliente = getClientName(cliente);
      return nombreCliente.toLowerCase().includes(filterSearch.cliente.toLowerCase());
    });
  };
  
  // Obtener productos filtrados para el selector de filtros
  const getFilteredProductosForSelector = () => {
    return productos.filter(producto => 
      producto.nombre.toLowerCase().includes(filterSearch.producto.toLowerCase())
    );
  };
  
  // Obtener supervisores filtrados para el selector de filtros
  const getFilteredSupervisoresForSelector = () => {
    return supervisores.filter(supervisor => {
      const nombreCompleto = supervisor.displayName || '';
      return nombreCompleto.toLowerCase().includes(filterSearch.supervisor.toLowerCase());
    });
  };
  
  // Obtener servicios únicos para filtro
  const serviciosUnicos = [...new Set(allPedidos
    .filter(p => p.servicio) // Filtrar pedidos que tengan servicio definido
    .map(p => p.servicio))];

  // Calcular paginación
  const indexOfLastPedido = currentPage * itemsPerPage;
  const indexOfFirstPedido = indexOfLastPedido - itemsPerPage;
  const currentPedidos = filteredPedidos.slice(indexOfFirstPedido, indexOfLastPedido);
  
  // Calcular el total de páginas
  const totalPages = Math.ceil(filteredPedidos.length / itemsPerPage);

  // Información de paginación
  const showingFromTo = filteredPedidos.length > 0 
    ? `${indexOfFirstPedido + 1}-${Math.min(indexOfLastPedido, filteredPedidos.length)} de ${filteredPedidos.length}`
    : '0 de 0';
    
  // Calcular si hay filtros activos
  const hasActiveFilters = 
    filterOptions.servicio !== 'todos' || 
    filterOptions.fechaInicio !== '' || 
    filterOptions.fechaFin !== '' ||
    filterOptions.productoId !== '' ||
    filterOptions.supervisorId !== '' ||
    filterOptions.clienteId !== '' ||
    filterOptions.subServicioId !== '' ||
    filterOptions.subUbicacionId !== '';
  
  // Obtener conteo de filtros activos
  const getActiveFilterCount = () => {
    let count = 0;
    if (filterOptions.servicio !== 'todos') count++;
    if (filterOptions.fechaInicio !== '') count++;
    if (filterOptions.fechaFin !== '') count++;
    if (filterOptions.productoId !== '') count++;
    if (filterOptions.supervisorId !== '') count++;
    if (filterOptions.clienteId !== '') count++;
    if (filterOptions.subServicioId !== '') count++;
    if (filterOptions.subUbicacionId !== '') count++;
    return count;
  };
  
  // Obtener nombres de los elementos seleccionados en filtros
  const getSelectedProductoName = () => {
    const producto = productos.find(p => p._id === filterOptions.productoId);
    return producto ? producto.nombre : 'Producto no encontrado';
  };
  
  const getSelectedSupervisorName = () => {
    const supervisor = supervisores.find(s => s._id === filterOptions.supervisorId);
    return supervisor ? supervisor.displayName : 'Supervisor no encontrado';
  };
  
  const getSelectedClienteName = () => {
    const cliente = allClientes.find(c => c._id === filterOptions.clienteId);
    return cliente ? getClientName(cliente) : 'Cliente no encontrado';
  };
  
  const getSelectedSubServicioName = () => {
    if (!filterOptions.clienteId || !filterOptions.subServicioId) return '';
    
    const cliente = allClientes.find(c => c._id === filterOptions.clienteId);
    if (!cliente) return 'Subservicio no encontrado';
    
    const subServicio = cliente.subServicios.find(s => s._id === filterOptions.subServicioId);
    return subServicio ? subServicio.nombre : 'Subservicio no encontrado';
  };
  
  const getSelectedSubUbicacionName = () => {
    if (!filterOptions.clienteId || !filterOptions.subServicioId || !filterOptions.subUbicacionId) 
      return '';
    
    const cliente = allClientes.find(c => c._id === filterOptions.clienteId);
    if (!cliente) return 'Sububicación no encontrada';
    
    const subServicio = cliente.subServicios.find(s => s._id === filterOptions.subServicioId);
    if (!subServicio) return 'Sububicación no encontrada';
    
    const subUbicacion = subServicio.subUbicaciones.find(u => u._id === filterOptions.subUbicacionId);
    return subUbicacion ? subUbicacion.nombre : 'Sububicación no encontrada';
  };

  return (
    <div className="space-y-6 bg-[#DFEFE6]/20 p-4 md:p-6 rounded-xl">
      {/* Alertas */}
      {error && (
        <Alert className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <AlertDescription className="text-red-700 ml-2">{error}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert className="mb-4 bg-[#DFEFE6] border border-[#91BEAD] text-[#29696B] rounded-lg">
          <CheckCircle className="h-4 w-4 text-[#29696B] shrink-0" />
          <AlertDescription className="text-[#29696B] ml-2">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Botón para refrescar solo cuando sea necesario */}
      {(loadingCacheData || (!isCacheValid('productos') || !isCacheValid('supervisores') || !isCacheValid('clientes') || !isCacheValid('pedidos'))) && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={forceRefreshAllData}
            disabled={loadingCacheData}
            className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/40"
          >
            {loadingCacheData ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Actualizar datos
          </Button>
        </div>
      )}

      {/* NAVEGACIÓN MEJORADA: Espacio vertical fijo para las tabs */}
      <div className="min-h-[60px]">
        <Tabs defaultValue="excel" className="w-full">
          {/* Tabs mejoradas para ser más responsivas */}
          <TabsList className="w-full grid grid-cols-3 gap-1 bg-[#DFEFE6]/50 p-1 rounded-md">
            <TabsTrigger 
              value="excel" 
              className="h-12 sm:h-10 px-2 py-1.5 text-xs sm:text-sm data-[state=active]:bg-[#29696B] data-[state=active]:text-white flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="text-center sm:text-left">Reportes Excel</span>
            </TabsTrigger>
            <TabsTrigger 
              value="remitos" 
              className="h-12 sm:h-10 px-2 py-1.5 text-xs sm:text-sm data-[state=active]:bg-[#29696B] data-[state=active]:text-white flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2"
            >
              <FileText className="w-4 h-4" />
              <span className="text-center sm:text-left">Remitos por Cliente</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tabla" 
              className="h-12 sm:h-10 px-2 py-1.5 text-xs sm:text-sm data-[state=active]:bg-[#29696B] data-[state=active]:text-white flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2"
            >
              <Hash className="w-4 h-4" />
              <span className="text-center sm:text-left">Tabla de Pedidos</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Pestaña de Excel */}
          <TabsContent value="excel" className="mt-4 pt-4">
            <Card className="border border-[#91BEAD]/20 shadow-sm">
              <CardHeader className="bg-[#DFEFE6]/20 border-b border-[#91BEAD]/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#29696B]">Exportar a Excel</CardTitle>
                  <FileSpreadsheet className="w-6 h-6 text-[#7AA79C]" />
                </div>
                <CardDescription className="text-[#7AA79C]">
                  Exporta los datos del período seleccionado a una planilla de Excel
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="date-from" className="text-[#29696B]">Desde</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-5 h-5" />
                      <Input
                        id="date-from"
                        type="date"
                        value={dateRange.from ? formatDate(dateRange.from) : ''}
                        onChange={(e) => setDateRange({
                          ...dateRange,
                          from: e.target.value ? new Date(e.target.value) : undefined
                        })}
                        className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="date-to" className="text-[#29696B]">Hasta</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-5 h-5" />
                      <Input
                        id="date-to"
                        type="date"
                        value={dateRange.to ? formatDate(dateRange.to) : ''}
                        onChange={(e) => setDateRange({
                          ...dateRange,
                          to: e.target.value ? new Date(e.target.value) : undefined
                        })}
                        className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-[#DFEFE6]/10 border-t border-[#91BEAD]/20">
                <Button
                  onClick={handleExcelDownload}
                  disabled={isLoading || !dateRange.from || !dateRange.to}
                  className="w-full bg-[#29696B] hover:bg-[#29696B]/90 text-white"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Descargar Excel
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Pestaña de Remitos */}
          <TabsContent value="remitos" className="mt-4 pt-4">
            <Card className="border border-[#91BEAD]/20 shadow-sm">
              <CardHeader className="bg-[#DFEFE6]/20 border-b border-[#91BEAD]/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#29696B]">Descargar Remito</CardTitle>
                  <FileText className="w-6 h-6 text-[#7AA79C]" />
                </div>
                <CardDescription className="text-[#7AA79C]">
                  Descarga el remito de un pedido específico
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {/* Buscador de clientes */}
                <div className="space-y-2">
                  <Label className="text-[#29696B]">Buscar Cliente</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-5 h-5" />
                    <Input
                      type="text"
                      placeholder="Buscar por nombre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                    />
                  </div>
                </div>

                {/* Selector de cliente */}
                <div className="space-y-2">
                  <Label className="text-[#29696B]">Seleccionar Cliente</Label>
                  <Select 
                    value={selectedCliente} 
                    onValueChange={(value) => {
                      setSelectedCliente(value);
                      resetJerarquiaSelections();
                    }}
                  >
                    <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredClientes.length > 0 ? (
                        filteredClientes.map((cliente) => (
                          <SelectItem key={cliente._id} value={cliente._id}>
                            {getClientName(cliente)}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-clientes" disabled>
                          No hay clientes disponibles
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selector de subservicio (si el cliente está seleccionado) */}
                {selectedCliente && getSubServicios().length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-[#29696B] flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      Seleccionar Subservicio
                    </Label>
                    <Select 
                      value={selectedSubServicio} 
                      onValueChange={(value) => {
                        setSelectedSubServicio(value);
                        setSelectedSubUbicacion('');
                      }}
                    >
                      <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
                        <SelectValue placeholder="Todos los subservicios" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos los subservicios</SelectItem>
                        {getSubServicios().map((subservicio) => (
                          <SelectItem key={subservicio._id} value={subservicio._id}>
                            {subservicio.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Selector de sububicación (si el subservicio está seleccionado) */}
                {selectedSubServicio && getSubUbicaciones().length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-[#29696B] flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Seleccionar Ubicación
                    </Label>
                    <Select 
                      value={selectedSubUbicacion} 
                      onValueChange={setSelectedSubUbicacion}
                    >
                      <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
                        <SelectValue placeholder="Todas las ubicaciones" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas las ubicaciones</SelectItem>
                        {getSubUbicaciones().map((sububicacion) => (
                          <SelectItem key={sububicacion._id} value={sububicacion._id}>
                            {sububicacion.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Selector de pedido */}
                {selectedCliente && (
                  <div className="space-y-2">
                    <Label className="text-[#29696B]">Seleccionar Pedido</Label>
                    <Select value={selectedPedido} onValueChange={setSelectedPedido}>
                      <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
                        <SelectValue placeholder="Selecciona un pedido" />
                      </SelectTrigger>
                      <SelectContent>
                        {pedidos.length > 0 ? (
                          pedidos.map((pedido) => (
                            <SelectItem key={pedido._id} value={pedido._id}>
                              {`Pedido ${pedido.nPedido || pedido.numero || 'S/N'} - ${
                                pedido.fecha ? new Date(pedido.fecha).toLocaleDateString() : 'Sin fecha'
                              }`}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-pedidos" disabled>
                            No hay pedidos disponibles
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-[#DFEFE6]/10 border-t border-[#91BEAD]/20">
                <Button
                  onClick={() => handleRemitoDownload()}
                  disabled={isLoading || !selectedCliente || !selectedPedido}
                  className="w-full bg-[#29696B] hover:bg-[#29696B]/90 text-white disabled:bg-[#8DB3BA] disabled:text-white/70"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Descargar Remito
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Pestaña de Tabla de Pedidos con filtros avanzados */}
          <TabsContent value="tabla" className="mt-4 pt-4">
            <Card className="border border-[#91BEAD]/20 shadow-sm">
              <CardHeader className="bg-[#DFEFE6]/20 border-b border-[#91BEAD]/20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="text-[#29696B]">Todos los Pedidos</CardTitle>
                    <CardDescription className="text-[#7AA79C]">
                      Visualiza y descarga remitos de cualquier pedido
                    </CardDescription>
                  </div>
                  
                  {/* Botón de filtros con indicador de filtros activos */}
                  <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="flex items-center gap-2 border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/40"
                      >
                        <Filter className="w-4 h-4" />
                        <span>Filtros</span>
                        {hasActiveFilters && (
                          <Badge className="ml-1 bg-[#29696B] text-white">
                            {getActiveFilterCount()}
                          </Badge>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white border border-[#91BEAD]/20 max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="text-[#29696B]">Filtrar Pedidos</DialogTitle>
                        <DialogDescription className="text-[#7AA79C]">
                          Ajusta los filtros para encontrar pedidos específicos
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                        {/* Servicio */}
                        <div className="space-y-2">
                          <Label htmlFor="servicio-filter" className="text-[#29696B]">Servicio</Label>
                          <Select 
                            value={tempFilterOptions.servicio} 
                            onValueChange={(value) => setTempFilterOptions({...tempFilterOptions, servicio: value})}
                          >
                            <SelectTrigger 
                              id="servicio-filter" 
                              className="border-[#91BEAD] focus:ring-[#29696B]/20"
                            >
                              <SelectValue placeholder="Todos los servicios" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todos">Todos los servicios</SelectItem>
                              {serviciosUnicos.map((servicio) => (
                                <SelectItem key={servicio} value={servicio}>
                                  {servicio}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Rango de fechas */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="fecha-inicio-filter" className="text-[#29696B]">Desde</Label>
                            <Input
                              id="fecha-inicio-filter"
                              type="date"
                              value={tempFilterOptions.fechaInicio}
                              onChange={(e) => setTempFilterOptions({...tempFilterOptions, fechaInicio: e.target.value})}
                              className="border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="fecha-fin-filter" className="text-[#29696B]">Hasta</Label>
                            <Input
                              id="fecha-fin-filter"
                              type="date"
                              value={tempFilterOptions.fechaFin}
                              onChange={(e) => setTempFilterOptions({...tempFilterOptions, fechaFin: e.target.value})}
                              className="border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                            />
                          </div>
                        </div>
                        
                        {/* Producto - Selector con búsqueda */}
                        <div className="space-y-2">
                          <Label className="text-[#29696B] flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Filtrar por Producto
                          </Label>
                          
                          <Dialog 
                            open={activeFilterSelector === 'producto'} 
                            onOpenChange={(open) => setActiveFilterSelector(open ? 'producto' : null)}
                          >
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                className="w-full justify-between border-[#91BEAD] text-left font-normal"
                              >
                                {tempFilterOptions.productoId ? (
                                  <span className="truncate">
                                    {productos.find(p => p._id === tempFilterOptions.productoId)?.nombre || 'Producto seleccionado'}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">Seleccionar producto</span>
                                )}
                                
                                {tempFilterOptions.productoId && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTempFilterOptions({...tempFilterOptions, productoId: ''});
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Seleccionar Producto</DialogTitle>
                                <DialogDescription>
                                  Busca y selecciona un producto específico
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4 space-y-4">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
                                  <Input
                                    placeholder="Buscar productos..."
                                    value={filterSearch.producto}
                                    onChange={(e) => setFilterSearch({...filterSearch, producto: e.target.value})}
                                    className="pl-10 border-[#91BEAD]"
                                  />
                                </div>
                                <div className="max-h-60 overflow-y-auto border rounded-md">
                                  {getFilteredProductosForSelector().length === 0 ? (
                                    <div className="p-4 text-center text-[#7AA79C]">
                                      No se encontraron productos
                                    </div>
                                  ) : (
                                    <div className="space-y-1 p-1">
                                      {getFilteredProductosForSelector().map(producto => (
                                        <div 
                                          key={producto._id}
                                          className={`px-3 py-2 rounded-md cursor-pointer flex justify-between items-center ${
                                            tempFilterOptions.productoId === producto._id 
                                              ? 'bg-[#29696B] text-white' 
                                              : 'hover:bg-[#DFEFE6]/40'
                                          }`}
                                          onClick={() => {
                                            setTempFilterOptions({...tempFilterOptions, productoId: producto._id});
                                            setActiveFilterSelector(null);
                                          }}
                                        >
                                          <div>
                                            <div>{producto.nombre}</div>
                                            <div className="text-xs opacity-70">
                                              {producto.categoria} - ${producto.precio}
                                            </div>
                                          </div>
                                          {tempFilterOptions.productoId === producto._id && (
                                            <Checkbox checked={true} className="data-[state=checked]:bg-white data-[state=checked]:text-[#29696B]" />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setActiveFilterSelector(null);
                                    setFilterSearch({...filterSearch, producto: ''});
                                  }}
                                >
                                  Cancelar
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                        
                        {/* Supervisor - Selector con búsqueda */}
                        <div className="space-y-2">
                          <Label className="text-[#29696B] flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Filtrar por Supervisor
                          </Label>
                          
                          <Dialog 
                            open={activeFilterSelector === 'supervisor'} 
                            onOpenChange={(open) => setActiveFilterSelector(open ? 'supervisor' : null)}
                          >
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                className="w-full justify-between border-[#91BEAD] text-left font-normal"
                              >
                                {tempFilterOptions.supervisorId ? (
                                  <span className="truncate">
                                    {supervisores.find(s => s._id === tempFilterOptions.supervisorId)?.displayName || 'Supervisor seleccionado'}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">Seleccionar supervisor</span>
                                )}
                                
                                {tempFilterOptions.supervisorId && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTempFilterOptions({...tempFilterOptions, supervisorId: ''});
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Seleccionar Supervisor</DialogTitle>
                                <DialogDescription>
                                  Busca y selecciona un supervisor específico
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4 space-y-4">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
                                  <Input
                                    placeholder="Buscar supervisores..."
                                    value={filterSearch.supervisor}
                                    onChange={(e) => setFilterSearch({...filterSearch, supervisor: e.target.value})}
                                    className="pl-10 border-[#91BEAD]"
                                  />
                                </div>
                                <div className="max-h-60 overflow-y-auto border rounded-md">
                                  {getFilteredSupervisoresForSelector().length === 0 ? (
                                    <div className="p-4 text-center text-[#7AA79C]">
                                      No se encontraron supervisores
                                    </div>
                                  ) : (
                                    <div className="space-y-1 p-1">
                                      {getFilteredSupervisoresForSelector().map(supervisor => (
                                        <div 
                                          key={supervisor._id}
                                          className={`px-3 py-2 rounded-md cursor-pointer flex justify-between items-center ${
                                            tempFilterOptions.supervisorId === supervisor._id 
                                              ? 'bg-[#29696B] text-white' 
                                              : 'hover:bg-[#DFEFE6]/40'
                                          }`}
                                          onClick={() => {
                                            setTempFilterOptions({...tempFilterOptions, supervisorId: supervisor._id});
                                            setActiveFilterSelector(null);
                                          }}
                                        >
                                          <div>
                                            <div>{supervisor.displayName}</div>
                                            <div className="text-xs opacity-70">
                                              {supervisor.role}
                                            </div>
                                          </div>
                                          {tempFilterOptions.supervisorId === supervisor._id && (
                                            <Checkbox checked={true} className="data-[state=checked]:bg-white data-[state=checked]:text-[#29696B]" />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setActiveFilterSelector(null);
                                    setFilterSearch({...filterSearch, supervisor: ''});
                                  }}
                                >
                                  Cancelar
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                        
                        {/* Cliente Jerárquico - Selector con búsqueda */}
                        <div className="space-y-2">
                          <Label className="text-[#29696B] flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            Filtrar por Cliente
                          </Label>
                          
                          <Dialog 
                            open={activeFilterSelector === 'cliente'} 
                            onOpenChange={(open) => setActiveFilterSelector(open ? 'cliente' : null)}
                          >
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                className="w-full justify-between border-[#91BEAD] text-left font-normal"
                              >
                                {tempFilterOptions.clienteId ? (
                                  <span className="truncate">
                                    {getSelectedClienteName()}
                                    {tempFilterOptions.subServicioId && 
                                      ` > ${getSelectedSubServicioName()}`}
                                    {tempFilterOptions.subUbicacionId && 
                                      ` > ${getSelectedSubUbicacionName()}`}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">Seleccionar cliente</span>
                                )}
                                
                                {tempFilterOptions.clienteId && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTempFilterOptions({
                                        ...tempFilterOptions, 
                                        clienteId: '',
                                        subServicioId: '',
                                        subUbicacionId: ''
                                      });
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Seleccionar Cliente</DialogTitle>
                                <DialogDescription>
                                  Busca y selecciona un cliente específico
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4 space-y-4">
                                {/* Búsqueda de cliente */}
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
                                  <Input
                                    placeholder="Buscar clientes..."
                                    value={filterSearch.cliente}
                                    onChange={(e) => setFilterSearch({...filterSearch, cliente: e.target.value})}
                                    className="pl-10 border-[#91BEAD]"
                                  />
                                </div>
                                
                                {/* Lista de clientes */}
                                <div className="max-h-60 overflow-y-auto border rounded-md">
                                  {getFilteredClientesForSelector().length === 0 ? (
                                    <div className="p-4 text-center text-[#7AA79C]">
                                      No se encontraron clientes
                                    </div>
                                  ) : (
                                    <div className="space-y-1 p-1">
                                      {getFilteredClientesForSelector().map(cliente => (
                                        <div 
                                          key={cliente._id}
                                          className={`px-3 py-2 rounded-md cursor-pointer flex justify-between items-center ${
                                            tempFilterOptions.clienteId === cliente._id 
                                              ? 'bg-[#29696B] text-white' 
                                              : 'hover:bg-[#DFEFE6]/40'
                                          }`}
                                          onClick={() => {
                                            setTempFilterOptions({
                                              ...tempFilterOptions, 
                                              clienteId: cliente._id,
                                              subServicioId: '',
                                              subUbicacionId: ''
                                            });
                                          }}
                                        >
                                          <div>
                                            <div>{getClientName(cliente)}</div>
                                            {getClientSection(cliente) && (
                                              <div className="text-xs opacity-70">
                                                {getClientSection(cliente)}
                                              </div>
                                            )}
                                          </div>
                                          {tempFilterOptions.clienteId === cliente._id && (
                                            <Checkbox checked={true} className="data-[state=checked]:bg-white data-[state=checked]:text-[#29696B]" />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Si hay un cliente seleccionado y tiene subservicios, mostrar selector */}
                                {tempFilterOptions.clienteId && (() => {
                                  const cliente = allClientes.find(c => c._id === tempFilterOptions.clienteId);
                                  if (cliente && cliente.subServicios && cliente.subServicios.length > 0) {
                                    return (
                                      <div className="mt-4 space-y-2">
                                        <Label className="text-[#29696B] flex items-center gap-2">
                                          <Store className="w-4 h-4" />
                                          Seleccionar Subservicio (opcional)
                                        </Label>
                                        <Select 
                                          value={tempFilterOptions.subServicioId} 
                                          onValueChange={(value) => {
                                            setTempFilterOptions({
                                              ...tempFilterOptions, 
                                              subServicioId: value,
                                              subUbicacionId: ''
                                            });
                                          }}
                                        >
                                          <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
                                            <SelectValue placeholder="Todos los subservicios" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="">Todos los subservicios</SelectItem>
                                            {cliente.subServicios.map(subservicio => (
                                              <SelectItem key={subservicio._id} value={subservicio._id}>
                                                {subservicio.nombre}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                                
                                {/* Si hay un subservicio seleccionado y tiene sububicaciones, mostrar selector */}
                                {tempFilterOptions.clienteId && tempFilterOptions.subServicioId && (() => {
                                  const cliente = allClientes.find(c => c._id === tempFilterOptions.clienteId);
                                  if (!cliente) return null;
                                  
                                  const subservicio = cliente.subServicios.find(s => s._id === tempFilterOptions.subServicioId);
                                  if (!subservicio) return null;
                                  
                                  if (subservicio.subUbicaciones && subservicio.subUbicaciones.length > 0) {
                                    return (
                                      <div className="mt-4 space-y-2">
                                        <Label className="text-[#29696B] flex items-center gap-2">
                                          <MapPin className="w-4 h-4" />
                                          Seleccionar Ubicación (opcional)
                                        </Label>
                                        <Select 
                                          value={tempFilterOptions.subUbicacionId} 
                                          onValueChange={(value) => {
                                            setTempFilterOptions({
                                              ...tempFilterOptions, 
                                              subUbicacionId: value
                                            });
                                          }}
                                        >
                                          <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
                                            <SelectValue placeholder="Todas las ubicaciones" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="">Todas las ubicaciones</SelectItem>
                                            {subservicio.subUbicaciones.map(ubicacion => (
                                              <SelectItem key={ubicacion._id} value={ubicacion._id}>
                                                {ubicacion.nombre}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              <DialogFooter className="flex justify-between">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setActiveFilterSelector(null);
                                    setFilterSearch({...filterSearch, cliente: ''});
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  onClick={() => setActiveFilterSelector(null)}
                                  className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
                                >
                                  Aceptar
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      
                      <DialogFooter className="flex justify-between">
                        <Button 
                          variant="outline" 
                          onClick={resetFilters}
                          className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/40"
                        >
                          Restablecer
                        </Button>
                        <Button
                          type="button"
                          onClick={handleApplyFilters}
                          className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
                        >
                          Aplicar filtros
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {/* Barra de filtros activos */}
                {hasActiveFilters && (
                  <div className="flex flex-wrap items-center gap-2 mt-2 p-2 bg-[#DFEFE6]/30 rounded-md border border-[#91BEAD]/20">
                    <span className="text-xs text-[#29696B] font-medium">Filtros activos:</span>
                    
                    {filterOptions.servicio !== 'todos' && (
                      <Badge variant="outline" className="bg-[#DFEFE6]/40 border-[#91BEAD] text-[#29696B] flex items-center gap-1">
                        <span>Servicio: {filterOptions.servicio}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFilterOptions(prev => ({...prev, servicio: 'todos'}));
                            setTempFilterOptions(prev => ({...prev, servicio: 'todos'}));
                          }}
                          className="h-4 w-4 p-0 ml-1 text-[#29696B] hover:bg-[#DFEFE6]/60"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                    
                    {filterOptions.fechaInicio && (
                      <Badge variant="outline" className="bg-[#DFEFE6]/40 border-[#91BEAD] text-[#29696B] flex items-center gap-1">
                        <span>Desde: {new Date(filterOptions.fechaInicio).toLocaleDateString()}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFilterOptions(prev => ({...prev, fechaInicio: ''}));
                            setTempFilterOptions(prev => ({...prev, fechaInicio: ''}));
                          }}
                          className="h-4 w-4 p-0 ml-1 text-[#29696B] hover:bg-[#DFEFE6]/60"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                    
                    {filterOptions.fechaFin && (
                      <Badge variant="outline" className="bg-[#DFEFE6]/40 border-[#91BEAD] text-[#29696B] flex items-center gap-1">
                        <span>Hasta: {new Date(filterOptions.fechaFin).toLocaleDateString()}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFilterOptions(prev => ({...prev, fechaFin: ''}));
                            setTempFilterOptions(prev => ({...prev, fechaFin: ''}));
                          }}
                          className="h-4 w-4 p-0 ml-1 text-[#29696B] hover:bg-[#DFEFE6]/60"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                    
                    {filterOptions.productoId && (
                      <Badge variant="outline" className="bg-[#DFEFE6]/40 border-[#91BEAD] text-[#29696B] flex items-center gap-1">
                        <span>Producto: {getSelectedProductoName()}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFilterOptions(prev => ({...prev, productoId: ''}));
                            setTempFilterOptions(prev => ({...prev, productoId: ''}));
                          }}
                          className="h-4 w-4 p-0 ml-1 text-[#29696B] hover:bg-[#DFEFE6]/60"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                    
                    {filterOptions.supervisorId && (
                      <Badge variant="outline" className="bg-[#DFEFE6]/40 border-[#91BEAD] text-[#29696B] flex items-center gap-1">
                        <span>Supervisor: {getSelectedSupervisorName()}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFilterOptions(prev => ({...prev, supervisorId: ''}));
                            setTempFilterOptions(prev => ({...prev, supervisorId: ''}));
                          }}
                          className="h-4 w-4 p-0 ml-1 text-[#29696B] hover:bg-[#DFEFE6]/60"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                    
                    {filterOptions.clienteId && (
                      <Badge variant="outline" className="bg-[#DFEFE6]/40 border-[#91BEAD] text-[#29696B] flex items-center gap-1">
                        <span>Cliente: {getSelectedClienteName()}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFilterOptions(prev => ({...prev, clienteId: ''}));
                            setTempFilterOptions(prev => ({...prev, clienteId: ''}));
                          }}
                          className="h-4 w-4 p-0 ml-1 text-[#29696B] hover:bg-[#DFEFE6]/60"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={resetFilters} 
                      className="ml-auto text-xs h-7 px-2 text-[#29696B]"
                    >
                      Limpiar todos
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {/* Vista de tabla para escritorio */}
                <div className="hidden md:block rounded-md border border-[#91BEAD]/20">
                  <Table>
                    <TableHeader className="bg-[#DFEFE6]/30">
                      <TableRow>
                        <TableHead className="text-[#29696B]">Nº</TableHead>
                        <TableHead className="text-[#29696B]">Fecha</TableHead>
                        <TableHead className="text-[#29696B]">Servicio</TableHead>
                        <TableHead className="hidden md:table-cell text-[#29696B]">Sección</TableHead>
                        <TableHead className="text-right text-[#29696B]">Productos</TableHead>
                        <TableHead className="text-right text-[#29696B]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingPedidos ? (
                        // Esqueleto de carga
                        Array.from({ length: 5 }).map((_, index) => (
                          <TableRow key={index}>
                            {Array.from({ length: 6 }).map((_, cellIndex) => (
                              <TableCell key={cellIndex}>
                                <Skeleton className="h-6 w-full bg-[#DFEFE6]/40" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : filteredPedidos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-[#7AA79C]">
                            No se encontraron pedidos con los filtros seleccionados
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentPedidos.map((pedido) => (
                          <TableRow 
                            key={pedido._id} 
                            className="hover:bg-[#DFEFE6]/10 transition-colors"
                          >
                            <TableCell className="text-[#29696B] font-medium">
                              <div className="flex items-center">
                                <Hash className="w-4 h-4 text-[#7AA79C] mr-2" />
                                {pedido.nPedido || pedido.numero || 'S/N'}
                              </div>
                            </TableCell>
                            <TableCell className="text-[#7AA79C]">{formatDisplayDate(pedido.fecha)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-[#91BEAD] text-[#29696B] bg-[#DFEFE6]/20">
                                {pedido.servicio || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-[#7AA79C]">
                              {pedido.seccionDelServicio || '-'}
                            </TableCell>
                            <TableCell className="text-right text-[#29696B] font-medium">
                              {pedido.productos?.length || 0}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemitoDownload(pedido._id)}
                                disabled={isLoading}
                                className="text-[#29696B] hover:bg-[#DFEFE6]/30"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Vista de tarjetas para móvil */}
                <div ref={mobileListRef} className="md:hidden space-y-3 p-3">
                  {/* Información de paginación para móvil */}
                  {!loadingPedidos && filteredPedidos.length > 0 && (
                    <div className="text-xs text-center text-[#7AA79C] py-1">
                      Mostrando {showingFromTo}
                    </div>
                  )}

                  {loadingPedidos ? (
                    // Esqueleto de carga para móvil
                    Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="rounded-lg border border-[#91BEAD]/20 bg-white p-4 space-y-2">
                        <div className="flex justify-between">
                          <Skeleton className="h-5 w-24 bg-[#DFEFE6]/40" />
                          <Skeleton className="h-5 w-14 bg-[#DFEFE6]/40" />
                        </div>
                        <Skeleton className="h-4 w-36 bg-[#DFEFE6]/40" />
                        <div className="flex justify-between items-center pt-2">
                          <Skeleton className="h-4 w-20 bg-[#DFEFE6]/40" />
                          <Skeleton className="h-8 w-8 rounded-full bg-[#DFEFE6]/40" />
                        </div>
                      </div>
                    ))
                  ) : filteredPedidos.length === 0 ? (
                    <div className="text-center py-8 text-[#7AA79C] bg-white rounded-lg border border-[#91BEAD]/20">
                      No se encontraron pedidos con los filtros seleccionados
                    </div>
                  ) : (
                    currentPedidos.map((pedido) => (
                      <div key={pedido._id} className="rounded-lg border border-[#91BEAD]/20 bg-white overflow-hidden">
                        <div className="p-3 bg-[#DFEFE6]/20 border-b border-[#91BEAD]/20 flex justify-between items-center">
                          <div className="flex items-center">
                            <Hash className="w-4 h-4 text-[#7AA79C] mr-1.5" />
                            <span className="font-medium text-sm text-[#29696B]">
                              Pedido #{pedido.nPedido || pedido.numero || 'S/N'}
                            </span>
                          </div>
                          <Badge variant="outline" className="border-[#91BEAD] text-xs text-[#29696B] bg-[#DFEFE6]/10">
                            {pedido.servicio || 'N/A'}
                          </Badge>
                        </div>
                        <div className="p-3 space-y-1.5">
                          <div className="text-xs text-[#7AA79C] flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1" />
                            {formatDisplayDate(pedido.fecha)}
                          </div>
                          {pedido.seccionDelServicio && (
                            <div className="text-xs text-[#7AA79C] flex items-center">
                              <MapPin className="w-3.5 h-3.5 mr-1" />
                              {pedido.seccionDelServicio}
                            </div>
                          )}
                          <div className="pt-1.5 flex justify-between items-center">
                            <div className="text-xs text-[#29696B]">
                              <span className="font-medium">{pedido.productos?.length || 0}</span> productos
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemitoDownload(pedido._id)}
                              disabled={isLoading}
                              className="h-8 w-8 p-0 text-[#29696B] hover:bg-[#DFEFE6]/30"
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Paginación para móvil */}
                  {!loadingPedidos && filteredPedidos.length > itemsPerPage && (
                    <div className="mt-4">
                      <Pagination
                        totalItems={filteredPedidos.length}
                        itemsPerPage={itemsPerPage}
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-[#DFEFE6]/10 border-t border-[#91BEAD]/20 justify-between">
                <div className="text-sm text-[#7AA79C]">
                  Mostrando {currentPedidos.length} de {filteredPedidos.length} pedidos
                </div>

                {/* Paginación para escritorio */}
                {!loadingPedidos && filteredPedidos.length > itemsPerPage && (
                  <div className="hidden md:block">
                    <Pagination
                      totalItems={filteredPedidos.length}
                      itemsPerPage={itemsPerPage}
                      currentPage={currentPage}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DownloadsManagement;