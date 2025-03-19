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

// ======== TYPES & INTERFACES ========

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

// Updated interfaces for hierarchical structure
interface SubUbicacion {
  _id: string;
  nombre: string;
  descripcion?: string;
}

interface SubServicio {
  _id: string;
  nombre: string;
  descripcion?: string;
  supervisorId?: string | User;
  subUbicaciones: SubUbicacion[];
}

interface Client {
  _id: string;
  nombre: string;
  servicio: string;
  seccionDelServicio: string;
  userId: string | User;
  subServicios: SubServicio[];
  direccion?: string;
  telefono?: string;
  email?: string;
  activo?: boolean;
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
  precioUnitario?: number;
}

// Updated client structure in order
interface OrderClient {
  clienteId: string;
  subServicioId?: string;
  subUbicacionId?: string;
  nombreCliente: string;
  nombreSubServicio?: string;
  nombreSubUbicacion?: string;
}

interface Order {
  _id: string;
  nPedido: number;
  cliente: OrderClient;
  servicio: string; // Compatibility field
  seccionDelServicio: string; // Compatibility field
  userId: string | User;
  supervisorId?: string | User;
  fecha: string;
  productos: OrderProduct[];
  detalle?: string;
  estado?: 'pendiente' | 'aprobado' | 'rechazado';
  aprobadoPor?: string | User;
  fechaAprobacion?: string;
  observaciones?: string;
}

interface OrderForm {
  clienteId: string;
  subServicioId?: string;
  subUbicacionId?: string;
  nombreCliente: string;
  nombreSubServicio?: string;
  nombreSubUbicacion?: string;
  servicio: string; // Keep for compatibility
  seccionDelServicio: string; // Keep for compatibility
  userId: string;
  supervisorId?: string;
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
  clienteId?: string;
  subServicioId?: string;
  subUbicacionId?: string;
}

// ======== API SERVICE ========

/**
 * API Service for Orders
 * Centralizes all API calls to maintain consistent error handling and request formatting
 */
