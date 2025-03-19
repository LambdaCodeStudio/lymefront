import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
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
  Info,
  CheckCircle,
  XCircle,
  Clock
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
import { getAuthToken } from '@/utils/inventoryUtils';

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
  estado?: 'pendiente' | 'aprobado' | 'rechazado';
}

interface OrderForm {
  servicio: string;
  seccionDelServicio: string;
  userId: string;
  productos: OrderProduct[];
  detalle?: string;
  estado?: 'pendiente' | 'aprobado' | 'rechazado';
}

interface FilterParams {
  search?: string;
  from?: string;
  to?: string;
  supervisor?: string;
  servicio?: string;
  estado?: string;
}

const apiUrl = "http://localhost:4000/api"

// ======== FUNCIONES API ========

// Función para obtener pedidos con filtros
const fetchOrders = async (filters: FilterParams = {}) => {
  const token = getAuthToken();
  if (!token) throw new Error("No hay token de autenticación");


  // Construir URL base
  let url = `${apiUrl}/pedido`;

  // Aplicar filtros de fecha si existen
  if (filters.from && filters.to) {
    url = `${apiUrl}/pedido/fecha?fechaInicio=${encodeURIComponent(filters.from)}&fechaFin=${encodeURIComponent(filters.to)}`;
  }

  // Aplicar filtro por supervisor si existe (esto requeriría endpoint adicional en el backend)
  if (filters.supervisor && !filters.from && !filters.to) {
    url = `${apiUrl}/pedido/user/${filters.supervisor}`;
  }

  // Aplicar filtro por servicio si existe
  if (filters.servicio && !filters.from && !filters.to && !filters.supervisor) {
    url = `${apiUrl}/pedido/servicio/${encodeURIComponent(filters.servicio)}`;
  }

  // Aplicar filtro por estado si existe (requiere endpoint adicional en el backend)
  if (filters.estado && filters.estado !== 'todos' && !filters.from && !filters.to && !filters.supervisor && !filters.servicio) {
    url = `${apiUrl}/pedido/estado/${filters.estado}`;
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cache-Control': 'no-cache'
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      window.location.href = '/login';
      return [];
    }
    throw new Error(`Error al obtener pedidos: ${response.status}`);
  }

  return await response.json();
};

// Función para obtener un pedido por ID
const fetchOrderById = async (id: string) => {
  const token = getAuthToken();
  if (!token) throw new Error("No hay token de autenticación");

  const response = await fetch(`${apiUrl}/pedido/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cache-Control': 'no-cache'
    }
  });

  if (!response.ok) {
    throw new Error(`Error al obtener pedido: ${response.status}`);
  }

  return await response.json();
};

// Función para obtener usuarios (supervisores)
const fetchSupervisors = async () => {
  const token = getAuthToken();
  if (!token) throw new Error("No hay token de autenticación");

  const response = await fetch(`${apiUrl}/auth/supervisors`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cache-Control': 'no-cache'
    }
  });

  if (!response.ok) {
    throw new Error(`Error al obtener supervisores: ${response.status}`);
  }

  return await response.json();
};

// Función para obtener productos
const fetchProducts = async () => {
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
  return responseData.items || responseData;
};

// Función para obtener clientes por supervisor
const fetchClientsBySupervisor = async (supervisorId: string) => {
  const token = getAuthToken();
  if (!token) throw new Error("No hay token de autenticación");

  const response = await fetch(`${apiUrl}/cliente/user/${supervisorId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cache-Control': 'no-cache'
    }
  });

  if (!response.ok) {
    throw new Error(`Error al obtener clientes: ${response.status}`);
  }

  return await response.json();
};

// Función para crear un pedido
const createOrder = async (data: any) => {
  const token = getAuthToken();
  if (!token) throw new Error("No hay token de autenticación");

  const response = await fetch(`${apiUrl}/pedido`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.mensaje || `Error al crear pedido: ${response.status}`);
  }

  return await response.json();
};

// Función para actualizar un pedido
const updateOrder = async ({ id, data }: { id: string; data: any }) => {
  const token = getAuthToken();
  if (!token) throw new Error("No hay token de autenticación");

  const response = await fetch(`${apiUrl}/pedido/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.mensaje || `Error al actualizar pedido: ${response.status}`);
  }

  return await response.json();
};

// Función para eliminar un pedido
const deleteOrder = async (id: string) => {
  const token = getAuthToken();
  if (!token) throw new Error("No hay token de autenticación");

  const response = await fetch(`${apiUrl}/pedido/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.mensaje || `Error al eliminar pedido: ${response.status}`);
  }

  return await response.json();
};

