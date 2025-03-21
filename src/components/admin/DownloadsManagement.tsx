import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Loader2,
  Search,
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
  Store,
  SlidersHorizontal
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
import api from '@/services/api';
import { inventoryObservable } from '@/utils/inventoryUtils';

// Create an observable for order-related updates
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
  supervisorId?: string;
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
  nPedido?: number;
  numero?: string;
  servicio: string;
  seccionDelServicio: string;
  cliente?: ClienteEnPedido;
  productos: ProductoEnPedido[];
  total?: number;
  displayNumber?: string;
  userId?: string | Usuario;
  supervisorId?: string | Usuario;
  clienteId?: string;
  estado?: string;
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

// Cache expiry time constants
const CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes
const PEDIDOS_CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes
const MAX_TIME_WITHOUT_UPDATE = 60 * 60 * 1000; // 1 hour

const DownloadsManagement: React.FC = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState('excel');

  // Excel tab state
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  });

  // Remitos tab state
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [selectedSubServicio, setSelectedSubServicio] = useState<string>('');
  const [selectedSubUbicacion, setSelectedSubUbicacion] = useState<string>('');
  const [selectedPedido, setSelectedPedido] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Orders table state
  const [allPedidos, setAllPedidos] = useState<Pedido[]>([]);
  const [filteredPedidos, setFilteredPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [loadingCacheData, setLoadingCacheData] = useState(false);

  // Filter state
  const [productos, setProductos] = useState<Producto[]>([]);
  const [supervisores, setSupervisores] = useState<Usuario[]>([]);
  const [allClientes, setAllClientes] = useState<Cliente[]>([]);
  const [filterSearch, setFilterSearch] = useState({
    producto: '',
    supervisor: '',
    cliente: ''
  });

  // Cache state
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

  // Reference to track initial load
  const initialLoadDone = useRef(false);

  // Filter options state - Centralizado para compartir entre tabs
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

  // Temporary filter state for dialog
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

  // UI state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [activeFilterSelector, setActiveFilterSelector] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const mobileListRef = useRef<HTMLDivElement>(null);

  // Pagination constants
  const ITEMS_PER_PAGE_MOBILE = 5;
  const ITEMS_PER_PAGE_DESKTOP = 10;
  const itemsPerPage = windowWidth < 768 ? ITEMS_PER_PAGE_MOBILE : ITEMS_PER_PAGE_DESKTOP;

  // Helper functions
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

  // Window resize handling
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);

      if ((newWidth < 768 && windowWidth >= 768) || (newWidth >= 768 && windowWidth < 768)) {
        setCurrentPage(1);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [windowWidth]);

  // Sincronizar filterOptions con dateRange en la pestaña de Excel
  useEffect(() => {
    if (activeTab === 'excel') {
      if (filterOptions.fechaInicio && (!dateRange.from || formatDate(dateRange.from) !== filterOptions.fechaInicio)) {
        setDateRange(prev => ({
          ...prev,
          from: new Date(filterOptions.fechaInicio)
        }));
      }

      if (filterOptions.fechaFin && (!dateRange.to || formatDate(dateRange.to) !== filterOptions.fechaFin)) {
        setDateRange(prev => ({
          ...prev,
          to: new Date(filterOptions.fechaFin)
        }));
      }
    }
  }, [activeTab, filterOptions.fechaInicio, filterOptions.fechaFin, dateRange]);

  // Sincronizar dateRange con filterOptions
  useEffect(() => {
    if (activeTab === 'excel') {
      const updatedOptions = { ...filterOptions };

      if (dateRange.from) {
        updatedOptions.fechaInicio = formatDate(dateRange.from);
      }

      if (dateRange.to) {
        updatedOptions.fechaFin = formatDate(dateRange.to);
      }

      if (updatedOptions.fechaInicio !== filterOptions.fechaInicio ||
        updatedOptions.fechaFin !== filterOptions.fechaFin) {
        setFilterOptions(updatedOptions);
        setTempFilterOptions(updatedOptions);
      }
    }
  }, [dateRange, activeTab]);

  // Sincronizar filterOptions con selección de cliente en pestaña remitos
  useEffect(() => {
    if (activeTab === 'remitos') {
      if (filterOptions.clienteId && (!selectedCliente || selectedCliente !== filterOptions.clienteId)) {
        setSelectedCliente(filterOptions.clienteId);
      }

      if (filterOptions.subServicioId && (!selectedSubServicio || selectedSubServicio !== filterOptions.subServicioId)) {
        setSelectedSubServicio(filterOptions.subServicioId);
      }

      if (filterOptions.subUbicacionId && (!selectedSubUbicacion || selectedSubUbicacion !== filterOptions.subUbicacionId)) {
        setSelectedSubUbicacion(filterOptions.subUbicacionId);
      }
    }
  }, [activeTab, filterOptions, selectedCliente, selectedSubServicio, selectedSubUbicacion]);

  // Sincronizar selección de cliente con filterOptions
  useEffect(() => {
    if (activeTab === 'remitos') {
      const updatedOptions = { ...filterOptions };

      if (selectedCliente) {
        updatedOptions.clienteId = selectedCliente;
      }

      if (selectedSubServicio) {
        updatedOptions.subServicioId = selectedSubServicio;
      } else {
        updatedOptions.subServicioId = '';
      }

      if (selectedSubUbicacion) {
        updatedOptions.subUbicacionId = selectedSubUbicacion;
      } else {
        updatedOptions.subUbicacionId = '';
      }

      if (updatedOptions.clienteId !== filterOptions.clienteId ||
        updatedOptions.subServicioId !== filterOptions.subServicioId ||
        updatedOptions.subUbicacionId !== filterOptions.subUbicacionId) {
        setFilterOptions(updatedOptions);
        setTempFilterOptions(updatedOptions);
      }
    }
  }, [selectedCliente, selectedSubServicio, selectedSubUbicacion, activeTab]);

  // Cache validation
  const isCacheValid = useCallback((cacheType: 'productos' | 'supervisores' | 'clientes' | 'pedidos') => {
    const lastRefreshed = cacheState.lastRefreshed[cacheType];
    const lastUpdated = cacheState.lastUpdated[cacheType];
    const now = Date.now();

    if (lastRefreshed === 0) return false;

    const expiryTime = cacheType === 'pedidos' ? PEDIDOS_CACHE_EXPIRY_TIME : CACHE_EXPIRY_TIME;

    if (now - lastRefreshed > MAX_TIME_WITHOUT_UPDATE) return false;

    if (lastUpdated > lastRefreshed) return false;

    return (now - lastRefreshed) < expiryTime;
  }, [cacheState.lastRefreshed, cacheState.lastUpdated]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterOptions]);

  // Page change handler
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (windowWidth < 768 && mobileListRef.current) {
      mobileListRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Tab change handler
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Data fetching functions
  const loadProductos = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('productos') && cacheState.productos.length > 0) {
      setProductos(cacheState.productos);
      return cacheState.productos;
    }

    try {
      setLoadingCacheData(true);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/producto', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      const data = await response.json();

      let processedProductos: Producto[] = [];

      if (data && Array.isArray(data.items)) {
        processedProductos = data.items.map((prod: any) => ({
          _id: prod._id,
          nombre: prod.nombre,
          categoria: prod.categoria,
          precio: prod.precio,
          stock: prod.stock
        }));
      } else if (data && Array.isArray(data)) {
        processedProductos = data.map((prod: any) => ({
          _id: prod._id,
          nombre: prod.nombre,
          categoria: prod.categoria,
          precio: prod.precio,
          stock: prod.stock
        }));
      }

      setProductos(processedProductos);

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
      console.error('Error loading products:', error);
      return cacheState.productos;
    } finally {
      setLoadingCacheData(false);
    }
  }, [cacheState.productos, isCacheValid]);

  const loadSupervisores = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('supervisores') && cacheState.supervisores.length > 0) {
      setSupervisores(cacheState.supervisores);
      return cacheState.supervisores;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      const data = await response.json();

      let filteredUsers: Usuario[] = [];

      if (data && data.users && Array.isArray(data.users)) {
        filteredUsers = data.users
          .filter((user: any) => user.isActive)
          .map((user: any) => ({
            _id: user._id,
            nombre: user.nombre || '',
            apellido: user.apellido || '',
            usuario: user.usuario,
            role: user.role,
            isActive: user.isActive,
            displayName: `${user.nombre || ''} ${user.apellido || ''}`.trim() || user.usuario
          }));

        setSupervisores(filteredUsers);

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
      console.error('Error loading supervisors:', error);
      return cacheState.supervisores;
    }
  }, [cacheState.supervisores, isCacheValid]);

  const loadAllClientes = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('clientes') && cacheState.clientes.length > 0) {
      setAllClientes(cacheState.clientes);
      setClientes(cacheState.clientes);
      return cacheState.clientes;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/cliente', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      const data = await response.json();

      if (data && Array.isArray(data)) {
        const clientesData = data.map((cliente: any) => {
          return {
            ...cliente,
            servicio: cliente.servicio || cliente.nombre,
            seccionDelServicio: cliente.seccionDelServicio || '',
            subServicios: cliente.subServicios || []
          };
        });

        setAllClientes(clientesData);
        setClientes(clientesData);

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
      console.error('Error loading clients:', err);
      return cacheState.clientes;
    }
  }, [cacheState.clientes, isCacheValid]);

  const loadAllPedidos = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('pedidos') && cacheState.pedidos.length > 0) {
      setAllPedidos(cacheState.pedidos);
      setFilteredPedidos(cacheState.pedidos);
      return cacheState.pedidos;
    }

    setLoadingPedidos(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/pedido', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      const data = await response.json();

      if (data && Array.isArray(data)) {
        const pedidosConTotal = data.map((pedido: any) => {
          let total = 0;
          if (pedido.productos && Array.isArray(pedido.productos)) {
            total = pedido.productos.reduce((sum: number, prod: any) => {
              const precio = prod.precioUnitario ||
                (prod.productoId && typeof prod.productoId === 'object' ?
                  prod.productoId.precio : 0);
              const cantidad = prod.cantidad || 0;
              return sum + (precio * cantidad);
            }, 0);
          }

          const displayNumber = pedido.nPedido?.toString() || pedido.numero || 'S/N';

          return { ...pedido, total, displayNumber };
        });

        setAllPedidos(pedidosConTotal);

        setCacheState(prev => ({
          ...prev,
          pedidos: pedidosConTotal,
          lastRefreshed: {
            ...prev.lastRefreshed,
            pedidos: Date.now()
          }
        }));

        return pedidosConTotal;
      }

      return cacheState.pedidos;
    } catch (err) {
      console.error('Error loading all orders:', err);
      return cacheState.pedidos;
    } finally {
      setLoadingPedidos(false);
    }
  }, [cacheState.pedidos, isCacheValid]);

  // Reset hierarchy selections
  const resetJerarquiaSelections = useCallback(() => {
    setSelectedSubServicio('');
    setSelectedSubUbicacion('');
  }, []);

  // Load orders by client
  const loadPedidosByCliente = useCallback(async (clienteId: string, subServicioId?: string, subUbicacionId?: string) => {
    if (!clienteId) {
      setPedidos([]);
      return [];
    }

    let url = `/api/pedido/cliente/${clienteId}`;

    // Construir URL con query params
    if (subServicioId || subUbicacionId) {
      const params = new URLSearchParams();
      if (subServicioId) params.append('subServicioId', subServicioId);
      if (subUbicacionId) params.append('subUbicacionId', subUbicacionId);
      url += `?${params.toString()}`;
    }

    try {
      setError('');
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      const data = await response.json();

      if (data && Array.isArray(data)) {
        const processedPedidos = data.map((pedido: any) => {
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
      console.error('Error loading orders:', err);
      setPedidos([]);
      setError('Error al cargar pedidos para este cliente');
      return [];
    }
  }, []);

  // Load orders when client selection changes
  useEffect(() => {
    if (selectedCliente) {
      loadPedidosByCliente(selectedCliente, selectedSubServicio, selectedSubUbicacion);
    }
  }, [selectedCliente, selectedSubServicio, selectedSubUbicacion, loadPedidosByCliente]);

  // Initial data loading
  useEffect(() => {
    if (!initialLoadDone.current) {
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

  // Subscribe to updates
  useEffect(() => {
    const unsubscribeInventory = inventoryObservable.subscribe(() => {
      console.log('DownloadsManagement: Inventory update notified');

      setCacheState(prev => ({
        ...prev,
        lastUpdated: {
          ...prev.lastUpdated,
          productos: Date.now()
        }
      }));

      loadProductos(true);
    });

    const unsubscribePedidos = pedidosObservable.subscribe(() => {
      console.log('DownloadsManagement: Orders update notified');

      setCacheState(prev => ({
        ...prev,
        lastUpdated: {
          ...prev.lastUpdated,
          pedidos: Date.now()
        }
      }));

      loadAllPedidos(true);

      if (selectedCliente) {
        loadPedidosByCliente(selectedCliente, selectedSubServicio, selectedSubUbicacion);
      }
    });

    return () => {
      unsubscribeInventory();
      unsubscribePedidos();
    };
  }, [loadProductos, loadAllPedidos, loadPedidosByCliente, selectedCliente, selectedSubServicio, selectedSubUbicacion]);

  // Force refresh all data
  const forceRefreshAllData = useCallback(() => {
    setLoadingCacheData(true);
    Promise.all([
      loadProductos(true),
      loadSupervisores(true),
      loadAllClientes(true),
      loadAllPedidos(true)
    ]).then(() => {
      if (selectedCliente) {
        return loadPedidosByCliente(selectedCliente, selectedSubServicio, selectedSubUbicacion);
      }
    }).finally(() => {
      setLoadingCacheData(false);
      setSuccessMessage('Datos actualizados correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    });
  }, [loadProductos, loadSupervisores, loadAllClientes, loadAllPedidos, loadPedidosByCliente, selectedCliente, selectedSubServicio, selectedSubUbicacion]);

  // Apply filters
  const applyFilters = useCallback(() => {
    if (!allPedidos.length) return;

    let filtered = [...allPedidos];

    // Filter by service
    if (filterOptions.servicio && filterOptions.servicio !== 'todos') {
      filtered = filtered.filter(pedido =>
        pedido.servicio === filterOptions.servicio
      );
    }

    // Filter by start date
    if (filterOptions.fechaInicio) {
      const fechaInicio = new Date(filterOptions.fechaInicio);
      fechaInicio.setHours(0, 0, 0, 0);
      filtered = filtered.filter(pedido => {
        const fechaPedido = new Date(pedido.fecha);
        return fechaPedido >= fechaInicio;
      });
    }

    // Filter by end date
    if (filterOptions.fechaFin) {
      const fechaFin = new Date(filterOptions.fechaFin);
      fechaFin.setHours(23, 59, 59, 999);
      filtered = filtered.filter(pedido => {
        const fechaPedido = new Date(pedido.fecha);
        return fechaPedido <= fechaFin;
      });
    }

    // Filter by product
    if (filterOptions.productoId) {
      filtered = filtered.filter(pedido => {
        if (!pedido.productos || !Array.isArray(pedido.productos)) return false;

        return pedido.productos.some(productoItem => {
          if (typeof productoItem.productoId === 'object') {
            return productoItem.productoId && productoItem.productoId._id === filterOptions.productoId;
          } else {
            return productoItem.productoId === filterOptions.productoId;
          }
        });
      });
    }

    // Filter by supervisor
    if (filterOptions.supervisorId) {
      filtered = filtered.filter(pedido => {
        if (typeof pedido.supervisorId === 'object') {
          return pedido.supervisorId && pedido.supervisorId._id === filterOptions.supervisorId;
        } else if (pedido.supervisorId) {
          return pedido.supervisorId === filterOptions.supervisorId;
        }

        if (typeof pedido.userId === 'object') {
          return pedido.userId && pedido.userId._id === filterOptions.supervisorId;
        } else {
          return pedido.userId === filterOptions.supervisorId;
        }
      });
    }

    // Filter by client (hierarchical structure)
    if (filterOptions.clienteId) {
      filtered = filtered.filter(pedido => {
        if (pedido.cliente && pedido.cliente.clienteId === filterOptions.clienteId) {
          if (filterOptions.subServicioId &&
            pedido.cliente.subServicioId !== filterOptions.subServicioId) {
            return false;
          }

          if (filterOptions.subUbicacionId &&
            pedido.cliente.subUbicacionId !== filterOptions.subUbicacionId) {
            return false;
          }

          return true;
        }

        const selectedCliente = allClientes.find(c => c._id === filterOptions.clienteId);

        if (selectedCliente) {
          const servicioMatch = pedido.servicio === selectedCliente.servicio;
          const seccionMatch = !selectedCliente.seccionDelServicio ||
            pedido.seccionDelServicio === selectedCliente.seccionDelServicio;

          return servicioMatch && seccionMatch;
        }

        return false;
      });
    }

    setFilteredPedidos(filtered);
    setCurrentPage(1);
  }, [allPedidos, allClientes, filterOptions]);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [filterOptions, applyFilters]);

  // Handle applying filters
  const handleApplyFilters = () => {
    setFilterOptions(tempFilterOptions);
    setIsFilterDialogOpen(false);
  };

  // Excel download handler
  const handleExcelDownload = async () => {
    // Usar fechas de los filtros si están disponibles
    const fromDate = dateRange.from || (filterOptions.fechaInicio ? new Date(filterOptions.fechaInicio) : undefined);
    const toDate = dateRange.to || (filterOptions.fechaFin ? new Date(filterOptions.fechaFin) : undefined);

    if (!fromDate || !toDate) {
      setError('Por favor selecciona un rango de fechas');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const params = new URLSearchParams({
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      });

      // Añadir filtros adicionales si están presentes
      if (filterOptions.clienteId) {
        params.append('clienteId', filterOptions.clienteId);
      }

      if (filterOptions.productoId) {
        params.append('productoId', filterOptions.productoId);
      }

      if (filterOptions.supervisorId) {
        params.append('supervisorId', filterOptions.supervisorId);
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/downloads/excel?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || 'Error al descargar el Excel');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_${formatDate(fromDate)}_${formatDate(toDate)}.xlsx`);
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      setSuccessMessage('Excel descargado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error downloading Excel:', err);
      setError(err.message || 'Error al descargar el Excel');
    } finally {
      setIsLoading(false);
    }
  };

  // Reporte mensual download handler
  const handleReporteMensualDownload = async () => {
    const fromDate = dateRange.from;
    const toDate = dateRange.to;

    if (!fromDate || !toDate) {
      setError('Por favor selecciona un rango de fechas');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const params = new URLSearchParams({
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      });

      // Añadir clienteId solo si está seleccionado
      if (filterOptions.clienteId) {
        params.append('clienteId', filterOptions.clienteId);
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/downloads/reporte-mensual?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || 'Error al descargar el reporte mensual');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Nombre del archivo
      let fileName = `reporte_mensual_${formatDate(fromDate)}_${formatDate(toDate)}`;
      if (filterOptions.clienteId) {
        const cliente = allClientes.find(c => c._id === filterOptions.clienteId);
        if (cliente) {
          fileName += `_${getClientName(cliente).replace(/\s+/g, '_')}`;
        }
      }
      fileName += '.xlsx';

      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      setSuccessMessage('Reporte mensual descargado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error downloading monthly report:', err);
      setError(err.message || 'Error al descargar el reporte mensual');
    } finally {
      setIsLoading(false);
    }
  };

  // Remito download handler
  const handleRemitoDownload = async (pedidoId = selectedPedido) => {
    if (!pedidoId) {
      setError('Por favor selecciona un pedido');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setSuccessMessage('');

      console.log(`Starting remito download for order: ${pedidoId}`);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/downloads/remito/${pedidoId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        if (response.headers.get('content-type')?.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.mensaje || 'Error al generar el PDF');
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();

      if (!blob || blob.size === 0) {
        throw new Error('La respuesta del servidor está vacía');
      }

      console.log(`PDF received: ${blob.size} bytes`);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const pedido = pedidos.find(p => p._id === pedidoId) ||
        allPedidos.find(p => p._id === pedidoId);

      const fileName = `remito_${pedido?.nPedido || pedido?.numero || pedidoId}.pdf`;
      link.setAttribute('download', fileName);

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      setSuccessMessage('Remito descargado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error downloading remito:', err);

      let errorMessage = 'Error al descargar el remito';

      if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset filters
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

    setFilterSearch({
      producto: '',
      supervisor: '',
      cliente: ''
    });

    resetJerarquiaSelections();

    // Resetear también el dateRange
    setDateRange({
      from: undefined,
      to: undefined
    });

    // Resetear selección del cliente en la pestaña remitos
    setSelectedCliente('');
    setSelectedSubServicio('');
    setSelectedSubUbicacion('');
    setSelectedPedido('');
  };

  // Client name helper
  const getClientName = (cliente: Cliente): string => {
    if (!cliente) return "Cliente no disponible";
    return cliente.nombre || cliente.servicio;
  };

  // Client section helper
  const getClientSection = (cliente: Cliente): string => {
    return cliente.seccionDelServicio || '';
  };

  // Filtered clients
  const filteredClientes = clientes.filter(cliente => {
    if (!cliente || typeof cliente !== 'object') return false;
    const nombreCliente = getClientName(cliente);
    return nombreCliente.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Get subservices
  const getSubServicios = () => {
    if (!selectedCliente) return [];

    const cliente = clientes.find(c => c._id === selectedCliente);
    if (!cliente) return [];

    return cliente.subServicios || [];
  };

  // Get sublocations
  const getSubUbicaciones = () => {
    if (!selectedCliente || !selectedSubServicio) return [];

    const cliente = clientes.find(c => c._id === selectedCliente);
    if (!cliente) return [];

    const subServicio = cliente.subServicios.find(s => s._id === selectedSubServicio);
    if (!subServicio) return [];

    return subServicio.subUbicaciones || [];
  };

  // Filtered clients for selector
  const getFilteredClientesForSelector = () => {
    return allClientes.filter(cliente => {
      const nombreCliente = getClientName(cliente);
      return nombreCliente.toLowerCase().includes(filterSearch.cliente.toLowerCase());
    });
  };

  // Filtered products for selector
  const getFilteredProductosForSelector = () => {
    return productos.filter(producto =>
      producto.nombre.toLowerCase().includes(filterSearch.producto.toLowerCase())
    );
  };

  // Filtered supervisors for selector
  const getFilteredSupervisoresForSelector = () => {
    return supervisores.filter(supervisor => {
      const nombreCompleto = supervisor.displayName || '';
      return nombreCompleto.toLowerCase().includes(filterSearch.supervisor.toLowerCase());
    });
  };

  // Unique services for filter
  const serviciosUnicos = [...new Set(allPedidos
    .filter(p => p.servicio)
    .map(p => p.servicio))];

  // Pagination calculations
  const indexOfLastPedido = currentPage * itemsPerPage;
  const indexOfFirstPedido = indexOfLastPedido - itemsPerPage;
  const currentPedidos = filteredPedidos.slice(indexOfFirstPedido, indexOfLastPedido);
  const totalPages = Math.ceil(filteredPedidos.length / itemsPerPage);
  const showingFromTo = filteredPedidos.length > 0
    ? `${indexOfFirstPedido + 1}-${Math.min(indexOfLastPedido, filteredPedidos.length)} de ${filteredPedidos.length}`
    : '0 de 0';

  // Check if filters are active
  const hasActiveFilters =
    filterOptions.servicio !== 'todos' ||
    filterOptions.fechaInicio !== '' ||
    filterOptions.fechaFin !== '' ||
    filterOptions.productoId !== '' ||
    filterOptions.supervisorId !== '' ||
    filterOptions.clienteId !== '' ||
    filterOptions.subServicioId !== '' ||
    filterOptions.subUbicacionId !== '';

  // Count active filters
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

  // Get selected item names
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

  // Componente de filtros comunes (Diálogo)
  const FilterDialog = () => (
    <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
      <DialogContent className="bg-white border border-[#91BEAD]/20 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#29696B]">Filtrar Pedidos</DialogTitle>
          <DialogDescription className="text-[#7AA79C]">
            Ajusta los filtros para encontrar pedidos específicos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Service filter */}
          <div className="space-y-2">
            <Label htmlFor="servicio-filter" className="text-[#29696B]">Servicio</Label>
            <Select
              value={tempFilterOptions.servicio}
              onValueChange={(value) => setTempFilterOptions({ ...tempFilterOptions, servicio: value })}
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

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha-inicio-filter" className="text-[#29696B]">Desde</Label>
              <Input
                id="fecha-inicio-filter"
                type="date"
                value={tempFilterOptions.fechaInicio}
                onChange={(e) => setTempFilterOptions({ ...tempFilterOptions, fechaInicio: e.target.value })}
                className="border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha-fin-filter" className="text-[#29696B]">Hasta</Label>
              <Input
                id="fecha-fin-filter"
                type="date"
                value={tempFilterOptions.fechaFin}
                onChange={(e) => setTempFilterOptions({ ...tempFilterOptions, fechaFin: e.target.value })}
                className="border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
              />
            </div>
          </div>

          {/* Product filter */}
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
                        setTempFilterOptions({ ...tempFilterOptions, productoId: '' });
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
                      onChange={(e) => setFilterSearch({ ...filterSearch, producto: e.target.value })}
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
                            className={`px-3 py-2 rounded-md cursor-pointer flex justify-between items-center ${tempFilterOptions.productoId === producto._id
                              ? 'bg-[#29696B] text-white'
                              : 'hover:bg-[#DFEFE6]/40'
                              }`}
                            onClick={() => {
                              setTempFilterOptions({ ...tempFilterOptions, productoId: producto._id });
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
                      setFilterSearch({ ...filterSearch, producto: '' });
                    }}
                  >
                    Cancelar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Supervisor filter */}
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
                        setTempFilterOptions({ ...tempFilterOptions, supervisorId: '' });
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
                      onChange={(e) => setFilterSearch({ ...filterSearch, supervisor: e.target.value })}
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
                            className={`px-3 py-2 rounded-md cursor-pointer flex justify-between items-center ${tempFilterOptions.supervisorId === supervisor._id
                              ? 'bg-[#29696B] text-white'
                              : 'hover:bg-[#DFEFE6]/40'
                              }`}
                            onClick={() => {
                              setTempFilterOptions({ ...tempFilterOptions, supervisorId: supervisor._id });
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
                      setFilterSearch({ ...filterSearch, supervisor: '' });
                    }}
                  >
                    Cancelar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Client filter (hierarchical) */}
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
                  {/* Client search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
                    <Input
                      placeholder="Buscar clientes..."
                      value={filterSearch.cliente}
                      onChange={(e) => setFilterSearch({ ...filterSearch, cliente: e.target.value })}
                      className="pl-10 border-[#91BEAD]"
                    />
                  </div>

                  {/* Client list */}
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
                            className={`px-3 py-2 rounded-md cursor-pointer flex justify-between items-center ${tempFilterOptions.clienteId === cliente._id
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

                  {/* Subservice selector if client is selected */}
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
                              <SelectItem value="all">Todos los subservicios</SelectItem>
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

                  {/* Sublocation selector if subservice is selected */}
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
                              <SelectItem value="all">Todas las ubicaciones</SelectItem>
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
                      setFilterSearch({ ...filterSearch, cliente: '' });
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
  );

  // Componente de barra de filtros activos
  const ActiveFiltersBar = () => (
    hasActiveFilters ? (
      <div className="flex flex-wrap items-center gap-2 mt-2 p-2 bg-[#DFEFE6]/30 rounded-md border border-[#91BEAD]/20">
        <span className="text-xs text-[#29696B] font-medium">Filtros activos:</span>

        {filterOptions.servicio !== 'todos' && (
          <Badge variant="outline" className="bg-[#DFEFE6]/40 border-[#91BEAD] text-[#29696B] flex items-center gap-1">
            <span>Servicio: {filterOptions.servicio}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterOptions(prev => ({ ...prev, servicio: 'todos' }));
                setTempFilterOptions(prev => ({ ...prev, servicio: 'todos' }));
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
                setFilterOptions(prev => ({ ...prev, fechaInicio: '' }));
                setTempFilterOptions(prev => ({ ...prev, fechaInicio: '' }));
                if (activeTab === 'excel') {
                  setDateRange(prev => ({ ...prev, from: undefined }));
                }
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
                setFilterOptions(prev => ({ ...prev, fechaFin: '' }));
                setTempFilterOptions(prev => ({ ...prev, fechaFin: '' }));
                if (activeTab === 'excel') {
                  setDateRange(prev => ({ ...prev, to: undefined }));
                }
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
                setFilterOptions(prev => ({ ...prev, productoId: '' }));
                setTempFilterOptions(prev => ({ ...prev, productoId: '' }));
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
                setFilterOptions(prev => ({ ...prev, supervisorId: '' }));
                setTempFilterOptions(prev => ({ ...prev, supervisorId: '' }));
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
                setFilterOptions(prev => ({ ...prev, clienteId: '', subServicioId: '', subUbicacionId: '' }));
                setTempFilterOptions(prev => ({ ...prev, clienteId: '', subServicioId: '', subUbicacionId: '' }));
                if (activeTab === 'remitos') {
                  setSelectedCliente('');
                  setSelectedSubServicio('');
                  setSelectedSubUbicacion('');
                }
              }}
              className="h-4 w-4 p-0 ml-1 text-[#29696B] hover:bg-[#DFEFE6]/60"
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}

        {filterOptions.subServicioId && (
          <Badge variant="outline" className="bg-[#DFEFE6]/40 border-[#91BEAD] text-[#29696B] flex items-center gap-1">
            <span>Subservicio: {getSelectedSubServicioName()}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterOptions(prev => ({ ...prev, subServicioId: '', subUbicacionId: '' }));
                setTempFilterOptions(prev => ({ ...prev, subServicioId: '', subUbicacionId: '' }));
                if (activeTab === 'remitos') {
                  setSelectedSubServicio('');
                  setSelectedSubUbicacion('');
                }
              }}
              className="h-4 w-4 p-0 ml-1 text-[#29696B] hover:bg-[#DFEFE6]/60"
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}

        {filterOptions.subUbicacionId && (
          <Badge variant="outline" className="bg-[#DFEFE6]/40 border-[#91BEAD] text-[#29696B] flex items-center gap-1">
            <span>Ubicación: {getSelectedSubUbicacionName()}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterOptions(prev => ({ ...prev, subUbicacionId: '' }));
                setTempFilterOptions(prev => ({ ...prev, subUbicacionId: '' }));
                if (activeTab === 'remitos') {
                  setSelectedSubUbicacion('');
                }
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
    ) : null
  );

  return (
    <div className="space-y-6 bg-[#DFEFE6]/20 p-4 md:p-6 rounded-xl">
      {/* Alerts */}
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

      {/* Header con botones de acciones globales */}
      <div className="flex justify-between items-center">
        {/* Botón de filtros - Ahora compartido por todas las secciones */}
        <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2 border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/40"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filtros</span>
              {hasActiveFilters && (
                <Badge className="ml-1 bg-[#29696B] text-white">
                  {getActiveFilterCount()}
                </Badge>
              )}
            </Button>
          </DialogTrigger>
        </Dialog>

        {/* Refresh button */}
        {(loadingCacheData || (!isCacheValid('productos') || !isCacheValid('supervisores') || !isCacheValid('clientes') || !isCacheValid('pedidos'))) && (
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
        )}
      </div>

      {/* Mostrar filtros activos en todas las secciones */}
      <ActiveFiltersBar />

      {/* Componente de Dialog para filtros */}
      <FilterDialog />

      {/* Tab Navigation */}
      <div className="min-h-[60px]">
        <Tabs defaultValue="excel" value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full grid grid-cols-4 gap-1 bg-[#DFEFE6]/50 p-1 rounded-md">
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
              value="reporteMensual"
              className="h-12 sm:h-10 px-2 py-1.5 text-xs sm:text-sm data-[state=active]:bg-[#29696B] data-[state=active]:text-white flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span className="text-center sm:text-left">Reporte Mensual</span>
            </TabsTrigger>
            <TabsTrigger
              value="tabla"
              className="h-12 sm:h-10 px-2 py-1.5 text-xs sm:text-sm data-[state=active]:bg-[#29696B] data-[state=active]:text-white flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2"
            >
              <Hash className="w-4 h-4" />
              <span className="text-center sm:text-left">Tabla de Pedidos</span>
            </TabsTrigger>
          </TabsList>

          {/* Excel Tab */}
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
                        onChange={(e) => {
                          const newDate = e.target.value ? new Date(e.target.value) : undefined;
                          setDateRange(prev => ({ ...prev, from: newDate }));

                          // Actualizar también los filtros
                          if (newDate) {
                            setFilterOptions(prev => ({ ...prev, fechaInicio: e.target.value }));
                            setTempFilterOptions(prev => ({ ...prev, fechaInicio: e.target.value }));
                          } else {
                            setFilterOptions(prev => ({ ...prev, fechaInicio: '' }));
                            setTempFilterOptions(prev => ({ ...prev, fechaInicio: '' }));
                          }
                        }}
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
                        onChange={(e) => {
                          const newDate = e.target.value ? new Date(e.target.value) : undefined;
                          setDateRange(prev => ({ ...prev, to: newDate }));

                          // Actualizar también los filtros
                          if (newDate) {
                            setFilterOptions(prev => ({ ...prev, fechaFin: e.target.value }));
                            setTempFilterOptions(prev => ({ ...prev, fechaFin: e.target.value }));
                          } else {
                            setFilterOptions(prev => ({ ...prev, fechaFin: '' }));
                            setTempFilterOptions(prev => ({ ...prev, fechaFin: '' }));
                          }
                        }}
                        className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Información adicional sobre filtros activos */}
                {filterOptions.clienteId && (
                  <div className="mt-4 p-3 bg-[#DFEFE6]/30 rounded-md text-sm text-[#29696B]">
                    <p className="font-medium">Filtros adicionales activos:</p>
                    <ul className="mt-1 space-y-1 list-disc list-inside text-[#7AA79C]">
                      <li>Cliente: {getSelectedClienteName()}</li>
                      {filterOptions.subServicioId && (
                        <li>Subservicio: {getSelectedSubServicioName()}</li>
                      )}
                      {filterOptions.subUbicacionId && (
                        <li>Ubicación: {getSelectedSubUbicacionName()}</li>
                      )}
                      {filterOptions.productoId && (
                        <li>Producto: {getSelectedProductoName()}</li>
                      )}
                      {filterOptions.supervisorId && (
                        <li>Supervisor: {getSelectedSupervisorName()}</li>
                      )}
                    </ul>
                  </div>
                )}
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

          {/* Remitos Tab */}
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
                {/* Client search */}
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

                {/* Client selector */}
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
                      ) : <SelectItem value="no-clientes" disabled>
                        No hay clientes disponibles
                      </SelectItem>
                      }
                    </SelectContent>
                  </Select>
                </div>

                {/* Subservice selector */}
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
                        <SelectItem value="all">Todos los subservicios</SelectItem>
                        {getSubServicios().map((subservicio) => (
                          <SelectItem key={subservicio._id} value={subservicio._id}>
                            {subservicio.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Sublocation selector */}
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
                        <SelectItem value="all">Todas las ubicaciones</SelectItem>
                        {getSubUbicaciones().map((sububicacion) => (
                          <SelectItem key={sububicacion._id} value={sububicacion._id}>
                            {sububicacion.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Order selector */}
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
                              {`Pedido ${pedido.nPedido || pedido.numero || 'S/N'} - ${pedido.fecha ? new Date(pedido.fecha).toLocaleDateString() : 'Sin fecha'
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

                {/* Información adicional sobre otros filtros activos */}
                {(filterOptions.productoId || filterOptions.supervisorId || filterOptions.fechaInicio || filterOptions.fechaFin) && (
                  <div className="mt-4 p-3 bg-[#DFEFE6]/30 rounded-md text-sm text-[#29696B]">
                    <p className="font-medium">Filtros adicionales activos:</p>
                    <ul className="mt-1 space-y-1 list-disc list-inside text-[#7AA79C]">
                      {filterOptions.productoId && (
                        <li>Producto: {getSelectedProductoName()}</li>
                      )}
                      {filterOptions.supervisorId && (
                        <li>Supervisor: {getSelectedSupervisorName()}</li>
                      )}
                      {filterOptions.fechaInicio && (
                        <li>Desde: {new Date(filterOptions.fechaInicio).toLocaleDateString()}</li>
                      )}
                      {filterOptions.fechaFin && (
                        <li>Hasta: {new Date(filterOptions.fechaFin).toLocaleDateString()}</li>
                      )}
                    </ul>
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

          {/* Reporte Mensual Tab */}
          <TabsContent value="reporteMensual" className="mt-4 pt-4">
            <Card className="border border-[#91BEAD]/20 shadow-sm">
              <CardHeader className="bg-[#DFEFE6]/20 border-b border-[#91BEAD]/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#29696B]">Reporte Mensual</CardTitle>
                  <Calendar className="w-6 h-6 text-[#7AA79C]" />
                </div>
                <CardDescription className="text-[#7AA79C]">
                  Genera un reporte jerárquico por Cliente, Subservicio y Sububicación
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="mensual-date-from" className="text-[#29696B]">Desde</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-5 h-5" />
                      <Input
                        id="mensual-date-from"
                        type="date"
                        value={dateRange.from ? formatDate(dateRange.from) : ''}
                        onChange={(e) => {
                          const newDate = e.target.value ? new Date(e.target.value) : undefined;
                          setDateRange(prev => ({ ...prev, from: newDate }));

                          // Actualizar también los filtros
                          if (newDate) {
                            setFilterOptions(prev => ({ ...prev, fechaInicio: e.target.value }));
                            setTempFilterOptions(prev => ({ ...prev, fechaInicio: e.target.value }));
                          } else {
                            setFilterOptions(prev => ({ ...prev, fechaInicio: '' }));
                            setTempFilterOptions(prev => ({ ...prev, fechaInicio: '' }));
                          }
                        }}
                        className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="mensual-date-to" className="text-[#29696B]">Hasta</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-5 h-5" />
                      <Input
                        id="mensual-date-to"
                        type="date"
                        value={dateRange.to ? formatDate(dateRange.to) : ''}
                        onChange={(e) => {
                          const newDate = e.target.value ? new Date(e.target.value) : undefined;
                          setDateRange(prev => ({ ...prev, to: newDate }));

                          // Actualizar también los filtros
                          if (newDate) {
                            setFilterOptions(prev => ({ ...prev, fechaFin: e.target.value }));
                            setTempFilterOptions(prev => ({ ...prev, fechaFin: e.target.value }));
                          } else {
                            setFilterOptions(prev => ({ ...prev, fechaFin: '' }));
                            setTempFilterOptions(prev => ({ ...prev, fechaFin: '' }));
                          }
                        }}
                        className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Cliente selector for monthly report */}
                <div className="mt-4 space-y-2">
                  <Label className="text-[#29696B] flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Cliente (opcional)
                  </Label>
                  <Select
                    value={filterOptions.clienteId}
                    onValueChange={(value) => {
                      setFilterOptions(prev => ({ ...prev, clienteId: value }));
                      setTempFilterOptions(prev => ({ ...prev, clienteId: value }));
                    }}
                  >
                    <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
                      <SelectValue placeholder="Todos los clientes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los clientes</SelectItem>
                      {allClientes
                        .filter(cliente => cliente.activo)
                        .map((cliente) => (
                          <SelectItem key={cliente._id} value={cliente._id}>
                            {getClientName(cliente)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {filterOptions.clienteId && (
                    <div className="mt-2 p-2 bg-[#DFEFE6]/30 rounded-md text-sm text-[#7AA79C]">
                      El reporte se generará solo para el cliente seleccionado
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-[#DFEFE6]/10 border-t border-[#91BEAD]/20">
                <Button
                  onClick={handleReporteMensualDownload}
                  disabled={isLoading || !dateRange.from || !dateRange.to}
                  className="w-full bg-[#29696B] hover:bg-[#29696B]/90 text-white"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Descargar Reporte Mensual
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Orders Table Tab */}
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
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Desktop table view */}
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
                        // Loading skeleton
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

                {/* Mobile card view */}
                <div ref={mobileListRef} className="md:hidden space-y-3 p-3">
                  {/* Mobile pagination info */}
                  {!loadingPedidos && filteredPedidos.length > 0 && (
                    <div className="text-xs text-center text-[#7AA79C] py-1">
                      Mostrando {showingFromTo}
                    </div>
                  )}

                  {loadingPedidos ? (
                    // Loading skeleton for mobile
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

                  {/* Mobile pagination */}
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

                {/* Desktop pagination */}
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