const OrdersService = {
  // API base URL
  apiUrl: 'http://localhost:3000/api',

  // Fetch orders with filters
  async fetchOrders(filters: FilterParams = {}): Promise<Order[]> {
    const token = getAuthToken();
    if (!token) throw new Error("No authentication token");

    // Build base URL
    let url = `${this.apiUrl}/pedido`;
    let queryParams = new URLSearchParams();

    // Apply date filters
    if (filters.from && filters.to) {
      queryParams.append('fechaInicio', filters.from);
      queryParams.append('fechaFin', filters.to);
      url = `${this.apiUrl}/pedido/fecha?${queryParams.toString()}`;
    }
    // Filter by supervisor
    else if (filters.supervisor) {
      url = `${this.apiUrl}/pedido/supervisor/${filters.supervisor}`;
    }
    // Filter by client
    else if (filters.clienteId) {
      url = `${this.apiUrl}/pedido/cliente/${filters.clienteId}`;
      
      // Add subServicioId if exists
      if (filters.subServicioId) {
        queryParams.append('subServicioId', filters.subServicioId);
        
        // Add subUbicacionId if exists
        if (filters.subUbicacionId) {
          queryParams.append('subUbicacionId', filters.subUbicacionId);
        }
        
        // Add parameters to URL
        if (queryParams.toString()) {
          url += `?${queryParams.toString()}`;
        }
      }
    }
    // Filter by service (compatibility)
    else if (filters.servicio) {
      url = `${this.apiUrl}/pedido/servicio/${encodeURIComponent(filters.servicio)}`;
    }
    // Filter by status
    else if (filters.estado && filters.estado !== 'todos') {
      url = `${this.apiUrl}/pedido/estado/${filters.estado}`;
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
      throw new Error(`Error fetching orders: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch order by ID
  async fetchOrderById(id: string): Promise<Order> {
    const token = getAuthToken();
    if (!token) throw new Error("No authentication token");

    const response = await fetch(`${this.apiUrl}/pedido/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching order: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch supervisors
  async fetchSupervisors(): Promise<User[]> {
    const token = getAuthToken();
    if (!token) throw new Error("No authentication token");

    const response = await fetch(`${this.apiUrl}/auth/supervisors`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching supervisors: ${response.status}`);
    }

    const result = await response.json();
    return result.supervisors || [];
  },

  // Fetch products
  async fetchProducts(): Promise<Product[]> {
    const token = getAuthToken();
    if (!token) throw new Error("No authentication token");

    const response = await fetch(`${this.apiUrl}/producto`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching products: ${response.status}`);
    }

    const responseData = await response.json();
    return responseData.items || responseData;
  },

  // Fetch single product by ID
  async fetchProductById(productId: string): Promise<Product | null> {
    const token = getAuthToken();
    if (!token) throw new Error("No authentication token");

    const response = await fetch(`${this.apiUrl}/producto/${productId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching product: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch all clients
  async fetchClients(): Promise<Client[]> {
    const token = getAuthToken();
    if (!token) throw new Error("No authentication token");

    const response = await fetch(`${this.apiUrl}/cliente`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching clients: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch clients by supervisor
  async fetchClientsBySupervisor(supervisorId: string): Promise<Client[]> {
    const token = getAuthToken();
    if (!token) throw new Error("No authentication token");

    const response = await fetch(`${this.apiUrl}/cliente/user/${supervisorId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching clients: ${response.status}`);
    }

    return await response.json();
  },

  // Create order
  async createOrder(data: any): Promise<Order> {
    const token = getAuthToken();
    if (!token) throw new Error("No authentication token");

    // Create complete structure for backend
    const orderData = {
      // User information
      userId: data.userId,
      supervisorId: data.supervisorId,
      
      // Hierarchical client structure
      cliente: {
        clienteId: data.clienteId,
        subServicioId: data.subServicioId || undefined,
        subUbicacionId: data.subUbicacionId || undefined,
        nombreCliente: data.nombreCliente,
        nombreSubServicio: data.nombreSubServicio || undefined,
        nombreSubUbicacion: data.nombreSubUbicacion || undefined
      },
      
      // Compatibility fields
      servicio: data.servicio,
      seccionDelServicio: data.seccionDelServicio || "",
      
      // Products and details
      productos: data.productos.map(p => ({
        productoId: typeof p.productoId === 'object' && p.productoId ? p.productoId._id : p.productoId,
        cantidad: p.cantidad,
        precioUnitario: p.precio || p.precioUnitario // Send current price
      })),
      
      detalle: data.detalle || "",
      estado: data.estado || 'pendiente'
    };

    const response = await fetch(`${this.apiUrl}/pedido`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.mensaje || `Error creating order: ${response.status}`);
    }

    return await response.json();
  },

  // Update order
  async updateOrder(id: string, data: any): Promise<Order> {
    const token = getAuthToken();
    if (!token) throw new Error("No authentication token");

    // Create complete structure for backend (similar to createOrder)
    const orderData = {
      // User information
      userId: data.userId,
      supervisorId: data.supervisorId,
      
      // Hierarchical client structure
      cliente: {
        clienteId: data.clienteId,
        subServicioId: data.subServicioId || undefined,
        subUbicacionId: data.subUbicacionId || undefined,
        nombreCliente: data.nombreCliente,
        nombreSubServicio: data.nombreSubServicio || undefined,
        nombreSubUbicacion: data.nombreSubUbicacion || undefined
      },
      
      // Compatibility fields
      servicio: data.servicio,
      seccionDelServicio: data.seccionDelServicio || "",
      
      // Products and details
      productos: data.productos.map(p => ({
        productoId: typeof p.productoId === 'object' && p.productoId ? p.productoId._id : p.productoId,
        cantidad: p.cantidad,
        precioUnitario: p.precio || p.precioUnitario
      })),
      
      detalle: data.detalle || "",
      estado: data.estado || 'pendiente'
    };

    const response = await fetch(`${this.apiUrl}/pedido/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.mensaje || `Error updating order: ${response.status}`);
    }

    return await response.json();
  },

  // Delete order
  async deleteOrder(id: string): Promise<any> {
    const token = getAuthToken();
    if (!token) throw new Error("No authentication token");

    const response = await fetch(`${this.apiUrl}/pedido/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.mensaje || `Error deleting order: ${response.status}`);
    }

    return await response.json();
  },

  // Fetch current user
  async fetchCurrentUser(): Promise<User> {
    const token = getAuthToken();
    if (!token) throw new Error("No authentication token");

    const response = await fetch(`${this.apiUrl}/auth/me`, {
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
      throw new Error(`Error fetching user data: ${response.status}`);
    }

    const result = await response.json();
    return result.user;
  },

  // Update order status
  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const token = getAuthToken();
    if (!token) throw new Error("No authentication token");

    // First get the current order
    const orderResponse = await fetch(`${this.apiUrl}/pedido/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });

    if (!orderResponse.ok) {
      throw new Error(`Error fetching order: ${orderResponse.status}`);
    }

    const order = await orderResponse.json();
    
    // Update only the status field
    const updateResponse = await fetch(`${this.apiUrl}/pedido/${id}`, {
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
      throw new Error(errorData.mensaje || `Error updating status: ${updateResponse.status}`);
    }

    return await updateResponse.json();
  },

  // Download receipt
  async downloadReceipt(id: string): Promise<void> {
    const token = getAuthToken();
    if (!token) throw new Error("No authentication token");

    // Create request to get receipt with authentication token
    const response = await fetch(`${this.apiUrl}/downloads/remito/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error downloading receipt: ${response.status}`);
    }

    // Get the blob (PDF file)
    const blob = await response.blob();
    
    // Create a temporary URL for the blob
    const url = window.URL.createObjectURL(blob);
    
    // Create a temporary <a> element for download
    const link = document.createElement('a');
    link.href = url;
    link.download = `remito_${id}.pdf`;
    
    // Temporarily add to DOM and click
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  }
};

// ======== HELPER COMPONENTS ========

// Loading skeleton for orders
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

// Component for product details in an order
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
    nombre: "Loading...",
    precio: 0,
    loaded: false
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    const fetchProductDetails = async () => {
      // Extract product ID safely
      const productId = typeof item.productoId === 'object' && item.productoId
        ? item.productoId._id
        : (typeof item.productoId === 'string' ? item.productoId : '');

      if (!productId) {
        if (mountedRef.current) {
          setProductDetail({
            nombre: "Invalid product ID",
            precio: 0,
            loaded: true
          });
        }
        return;
      }

      // If we already have information directly in the item
      if (item.nombre && (typeof item.precio === 'number' || typeof item.precioUnitario === 'number')) {
        if (mountedRef.current) {
          setProductDetail({
            nombre: item.nombre,
            precio: item.precio || item.precioUnitario || 0,
            loaded: true
          });
        }
        return;
      }

      // If the product is in the products map
      if (productsMap[productId]) {
        if (mountedRef.current) {
          setProductDetail({
            nombre: productsMap[productId].nombre,
            precio: item.precioUnitario || productsMap[productId].precio,
            loaded: true
          });
        }
        return;
      }

      // If we don't have it, load from server
      try {
        const product = await onProductLoad(productId);
        if (mountedRef.current && product) {
          setProductDetail({
            nombre: product.nombre,
            precio: item.precioUnitario || product.precio,
            loaded: true
          });
        } else if (mountedRef.current) {
          setProductDetail({
            nombre: "Product not found",
            precio: 0,
            loaded: true
          });
        }
      } catch (error) {
        console.error("Error loading product details:", error);
        if (mountedRef.current) {
          setProductDetail({
            nombre: "Error loading",
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

// Component for product details in mobile view
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
    nombre: "Loading...",
    precio: 0,
    loaded: false
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    const fetchProductDetails = async () => {
      // Extract product ID safely
      const productId = typeof item.productoId === 'object' && item.productoId
        ? item.productoId._id
        : (typeof item.productoId === 'string' ? item.productoId : '');

      if (!productId) {
        if (mountedRef.current) {
          setProductDetail({
            nombre: "Invalid product ID",
            precio: 0,
            loaded: true
          });
        }
        return;
      }

      // If we already have information directly in the item
      if (item.nombre && (typeof item.precio === 'number' || typeof item.precioUnitario === 'number')) {
        if (mountedRef.current) {
          setProductDetail({
            nombre: item.nombre,
            precio: item.precio || item.precioUnitario || 0,
            loaded: true
          });
        }
        return;
      }

      // If the product is in the products map
      if (productsMap[productId]) {
        if (mountedRef.current) {
          setProductDetail({
            nombre: productsMap[productId].nombre,
            precio: item.precioUnitario || productsMap[productId].precio,
            loaded: true
          });
        }
        return;
      }

      // If we don't have it, load from server
      try {
        const product = await onProductLoad(productId);
        if (mountedRef.current && product) {
          setProductDetail({
            nombre: product.nombre,
            precio: item.precioUnitario || product.precio,
            loaded: true
          });
        } else if (mountedRef.current) {
          setProductDetail({
            nombre: "Product not found",
            precio: 0,
            loaded: true
          });
        }
      } catch (error) {
        console.error("Error loading product details:", error);
        if (mountedRef.current) {
          setProductDetail({
            nombre: "Error loading",
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

// Component to calculate order total
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

      // First calculate with the data we already have
      for (const item of order.productos) {
        const productId = typeof item.productoId === 'object' && item.productoId
          ? item.productoId._id
          : (typeof item.productoId === 'string' ? item.productoId : '');

        if (!productId) continue;

        // If the item already has price or unit price, use it
        if (typeof item.precio === 'number' || typeof item.precioUnitario === 'number') {
          sum += (item.precio || item.precioUnitario || 0) * (typeof item.cantidad === 'number' ? item.cantidad : 0);
          continue;
        }

        // If the product is in the map, use its price
        if (productsMap[productId]) {
          sum += productsMap[productId].precio * (typeof item.cantidad === 'number' ? item.cantidad : 0);
          continue;
        }

        // If we don't have the price, add to pending
        pendingProducts.push(productId);
      }

      // If there are pending products, load them
      if (pendingProducts.length > 0) {
        // Load in parallel, but with a limit of 5 at a time
        const batchSize = 5;
        for (let i = 0; i < pendingProducts.length; i += batchSize) {
          const batch = pendingProducts.slice(i, i + batchSize);
          const productPromises = batch.map(id => onProductLoad(id));

          try {
            const products = await Promise.all(productPromises);

            // Update sum with loaded products
            for (let j = 0; j < products.length; j++) {
              const product = products[j];
              const productId = batch[j];

              if (product) {
                // Find the corresponding item
                const item = order.productos.find(p => {
                  const itemId = typeof p.productoId === 'object' && p.productoId
                    ? p.productoId._id
                    : (typeof p.productoId === 'string' ? p.productoId : '');
                  return itemId === productId;
                });

                if (item) {
                  // Use the product's unit price if it exists, or the catalog price
                  const precio = item.precioUnitario || product.precio;
                  sum += precio * (typeof item.cantidad === 'number' ? item.cantidad : 0);
                }
              }
            }
          } catch (error) {
            console.error("Error loading products for calculation:", error);
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

// Component to display order status
const OrderStatusBadge = ({ status, onStatusChange, orderId }) => {
  // Define colors and labels based on status
  const getStatusConfig = (status) => {
    switch(status) {
      case 'aprobado':
        return {
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: <CheckCircle className="w-3.5 h-3.5 mr-1" />,
          label: 'Approved'
        };
      case 'rechazado':
        return {
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: <XCircle className="w-3.5 h-3.5 mr-1" />,
          label: 'Rejected'
        };
      default:
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          icon: <Clock className="w-3.5 h-3.5 mr-1" />,
          label: 'Pending'
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

// ======== MAIN COMPONENT ========

const OrdersSection = () => {
  const { addNotification } = useNotification();
  const queryClient = useQueryClient();

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const [statusFilter, setStatusFilter] = useState('todos');
  const [supervisorFilter, setSupervisorFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [clientFilter, setClientFilter] = useState<{
    clienteId?: string;
    subServicioId?: string;
    subUbicacionId?: string;
  }>({});

  // UI state
  const [currentPage, setCurrentPage] = useState(1);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState({});
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Modal state
  const [createOrderModalOpen, setCreateOrderModalOpen] = useState(false);
  const [selectProductModalOpen, setSelectProductModalOpen] = useState(false);
  const [selectClientModalOpen, setSelectClientModalOpen] = useState(false);
  const [selectSubServiceModalOpen, setSelectSubServiceModalOpen] = useState(false);
  const [selectSubLocationModalOpen, setSelectSubLocationModalOpen] = useState(false);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [supervisorSelectOpen, setSupervisorSelectOpen] = useState(false);

  // Form state
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [orderForm, setOrderForm] = useState<OrderForm>({
    clienteId: '',
    nombreCliente: '',
    servicio: '',
    seccionDelServicio: '',
    userId: '',
    productos: [],
    detalle: ''
  });
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productQuantity, setProductQuantity] = useState(1);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedSubService, setSelectedSubService] = useState<SubServicio | null>(null);
  const [selectedSubLocation, setSelectedSubLocation] = useState<SubUbicacion | null>(null);

  // References
  const mobileListRef = useRef(null);
  const productLoadQueue = useRef(new Set());
  const isProcessingQueue = useRef(false);

  // ======== REACT QUERY HOOKS ========

  // Load current user
  const { 
    data: currentUser,
    isLoading: isLoadingUser
  } = useQuery('currentUser', OrdersService.fetchCurrentUser, {
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      // If admin or supervisor of supervisors, load supervisors list
      if (data?.role === 'admin' || data?.role === 'supervisor_de_supervisores') {
        queryClient.prefetchQuery('supervisors', OrdersService.fetchSupervisors);
      }
      
      // Update user ID in form if no supervisor selected
      if (!selectedSupervisor) {
        setOrderForm(prev => ({
          ...prev,
          userId: data?._id || ''
        }));
      }
    }
  });

  // Determine if current user is admin or supervisor of supervisors
  const isAdminOrSuperSupervisor = currentUser?.role === 'admin' || currentUser?.role === 'supervisor_de_supervisores';

  // Load supervisors
  const { 
    data: supervisors = [],
    isLoading: isLoadingSupervisors
  } = useQuery('supervisors', OrdersService.fetchSupervisors, {
    enabled: isAdminOrSuperSupervisor,
    refetchOnWindowFocus: false
  });

  // Load orders
  const {
    data: orders = [],
    isLoading: isLoadingOrders,
    isRefetching: isRefreshingOrders,
    refetch: refetchOrders
  } = useQuery(
    ['orders', dateFilter, statusFilter, supervisorFilter, serviceFilter, clientFilter],
    () => OrdersService.fetchOrders({
      from: dateFilter.from,
      to: dateFilter.to,
      estado: statusFilter !== 'todos' ? statusFilter : undefined,
      supervisor: supervisorFilter || undefined,
      servicio: serviceFilter || undefined,
      clienteId: clientFilter.clienteId,
      subServicioId: clientFilter.subServicioId,
      subUbicacionId: clientFilter.subUbicacionId
    }),
    {
      refetchOnWindowFocus: false,
      onError: (error) => {
        addNotification(`Error loading orders: ${error.message}`, "error");
      }
    }
  );

  // Load products
  const {
    data: products = [],
    isLoading: isLoadingProducts
  } = useQuery('products', OrdersService.fetchProducts, {
    refetchOnWindowFocus: false,
    onError: (error) => {
      addNotification(`Error loading products: ${error.message}`, "warning");
    }
  });

  // Load all clients
  const {
    data: allClients = [],
    isLoading: isLoadingAllClients
  } = useQuery('allClients', OrdersService.fetchClients, {
    refetchOnWindowFocus: false,
    onError: (error) => {
      addNotification(`Error loading all clients: ${error.message}`, "warning");
    }
  });

  // Load clients by supervisor
  const {
    data: clients = [],
    isLoading: isLoadingClients
  } = useQuery(
    ['clients', selectedSupervisor || currentUser?._id],
    () => OrdersService.fetchClientsBySupervisor(selectedSupervisor || currentUser?._id),
    {
      enabled: !!selectedSupervisor || !!currentUser?._id,
      refetchOnWindowFocus: false,
      onError: (error) => {
        addNotification(`Error loading clients: ${error.message}`, "warning");
      }
    }
  );

  // CRUD Mutations
  const createOrderMutation = useMutation(OrdersService.createOrder, {
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      resetOrderForm();
      setCreateOrderModalOpen(false);
      addNotification("Order created successfully", "success");
    },
    onError: (error) => {
      addNotification(`Error creating order: ${error.message}`, "error");
    }
  });

  const updateOrderMutation = useMutation(
    ({ id, data }) => OrdersService.updateOrder(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['orders']);
        resetOrderForm();
        setCreateOrderModalOpen(false);
        addNotification("Order updated successfully", "success");
      },
      onError: (error) => {
        addNotification(`Error updating order: ${error.message}`, "error");
      }
    }
  );

  const deleteOrderMutation = useMutation(OrdersService.deleteOrder, {
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      setOrderToDelete(null);
      setDeleteConfirmModalOpen(false);
      addNotification("Order deleted successfully", "success");
    },
    onError: (error) => {
      addNotification(`Error deleting order: ${error.message}`, "error");
    }
  });

  const downloadReceiptMutation = useMutation(OrdersService.downloadReceipt, {
    onSuccess: () => {
      addNotification("Download started", "success");
    },
    onError: (error) => {
      addNotification(`Error downloading receipt: ${error.message}`, "error");
    }
  });

  // ======== EFFECTS ========

  // Effect to load specific product
  const fetchProductById = useCallback(async (productId) => {
    try {
      const product = await OrdersService.fetchProductById(productId);
      
      // Update products map
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
      console.error(`Error loading product ${productId}:`, error);
      return null;
    }
  }, [queryClient]);

  // Process product queue
  const processProductQueue = useCallback(async () => {
    if (isProcessingQueue.current || productLoadQueue.current.size === 0) {
      return;
    }

    isProcessingQueue.current = true;

    try {
      const batchSize = 5;
      const productIds = Array.from(productLoadQueue.current);
      productLoadQueue.current.clear();

      // Get current products from queryClient
      const currentProducts = queryClient.getQueryData('products') || [];
      const productsMap = {};
      currentProducts.forEach(p => {
        if (p && p._id) {
          productsMap[p._id] = p;
        }
      });

      // Process in batches
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        const filteredBatch = batch.filter(id => !productsMap[id]);

        if (filteredBatch.length === 0) continue;

        // Load products in parallel
        const productsPromises = filteredBatch.map(id => fetchProductById(id));
        await Promise.all(productsPromises);
      }
    } catch (error) {
      console.error("Error processing product queue:", error);
    } finally {
      isProcessingQueue.current = false;

      // If there are products left in the queue, process them
      if (productLoadQueue.current.size > 0) {
        setTimeout(processProductQueue, 100);
      }
    }
  }, [fetchProductById, queryClient]);

  // Prefetch products from orders
  const prefetchProductsFromOrders = useCallback((ordersData) => {
    if (!Array.isArray(ordersData) || ordersData.length === 0) return;

    // Get current products
    const currentProducts = queryClient.getQueryData('products') || [];
    const productsMap = {};
    currentProducts.forEach(p => {
      if (p && p._id) {
        productsMap[p._id] = p;
      }
    });

    // Limit to first 20 orders to avoid overloading
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

  // Effect to detect window size changes
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Effect to load products from orders when mounted
  useEffect(() => {
    if (orders && orders.length > 0) {
      prefetchProductsFromOrders(orders);
    }
  }, [orders, prefetchProductsFromOrders]);

  // ======== HANDLER FUNCTIONS ========

  // Get user information
  const getUserInfo = useCallback((userId) => {
    // If it's an object with username and name
    if (typeof userId === 'object' && userId) {
      return {
        usuario: userId.usuario || "User not available",
        name: userId.usuario || (userId.nombre
          ? `${userId.nombre} ${userId.apellido || ''}`
          : "User not available")
      };
    }
    
    // If it's a string (ID), look it up in supervisors
    if (typeof userId === 'string') {
      // Look in supervisors
      const supervisorMatch = supervisors.find(s => s._id === userId);
      if (supervisorMatch) {
        return {
          usuario: supervisorMatch.usuario || "Supervisor",
          name: supervisorMatch.usuario || (supervisorMatch.nombre
            ? `${supervisorMatch.nombre} ${supervisorMatch.apellido || ''}`
            : "Supervisor")
        };
      }
      
      // If it's the current user
      if (currentUser && currentUser._id === userId) {
        return {
          usuario: currentUser.usuario || "Current user",
          name: currentUser.usuario || (currentUser.nombre
            ? `${currentUser.nombre} ${currentUser.apellido || ''}`
            : "Current user")
        };
      }
    }
    
    // If no information is found
    return { usuario: "User not available", name: "User not available" };
  }, [supervisors, currentUser]);

  // Create a new order
  const handleCreateOrder = async () => {
    // Validate basic structure
    if (!orderForm.clienteId || !orderForm.nombreCliente) {
      addNotification("You must select a client", "warning");
      return;
    }

    if (!orderForm.productos || orderForm.productos.length === 0) {
      addNotification("You must add at least one product", "warning");
      return;
    }

    // Validate that there is an assigned user (selected supervisor or current user)
    if (!orderForm.userId) {
      addNotification("Error: No user assigned", "error");
      return;
    }

    // Create order with mutation
    createOrderMutation.mutate(orderForm);
  };

  // Update an existing order
  const handleUpdateOrder = async () => {
    if (!currentOrderId) {
      addNotification("No order selected for update", "error");
      return;
    }

    // Update order with mutation
    updateOrderMutation.mutate({ id: currentOrderId, data: orderForm });
  };

  // Prepare to delete order
  const confirmDeleteOrder = (orderId) => {
    setOrderToDelete(orderId);
    setDeleteConfirmModalOpen(true);
  };

  // Delete order
  const handleDeleteOrder = () => {
    if (!orderToDelete) return;
    deleteOrderMutation.mutate(orderToDelete);
  };

  // Prepare to edit order
  const handleEditOrder = async (order) => {
    setCurrentOrderId(order._id);

    try {
      // Determine userId safely
      const userId = typeof order.userId === 'object' && order.userId
        ? order.userId._id
        : (typeof order.userId === 'string' ? order.userId : '');

      // If it's a supervisor's order and not the current user, load their clients
      if (userId && userId !== currentUser?._id && isAdminOrSuperSupervisor) {
        console.log(`Loading clients for supervisor ${userId} for editing`);
        setSelectedSupervisor(userId);
        
        // Force reload clients
        queryClient.invalidateQueries(['clients', userId]);
      }

      // Prepare products with names and prices
      const productos = order.productos.map(p => {
        const productId = typeof p.productoId === 'object' && p.productoId
          ? p.productoId._id
          : (typeof p.productoId === 'string' ? p.productoId : '');

        let nombre = p.nombre;
        let precio = p.precio || p.precioUnitario;

        // If it's a populated product, extract data
        if (typeof p.productoId === 'object' && p.productoId) {
          nombre = nombre || p.productoId.nombre;
          precio = typeof precio === 'number' ? precio : p.productoId.precio;
        }

        // Product from catalog
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
          nombre: nombre || "Product not found",
          precio: typeof precio === 'number' ? precio : 0
        };
      });

      // Find current client
      let clienteData = null;
      let subServicioData = null;
      let subUbicacionData = null;

      // If it has complete hierarchical structure
      if (order.cliente && order.cliente.clienteId) {
        // Find the client in the complete list
        const clienteObject = typeof order.cliente.clienteId === 'string' 
          ? allClients.find(c => c._id === order.cliente.clienteId)
          : order.cliente.clienteId;
          
        clienteData = clienteObject || null;
        
        // Find the subservice if it exists
        if (clienteData && order.cliente.subServicioId) {
          const subServicioId = typeof order.cliente.subServicioId === 'string' 
            ? order.cliente.subServicioId 
            : order.cliente.subServicioId._id;
            
          subServicioData = clienteData.subServicios?.find(ss => ss._id === subServicioId) || null;
          
          // Find the sublocation if it exists
          if (subServicioData && order.cliente.subUbicacionId) {
            const subUbicacionId = typeof order.cliente.subUbicacionId === 'string' 
              ? order.cliente.subUbicacionId 
              : order.cliente.subUbicacionId._id;
              
            subUbicacionData = subServicioData.subUbicaciones?.find(su => su._id === subUbicacionId) || null;
          }
        }
      }

      // Update form with complete structure
      setOrderForm({
        // Hierarchical client
        clienteId: order.cliente?.clienteId?._id || order.cliente?.clienteId || '',
        subServicioId: order.cliente?.subServicioId?._id || order.cliente?.subServicioId || undefined,
        subUbicacionId: order.cliente?.subUbicacionId?._id || order.cliente?.subUbicacionId || undefined,
        nombreCliente: order.cliente?.nombreCliente || order.servicio || '',
        nombreSubServicio: order.cliente?.nombreSubServicio || order.seccionDelServicio || undefined,
        nombreSubUbicacion: order.cliente?.nombreSubUbicacion || undefined,
        
        // Compatibility fields
        servicio: order.servicio || '',
        seccionDelServicio: order.seccionDelServicio || '',
        
        // User information
        userId: userId,
        supervisorId: typeof order.supervisorId === 'object' ? order.supervisorId._id : order.supervisorId,
        
        // Products and status
        productos: productos,
        detalle: order.detalle || " ",
        estado: order.estado || 'pendiente'
      });

      // Update selections
      setSelectedClient(clienteData);
      setSelectedSubService(subServicioData);
      setSelectedSubLocation(subUbicacionData);

      // Open modal
      setCreateOrderModalOpen(true);
    } catch (error) {
      console.error("Error preparing order for editing:", error);
      addNotification(`Error preparing the order for editing: ${error.message}`, "error");
    }
  };

  // Select client
  const handleClientSelect = (client) => {
    if (!client) return;

    // Update selected client state
    setSelectedClient(client);
    setSelectedSubService(null);
    setSelectedSubLocation(null);

    // Update form
    setOrderForm(prev => ({
      ...prev,
      clienteId: client._id,
      nombreCliente: client.nombre,
      servicio: client.servicio || client.nombre,
      seccionDelServicio: '',
      subServicioId: undefined,
      nombreSubServicio: undefined,
      subUbicacionId: undefined,
      nombreSubUbicacion: undefined
    }));

    // If there are subservices, show modal to select
    if (client.subServicios && client.subServicios.length > 0) {
      setSelectSubServiceModalOpen(true);
    } else {
      // If no subservices, close current modal
      setSelectClientModalOpen(false);
    }
  };

  // Select subservice
  const handleSubServiceSelect = (subService) => {
    if (!subService) return;

    // Update selected subservice state
    setSelectedSubService(subService);
    setSelectedSubLocation(null);

    // Update form
    setOrderForm(prev => ({
      ...prev,
      subServicioId: subService._id,
      nombreSubServicio: subService.nombre,
      seccionDelServicio: subService.nombre, // For compatibility
      subUbicacionId: undefined,
      nombreSubUbicacion: undefined
    }));

    // If there are sublocations, show modal to select
    if (subService.subUbicaciones && subService.subUbicaciones.length > 0) {
      setSelectSubLocationModalOpen(true);
      setSelectSubServiceModalOpen(false);
    } else {
      // If no sublocations, close modals
      setSelectSubServiceModalOpen(false);
      setSelectClientModalOpen(false);
    }
  };

  // Select sublocation
  const handleSubLocationSelect = (subLocation) => {
    if (!subLocation) return;

    // Update selected sublocation state
    setSelectedSubLocation(subLocation);

    // Update form
    setOrderForm(prev => ({
      ...prev,
      subUbicacionId: subLocation._id,
      nombreSubUbicacion: subLocation.nombre
    }));

    // Close modals
    setSelectSubLocationModalOpen(false);
    setSelectClientModalOpen(false);
  };

  // Add product to order
  const handleAddProduct = () => {
    if (!selectedProduct || selectedProduct === "none" || productQuantity <= 0) {
      addNotification("Select a product and a valid quantity", "warning");
      return;
    }

    // Find product in data
    const productsData = queryClient.getQueryData('products') || [];
    const productsMap = {};
    productsData.forEach(p => {
      if (p && p._id) productsMap[p._id] = p;
    });

    const product = productsMap[selectedProduct];
    if (!product) {
      addNotification("Product not found", "warning");
      return;
    }

    // Check stock
    if (product.stock < productQuantity) {
      addNotification(`Insufficient stock. Only ${product.stock} units available.`, "warning");
      return;
    }

    // Check if product is already in order
    const existingIndex = orderForm.productos.findIndex(p => {
      const id = typeof p.productoId === 'object' && p.productoId ? p.productoId._id : p.productoId;
      return id === selectedProduct;
    });

    if (existingIndex >= 0) {
      // Update quantity
      const newQuantity = orderForm.productos[existingIndex].cantidad + productQuantity;

      // Check stock for total quantity
      if (product.stock < newQuantity) {
        addNotification(`Insufficient stock. Only ${product.stock} units available.`, "warning");
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

      addNotification(`Quantity updated: ${product.nombre} (${newQuantity})`, "success");
    } else {
      // Add new product
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

      addNotification(`Product added: ${product.nombre} (${productQuantity})`, "success");
    }

    // Reset selection
    setSelectedProduct("none");
    setProductQuantity(1);
    setSelectProductModalOpen(false);
  };

  // Remove product from order
  const handleRemoveProduct = (index) => {
    if (index < 0 || index >= orderForm.productos.length) {
      console.error(`Invalid product index: ${index}`);
      return;
    }

    const productToRemove = orderForm.productos[index];
    const productId = typeof productToRemove.productoId === 'object' && productToRemove.productoId
      ? productToRemove.productoId._id
      : (typeof productToRemove.productoId === 'string' ? productToRemove.productoId : '');

    // Get product name
    const productsData = queryClient.getQueryData('products') || [];
    const productsMap = {};
    productsData.forEach(p => {
      if (p && p._id) productsMap[p._id] = p;
    });

    const productName = productToRemove.nombre ||
      (productId && productsMap[productId] ? productsMap[productId].nombre : "Unknown product");

    const updatedProducts = [...orderForm.productos];
    updatedProducts.splice(index, 1);

    setOrderForm(prev => ({
      ...prev,
      productos: updatedProducts
    }));

    addNotification(`Product removed: ${productName}`, "info");
  };

  // Reset order form
  const resetOrderForm = () => {
    setOrderForm({
      clienteId: '',
      nombreCliente: '',
      servicio: '',
      seccionDelServicio: '',
      userId: currentUser?._id || '',
      supervisorId: selectedSupervisor || undefined,
      productos: [],
      detalle: ''
    });

    setCurrentOrderId(null);
    setSelectedProduct("none");
    setProductQuantity(1);
    setSelectedClient(null);
    setSelectedSubService(null);
    setSelectedSubLocation(null);
  };

  // Clear selected supervisor
  const clearSelectedSupervisor = () => {
    if (isAdminOrSuperSupervisor) {
      setSelectedSupervisor(null);
      
      // Reload clients for current user
      if (currentUser?._id) {
        queryClient.invalidateQueries(['clients', currentUser._id]);
      }
    }
  };

  // Calculate order total
  const calculateOrderTotal = useCallback((productos) => {
    if (!productos || !Array.isArray(productos)) return 0;

    // Get products from catalog
    const productsData = queryClient.getQueryData('products') || [];
    const productsMap = {};
    productsData.forEach(p => {
      if (p && p._id) productsMap[p._id] = p;
    });

    return productos.reduce((total, item) => {
      let precio = 0;
      let cantidad = 0;

      // Extract price safely
      if (typeof item.precio === 'number') {
        precio = item.precio;
      } else if (typeof item.precioUnitario === 'number') {
        precio = item.precioUnitario;
      } else {
        const productId = typeof item.productoId === 'object' && item.productoId
          ? item.productoId._id
          : (typeof item.productoId === 'string' ? item.productoId : '');

        if (productId && productsMap[productId]) {
          precio = productsMap[productId].precio;
        }
      }

      // Extract quantity safely
      cantidad = typeof item.cantidad === 'number' ? item.cantidad : 0;

      return total + (precio * cantidad);
    }, 0);
  }, [queryClient]);

  // Filter orders by date
  const handleDateFilter = async () => {
    if (!dateFilter.from || !dateFilter.to) {
      addNotification("Select both dates to filter", "warning");
      return;
    }

    refetchOrders();
    setShowMobileFilters(false);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setDateFilter({ from: '', to: '' });
    setStatusFilter('todos');
    setSupervisorFilter('');
    setServiceFilter('');
    setClientFilter({});
    refetchOrders();
    setShowMobileFilters(false);
    setCurrentPage(1);

    addNotification("Filters cleared", "info");
  };

  // Toggle order details view
  const toggleOrderDetails = useCallback((orderId) => {
    setOrderDetailsOpen(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));

    // Get current products
    const productsData = queryClient.getQueryData('products') || [];
    const productsMap = {};
    productsData.forEach(p => {
      if (p && p._id) productsMap[p._id] = p;
    });

    // Load missing products
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

  // Select supervisor
  const handleSupervisorSelect = async (supervisorId) => {
    // Find supervisor in list
    const supervisor = supervisors.find(s => s._id === supervisorId);
  
    setSelectedSupervisor(supervisorId);
    setOrderForm(prev => ({
      ...prev,
      userId: supervisorId,
      supervisorId: undefined, // Clear supervisorId if it existed
      clienteId: '',
      nombreCliente: '',
      servicio: '',
      seccionDelServicio: '',
      productos: []
    }));
  
    // Close selection modal
    setSupervisorSelectOpen(false);
  
    // Load clients for selected supervisor
    try {
      await queryClient.invalidateQueries(['clients', supervisorId]);
  
      // Open creation modal after loading clients
      setCreateOrderModalOpen(true);
    } catch (error) {
      console.error("Error loading supervisor's clients:", error);
      addNotification("Error loading supervisor's clients", "error");
    }
  };

  // Create new order
  const handleNewOrderClick = () => {
    resetOrderForm();

    // If admin or supervisor of supervisors, first show supervisor selector
    if (isAdminOrSuperSupervisor) {
      setSupervisorSelectOpen(true);
    } else {
      // For normal users, open creation modal directly
      setCreateOrderModalOpen(true);
    }
  };

  // Download receipt
  const handleDownloadReceipt = (orderId) => {
    downloadReceiptMutation.mutate(orderId);
  };

  // Change table page
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // On mobile, scroll to top of list
    if (windowWidth < 640 && mobileListRef.current) {
      mobileListRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ======== FILTERING AND PAGINATION ========

  // Products in a map for quick access
  const productsMap = useMemo(() => {
    const map = {};
    products.forEach(product => {
      if (product && product._id) {
        map[product._id] = product;
      }
    });
    return map;
  }, [products]);

  // Filter orders by local search terms
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];

    return orders.filter(order => {
      if (!searchTerm) return true;

      const searchLower = searchTerm.toLowerCase();
      const userInfo = getUserInfo(order.userId);

      // Search in order data
      return (
        // Search in service or order number
        (order.servicio || '').toLowerCase().includes(searchLower) ||
        String(order.nPedido || '').includes(searchTerm) ||
        
        // Search in section
        (order.seccionDelServicio || '').toLowerCase().includes(searchLower) ||
        
        // Search in hierarchical structure
        (order.cliente?.nombreCliente || '').toLowerCase().includes(searchLower) ||
        (order.cliente?.nombreSubServicio || '').toLowerCase().includes(searchLower) ||
        (order.cliente?.nombreSubUbicacion || '').toLowerCase().includes(searchLower) ||
        
        // Search by user
        userInfo.usuario.toLowerCase().includes(searchLower) ||
        userInfo.name.toLowerCase().includes(searchLower)
      );
    });
  }, [orders, searchTerm, getUserInfo]);

  // Items per page configuration based on screen size
  const itemsPerPage = useMemo(() => {
    if (windowWidth < 640) return 4; // Mobile
    if (windowWidth < 1024) return 8; // Tablet
    return 12; // Desktop
  }, [windowWidth]);

  // Calculate pagination
  const paginatedOrders = useMemo(() => {
    if (!Array.isArray(filteredOrders)) return [];

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredOrders.length / itemsPerPage);
  }, [filteredOrders.length, itemsPerPage]);

  // Pagination information
  const paginationInfo = useMemo(() => {
    const total = filteredOrders.length;
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(start + itemsPerPage - 1, total);

    return {
      total,
      start: total > 0 ? start : 0,
      end: total > 0 ? end : 0,
      range: total > 0 ? `${start}-${end} of ${total}` : "0 of 0"
    };
  }, [filteredOrders.length, currentPage, itemsPerPage]);

  // ======== RENDERING ========

  // Show loading screen
  const isLoading = isLoadingUser || (isLoadingOrders && orders.length === 0);
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 bg-[#DFEFE6]/30 min-h-[300px] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#29696B] animate-spin mb-4" />
        <p className="text-[#29696B]">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-[#DFEFE6]/30">
      {/* Alerts handled by notification context */}

      {/* Filters and actions bar for desktop */}
      <div className="mb-6 space-y-4 hidden md:block bg-white p-4 rounded-xl shadow-sm border border-[#91BEAD]/20">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
            <Input
              type="text"
              placeholder="Search by client, section, user or number..."
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
              Refresh
            </Button>

            <Button
              onClick={handleNewOrderClick}
              className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              disabled={products.length === 0 || (isAdminOrSuperSupervisor ? supervisors.length === 0 : clients.length === 0)}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              New Order
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          {/* Date filters */}
          <div>
            <Label htmlFor="fechaInicio" className="text-[#29696B]">Start Date</Label>
            <Input
              id="fechaInicio"
              type="date"
              value={dateFilter.from}
              onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
              className="w-full border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
            />
          </div>

          <div>
            <Label htmlFor="fechaFin" className="text-[#29696B]">End Date</Label>
            <Input
              id="fechaFin"
              type="date"
              value={dateFilter.to}
              onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
              className="w-full border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
            />
          </div>

          {/* Status filter */}
          <div>
            <Label htmlFor="estado" className="text-[#29696B]">Status</Label>
            <Select 
              value={statusFilter} 
              onValueChange={setStatusFilter}
            >
              <SelectTrigger id="estado" className="border-[#91BEAD] focus:ring-[#29696B]/20">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">All</SelectItem>
                <SelectItem value="pendiente">Pending</SelectItem>
                <SelectItem value="aprobado">Approved</SelectItem>
                <SelectItem value="rechazado">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Supervisor filter (admin only) */}
          {isAdminOrSuperSupervisor && (
            <div>
              <Label htmlFor="supervisor" className="text-[#29696B]">Supervisor</Label>
              <Select 
                value={supervisorFilter} 
                onValueChange={setSupervisorFilter}
              >
                <SelectTrigger id="supervisor" className="border-[#91BEAD] focus:ring-[#29696B]/20">
                  <SelectValue placeholder="All supervisors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {supervisors.map(supervisor => (
                    <SelectItem key={supervisor._id} value={supervisor._id}>
                      {supervisor.usuario || (supervisor.nombre ? `${supervisor.nombre} ${supervisor.apellido || ''}` : 'No name')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Client filter */}
          <div>
            <Label htmlFor="cliente" className="text-[#29696B]">Client</Label>
            <Select 
              value={clientFilter.clienteId || ''} 
              onValueChange={(value) => {
                if (value) {
                  // Find complete client
                  const cliente = allClients.find(c => c._id === value);
                  setClientFilter({ clienteId: value });
                } else {
                  setClientFilter({});
                }
              }}
            >
              <SelectTrigger id="cliente" className="border-[#91BEAD] focus:ring-[#29696B]/20">
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {allClients.map(cliente => (
                  <SelectItem key={cliente._id} value={cliente._id}>
                    {cliente.nombre || cliente.servicio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={handleDateFilter}
            className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
          >
            <Filter className="w-4 h-4 mr-2" />
            Apply Filters
          </Button>

          {(dateFilter.from || dateFilter.to || searchTerm || statusFilter !== 'todos' || supervisorFilter || clientFilter.clienteId) && (
            <Button
              variant="ghost"
              onClick={clearAllFilters}
              className="text-[#7AA79C] hover:text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Filters and actions bar for mobile */}
      <div className="mb-6 space-y-4 md:hidden">
        <div className="flex items-center gap-2 bg-white p-3 rounded-xl shadow-sm border border-[#91BEAD]/20">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
            <Input
              type="text"
              placeholder="Search orders..."
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
            <h3 className="font-medium text-sm text-[#29696B]">Advanced Filters</h3>

            {/* Date filters */}
            <div className="space-y-2">
              <div>
                <Label htmlFor="mFechaInicio" className="text-xs text-[#29696B]">Start Date</Label>
                <Input id="mFechaInicio"
                  type="date"
                  value={dateFilter.from}
                  onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
                  className="w-full text-sm border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                />
              </div>

              <div>
                <Label htmlFor="mFechaFin" className="text-xs text-[#29696B]">End Date</Label>
                <Input
                  id="mFechaFin"
                  type="date"
                  value={dateFilter.to}
                  onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
                  className="w-full text-sm border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                />
              </div>
              
              {/* Status filter */}
              <div>
                <Label htmlFor="mEstado" className="text-xs text-[#29696B]">Status</Label>
                <Select 
                  value={statusFilter} 
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger id="mEstado" className="text-sm border-[#91BEAD] focus:ring-[#29696B]/20">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">All</SelectItem>
                    <SelectItem value="pendiente">Pending</SelectItem>
                    <SelectItem value="aprobado">Approved</SelectItem>
                    <SelectItem value="rechazado">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Supervisor filter (admin only) */}
              {isAdminOrSuperSupervisor && (
                <div>
                  <Label htmlFor="mSupervisor" className="text-xs text-[#29696B]">Supervisor</Label>
                  <Select 
                    value={supervisorFilter} 
                    onValueChange={setSupervisorFilter}
                  >
                    <SelectTrigger id="mSupervisor" className="text-sm border-[#91BEAD] focus:ring-[#29696B]/20">
                      <SelectValue placeholder="All supervisors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {supervisors.map(supervisor => (
                        <SelectItem key={supervisor._id} value={supervisor._id}>
                          {supervisor.usuario || (supervisor.nombre ? `${supervisor.nombre} ${supervisor.apellido || ''}` : 'No name')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Client filter */}
              <div>
                <Label htmlFor="mCliente" className="text-xs text-[#29696B]">Client</Label>
                <Select 
                  value={clientFilter.clienteId || ''} 
                  onValueChange={(value) => {
                    if (value) {
                      setClientFilter({ clienteId: value });
                    } else {
                      setClientFilter({});
                    }
                  }}
                >
                  <SelectTrigger id="mCliente" className="text-sm border-[#91BEAD] focus:ring-[#29696B]/20">
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {allClients.map(cliente => (
                      <SelectItem key={cliente._id} value={cliente._id}>
                        {cliente.nombre || cliente.servicio}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
              >
                Clear
              </Button>

              <Button
                size="sm"
                onClick={handleDateFilter}
                className="text-xs bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        )}

        {/* Active filters indicator */}
        {(dateFilter.from || dateFilter.to || statusFilter !== 'todos' || supervisorFilter || clientFilter.clienteId) && (
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

              {clientFilter.clienteId && (
                <span className="flex items-center">
                  <Building className="w-3 h-3 mr-1" />
                  {allClients.find(c => c._id === clientFilter.clienteId)?.nombre || 'Client'}
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

      {/* Loading or refresh indicator */}
      {isRefreshingOrders && (
        <div className="bg-[#DFEFE6]/30 rounded-lg p-2 mb-4 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-[#29696B] animate-spin mr-2" />
          <span className="text-sm text-[#29696B]">Updating data...</span>
        </div>
      )}

      {/* No results */}
      {!isLoading && filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-[#7AA79C] border border-[#91BEAD]/20">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
            <ShoppingCart className="w-6 h-6 text-[#29696B]" />
          </div>

          <p>
            No orders found
            {searchTerm && ` that match "${searchTerm}"`}
            {(dateFilter.from || dateFilter.to) && " in the selected date range"}
            {statusFilter !== 'todos' && ` with status ${statusFilter}`}
            {supervisorFilter && " for the selected supervisor"}
            {clientFilter.clienteId && " for the selected client"}
          </p>

          {(clients.length === 0 || products.length === 0) && (
            <p className="mt-4 text-sm text-red-500 flex items-center justify-center">
              <Info className="w-4 h-4 mr-2" />
              {clients.length === 0
                ? "You have no assigned clients. Contact an administrator."
                : "No products available to create orders."}
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Orders table for medium and large screens */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden hidden md:block border border-[#91BEAD]/20">
            <div className="w-full">
              <table className="w-full table-auto">
                <thead className="bg-[#DFEFE6]/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                      Order #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                      Section
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                      Products
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#29696B] uppercase tracking-wider">
                      Actions
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
                              {order.cliente?.nombreCliente || order.servicio || "No client"}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          {(order.cliente?.nombreSubServicio || order.seccionDelServicio) ? (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 text-[#7AA79C] mr-2" />
                              <div className="text-sm text-[#29696B]">
                                {order.cliente?.nombreSubServicio || order.seccionDelServicio}
                                {order.cliente?.nombreSubUbicacion && (
                                  <span className="text-xs text-[#7AA79C] ml-1">
                                    ({order.cliente.nombreSubUbicacion})
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-[#7AA79C]">No section</span>
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
                                ? `${order.productos.length} product${order.productos.length !== 1 ? 's' : ''}`
                                : '0 products'}
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
                                    onClick={() => handleDownloadReceipt(order._id)}
                                    className="text-[#29696B] hover:bg-[#DFEFE6]/30"
                                    disabled={downloadReceiptMutation.isLoading}
                                  >
                                    {downloadReceiptMutation.isLoading ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Download className="w-4 h-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Download Receipt</p>
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
                                  <p>Edit Order</p>
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
                                  <p>Delete Order</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable order details */}
                      {orderDetailsOpen[order._id] && (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 bg-[#DFEFE6]/20">
                            <div className="space-y-3">
                              <div className="font-medium text-[#29696B]">Order Details</div>

                              <div className="overflow-x-auto rounded-md border border-[#91BEAD]/30">
                                <table className="min-w-full divide-y divide-[#91BEAD]/20">
                                  <thead className="bg-[#DFEFE6]/50">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-[#29696B]">Product</th>
                                      <th className="px-4 py-2 text-center text-xs font-medium text-[#29696B]">Quantity</th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-[#29696B]">Unit Price</th>
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
                                      <td colSpan={3} className="px-4 py-2 text-right text-[#29696B]">Order Total:</td>
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
                                  onClick={() => handleDownloadReceipt(order._id)}
                                  className="text-xs h-8 border-[#29696B] text-[#29696B] hover:bg-[#DFEFE6]/30"
                                  disabled={downloadReceiptMutation.isLoading}
                                >
                                  {downloadReceiptMutation.isLoading ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <Download className="w-3 h-3 mr-1" />
                                  )}
                                  Download Receipt
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

            {/* Pagination for table */}
            {filteredOrders.length > itemsPerPage && (
              <div className="py-4 border-t border-[#91BEAD]/20 px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
                <div className="text-sm text-[#7AA79C]">
                  Showing {paginationInfo.range}
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

          {/* Card view for mobile */}
          <div ref={mobileListRef} id="mobile-orders-list" className="md:hidden grid grid-cols-1 gap-4">
            {/* Top pagination on mobile */}
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
                          {order.cliente?.nombreCliente || order.servicio || "No client"}
                        </CardTitle>

                        {(order.cliente?.nombreSubServicio || order.seccionDelServicio) && (
                          <div className="text-xs text-[#7AA79C] flex items-center mt-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            {order.cliente?.nombreSubServicio || order.seccionDelServicio}
                            {order.cliente?.nombreSubUbicacion && ` (${order.cliente.nombreSubUbicacion})`}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {/* Badge for order number */}
                        <Badge variant="outline" className="text-xs border-[#91BEAD] text-[#29696B] bg-[#DFEFE6]/20">
                          <Hash className="w-3 h-3 mr-1" />
                          {order.nPedido}
                        </Badge>

                        {/* Badge for date */}
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

                      {/* Order status */}
                      <div className="flex items-center">
                        {order.estado === 'aprobado' && <CheckCircle className="w-3 h-3 text-green-600 mr-1" />}
                        {order.estado === 'rechazado' && <XCircle className="w-3 h-3 text-red-600 mr-1" />}
                        {(!order.estado || order.estado === 'pendiente') && <Clock className="w-3 h-3 text-yellow-600 mr-1" />}
                        <span className={`text-[#29696B] flex items-center`}>
                          Status: 
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
                              ? 'Approved' 
                              : order.estado === 'rechazado' 
                              ? 'Rejected' 
                              : 'Pending'
                            }
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center">
                        <ShoppingCart className="w-3 h-3 text-[#7AA79C] mr-1" />
                        <span className="text-[#29696B]">
                          {Array.isArray(order.productos)
                            ? `${order.productos.length} product${order.productos.length !== 1 ? 's' : ''}`
                            : '0 products'}
                        </span>
                      </div>
                    </div>

                    {/* Expandable details on mobile with Accordion */}
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
                          View details
                        </AccordionTrigger>

                        <AccordionContent>
                          <div className="text-xs pt-2 pb-1">
                            <div className="font-medium mb-2 text-[#29696B]">Products:</div>

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
                              onClick={() => handleDownloadReceipt(order._id)}
                              className="w-full text-xs h-8 border-[#29696B] text-[#29696B] hover:bg-[#DFEFE6]/30"
                              disabled={downloadReceiptMutation.isLoading}
                            >
                              {downloadReceiptMutation.isLoading ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3 mr-1" />
                              )}
                              Download Receipt
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>

                  <CardFooter className="py-2 px-4 bg-[#DFEFE6]/10 flex justify-end gap-2 border-t border-[#91BEAD]/20">
                    {/* Dropdown menu to change status */}
                    <Select
                      value={order.estado || 'pendiente'}
                      onValueChange={(value) => {
                        // Update order status
                        queryClient.setQueryData(['orders'], (oldData) => {
                          return oldData?.map(o => o._id === order._id ? {...o, estado: value} : o);
                        });
                        // Call API to update status
                        OrdersService.updateOrderStatus(order._id, value)
                          .then(() => {
                            queryClient.invalidateQueries(['orders']);
                          })
                          .catch((error) => {
                            addNotification(`Error updating status: ${error.message}`, "error");
                            // Revert optimistic update
                            queryClient.invalidateQueries(['orders']);
                          });
                      }}
                    >
                      <SelectTrigger className="h-8 px-2 text-xs border-[#91BEAD] focus:ring-[#29696B]/20 w-[100px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente" className="text-xs">
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1 text-yellow-600" />
                            Pending
                          </div>
                        </SelectItem>
                        <SelectItem value="aprobado" className="text-xs">
                          <div className="flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                            Approved
                          </div>
                        </SelectItem>
                        <SelectItem value="rechazado" className="text-xs">
                          <div className="flex items-center">
                            <XCircle className="w-3 h-3 mr-1 text-red-600" />
                            Rejected
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

            {/* Message showing current page and total */}
            {filteredOrders.length > itemsPerPage && (
              <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm">
                <span className="text-[#29696B] font-medium">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            )}

            {/* Bottom pagination for mobile */}
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

      {/* ======== MODALS ======== */}

      {/* Create/Edit Order Modal */}
      <Dialog
        open={createOrderModalOpen}
        onOpenChange={(open) => {
          setCreateOrderModalOpen(open);
          if (!open) {
            // Clear selected supervisor when closing modal
            clearSelectedSupervisor();
          }
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">
              {currentOrderId
                ? `Edit Order #${orders.find(o => o._id === currentOrderId)?.nPedido || ''}`
                : isAdminOrSuperSupervisor && selectedSupervisor
                  ? `New Order (For: ${supervisors.find(s => s._id === selectedSupervisor)?.usuario || 'Supervisor'})`
                  : 'New Order'
              }
            </DialogTitle>
            {currentOrderId && (
              <DialogDescription className="text-[#7AA79C]">
                Modify the order details
              </DialogDescription>
            )}
            {isAdminOrSuperSupervisor && selectedSupervisor && !currentOrderId && (
              <DialogDescription className="text-[#7AA79C]">
                Creating order for supervisor: {
                  supervisors.find(s => s._id === selectedSupervisor)?.usuario ||
                  'Selected supervisor'
                }
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Selected supervisor indicator */}
          {isAdminOrSuperSupervisor && selectedSupervisor && (
            <div className="bg-[#DFEFE6]/30 p-3 rounded-md border border-[#91BEAD]/30 mb-4">
              <div className="flex items-center text-[#29696B]">
                <User className="w-4 h-4 text-[#7AA79C] mr-2" />
                <span className="font-medium">
                  {(() => {
                    // Find supervisor in the supervisors list
                    const supervisor = supervisors.find(s => s._id === selectedSupervisor);
                    if (!supervisor) return "Selected supervisor";

                    return supervisor.usuario || "Selected supervisor";
                  })()}
                </span>
              </div>
            </div>
          )}

          <div className="py-4 space-y-6">
            {/* Section to change supervisor (admin only and when editing) */}
            {isAdminOrSuperSupervisor && currentOrderId && (
              <div>
                <h2 className="text-lg font-medium mb-4 flex items-center text-[#29696B]">
                  <User className="w-5 h-5 mr-2 text-[#7AA79C]" />
                  Assigned Supervisor
                </h2>
                
                <Select
                  value={orderForm.userId}
                  onValueChange={(value) => {
                    // Change supervisor and reload their clients
                    setOrderForm(prev => ({
                      ...prev,
                      userId: value,
                      clienteId: '',
                      nombreCliente: '',
                      servicio: '',
                      seccionDelServicio: '',
                      subServicioId: undefined,
                      subUbicacionId: undefined
                    }));
                    setSelectedSupervisor(value);
                    setSelectedClient(null);
                    setSelectedSubService(null);
                    setSelectedSubLocation(null);
                    queryClient.invalidateQueries(['clients', value]);
                  }}
                >
                  <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
                    <SelectValue placeholder="Select supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisors.map(supervisor => (
                      <SelectItem key={supervisor._id} value={supervisor._id}>
                        {supervisor.usuario || "Supervisor without name"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Client Section */}
            <div>
              <h2 className="text-lg font-medium mb-4 flex items-center text-[#29696B]">
                <Building className="w-5 h-5 mr-2 text-[#7AA79C]" />
                Client Selection
              </h2>

              {isLoadingClients ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-6 h-6 text-[#29696B] animate-spin" />
                </div>
              ) : clients.length === 0 ? (
                <Alert className="bg-[#DFEFE6]/30 border border-[#91BEAD] text-[#29696B]">
                  <AlertDescription>
                    {isAdminOrSuperSupervisor && selectedSupervisor
                      ? "The selected supervisor has no assigned clients."
                      : "You have no assigned clients. Contact an administrator to get clients assigned to you."
                    }
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {/* Currently selected client */}
                  {selectedClient && (
                    <div className="p-3 bg-[#DFEFE6]/30 rounded-md border border-[#91BEAD]/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-[#29696B] flex items-center">
                            <Building className="w-4 h-4 text-[#7AA79C] mr-2" />
                            {selectedClient.nombre || selectedClient.servicio || 'Selected client'}
                          </div>
                          
                          {/* Show subservice if selected */}
                          {selectedSubService && (
                            <div className="text-sm text-[#7AA79C] flex items-center mt-1">
                              <MapPin className="w-3 h-3 text-[#7AA79C] mr-1" />
                              {selectedSubService.nombre}
                              
                              {/* Show sublocation if selected */}
                              {selectedSubLocation && (
                                <span className="ml-1">
                                  ({selectedSubLocation.nombre})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectClientModalOpen(true)}
                          className="text-xs text-[#29696B] hover:bg-[#DFEFE6]/40"
                        >
                          Change
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Button to select client if none is selected */}
                  {!selectedClient && (
                    <Button
                      variant="outline"
                      onClick={() => setSelectClientModalOpen(true)}
                      className="w-full border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
                    >
                      <Building className="w-4 h-4 mr-2 text-[#7AA79C]" />
                      Select Client
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Order Status */}
            <div>
              <h2 className="text-lg font-medium mb-4 flex items-center text-[#29696B]">
                <Clock className="w-5 h-5 mr-2 text-[#7AA79C]" />
                Order Status
              </h2>
              
              <Select
                value={orderForm.estado || 'pendiente'}
                onValueChange={(value) => setOrderForm(prev => ({ ...prev, estado: value }))}
              >
                <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-yellow-600" />
                      Pending
                    </div>
                  </SelectItem>
                  <SelectItem value="aprobado">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                      Approved
                    </div>
                  </SelectItem>
                  <SelectItem value="rechazado">
                    <div className="flex items-center">
                      <XCircle className="w-4 h-4 mr-2 text-red-600" />
                      Rejected
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Order Products */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium flex items-center text-[#29696B]">
                  <ShoppingCart className="w-5 h-5 mr-2 text-[#7AA79C]" />
                  Products
                </h2>

                <Button
                  variant="outline"
                  onClick={() => setSelectProductModalOpen(true)}
                  disabled={!selectedClient || products.length === 0}
                  className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>

              {!orderForm.productos || orderForm.productos.length === 0 ? (
                <div className="text-center py-8 text-[#7AA79C] border border-dashed border-[#91BEAD]/40 rounded-md bg-[#DFEFE6]/10">
                  No products in the order
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {orderForm.productos.map((item, index) => {
                    const productId = typeof item.productoId === 'object' && item.productoId
                      ? item.productoId._id
                      : (typeof item.productoId === 'string' ? item.productoId : '');

                    const product = productId ? productsMap[productId] : undefined;
                    const nombre = item.nombre || (product?.nombre || 'Product not found');
                    const precio = typeof item.precio === 'number' ? item.precio : 
                                   (typeof item.precioUnitario === 'number' ? item.precioUnitario : 
                                   (product?.precio || 0));
                    const cantidad = typeof item.cantidad === 'number' ? item.cantidad : 0;

                    return (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-[#DFEFE6]/20 rounded-md border border-[#91BEAD]/30"
                      >
                        <div>
                          <div className="font-medium text-[#29696B]">{nombre}</div>
                          <div className="text-sm text-[#7AA79C]">
                            Quantity: {cantidad} x ${precio.toFixed(2)}
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

            {/* Notes */}
            <div>
              <Label htmlFor="detalle" className="text-[#29696B]">Notes (optional)</Label>
              <textarea
                id="detalle"
                value={orderForm.detalle === ' ' ? '' : orderForm.detalle}
                onChange={(e) => setOrderForm(prev => ({ ...prev, detalle: e.target.value }))}
                className="w-full border-[#91BEAD] rounded-md p-2 mt-1 focus:ring-[#29696B]/20 focus:border-[#29696B]"
                rows={3}
                placeholder="Add additional notes here..."
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
              Cancel
            </Button>

            <Button
              onClick={currentOrderId ? handleUpdateOrder : handleCreateOrder}
              disabled={
                createOrderMutation.isLoading ||
                updateOrderMutation.isLoading ||
                !orderForm.productos ||
                orderForm.productos.length === 0 ||
                !orderForm.clienteId
              }
              className="bg-[#29696B] hover:bg-[#29696B]/90 text-white disabled:bg-[#8DB3BA] disabled:text-white/70"
            >
              {createOrderMutation.isLoading || updateOrderMutation.isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </span>
              ) : currentOrderId ? 'Update Order' : 'Create Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supervisor Selection Modal */}
      <Dialog open={supervisorSelectOpen} onOpenChange={setSupervisorSelectOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">Select Supervisor</DialogTitle>
            <DialogDescription className="text-[#7AA79C]">
              Choose the supervisor for whom you want to create the order.
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
                  No supervisors available. Contact the system administrator.
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
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Selection Modal */}
      <Dialog open={selectClientModalOpen} onOpenChange={setSelectClientModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">Select Client</DialogTitle>
            <DialogDescription className="text-[#7AA79C]">
              Select the client for this order.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Client search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
              <Input
                type="text"
                placeholder="Search clients..."
                className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
              />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {clients.map((cliente) => (
                <div
                  key={cliente._id}
                  className="p-3 border border-[#91BEAD] rounded-md hover:bg-[#DFEFE6]/30 cursor-pointer transition-colors"
                  onClick={() => handleClientSelect(cliente)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[#29696B]">
                        {cliente.nombre || cliente.servicio}
                      </div>
                      {cliente.subServicios?.length > 0 && (
                        <div className="text-xs text-[#7AA79C]">
                          {cliente.subServicios.length} 
                          {cliente.subServicios.length === 1 ? ' subservice' : ' subservices'}
                        </div>
                      )}
                    </div>
                    <MapPin className="w-4 h-4 text-[#7AA79C]" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectClientModalOpen(false)}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subservice Selection Modal */}
      <Dialog open={selectSubServiceModalOpen} onOpenChange={setSelectSubServiceModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">Select Subservice</DialogTitle>
            <DialogDescription className="text-[#7AA79C]">
              Select the subservice for {selectedClient?.nombre || selectedClient?.servicio || 'this client'}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {/* Option for "no subservice" */}
              <div
                className="p-3 border border-[#91BEAD] rounded-md hover:bg-[#DFEFE6]/30 cursor-pointer transition-colors"
                onClick={() => {
                  // Update form without subservice
                  setOrderForm(prev => ({
                    ...prev,
                    subServicioId: undefined,
                    nombreSubServicio: undefined,
                    seccionDelServicio: '',
                    subUbicacionId: undefined,
                    nombreSubUbicacion: undefined
                  }));
                  
                  setSelectedSubService(null);
                  setSelectedSubLocation(null);
                  setSelectSubServiceModalOpen(false);
                  setSelectClientModalOpen(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-[#29696B]">
                    No specific subservice
                  </div>
                  <Check className="w-4 h-4 text-[#7AA79C]" />
                </div>
              </div>
              
              {/* Subservices list */}
              {selectedClient?.subServicios?.map((subServicio) => (
                <div
                  key={subServicio._id}
                  className="p-3 border border-[#91BEAD] rounded-md hover:bg-[#DFEFE6]/30 cursor-pointer transition-colors"
                  onClick={() => handleSubServiceSelect(subServicio)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[#29696B]">
                        {subServicio.nombre}
                      </div>
                      {subServicio.subUbicaciones?.length > 0 && (
                        <div className="text-xs text-[#7AA79C]">
                          {subServicio.subUbicaciones.length} 
                          {subServicio.subUbicaciones.length === 1 ? ' sublocation' : ' sublocations'}
                        </div>
                      )}
                    </div>
                    <MapPin className="w-4 h-4 text-[#7AA79C]" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectSubServiceModalOpen(false);
                // If cancelled, return to client modal
                setSelectClientModalOpen(true);
              }}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sublocation Selection Modal */}
      <Dialog open={selectSubLocationModalOpen} onOpenChange={setSelectSubLocationModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">Select Sublocation</DialogTitle>
            <DialogDescription className="text-[#7AA79C]">
              Select the sublocation for {selectedSubService?.nombre || 'this subservice'}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {/* Option for "no sublocation" */}
              <div
                className="p-3 border border-[#91BEAD] rounded-md hover:bg-[#DFEFE6]/30 cursor-pointer transition-colors"
                onClick={() => {
                  // Update form without sublocation
                  setOrderForm(prev => ({
                    ...prev,
                    subUbicacionId: undefined,
                    nombreSubUbicacion: undefined
                  }));
                  
                  setSelectedSubLocation(null);
                  setSelectSubLocationModalOpen(false);
                  setSelectClientModalOpen(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-[#29696B]">
                    No specific sublocation
                  </div>
                  <Check className="w-4 h-4 text-[#7AA79C]" />
                </div>
              </div>
              
              {/* Sublocations list */}
              {selectedSubService?.subUbicaciones?.map((subUbicacion) => (
                <div
                  key={subUbicacion._id}
                  className="p-3 border border-[#91BEAD] rounded-md hover:bg-[#DFEFE6]/30 cursor-pointer transition-colors"
                  onClick={() => handleSubLocationSelect(subUbicacion)}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-[#29696B]">
                      {subUbicacion.nombre}
                    </div>
                    <MapPin className="w-4 h-4 text-[#7AA79C]" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectSubLocationModalOpen(false);
                // If cancelled, return to subservice modal
                setSelectSubServiceModalOpen(true);
              }}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Selection Modal */}
      <Dialog open={selectProductModalOpen} onOpenChange={setSelectProductModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">Add Product</DialogTitle>
            <DialogDescription className="text-[#7AA79C]">
              Select the product and quantity you want to add.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Product search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
              <Input
                type="text"
                placeholder="Search products..."
                className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                onChange={(e) => {
                  const searchTerm = e.target.value.toLowerCase();
                  // We would implement product filtering logic here
                }}
              />
            </div>

            <div>
              <Label htmlFor="producto" className="text-[#29696B]">Product</Label>
              <Select
                value={selectedProduct || "none"}
                onValueChange={setSelectedProduct}
              >
                <SelectTrigger id="producto" className="border-[#91BEAD] focus:ring-[#29696B]/20">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="none" disabled>Select a product</SelectItem>
                  {isLoadingProducts ? (
                    <SelectItem value="loading" disabled>Loading products...</SelectItem>
                  ) : products.length > 0 ? (
                    products.map(product => (
                      <SelectItem
                        key={product._id}
                        value={product._id}
                        disabled={product.stock <= 0}
                      >
                        {product.nombre} - ${product.precio.toFixed(2)} {product.stock <= 0 ? '(Out of stock)' : `(Stock: ${product.stock})`}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-products" disabled>No products available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cantidad" className="text-[#29696B]">Quantity</Label>
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

            {/* Selected product information */}
            {selectedProduct && selectedProduct !== "none" && productsMap[selectedProduct] && (
              <div className="p-3 bg-[#DFEFE6]/20 rounded-md border border-[#91BEAD]/30">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-[#29696B]">Selected product:</span>
                  <span className="text-sm text-[#29696B]">{productsMap[selectedProduct].nombre}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm font-medium text-[#29696B]">Price:</span>
                  <span className="text-sm text-[#29696B]">${productsMap[selectedProduct].precio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm font-medium text-[#29696B]">Available stock:</span>
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
              Cancel
            </Button>

            <Button
              onClick={handleAddProduct}
              className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              disabled={!selectedProduct || selectedProduct === "none" || productQuantity <= 0}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmationDialog
        open={deleteConfirmModalOpen}
        onOpenChange={setDeleteConfirmModalOpen}
        title="Delete Order?"
        description="Are you sure you want to delete this order? This action cannot be undone and will return stock to inventory."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteOrder}
        variant="destructive"
      />
    </div>
  );
};

export default OrdersSection;