// Función para obtener usuario actual
const fetchCurrentUser = async () => {
  const token = getAuthToken();
  if (!token) throw new Error("No hay token de autenticación");

  const response = await fetch(`${apiUrl}/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cache-Control': 'no-cache'
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      window.location.href = '/login';
      return null;
    }
    throw new Error(`Error al obtener datos del usuario: ${response.status}`);
  }

  return await response.json();
};

// Función para cambiar estado del pedido
const updateOrderStatus = async ({ id, status }: { id: string; status: string }) => {
  const token = getAuthToken();
  if (!token) throw new Error("No hay token de autenticación");

  // Obtener primero el pedido actual
  const orderResponse = await fetch(`${apiUrl}/pedido/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cache-Control': 'no-cache'
    }
  });

  if (!orderResponse.ok) {
    throw new Error(`Error al obtener pedido: ${orderResponse.status}`);
  }

  const order = await orderResponse.json();
  
  // Actualizar solo el campo estado
  const updateResponse = await fetch(`${apiUrl}/pedido/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      ...order,
      estado: status
    })
  });

  if (!updateResponse.ok) {
    const errorData = await updateResponse.json();
    throw new Error(errorData.mensaje || `Error al actualizar estado: ${updateResponse.status}`);
  }

  return await updateResponse.json();
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

// Componente para mostrar el estado del pedido
const OrderStatusBadge = ({ status, onStatusChange, orderId }) => {
  const { addNotification } = useNotification();
  const queryClient = useQueryClient();
  
  // Mutación para actualizar estado
  const statusMutation = useMutation(
    updateOrderStatus,
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['orders']);
        addNotification("Estado actualizado correctamente", "success");
      },
      onError: (error) => {
        addNotification(`Error al actualizar estado: ${error.message}`, "error");
      }
    }
  );

  // Definir colores y etiquetas según el estado
  const getStatusConfig = (status) => {
    switch(status) {
      case 'aprobado':
        return {
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: <CheckCircle className="w-3.5 h-3.5 mr-1" />,
          label: 'Aprobado'
        };
      case 'rechazado':
        return {
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: <XCircle className="w-3.5 h-3.5 mr-1" />,
          label: 'Rechazado'
        };
      default:
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          icon: <Clock className="w-3.5 h-3.5 mr-1" />,
          label: 'Pendiente'
        };
    }
  };

  const { color, icon, label } = getStatusConfig(status || 'pendiente');

  return (
    <div className="inline-block relative group">
      <Badge
        className={`${color} border px-2 py-1 text-xs font-medium flex items-center`}
      >
        {icon}
        {label}
      </Badge>
    </div>
  );
};

// ======== COMPONENTE PRINCIPAL ========

const OrdersSection = () => {
  const apiUrl = 'http://localhost:4000/api';
  const { addNotification } = useNotification();
<<<<<<< HEAD
  const queryClient = useQueryClient();
=======
  const apiUrl = 'http://179.43.118.101:3000/api'
>>>>>>> server

  // Estado para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const [statusFilter, setStatusFilter] = useState('todos');
  const [supervisorFilter, setSupervisorFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');

  // Estado UI 
  const [currentPage, setCurrentPage] = useState(1);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState({});
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Estado modales
  const [createOrderModalOpen, setCreateOrderModalOpen] = useState(false);
  const [selectProductModalOpen, setSelectProductModalOpen] = useState(false);
  const [selectSectionModalOpen, setSelectSectionModalOpen] = useState(false);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [supervisorSelectOpen, setSupervisorSelectOpen] = useState(false);

  // Estado de formulario
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [orderForm, setOrderForm] = useState({
    servicio: '',
    seccionDelServicio: '',
    userId: '',
    productos: [],
    detalle: '',
    estado: 'pendiente'
  });
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productQuantity, setProductQuantity] = useState(1);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);

  // Referencias
  const mobileListRef = useRef(null);
  const productLoadQueue = useRef(new Set());
  const isProcessingQueue = useRef(false);

  // ======== REACT QUERY HOOKS ========

  // Cargar usuario actual
  const { 
    data: currentUser,
    isLoading: isLoadingUser
  } = useQuery('currentUser', fetchCurrentUser, {
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      // Si es admin o supervisor de supervisores, cargar la lista de supervisores
      if (data?.role === 'admin' || data?.role === 'supervisor_de_supervisores') {
        queryClient.prefetchQuery('supervisors', fetchSupervisors);
      }
      
      // Actualizar ID de usuario en formulario si no hay supervisor seleccionado
      if (!selectedSupervisor) {
        setOrderForm(prev => ({
          ...prev,
          userId: data?._id || ''
        }));
      }
    }
  });

  // Determinar si el usuario actual es admin o supervisor de supervisores
  const isAdminOrSuperSupervisor = currentUser?.role === 'admin' || currentUser?.role === 'supervisor_de_supervisores';

  // Cargar supervisores
  const { 
    data: supervisors = [],
    isLoading: isLoadingSupervisors
  } = useQuery('supervisors', fetchSupervisors, {
    enabled: isAdminOrSuperSupervisor,
    refetchOnWindowFocus: false
  });

  // Cargar pedidos
  const {
    data: orders = [],
    isLoading: isLoadingOrders,
    isRefetching: isRefreshingOrders,
    refetch: refetchOrders
  } = useQuery(
    ['orders', dateFilter, statusFilter, supervisorFilter, serviceFilter],
    () => fetchOrders({
      from: dateFilter.from,
      to: dateFilter.to,
      estado: statusFilter !== 'todos' ? statusFilter : undefined,
      supervisor: supervisorFilter || undefined,
      servicio: serviceFilter || undefined
    }),
    {
      refetchOnWindowFocus: false,
      onError: (error) => {
        addNotification(`Error al cargar pedidos: ${error.message}`, "error");
      }
    }
  );

  // Cargar productos
  const {
    data: products = [],
    isLoading: isLoadingProducts
  } = useQuery('products', fetchProducts, {
    refetchOnWindowFocus: false,
    onError: (error) => {
      addNotification(`Error al cargar productos: ${error.message}`, "warning");
    }
  });

  // Cargar clientes por supervisor
  const {
    data: clients = [],
    isLoading: isLoadingClients
  } = useQuery(
    ['clients', selectedSupervisor || currentUser?._id],
    () => fetchClientsBySupervisor(selectedSupervisor || currentUser?._id),
    {
      enabled: !!selectedSupervisor || !!currentUser?._id,
      refetchOnWindowFocus: false,
      onError: (error) => {
        addNotification(`Error al cargar clientes: ${error.message}`, "warning");
      }
    }
  );

  // Mutaciones para CRUD
  const createOrderMutation = useMutation(createOrder, {
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      resetOrderForm();
      setCreateOrderModalOpen(false);
      addNotification("Pedido creado correctamente", "success");
    },
    onError: (error) => {
      addNotification(`Error al crear pedido: ${error.message}`, "error");
    }
  });

  const updateOrderMutation = useMutation(
    ({ id, data }) => updateOrder({ id, data }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['orders']);
        resetOrderForm();
        setCreateOrderModalOpen(false);
        addNotification("Pedido actualizado correctamente", "success");
      },
      onError: (error) => {
        addNotification(`Error al actualizar pedido: ${error.message}`, "error");
      }
    }
  );

  const deleteOrderMutation = useMutation(deleteOrder, {
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      setOrderToDelete(null);
      setDeleteConfirmModalOpen(false);
      addNotification("Pedido eliminado correctamente", "success");
    },
    onError: (error) => {
      addNotification(`Error al eliminar pedido: ${error.message}`, "error");
    }
  });

  // ======== EFECTOS ========

  // Efecto para cargar producto concreto
  const fetchProductById = useCallback(async (productId) => {
    try {
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
      
      // Actualizar el mapa de productos
      queryClient.setQueryData('products', (oldData) => {
        const newProducts = [...(oldData || [])];
        const existingIndex = newProducts.findIndex(p => p._id === productId);
        
        if (existingIndex >= 0) {
          newProducts[existingIndex] = product;
        } else {
          newProducts.push(product);
        }
        
        return newProducts;
      });

      return product;
    } catch (error) {
      console.error(`Error cargando producto ${productId}:`, error);
      return null;
    }
  }, [apiUrl, queryClient]);

  // Procesar cola de productos
  const processProductQueue = useCallback(async () => {
    if (isProcessingQueue.current || productLoadQueue.current.size === 0) {
      return;
    }

    isProcessingQueue.current = true;

    try {
      const batchSize = 5;
      const productIds = Array.from(productLoadQueue.current);
      productLoadQueue.current.clear();

      // Obtener productos actuales del queryClient
      const currentProducts = queryClient.getQueryData('products') || [];
      const productsMap = {};
      currentProducts.forEach(p => {
        if (p && p._id) {
          productsMap[p._id] = p;
        }
      });

      // Procesar en lotes
      for (let i = 0; i < productIds.length; i += batchSize) {
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
      if (productLoadQueue.current.size > 0) {
        setTimeout(processProductQueue, 100);
      }
    }
  }, [fetchProductById, queryClient]);

  // Precarga de productos
  const prefetchProductsFromOrders = useCallback((ordersData) => {
    if (!Array.isArray(ordersData) || ordersData.length === 0) return;

    // Obtener productos actuales
    const currentProducts = queryClient.getQueryData('products') || [];
    const productsMap = {};
    currentProducts.forEach(p => {
      if (p && p._id) {
        productsMap[p._id] = p;
      }
    });

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
  }, [queryClient, processProductQueue]);

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

  // Efecto para cargar productos de pedidos cuando se montan
  useEffect(() => {
    if (orders && orders.length > 0) {
      prefetchProductsFromOrders(orders);
    }
  }, [orders, prefetchProductsFromOrders]);

  // ======== FUNCIONES DE MANEJO ========

  // Obtener información de usuario
  const getUserInfo = useCallback((userId) => {
    // Si es un objeto con usuario y nombre
    if (typeof userId === 'object' && userId) {
      return {
        usuario: userId.usuario || "Usuario no disponible",
        name: userId.usuario || (userId.nombre
          ? `${userId.nombre} ${userId.apellido || ''}`
          : "Usuario no disponible")
      };
    }
    
    // Si es un string (ID), buscar en supervisores
    if (typeof userId === 'string') {
      // Buscar en supervisores
      const supervisorMatch = supervisors.find(s => s._id === userId);
      if (supervisorMatch) {
        return {
          usuario: supervisorMatch.usuario || "Supervisor",
          name: supervisorMatch.usuario || (supervisorMatch.nombre
            ? `${supervisorMatch.nombre} ${supervisorMatch.apellido || ''}`
            : "Supervisor")
        };
      }
      
      // Si es el usuario actual
      if (currentUser && currentUser._id === userId) {
        return {
          usuario: currentUser.usuario || "Usuario actual",
          name: currentUser.usuario || (currentUser.nombre
            ? `${currentUser.nombre} ${currentUser.apellido || ''}`
            : "Usuario actual")
        };
      }
    }
    
    // Si no se encuentra información
    return { usuario: "Usuario no disponible", name: "Usuario no disponible" };
  }, [supervisors, currentUser]);

  // Crear un nuevo pedido
  const handleCreateOrder = async () => {
    // Validaciones
    if (!orderForm.servicio) {
      addNotification("Debe seleccionar un cliente", "warning");
      return;
    }

    if (!orderForm.productos || orderForm.productos.length === 0) {
      addNotification("Debe agregar al menos un producto", "warning");
      return;
    }

    // Validar que haya un usuario asignado (supervisor seleccionado o usuario actual)
    if (!orderForm.userId) {
      addNotification("Error: No hay usuario asignado", "error");
      return;
    }

    // Preparar datos del pedido
    const orderData = {
      userId: orderForm.userId,
      servicio: orderForm.servicio,
      seccionDelServicio: orderForm.seccionDelServicio || "",
      detalle: orderForm.detalle || " ",
      productos: orderForm.productos.map(p => ({
        productoId: typeof p.productoId === 'object' && p.productoId ? p.productoId._id : p.productoId,
        cantidad: p.cantidad
      })),
      estado: orderForm.estado || 'pendiente'
    };

    // Crear pedido con mutación
    createOrderMutation.mutate(orderData);
  };

  // Actualizar un pedido existente
  const handleUpdateOrder = async () => {
    if (!currentOrderId) {
      addNotification("No se ha seleccionado un pedido para actualizar", "error");
      return;
    }

    // Preparar datos de actualización
    const updateData = {
      userId: orderForm.userId, // Ahora incluimos el userId para poder cambiar supervisor
      servicio: orderForm.servicio,
      seccionDelServicio: orderForm.seccionDelServicio || "",
      detalle: orderForm.detalle || " ",
      productos: orderForm.productos.map(p => ({
        productoId: typeof p.productoId === 'object' && p.productoId ? p.productoId._id : p.productoId,
        cantidad: p.cantidad
      })),
      estado: orderForm.estado || 'pendiente'
    };

    // Actualizar pedido con mutación
    updateOrderMutation.mutate({ id: currentOrderId, data: updateData });
  };

  // Preparar eliminar pedido
  const confirmDeleteOrder = (orderId) => {
    setOrderToDelete(orderId);
    setDeleteConfirmModalOpen(true);
  };

  // Eliminar pedido (llamada en diálogo de confirmación)
  const handleDeleteOrder = () => {
    if (!orderToDelete) return;
    deleteOrderMutation.mutate(orderToDelete);
  };

  // Preparar editar pedido
  const handleEditOrder = async (order) => {
    setCurrentOrderId(order._id);

    try {
      // Determinar userId de forma segura
      const userId = typeof order.userId === 'object' && order.userId
        ? order.userId._id
        : (typeof order.userId === 'string' ? order.userId : '');

      // Si es un pedido de supervisor y no es el usuario actual, cargar sus clientes
      if (userId && userId !== currentUser?._id && isAdminOrSuperSupervisor) {
        console.log(`Cargando clientes del supervisor ${userId} para edición`);
        setSelectedSupervisor(userId);
        
        // Forzar recarga de clientes
        queryClient.invalidateQueries(['clients', userId]);
      }

      // Preparar productos con nombres y precios
      const productos = order.productos.map(p => {
        const productId = typeof p.productoId === 'object' && p.productoId
          ? p.productoId._id
          : (typeof p.productoId === 'string' ? p.productoId : '');

        let nombre = p.nombre;
        let precio = p.precio;

        // Si es un producto poblado, extraer datos
        if (typeof p.productoId === 'object' && p.productoId) {
          nombre = nombre || p.productoId.nombre;
          precio = typeof precio === 'number' ? precio : p.productoId.precio;
        }

        // Producto desde el catálogo
        const productsData = queryClient.getQueryData('products') || [];
        const productsCatalog = {};
        productsData.forEach(prod => {
          if (prod && prod._id) productsCatalog[prod._id] = prod;
        });

        if (productId && productsCatalog[productId]) {
          nombre = nombre || productsCatalog[productId].nombre;
          precio = typeof precio === 'number' ? precio : productsCatalog[productId].precio;
        }

        return {
          productoId: productId,
          cantidad: typeof p.cantidad === 'number' ? p.cantidad : 0,
          nombre: nombre || "Producto no encontrado",
          precio: typeof precio === 'number' ? precio : 0
        };
      });

      // Actualizar formulario
      setOrderForm({
        servicio: order.servicio || '',
        seccionDelServicio: order.seccionDelServicio || '',
        userId: userId,
        productos: productos,
        detalle: order.detalle || " ",
        estado: order.estado || 'pendiente'
      });

      // Abrir modal
      setCreateOrderModalOpen(true);
    } catch (error) {
      console.error("Error preparando edición de pedido:", error);
      addNotification(`Error al preparar la edición del pedido: ${error.message}`, "error");
    }
  };

  // Seleccionar cliente
  const handleClientChange = (clientId) => {
    if (!clientId || clientId === "none") return;

    const selectedClient = clients.find(c => c._id === clientId);
    if (!selectedClient) {
      console.error(`Cliente no encontrado: ${clientId}`);
      addNotification("Cliente seleccionado no encontrado", "warning");
      return;
    }

    // Agrupar clientes por servicio
    const clientSections = {};
    clients.forEach(client => {
      if (client && client.servicio) {
        if (!clientSections[client.servicio]) {
          clientSections[client.servicio] = [];
        }
        clientSections[client.servicio].push(client);
      }
    });

    // Actualizar formulario con cliente seleccionado
    setOrderForm(prev => ({
      ...prev,
      servicio: selectedClient.servicio || '',
      seccionDelServicio: '',
      userId: selectedSupervisor || currentUser?._id || ''
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
  const handleSectionSelect = (section) => {
    setOrderForm(prev => ({
      ...prev,
      seccionDelServicio: section
    }));
    setSelectSectionModalOpen(false);
  };

  // Agregar producto al pedido
  const handleAddProduct = () => {
    if (!selectedProduct || selectedProduct === "none" || productQuantity <= 0) {
      addNotification("Seleccione un producto y una cantidad válida", "warning");
      return;
    }

    // Buscar el producto en los datos
    const productsData = queryClient.getQueryData('products') || [];
    const productsMap = {};
    productsData.forEach(p => {
      if (p && p._id) productsMap[p._id] = p;
    });

    const product = productsMap[selectedProduct];
    if (!product) {
      addNotification("Producto no encontrado", "warning");
      return;
    }

    // Verificar stock
    if (product.stock < productQuantity) {
      addNotification(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`, "warning");
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
  const handleRemoveProduct = (index) => {
    if (index < 0 || index >= orderForm.productos.length) {
      console.error(`Índice de producto inválido: ${index}`);
      return;
    }

    const productToRemove = orderForm.productos[index];
    const productId = typeof productToRemove.productoId === 'object' && productToRemove.productoId
      ? productToRemove.productoId._id
      : (typeof productToRemove.productoId === 'string' ? productToRemove.productoId : '');

    // Obtener el nombre del producto
    const productsData = queryClient.getQueryData('products') || [];
    const productsMap = {};
    productsData.forEach(p => {
      if (p && p._id) productsMap[p._id] = p;
    });

    const productName = productToRemove.nombre ||
      (productId && productsMap[productId] ? productsMap[productId].nombre : "Producto desconocido");

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
    if (isAdminOrSuperSupervisor && selectedSupervisor) {
      // Si es admin y hay un supervisor seleccionado, mantener el userId del supervisor
      setOrderForm({
        servicio: '',
        seccionDelServicio: '',
        userId: selectedSupervisor,
        productos: [],
        detalle: ' ',
        estado: 'pendiente'
      });
    } else {
      // Reseteo normal
      setOrderForm({
        servicio: '',
        seccionDelServicio: '',
        userId: currentUser?._id || '',
        productos: [],
        detalle: ' ',
        estado: 'pendiente'
      });
    }

    setCurrentOrderId(null);
    setSelectedProduct("none");
    setProductQuantity(1);
  };

  // Limpiar supervisor seleccionado
  const clearSelectedSupervisor = () => {
    if (isAdminOrSuperSupervisor) {
      setSelectedSupervisor(null);
      
      // Volver a cargar los clientes del usuario actual
      if (currentUser?._id) {
        queryClient.invalidateQueries(['clients', currentUser._id]);
      }
    }
  };

  // Calcular total de un pedido
  const calculateOrderTotal = useCallback((productos) => {
    if (!productos || !Array.isArray(productos)) return 0;

    // Obtener productos del catálogo
    const productsData = queryClient.getQueryData('products') || [];
    const productsMap = {};
    productsData.forEach(p => {
      if (p && p._id) productsMap[p._id] = p;
    });

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
  }, [queryClient]);

  // Filtrar pedidos por fecha
  const handleDateFilter = async () => {
    if (!dateFilter.from || !dateFilter.to) {
      addNotification("Seleccione ambas fechas para filtrar", "warning");
      return;
    }

    refetchOrders();
    setShowMobileFilters(false);
  };

  // Limpiar todos los filtros
  const clearAllFilters = () => {
    setSearchTerm('');
    setDateFilter({ from: '', to: '' });
    setStatusFilter('todos');
    setSupervisorFilter('');
    setServiceFilter('');
    refetchOrders();
    setShowMobileFilters(false);
    setCurrentPage(1);

    addNotification("Filtros eliminados", "info");
  };

  // Alternar vista de detalles del pedido
  const toggleOrderDetails = useCallback((orderId) => {
    setOrderDetailsOpen(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));

    // Obtener productos actuales
    const productsData = queryClient.getQueryData('products') || [];
    const productsMap = {};
    productsData.forEach(p => {
      if (p && p._id) productsMap[p._id] = p;
    });

    // Cargar productos faltantes
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
  }, [orders, queryClient, processProductQueue]);

  // Seleccionar supervisor
  const handleSupervisorSelect = async (supervisorId) => {
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
  
    // Cerrar modal de selección
    setSupervisorSelectOpen(false);
  
    // Cargar clientes del supervisor seleccionado
    try {
      await queryClient.invalidateQueries(['clients', supervisorId]);
  
      // Abrir el modal de creación después de cargar los clientes
      setCreateOrderModalOpen(true);
    } catch (error) {
      console.error("Error cargando clientes del supervisor:", error);
      addNotification("Error al cargar clientes del supervisor", "error");
    }
  };

  // Crear nuevo pedido
  const handleNewOrderClick = () => {
    resetOrderForm();

    // Si es admin o supervisor de supervisores, mostrar primero el selector de supervisor
    if (isAdminOrSuperSupervisor) {
      setSupervisorSelectOpen(true);
    } else {
      // Para usuarios normales, abrir directamente el modal de creación
      setCreateOrderModalOpen(true);
    }
  };

  // Cambiar página de la tabla
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);

    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // En móvil, scroll al inicio de la lista
    if (windowWidth < 640 && mobileListRef.current) {
      mobileListRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ======== FILTRADO Y PAGINACIÓN ========

  // Productos en un mapa para acceso rápido
  const productsMap = useMemo(() => {
    const map = {};
    products.forEach(product => {
      if (product && product._id) {
        map[product._id] = product;
      }
    });
    return map;
  }, [products]);

  // Filtrar pedidos según términos de búsqueda local
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];

    return orders.filter(order => {
      if (!searchTerm) return true;

      const searchLower = searchTerm.toLowerCase();
      const userInfo = getUserInfo(order.userId);

      return (
        (order.servicio || '').toLowerCase().includes(searchLower) ||
        String(order.nPedido || '').includes(searchTerm) ||
        (order.seccionDelServicio || '').toLowerCase().includes(searchLower) ||
        userInfo.usuario.toLowerCase().includes(searchLower) ||
        userInfo.name.toLowerCase().includes(searchLower)
      );
    });
  }, [orders, searchTerm, getUserInfo]);

  // Configuración de items por página según tamaño de pantalla
  const itemsPerPage = useMemo(() => {
    if (windowWidth < 640) return 4; // Móvil
    if (windowWidth < 1024) return 8; // Tablet
    return 12; // Desktop
  }, [windowWidth]);

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
  const isLoading = isLoadingUser || (isLoadingOrders && orders.length === 0);
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 bg-[#DFEFE6]/30 min-h-[300px] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#29696B] animate-spin mb-4" />
        <p className="text-[#29696B]">Cargando pedidos...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-[#DFEFE6]/30">
      {/* Alertas manejadas por el contexto de notificaciones */}

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
              onClick={() => refetchOrders()}
              disabled={isRefreshingOrders}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshingOrders ? 'animate-spin' : ''}`} />
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
          {/* Filtro de fechas */}
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

          {/* Filtro de estado */}
          <div>
            <Label htmlFor="estado" className="text-[#29696B]">Estado</Label>
            <Select 
              value={statusFilter} 
              onValueChange={setStatusFilter}
            >
              <SelectTrigger id="estado" className="border-[#91BEAD] focus:ring-[#29696B]/20">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="aprobado">Aprobados</SelectItem>
                <SelectItem value="rechazado">Rechazados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro de supervisor (solo para admin) */}
          {isAdminOrSuperSupervisor && (
            <div>
              <Label htmlFor="supervisor" className="text-[#29696B]">Supervisor</Label>
              <Select 
                value={supervisorFilter} 
                onValueChange={setSupervisorFilter}
              >
                <SelectTrigger id="supervisor" className="border-[#91BEAD] focus:ring-[#29696B]/20">
                  <SelectValue placeholder="Todos los supervisores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {supervisors.map(supervisor => (
                    <SelectItem key={supervisor._id} value={supervisor._id}>
                      {supervisor.usuario || (supervisor.nombre ? `${supervisor.nombre} ${supervisor.apellido || ''}` : 'Sin nombre')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleDateFilter}
            className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
          >
            <Filter className="w-4 h-4 mr-2" />
            Aplicar Filtros
          </Button>

          {(dateFilter.from || dateFilter.to || searchTerm || statusFilter !== 'todos' || supervisorFilter) && (
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
            <h3 className="font-medium text-sm text-[#29696B]">Filtros avanzados</h3>

            {/* Filtro de fechas */}
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
              
              {/* Filtro de estado */}
              <div>
                <Label htmlFor="mEstado" className="text-xs text-[#29696B]">Estado</Label>
                <Select 
                  value={statusFilter} 
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger id="mEstado" className="text-sm border-[#91BEAD] focus:ring-[#29696B]/20">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendiente">Pendientes</SelectItem>
                    <SelectItem value="aprobado">Aprobados</SelectItem>
                    <SelectItem value="rechazado">Rechazados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filtro de supervisor (solo para admin) */}
              {isAdminOrSuperSupervisor && (
                <div>
                  <Label htmlFor="mSupervisor" className="text-xs text-[#29696B]">Supervisor</Label>
                  <Select 
                    value={supervisorFilter} 
                    onValueChange={setSupervisorFilter}
                  >
                    <SelectTrigger id="mSupervisor" className="text-sm border-[#91BEAD] focus:ring-[#29696B]/20">
                      <SelectValue placeholder="Todos los supervisores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {supervisors.map(supervisor => (
                        <SelectItem key={supervisor._id} value={supervisor._id}>
                          {supervisor.usuario || (supervisor.nombre ? `${supervisor.nombre} ${supervisor.apellido || ''}` : 'Sin nombre')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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

        {/* Indicador de filtros activos */}
        {(dateFilter.from || dateFilter.to || statusFilter !== 'todos' || supervisorFilter) && (
          <div className="px-3 py-2 bg-[#DFEFE6]/50 rounded-md text-xs text-[#29696B] flex items-center justify-between border border-[#91BEAD]/20">
            <div className="flex items-center space-x-2">
              {(dateFilter.from || dateFilter.to) && (
                <span className="flex items-center">
                  <CalendarRange className="w-3 h-3 mr-1" />
                  {dateFilter.from && new Date(dateFilter.from).toLocaleDateString()}
                  {dateFilter.from && dateFilter.to && ' - '}
                  {dateFilter.to && new Date(dateFilter.to).toLocaleDateString()}
                </span>
              )}
              
              {statusFilter !== 'todos' && (
                <span className="flex items-center">
                  {statusFilter === 'pendiente' && <Clock className="w-3 h-3 mr-1 text-yellow-600" />}
                  {statusFilter === 'aprobado' && <CheckCircle className="w-3 h-3 mr-1 text-green-600" />}
                  {statusFilter === 'rechazado' && <XCircle className="w-3 h-3 mr-1 text-red-600" />}
                  {statusFilter}
                </span>
              )}
              
              {supervisorFilter && (
                <span className="flex items-center">
                  <User className="w-3 h-3 mr-1" />
                  {supervisors.find(s => s._id === supervisorFilter)?.usuario || 'Supervisor'}
                </span>
              )}
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
      {isRefreshingOrders && (
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
            {statusFilter !== 'todos' && ` con estado ${statusFilter}`}
            {supervisorFilter && " para el supervisor seleccionado"}
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
                      Estado
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
                          <div className="text-sm text-[#29696B]">
                            {getUserInfo(order.userId).usuario}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <OrderStatusBadge 
                            status={order.estado || 'pendiente'}
                            orderId={order._id}
                          />
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
                                    onClick={() => window.open(`${apiUrl}/downloads/remito/${order._id}`, '_blank')}
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
                                    disabled={updateOrderMutation.isLoading}
                                    className="text-[#29696B] hover:bg-[#DFEFE6]/30"
                                  >
                                    {updateOrderMutation.isLoading ? (
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
                                    disabled={deleteOrderMutation.isLoading}
                                    className="text-red-600 hover:bg-red-50"
                                  >
                                    {deleteOrderMutation.isLoading && orderToDelete === order._id ? (
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
                          <td colSpan={8} className="px-6 py-4 bg-[#DFEFE6]/20">
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
                                  onClick={() => window.open(`${apiUrl}/downloads/remito/${order._id}`, '_blank')}
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

            {isRefreshingOrders && filteredOrders.length === 0 ? (
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

                      {/* Estado del pedido */}
                      <div className="flex items-center">
                        {order.estado === 'aprobado' && <CheckCircle className="w-3 h-3 text-green-600 mr-1" />}
                        {order.estado === 'rechazado' && <XCircle className="w-3 h-3 text-red-600 mr-1" />}
                        {(!order.estado || order.estado === 'pendiente') && <Clock className="w-3 h-3 text-yellow-600 mr-1" />}
                        <span className={`text-[#29696B] flex items-center`}>
                          Estado: 
                          <span 
                            className={`ml-1 ${
                              order.estado === 'aprobado' 
                                ? 'text-green-600' 
                                : order.estado === 'rechazado' 
                                ? 'text-red-600' 
                                : 'text-yellow-600'
                            }`}
                          >
                            {order.estado === 'aprobado' 
                              ? 'Aprobado' 
                              : order.estado === 'rechazado' 
                              ? 'Rechazado' 
                              : 'Pendiente'
                            }
                          </span>
                        </span>
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
                              onClick={() => window.open(`${apiUrl}/downloads/remito/${order._id}`, '_blank')}
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
                    {/* Menú desplegable para cambiar estado */}
                    <Select
                      value={order.estado || 'pendiente'}
                      onValueChange={(value) => {
                        // Actualizar estado del pedido
                        queryClient.invalidateQueries(['orders']);
                        const updateData = {
                          id: order._id,
                          status: value
                        };
                        // Optimistic update
                        queryClient.setQueryData(['orders'], (oldData) => {
                          return oldData?.map(o => o._id === order._id ? {...o, estado: value} : o);
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 px-2 text-xs border-[#91BEAD] focus:ring-[#29696B]/20 w-[100px]">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente" className="text-xs">
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1 text-yellow-600" />
                            Pendiente
                          </div>
                        </SelectItem>
                        <SelectItem value="aprobado" className="text-xs">
                          <div className="flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                            Aprobado
                          </div>
                        </SelectItem>
                        <SelectItem value="rechazado" className="text-xs">
                          <div className="flex items-center">
                            <XCircle className="w-3 h-3 mr-1 text-red-600" />
                            Rechazado
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-[#29696B] hover:bg-[#DFEFE6]/30"
                      onClick={() => handleEditOrder(order)}
                      disabled={updateOrderMutation.isLoading}
                    >
                      {updateOrderMutation.isLoading ? (
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
                      disabled={deleteOrderMutation.isLoading}
                    >
                      {deleteOrderMutation.isLoading && orderToDelete === order._id ? (
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
                  ? `Nuevo Pedido (Para: ${supervisors.find(s => s._id === selectedSupervisor)?.usuario || 'Supervisor'})`
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

                    return supervisor.usuario || "Supervisor seleccionado";
                  })()}
                </span>
              </div>
            </div>
          )}

          <div className="py-4 space-y-6">
            {/* Sección para cambiar el supervisor (solo para admin y cuando está editando) */}
            {isAdminOrSuperSupervisor && currentOrderId && (
              <div>
                <h2 className="text-lg font-medium mb-4 flex items-center text-[#29696B]">
                  <User className="w-5 h-5 mr-2 text-[#7AA79C]" />
                  Supervisor Asignado
                </h2>
                
                <Select
                  value={orderForm.userId}
                  onValueChange={(value) => {
                    // Cambiar supervisor y recargar sus clientes
                    setOrderForm(prev => ({
                      ...prev,
                      userId: value,
                      servicio: '',
                      seccionDelServicio: ''
                    }));
                    setSelectedSupervisor(value);
                    queryClient.invalidateQueries(['clients', value]);
                  }}
                >
                  <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
                    <SelectValue placeholder="Seleccionar supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisors.map(supervisor => (
                      <SelectItem key={supervisor._id} value={supervisor._id}>
                        {supervisor.usuario || "Supervisor sin nombre"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sección de Cliente */}
            <div>
              <h2 className="text-lg font-medium mb-4 flex items-center text-[#29696B]">
                <Building className="w-5 h-5 mr-2 text-[#7AA79C]" />
                Selección de Cliente
              </h2>

              {isLoadingClients ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-6 h-6 text-[#29696B] animate-spin" />
                </div>
              ) : clients.length === 0 ? (
                <Alert className="bg-[#DFEFE6]/30 border border-[#91BEAD] text-[#29696B]">
                  <AlertDescription>
                    {isAdminOrSuperSupervisor && selectedSupervisor
                      ? "El supervisor seleccionado no tiene clientes asignados."
                      : "No tiene clientes asignados. Contacte a un administrador para que le asigne clientes."
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
                    >
                      <SelectTrigger id="cliente" className="border-[#91BEAD] focus:ring-[#29696B]/20">
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" disabled>Seleccione un cliente</SelectItem>
                        {Array.isArray(clients) && clients.length > 0 ? (
                          clients.map(client => (
                            <SelectItem
                              key={client._id}
                              value={client._id}
                            >
                              {client.servicio}
                              {client.seccionDelServicio ? ` - ${client.seccionDelServicio}` : ''}
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

            {/* Estado del Pedido */}
            <div>
              <h2 className="text-lg font-medium mb-4 flex items-center text-[#29696B]">
                <Clock className="w-5 h-5 mr-2 text-[#7AA79C]" />
                Estado del Pedido
              </h2>
              
              <Select
                value={orderForm.estado || 'pendiente'}
                onValueChange={(value) => setOrderForm(prev => ({ ...prev, estado: value }))}
              >
                <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-yellow-600" />
                      Pendiente
                    </div>
                  </SelectItem>
                  <SelectItem value="aprobado">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                      Aprobado
                    </div>
                  </SelectItem>
                  <SelectItem value="rechazado">
                    <div className="flex items-center">
                      <XCircle className="w-4 h-4 mr-2 text-red-600" />
                      Rechazado
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
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
                createOrderMutation.isLoading ||
                updateOrderMutation.isLoading ||
                !orderForm.productos ||
                orderForm.productos.length === 0 ||
                !orderForm.servicio
              }
              className="bg-[#29696B] hover:bg-[#29696B]/90 text-white disabled:bg-[#8DB3BA] disabled:text-white/70"
            >
              {createOrderMutation.isLoading || updateOrderMutation.isLoading ? (
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
            {isLoadingSupervisors ? (
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
                        {supervisor.usuario || "Supervisor"}
                      </span>
                    </div>
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
              {orderForm.servicio && clients
                .filter(c => c.servicio === orderForm.servicio)
                .map((client) => (
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
                  {isLoadingProducts ? (
                    <SelectItem value="loading" disabled>Cargando productos...</SelectItem>
                  ) : products.length > 0 ? (
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
        onConfirm={handleDeleteOrder}
        variant="destructive"
      />
    </div>
  );
};

export default OrdersSection;