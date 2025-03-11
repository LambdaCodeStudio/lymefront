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
  RefreshCw
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

// Interface definitions
interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface Cliente {
  _id: string;
  servicio: string;
  seccionDelServicio: string;
  userId: {
    _id: string;
    nombre?: string;
    email?: string;
  } | string;
}

interface Usuario {
  _id: string;
  nombre?: string;
  apellido?: string;
  usuario: string;
  role: string;
  isActive: boolean;
  // Display name for UI
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
}

interface Pedido {
  _id: string;
  fecha: string;
  nPedido?: number; // Campo específico para número de pedido (backend)
  numero?: string;  // Campo de compatibilidad anterior
  servicio: string;
  seccionDelServicio: string;
  productos: ProductoEnPedido[];
  total?: number;
  displayNumber?: string; // Campo para mostrar consistentemente
  userId?: string | Usuario; // Supervisor/Usuario asignado
  clienteId?: string;
}

interface FilterOptions {
  servicio: string;
  fechaInicio: string;
  fechaFin: string;
  productoId: string;
  supervisorId: string;
  clienteId: string;
}

interface CacheState {
  productos: Producto[];
  supervisores: Usuario[];
  clientes: Cliente[];
  lastRefreshed: {
    productos: number;
    supervisores: number;
    clientes: number;
    pedidos: number;
  };
}

// Constante para tiempo de caché en milisegundos
const CACHE_EXPIRY_TIME = {
  productos: 15 * 60 * 1000,     // 15 minutos para productos
  supervisores: 20 * 60 * 1000,  // 20 minutos para supervisores
  clientes: 15 * 60 * 1000,      // 15 minutos para clientes
  pedidos: 5 * 60 * 1000         // 5 minutos para pedidos (cambian con más frecuencia)
};

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
  
  // Estado para el cache
  const [cacheState, setCacheState] = useState<CacheState>({
    productos: [],
    supervisores: [],
    clientes: [],
    lastRefreshed: {
      productos: 0,
      supervisores: 0,
      clientes: 0,
      pedidos: 0
    }
  });
  
  // Filtros
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    servicio: 'todos',
    fechaInicio: '',
    fechaFin: '',
    productoId: '',
    supervisorId: '',
    clienteId: ''
  });
  
  // Estado temporal para formulario de filtros
  const [tempFilterOptions, setTempFilterOptions] = useState<FilterOptions>({
    servicio: 'todos',
    fechaInicio: '',
    fechaFin: '',
    productoId: '',
    supervisorId: '',
    clienteId: ''
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

  // Función para formatear fechas
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

  // Función para verificar si el caché está actualizado
  const isCacheValid = (cacheType: 'productos' | 'supervisores' | 'clientes' | 'pedidos') => {
    const lastRefreshed = cacheState.lastRefreshed[cacheType];
    const now = Date.now();
    // Usar el tiempo de expiración específico para cada tipo de datos
    return lastRefreshed > 0 && (now - lastRefreshed) < CACHE_EXPIRY_TIME[cacheType];
  };

  // Cargar datos de productos (con caché)
  const loadProductos = useCallback(async (forceRefresh = false) => {
    // Si ya tenemos productos en caché y no forzamos actualización, usamos el caché
    if (!forceRefresh && isCacheValid('productos') && cacheState.productos.length > 0) {
      setProductos(cacheState.productos);
      return;
    }
    
    setLoadingCacheData(true);
    try {
      // Usar fetchWithRetry para manejar errores 429
      const response = await fetchWithRetry('/producto');
      
      if (response.data && Array.isArray(response.data.items)) {
        // Si estamos usando la estructura paginada
        const processedProductos = response.data.items.map((prod: any) => ({
          _id: prod._id,
          nombre: prod.nombre,
          categoria: prod.categoria,
          precio: prod.precio,
          stock: prod.stock
        }));
        
        setProductos(processedProductos);
        
        // Actualizar caché
        setCacheState(prev => ({
          ...prev,
          productos: processedProductos,
          lastRefreshed: {
            ...prev.lastRefreshed,
            productos: Date.now()
          }
        }));
      } else if (response.data && Array.isArray(response.data)) {
        // Si estamos usando la estructura de array simple
        const processedProductos = response.data.map((prod: any) => ({
          _id: prod._id,
          nombre: prod.nombre,
          categoria: prod.categoria,
          precio: prod.precio,
          stock: prod.stock
        }));
        
        setProductos(processedProductos);
        
        // Actualizar caché
        setCacheState(prev => ({
          ...prev,
          productos: processedProductos,
          lastRefreshed: {
            ...prev.lastRefreshed,
            productos: Date.now()
          }
        }));
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
      setProductos([]);
      // Mostrar error solo si no hay productos en caché
      if (cacheState.productos.length === 0) {
        setError(error.response?.status === 429 
          ? 'Demasiadas solicitudes al servidor. Por favor, espere un momento antes de volver a intentarlo.' 
          : 'Error al cargar los productos. Por favor, intente nuevamente más tarde.');
      }
    } finally {
      setLoadingCacheData(false);
    }
  }, [cacheState.productos, cacheState.lastRefreshed]);

  // Cargar supervisores (usuarios con rol de supervisor)
  const loadSupervisores = useCallback(async (forceRefresh = false) => {
    // Si ya tenemos supervisores en caché y no forzamos actualización, usamos el caché
    if (!forceRefresh && isCacheValid('supervisores') && cacheState.supervisores.length > 0) {
      setSupervisores(cacheState.supervisores);
      return;
    }
    
    setLoadingCacheData(true);
    try {
      // Usar fetchWithRetry para manejar errores 429
      const response = await fetchWithRetry('/auth/users');
      
      if (response.data && Array.isArray(response.data)) {
        // Filtrar solo usuarios activos con roles relevantes (supervisor, admin, etc.)
        const filteredUsers = response.data
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
    } catch (error) {
      console.error('Error al cargar supervisores:', error);
      setSupervisores([]);
      // Mostrar error solo si no hay supervisores en caché
      if (cacheState.supervisores.length === 0) {
        setError(error.response?.status === 429 
          ? 'Demasiadas solicitudes al servidor. Por favor, espere un momento antes de volver a intentarlo.' 
          : 'Error al cargar supervisores. Por favor, intente nuevamente más tarde.');
      }
    } finally {
      setLoadingCacheData(false);
    }
  }, [cacheState.supervisores, cacheState.lastRefreshed]);

  // Función para retry con delay exponencial para errores 429
  const fetchWithRetry = async (url, retries = 3, backoff = 1000) => {
    try {
      return await api.getClient().get(url);
    } catch (err) {
      // Si el error es 429 (Too Many Requests) y quedan reintentos
      if (err?.response?.status === 429 && retries > 0) {
        console.log(`Recibido error 429, reintentando en ${backoff}ms. Reintentos restantes: ${retries}`);
        // Esperar antes de reintentar (backoff exponencial)
        await new Promise(resolve => setTimeout(resolve, backoff));
        // Reintentar con un backoff exponencial (ej. 1s, 2s, 4s)
        return fetchWithRetry(url, retries - 1, backoff * 2);
      }
      throw err;
    }
  };

  // Cargar todos los clientes (con caché)
  const loadAllClientes = useCallback(async (forceRefresh = false) => {
    // Si ya tenemos clientes en caché y no forzamos actualización, usamos el caché
    if (!forceRefresh && isCacheValid('clientes') && cacheState.clientes.length > 0) {
      setAllClientes(cacheState.clientes);
      setClientes(cacheState.clientes);
      return;
    }
    
    setLoadingCacheData(true);
    try {
      // Usar fetchWithRetry para manejar errores 429
      const response = await fetchWithRetry('/cliente');
      
      if (response.data && Array.isArray(response.data)) {
        setAllClientes(response.data);
        setClientes(response.data);
        
        // Actualizar caché
        setCacheState(prev => ({
          ...prev,
          clientes: response.data,
          lastRefreshed: {
            ...prev.lastRefreshed,
            clientes: Date.now()
          }
        }));
      } else {
        setAllClientes([]);
        setClientes([]);
      }
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      // Mostrar mensaje de error al usuario
      setError(err.response?.status === 429 
        ? 'Demasiadas solicitudes al servidor. Por favor, espere un momento antes de volver a intentarlo.' 
        : 'Error al cargar los clientes. Por favor, intente nuevamente más tarde.');
      setAllClientes([]);
      setClientes([]);
    } finally {
      setLoadingCacheData(false);
    }
  }, [cacheState.clientes, cacheState.lastRefreshed]);

  // Cargar todos los datos necesarios al iniciar
  useEffect(() => {
    loadProductos();
    loadSupervisores();
    loadAllClientes();
  }, [loadProductos, loadSupervisores, loadAllClientes]);

  // Cargar pedidos cuando se selecciona un cliente en la pestaña de remitos
  useEffect(() => {
    const fetchPedidos = async () => {
      if (!selectedCliente) {
        setPedidos([]);
        return;
      }
      
      try {
        setError('');
        const pedidosResponse = await api.getClient().get(`/pedido/cliente/${selectedCliente}`);
        
        if (pedidosResponse.data && Array.isArray(pedidosResponse.data)) {
          // Procesar los pedidos para asegurar que displayNumber esté definido
          const processedPedidos = pedidosResponse.data.map((pedido: any) => {
            return {
              ...pedido,
              displayNumber: pedido.nPedido?.toString() || pedido.numero || 'S/N'
            };
          });
          setPedidos(processedPedidos);
        } else {
          setPedidos([]);
          setError('Formato de respuesta inválido al cargar pedidos');
        }
      } catch (err) {
        console.error('Error al cargar pedidos:', err);
        setPedidos([]);
        setError('Error al cargar pedidos para este cliente');
      }
    };
    
    fetchPedidos();
  }, [selectedCliente]);
  
  // Cargar todos los pedidos para la tabla (con caché)
  const loadAllPedidos = useCallback(async (forceRefresh = false) => {
    // Si no forzamos la actualización y el caché de pedidos es válido, no hacemos nada
    // Esta función siempre carga los datos porque los pedidos cambian con frecuencia
    if (!forceRefresh && isCacheValid('pedidos') && allPedidos.length > 0) {
      return;
    }
    
    setLoadingPedidos(true);
    try {
      // Usar fetchWithRetry para manejar errores 429
      const response = await fetchWithRetry('/pedido');
      
      // Verificar que response.data exista y sea un array
      if (response.data && Array.isArray(response.data)) {
        // Calcular total para cada pedido y agregar displayNumber
        const pedidosConTotal = response.data.map((pedido: any) => {
          let total = 0;
          if (pedido.productos && Array.isArray(pedido.productos)) {
            total = pedido.productos.reduce((sum: number, prod: any) => {
              const precio = prod.productoId?.precio || 0;
              const cantidad = prod.cantidad || 0;
              return sum + (precio * cantidad);
            }, 0);
          }
          
          // Add display number that prioritizes nPedido
          const displayNumber = pedido.nPedido?.toString() || pedido.numero || 'S/N';
          
          return { ...pedido, total, displayNumber };
        });
        
        setAllPedidos(pedidosConTotal);
        setFilteredPedidos(pedidosConTotal);
        
        // Actualizar caché
        setCacheState(prev => ({
          ...prev,
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
          clienteId: ''
        });
      } else {
        // Si la respuesta no es un array, inicializar con array vacío
        setAllPedidos([]);
        setFilteredPedidos([]);
      }
    } catch (err) {
      console.error('Error al cargar todos los pedidos:', err);
      setAllPedidos([]);
      setFilteredPedidos([]);
      setError(err.response?.status === 429 
        ? 'Demasiadas solicitudes al servidor. Por favor, espere un momento antes de volver a intentarlo.' 
        : 'Error al cargar los pedidos. Por favor, intente nuevamente más tarde.');
    } finally {
      setLoadingPedidos(false);
    }
  }, [allPedidos.length]);

  // Cargar datos iniciales con retraso entre solicitudes para evitar errores 429
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Cargar primero los clientes (probablemente los más importantes)
        await loadAllClientes();
        
        // Pequeño retraso para evitar errores 429
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Luego cargar productos
        await loadProductos();
        
        // Otro pequeño retraso
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Finalmente cargar supervisores
        await loadSupervisores();
        
        // Un retraso final antes de cargar pedidos
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Cargar los pedidos al final
        await loadAllPedidos();
      } catch (err) {
        console.error("Error al cargar datos iniciales:", err);
      }
    };
    
    loadInitialData();
  }, [loadAllClientes, loadProductos, loadSupervisores, loadAllPedidos]);
  
  // Función para forzar la recarga de todos los datos (de forma secuencial para evitar 429)
  const forceRefreshAllData = async () => {
    setLoadingCacheData(true);
    setError(''); // Limpiar errores previos
    
    try {
      // Cargar datos de forma secuencial para evitar errores 429
      await loadAllClientes(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await loadProductos(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await loadSupervisores(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await loadAllPedidos(true);
      
      // Mostrar mensaje de éxito
      setSuccessMessage('Datos actualizados correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error al actualizar datos:', err);
      setError('Error al actualizar los datos. Por favor intente nuevamente más tarde.');
    } finally {
      setLoadingCacheData(false);
    }
  };
  
  // Función para aplicar filtros manualmente
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
        // Manejar casos donde userId es objeto o string
        if (typeof pedido.userId === 'object') {
          return pedido.userId && pedido.userId._id === filterOptions.supervisorId;
        } else {
          return pedido.userId === filterOptions.supervisorId;
        }
      });
    }
    
    // Filtrar por cliente
    if (filterOptions.clienteId) {
      // Primero debemos buscar el cliente seleccionado
      const selectedCliente = allClientes.find(c => c._id === filterOptions.clienteId);
      
      if (selectedCliente) {
        filtered = filtered.filter(pedido => {
          // Un pedido coincide con un cliente si:
          // 1. Mismo servicio
          const servicioMatch = pedido.servicio === selectedCliente.servicio;
          
          // 2. Misma sección de servicio (si está especificada)
          const seccionMatch = !selectedCliente.seccionDelServicio || 
                            pedido.seccionDelServicio === selectedCliente.seccionDelServicio;
          
          // 3. Mismo userId (si está asignado)
          let userMatch = true;
          if (typeof selectedCliente.userId === 'object' && selectedCliente.userId && selectedCliente.userId._id) {
            if (typeof pedido.userId === 'object') {
              userMatch = pedido.userId && pedido.userId._id === selectedCliente.userId._id;
            } else {
              userMatch = pedido.userId === selectedCliente.userId._id;
            }
          }
          
          return servicioMatch && seccionMatch && userMatch;
        });
      }
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
      link.remove();
      window.URL.revokeObjectURL(url);
      
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
      clienteId: ''
    };
    setTempFilterOptions(emptyFilters);
    setFilterOptions(emptyFilters);
    
    // Limpiar búsquedas de filtros
    setFilterSearch({
      producto: '',
      supervisor: '',
      cliente: ''
    });
  };

  // Función para obtener el nombre del cliente
  const getClientName = (cliente: Cliente): string => {
    if (!cliente) return "Cliente no disponible";
    
    // Mostrar el servicio y la sección si está disponible
    const servicioCompleto = cliente.seccionDelServicio 
      ? `${cliente.servicio} - ${cliente.seccionDelServicio}` 
      : cliente.servicio;
    
    return servicioCompleto;
  };

  // Filtrar clientes por búsqueda
  const filteredClientes = clientes.filter(cliente => {
    // Verificar que cliente tenga la estructura esperada
    if (!cliente || typeof cliente !== 'object') return false;
    
    // Obtener el nombre completo del cliente (servicio + sección)
    const nombreCompleto = getClientName(cliente);
    
    // Filtrar si el término de búsqueda está en el nombre
    return nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  // Obtener clientes filtrados para el selector de filtros
  const getFilteredClientesForSelector = () => {
    return allClientes.filter(cliente => {
      const nombreCompleto = getClientName(cliente);
      return nombreCompleto.toLowerCase().includes(filterSearch.cliente.toLowerCase());
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
  const serviciosUnicos = [...new Set(allPedidos.map(p => p.servicio).filter(Boolean))];

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
    filterOptions.clienteId !== '';
  
  // Obtener conteo de filtros activos
  const getActiveFilterCount = () => {
    let count = 0;
    if (filterOptions.servicio !== 'todos') count++;
    if (filterOptions.fechaInicio !== '') count++;
    if (filterOptions.fechaFin !== '') count++;
    if (filterOptions.productoId !== '') count++;
    if (filterOptions.supervisorId !== '') count++;
    if (filterOptions.clienteId !== '') count++;
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

  return (
    <div className="space-y-6 bg-[#DFEFE6]/20 p-4 md:p-6 rounded-xl">
      {/* Alertas */}
      {error && (
        <Alert className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert className="mb-4 bg-[#DFEFE6] border border-[#91BEAD] text-[#29696B] rounded-lg">
          <AlertDescription className="text-[#29696B]">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Botón para refrescar todos los datos del caché */}
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
                  <Select value={selectedCliente} onValueChange={setSelectedCliente}>
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
                        
                        {/* Cliente - Selector con búsqueda */}
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
                                    {getClientName(allClientes.find(c => c._id === tempFilterOptions.clienteId) as Cliente)}
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
                                      setTempFilterOptions({...tempFilterOptions, clienteId: ''});
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
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
                                  <Input
                                    placeholder="Buscar clientes..."
                                    value={filterSearch.cliente}
                                    onChange={(e) => setFilterSearch({...filterSearch, cliente: e.target.value})}
                                    className="pl-10 border-[#91BEAD]"
                                  />
                                </div>
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
                                            setTempFilterOptions({...tempFilterOptions, clienteId: cliente._id});
                                            setActiveFilterSelector(null);
                                          }}
                                        >
                                          <div>
                                            <div>{cliente.servicio}</div>
                                            {cliente.seccionDelServicio && (
                                              <div className="text-xs opacity-70">
                                                {cliente.seccionDelServicio}
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
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setActiveFilterSelector(null);
                                    setFilterSearch({...filterSearch, cliente: ''});
                                  }}
                                >
                                  Cancelar
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