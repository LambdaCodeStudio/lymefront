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
import Pagination from "./components/Pagination";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { getAuthToken } from '@/utils/inventoryUtils';

// ======== TIPOS E INTERFACES ========

export interface Usuario {
  _id: string;
  usuario?: string;
  nombre?: string;
  apellido?: string;
  role: string;
  secciones?: 'limpieza' | 'mantenimiento' | 'ambos';
  isActive?: boolean;
  expiresAt?: string | Date;
}

// Interfaces actualizadas para estructura jerárquica
interface SubUbicacion {
  _id: string;
  nombre: string;
  descripcion?: string;
}

interface SubServicio {
  _id: string;
  nombre: string;
  descripcion?: string;
  supervisorId?: string | Usuario;
  subUbicaciones: SubUbicacion[];
}

interface Cliente {
  _id: string;
  nombre: string;
  servicio: string;
  seccionDelServicio: string;
  userId: string | Usuario;
  subServicios: SubServicio[];
  direccion?: string;
  telefono?: string;
  email?: string;
  activo?: boolean;
  requiereAsignacion?: boolean;
}

interface Producto {
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

interface ProductoPedido {
  productoId: string | Producto;
  cantidad: number;
  nombre?: string;
  precio?: number;
  precioUnitario?: number;
}

// Estructura de cliente actualizada en el pedido
interface ClientePedido {
  clienteId: string;
  subServicioId?: string;
  subUbicacionId?: string;
  nombreCliente: string;
  nombreSubServicio?: string;
  nombreSubUbicacion?: string;
}

interface Pedido {
  _id: string;
  nPedido: number;
  cliente: ClientePedido;
  servicio: string; // Campo de compatibilidad
  seccionDelServicio: string; // Campo de compatibilidad
  userId: string | Usuario;
  supervisorId?: string | Usuario;
  fecha: string;
  productos: ProductoPedido[];
  detalle?: string;
  estado?: 'pendiente' | 'aprobado' | 'rechazado';
  aprobadoPor?: string | Usuario;
  fechaAprobacion?: string;
  observaciones?: string;
}

interface FormularioPedido {
  clienteId: string;
  subServicioId?: string;
  subUbicacionId?: string;
  nombreCliente: string;
  nombreSubServicio?: string;
  nombreSubUbicacion?: string;
  servicio: string; // Mantener para compatibilidad
  seccionDelServicio: string; // Mantener para compatibilidad
  userId: string;
  supervisorId?: string;
  productos: ProductoPedido[];
  detalle?: string;
  estado?: 'pendiente' | 'aprobado' | 'rechazado';
}

interface FiltrosParams {
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

// Función utilitaria para truncar texto
/**
 * Trunca un texto si excede la longitud máxima especificada
 * @param text Texto a truncar
 * @param maxLength Longitud máxima permitida (por defecto 25 caracteres)
 * @returns Texto truncado con puntos suspensivos o el texto original si es más corto
 */
const truncarTexto = (texto, longitudMaxima = 25) => {
  if (!texto) return '';
  return texto.length > longitudMaxima ? `${texto.substring(0, longitudMaxima)}...` : texto;
};

// ======== SERVICIO API ========

/**
 * Servicio API para Pedidos
 * Centraliza todas las llamadas API para mantener un manejo de errores y formato de solicitudes consistente
 */
const ServicioPedidos = {
  // URL base de la API
  apiUrl: '/api',

  // Obtener pedidos con filtros
  async obtenerPedidos(filtros: FiltrosParams = {}): Promise<Pedido[]> {
    const token = getAuthToken();
    if (!token) throw new Error("No hay token de autenticación.");

    // Construir URL base
    let url = `/api/pedido`;
    let queryParams = new URLSearchParams();

    // Aplicar filtros de fecha
    if (filtros.from && filtros.to) {
      queryParams.append('fechaInicio', filtros.from);
      queryParams.append('fechaFin', filtros.to);
      url = `/api/pedido/fecha?${queryParams.toString()}`;
    }
    // Filtrar por supervisor
    else if (filtros.supervisor) {
      url = `/api/pedido/supervisor/${filtros.supervisor}`;
    }
    // Filtrar por cliente
    else if (filtros.clienteId) {
      url = `/api/pedido/cliente/${filtros.clienteId}`;

      // Añadir subServicioId si existe
      if (filtros.subServicioId) {
        queryParams.append('subServicioId', filtros.subServicioId);

        // Añadir subUbicacionId si existe
        if (filtros.subUbicacionId) {
          queryParams.append('subUbicacionId', filtros.subUbicacionId);
        }

        // Añadir parámetros a la URL
        if (queryParams.toString()) {
          url += `?${queryParams.toString()}`;
        }
      }
    }
    // Filtrar por servicio (compatibilidad)
    else if (filtros.servicio) {
      url = `/api/pedido/servicio/${encodeURIComponent(filtros.servicio)}`;
    }
    // Filtrar por estado
    else if (filtros.estado && filtros.estado !== 'todos') {
      url = `/api/pedido/estado/${filtros.estado}`;
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
  },

  // Obtener pedido por ID
  async obtenerPedidoPorId(id: string): Promise<Pedido> {
    const token = getAuthToken();
    if (!token) throw new Error("No hay token de autenticación.");

    const response = await fetch(`/api/pedido/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Error al obtener pedidos: ${response.status}`);
    }

    return await response.json();
  },

  // Obtener supervisores
  async obtenerSupervisores(): Promise<Usuario[]> {
    const token = getAuthToken();
    if (!token) throw new Error("No hay token de autenticación.");

    const response = await fetch(`/api/auth/supervisors`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Error al obtener supervisores: ${response.status}`);
    }

    const result = await response.json();
    return result.supervisors || [];
  },

  // Obtener productos
  async obtenerProductos(): Promise<Producto[]> {
    const token = getAuthToken();
    if (!token) throw new Error("No hay token de autenticación.");

    const response = await fetch(`/api/producto`, {
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
  },

  // Obtener un producto por ID
  async obtenerProductoPorId(productoId: string): Promise<Producto | null> {
    const token = getAuthToken();
    if (!token) throw new Error("No hay token de autenticación.");

    const response = await fetch(`/api/producto/${productoId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Error al obtener productos: ${response.status}`);
    }

    return await response.json();
  },

  // Obtener todos los clientes
  async obtenerClientes(): Promise<Cliente[]> {
    const token = getAuthToken();
    if (!token) throw new Error("No hay token de autenticación.");

    const response = await fetch(`/api/cliente`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Error al obtener clientes: ${response.status}`);
    }

    return await response.json();
  },

  // Obtener clientes por supervisor
  async obtenerClientesPorSupervisor(supervisorId: string): Promise<Cliente[]> {
    const token = getAuthToken();
    if (!token) throw new Error("No hay token de autenticación.");

    const response = await fetch(`/api/cliente/user/${supervisorId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Error al obtener clientes: ${response.status}`);
    }

    return await response.json();
  },

  // Crear pedido
  async crearPedido(data: any): Promise<Pedido> {
    const token = getAuthToken();
    if (!token) throw new Error("No hay token de autenticación.");

    // Crear estructura completa para el backend
    const datosPedido = {
      // Información del usuario
      userId: data.userId,
      supervisorId: data.supervisorId,

      // Estructura jerárquica del cliente
      cliente: {
        clienteId: data.clienteId,
        subServicioId: data.subServicioId || undefined,
        subUbicacionId: data.subUbicacionId || undefined,
        nombreCliente: data.nombreCliente,
        nombreSubServicio: data.nombreSubServicio || undefined,
        nombreSubUbicacion: data.nombreSubUbicacion || undefined
      },

      // Campos de compatibilidad
      servicio: data.servicio,
      seccionDelServicio: data.seccionDelServicio || "",

      // Productos y detalles
      productos: data.productos.map(p => ({
        productoId: typeof p.productoId === 'object' && p.productoId ? p.productoId._id : p.productoId,
        cantidad: p.cantidad,
        precioUnitario: p.precio || p.precioUnitario // Enviar precio actual
      })),

      detalle: data.detalle || "",
      estado: data.estado || 'pendiente'
    };

    const response = await fetch(`/api/pedido`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(datosPedido)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.mensaje || `Error al crear un pedido: ${response.status}`);
    }

    return await response.json();
  },

  // Actualizar pedido
  async actualizarPedido(id: string, data: any): Promise<Pedido> {
    const token = getAuthToken();
    if (!token) throw new Error("No hay token de autenticación.");

    // Crear estructura completa para el backend (similar a crearPedido)
    const datosPedido = {
      // Información del usuario
      userId: data.userId,
      supervisorId: data.supervisorId,

      // Estructura jerárquica del cliente
      cliente: {
        clienteId: data.clienteId,
        subServicioId: data.subServicioId || undefined,
        subUbicacionId: data.subUbicacionId || undefined,
        nombreCliente: data.nombreCliente,
        nombreSubServicio: data.nombreSubServicio || undefined,
        nombreSubUbicacion: data.nombreSubUbicacion || undefined
      },

      // Campos de compatibilidad
      servicio: data.servicio,
      seccionDelServicio: data.seccionDelServicio || "",

      // Productos y detalles
      productos: data.productos.map(p => ({
        productoId: typeof p.productoId === 'object' && p.productoId ? p.productoId._id : p.productoId,
        cantidad: p.cantidad,
        precioUnitario: p.precio || p.precioUnitario
      })),

      detalle: data.detalle || "",
      estado: data.estado || 'pendiente'
    };

    const response = await fetch(`/api/pedido/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(datosPedido)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.mensaje || `Error actualizando pedido: ${response.status}`);
    }

    return await response.json();
  },

  // Eliminar pedido
  async eliminarPedido(id: string): Promise<any> {
    const token = getAuthToken();
    if (!token) throw new Error("No hay token de autenticación.");

    const response = await fetch(`/api/pedido/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.mensaje || `Error eliminando pedido: ${response.status}`);
    }

    return await response.json();
  },

  // Obtener usuario actual
  async obtenerUsuarioActual(): Promise<Usuario> {
    const token = getAuthToken();
    if (!token) throw new Error("No hay token de autenticación.");

    const response = await fetch(`/api/auth/me`, {
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
      throw new Error(`Error al obtener datos del usuario.: ${response.status}`);
    }

    const result = await response.json();
    return result.user;
  },

  // Actualizar estado del pedido
  async actualizarEstadoPedido(id: string, estado: string): Promise<Pedido> {
    const token = getAuthToken();
    if (!token) throw new Error("No hay token de autenticación.");

    // Primero obtener el pedido actual
    const pedidoResponse = await fetch(`/api/pedido/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });

    if (!pedidoResponse.ok) {
      throw new Error(`Error obteniendo el pedido: ${pedidoResponse.status}`);
    }

    const pedido = await pedidoResponse.json();

    // Actualizar solo el campo de estado
    const actualizarResponse = await fetch(`/api/pedido/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...pedido,
        estado: estado
      })
    });

    if (!actualizarResponse.ok) {
      const errorData = await actualizarResponse.json();
      throw new Error(errorData.mensaje || `Error al Actualizar el estado: ${actualizarResponse.status}`);
    }

    return await actualizarResponse.json();
  },

  // Descargar remito
  async descargarRemito(id: string): Promise<void> {
    const token = getAuthToken();
    if (!token) throw new Error("No hay token de autenticación.");

    // Crear solicitud para obtener el remito con token de autenticación
    const response = await fetch(`/api/downloads/remito/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error al descargar el remito: ${response.status}`);
    }

    // Obtener el blob (archivo PDF)
    const blob = await response.blob();

    // Crear una URL temporal para el blob
    const url = window.URL.createObjectURL(blob);

    // Crear un elemento <a> temporal para la descarga
    const link = document.createElement('a');
    link.href = url;
    link.download = `remito_${id}.pdf`;

    // Añadir temporalmente al DOM y hacer clic
    document.body.appendChild(link);
    link.click();

    // Limpiar
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  }
};

// ======== COMPONENTES AUXILIARES ========

// Esqueleto de carga para pedidos
const EsqueletoPedidos = ({ count = 3 }) => (
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

/**
 * Componente para mostrar información de cliente y ubicación juntos
 * @param order Objeto pedido que contiene la información del cliente
 * @returns Componente con información de cliente y ubicación formateada
 */
const InformacionClienteUbicacion = ({ order }) => {
  const nombreCliente = order.cliente?.nombreCliente || order.servicio || "Ningún Cliente";
  const nombreSeccion = order.cliente?.nombreSubServicio || order.seccionDelServicio || "";
  const nombreSubUbicacion = order.cliente?.nombreSubUbicacion || "";
  
  return (
    <div className="flex flex-col">
      <div className="flex items-center">
        <Building className="w-4 h-4 text-[#7AA79C] mr-2 flex-shrink-0" />
        <div className="text-sm font-medium text-[#29696B] truncate">
          {truncarTexto(nombreCliente)}
        </div>
      </div>
      
      {nombreSeccion && (
        <div className="flex items-center mt-1">
          <MapPin className="w-4 h-4 text-[#7AA79C] mr-2 flex-shrink-0" />
          <div className="text-xs text-[#29696B] truncate">
            {truncarTexto(nombreSeccion)}
            {nombreSubUbicacion && (
              <span className="text-xs text-[#7AA79C] ml-1">
                ({truncarTexto(nombreSubUbicacion, 15)})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Componente para detalles de producto en un pedido
const DetalleProducto = React.memo(({
  item,
  mapaProductos,
  onProductLoad
}: {
  item: ProductoPedido;
  mapaProductos: Record<string, Producto>;
  onProductLoad: (productoId: string) => Promise<Producto | null>;
}) => {
  const [detalleProducto, setDetalleProducto] = useState<{
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
    const obtenerDetallesProducto = async () => {
      // Extraer ID del producto de forma segura
      const productoId = typeof item.productoId === 'object' && item.productoId
        ? item.productoId._id
        : (typeof item.productoId === 'string' ? item.productoId : '');

      if (!productoId) {
        if (mountedRef.current) {
          setDetalleProducto({
            nombre: "ID de producto inválido",
            precio: 0,
            loaded: true
          });
        }
        return;
      }

      // Si ya tenemos información directamente en el item
      if (item.nombre && (typeof item.precio === 'number' || typeof item.precioUnitario === 'number')) {
        if (mountedRef.current) {
          setDetalleProducto({
            nombre: item.nombre,
            precio: item.precio || item.precioUnitario || 0,
            loaded: true
          });
        }
        return;
      }

      // Si el producto está en el mapa de productos
      if (mapaProductos[productoId]) {
        if (mountedRef.current) {
          setDetalleProducto({
            nombre: mapaProductos[productoId].nombre,
            precio: item.precioUnitario || mapaProductos[productoId].precio,
            loaded: true
          });
        }
        return;
      }

      // Si no lo tenemos, cargar desde el servidor
      try {
        const producto = await onProductLoad(productoId);
        if (mountedRef.current && producto) {
          setDetalleProducto({
            nombre: producto.nombre,
            precio: item.precioUnitario || producto.precio,
            loaded: true
          });
        } else if (mountedRef.current) {
          setDetalleProducto({
            nombre: "Producto no encontrado.",
            precio: 0,
            loaded: true
          });
        }
      } catch (error) {
        console.error("Error al cargar los detalles del producto:", error);
        if (mountedRef.current) {
          setDetalleProducto({
            nombre: "Error cargando",
            precio: 0,
            loaded: true
          });
        }
      }
    };

    obtenerDetallesProducto();

    return () => {
      mountedRef.current = false;
    };
  }, [item, mapaProductos, onProductLoad]);

  if (!detalleProducto.loaded) {
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
      <td className="px-4 py-2 whitespace-nowrap text-[#29696B]">{detalleProducto.nombre}</td>
      <td className="px-4 py-2 whitespace-nowrap text-center text-[#7AA79C]">{cantidad}</td>
      <td className="px-4 py-2 whitespace-nowrap text-right text-[#7AA79C]">${detalleProducto.precio.toFixed(2)}</td>
      <td className="px-4 py-2 whitespace-nowrap text-right font-medium text-[#29696B]">
        ${(detalleProducto.precio * cantidad).toFixed(2)}
      </td>
    </>
  );
});

// Componente para detalles de producto en vista móvil
const DetalleProductoMovil = React.memo(({
  item,
  mapaProductos,
  onProductLoad
}: {
  item: ProductoPedido;
  mapaProductos: Record<string, Producto>;
  onProductLoad: (productoId: string) => Promise<Producto | null>;
}) => {
  const [detalleProducto, setDetalleProducto] = useState<{
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
    const obtenerDetallesProducto = async () => {
      // Extraer ID del producto de forma segura
      const productoId = typeof item.productoId === 'object' && item.productoId
        ? item.productoId._id
        : (typeof item.productoId === 'string' ? item.productoId : '');

      if (!productoId) {
        if (mountedRef.current) {
          setDetalleProducto({
            nombre: "ID de producto inválido",
            precio: 0,
            loaded: true
          });
        }
        return;
      }

      // Si ya tenemos información directamente en el item
      if (item.nombre && (typeof item.precio === 'number' || typeof item.precioUnitario === 'number')) {
        if (mountedRef.current) {
          setDetalleProducto({
            nombre: item.nombre,
            precio: item.precio || item.precioUnitario || 0,
            loaded: true
          });
        }
        return;
      }

      // Si el producto está en el mapa de productos
      if (mapaProductos[productoId]) {
        if (mountedRef.current) {
          setDetalleProducto({
            nombre: mapaProductos[productoId].nombre,
            precio: item.precioUnitario || mapaProductos[productoId].precio,
            loaded: true
          });
        }
        return;
      }

      // Si no lo tenemos, cargar desde el servidor
      try {
        const producto = await onProductLoad(productoId);
        if (mountedRef.current && producto) {
          setDetalleProducto({
            nombre: producto.nombre,
            precio: item.precioUnitario || producto.precio,
            loaded: true
          });
        } else if (mountedRef.current) {
          setDetalleProducto({
            nombre: "Producto no encontrado.",
            precio: 0,
            loaded: true
          });
        }
      } catch (error) {
        console.error("Error cargando los detalles del pedido", error);
        if (mountedRef.current) {
          setDetalleProducto({
            nombre: "Error cargando",
            precio: 0,
            loaded: true
          });
        }
      }
    };

    obtenerDetallesProducto();

    return () => {
      mountedRef.current = false;
    };
  }, [item, mapaProductos, onProductLoad]);

  if (!detalleProducto.loaded) {
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
        <div className="font-medium text-[#29696B]">{detalleProducto.nombre}</div>
        <div className="text-xs text-[#7AA79C]">
          {cantidad} x ${detalleProducto.precio.toFixed(2)}
        </div>
      </div>
      <div className="text-sm font-medium text-[#29696B]">
        ${(detalleProducto.precio * cantidad).toFixed(2)}
      </div>
    </div>
  );
});

// Componente para calcular el total del pedido
const TotalPedido = React.memo(({
  order,
  mapaProductos,
  onProductLoad
}: {
  order: Pedido;
  mapaProductos: Record<string, Producto>;
  onProductLoad: (productoId: string) => Promise<Producto | null>;
}) => {
  const [total, setTotal] = useState<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    const calcularTotal = async () => {
      if (!order.productos || !Array.isArray(order.productos) || order.productos.length === 0) {
        if (mountedRef.current) setTotal(0);
        return;
      }

      let suma = 0;
      let productosPendientes = [];

      // Primero calcular con los datos que ya tenemos
      for (const item of order.productos) {
        const productoId = typeof item.productoId === 'object' && item.productoId
          ? item.productoId._id
          : (typeof item.productoId === 'string' ? item.productoId : '');

        if (!productoId) continue;

        // Si el item ya tiene precio o precio unitario, usarlo
        if (typeof item.precio === 'number' || typeof item.precioUnitario === 'number') {
          suma += (item.precio || item.precioUnitario || 0) * (typeof item.cantidad === 'number' ? item.cantidad : 0);
          continue;
        }

        // Si el producto está en el mapa, usar su precio
        if (mapaProductos[productoId]) {
          suma += mapaProductos[productoId].precio * (typeof item.cantidad === 'number' ? item.cantidad : 0);
          continue;
        }

        // Si no tenemos el precio, añadir a pendientes
        productosPendientes.push(productoId);
      }

      // Si hay productos pendientes, cargarlos
      if (productosPendientes.length > 0) {
        // Cargar en paralelo, pero con un límite de 5 a la vez
        const tamañoLote = 5;
        for (let i = 0; i < productosPendientes.length; i += tamañoLote) {
          const lote = productosPendientes.slice(i, i + tamañoLote);
          const promesasProductos = lote.map(id => onProductLoad(id));

          try {
            const productos = await Promise.all(promesasProductos);

            // Actualizar suma con productos cargados
            for (let j = 0; j < productos.length; j++) {
              const producto = productos[j];
              const productoId = lote[j];

              if (producto) {
                // Encontrar el item correspondiente
                const item = order.productos.find(p => {
                  const itemId = typeof p.productoId === 'object' && p.productoId
                    ? p.productoId._id
                    : (typeof p.productoId === 'string' ? p.productoId : '');
                  return itemId === productoId;
                });

                if (item) {
                  // Usar el precio unitario del producto si existe, o el precio del catálogo
                  const precio = item.precioUnitario || producto.precio;
                  suma += precio * (typeof item.cantidad === 'number' ? item.cantidad : 0);
                }
              }
            }
          } catch (error) {
            console.error("Error al cargar productos para el cálculo.", error);
          }
        }
      }

      if (mountedRef.current) setTotal(suma);
    };

    calcularTotal();

    return () => {
      mountedRef.current = false;
    };
  }, [order, mapaProductos, onProductLoad]);

  if (total === null) {
    return <Skeleton className="h-5 w-20 inline-block" />;
  }

  return <span>${total.toFixed(2)}</span>;
});

// Componente para mostrar el estado del pedido
const BadgeEstadoPedido = ({ status, onStatusChange, orderId }) => {
  // Definir colores y etiquetas según el estado
  const getConfigEstado = (estado) => {
    switch (estado) {
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

  const { color, icon, label } = getConfigEstado(status || 'pendiente');

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

/**
 * SeccionPedidos - Componente principal para la gestión de pedidos
 * 
 * Este componente permite:
 * - Visualizar pedidos en formato tabla y tarjetas
 * - Filtrar pedidos por diferentes criterios
 * - Crear, editar y eliminar pedidos
 * - Gestionar productos dentro de los pedidos
 * - Descargar remitos
 */
const OrdersSection = () => {
  const { addNotification } = useNotification();
  const queryClient = useQueryClient();

  // Estado de filtros
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState({ from: '', to: '' });
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroSupervisor, setFiltroSupervisor] = useState('');
  const [filtroServicio, setFiltroServicio] = useState('');
  const [filtroCliente, setFiltroCliente] = useState<{
    clienteId?: string;
    subServicioId?: string;
    subUbicacionId?: string;
  }>({});

  // Estado de UI
  const [paginaActual, setPaginaActual] = useState(1);
  const [detallesPedidoAbierto, setDetallesPedidoAbierto] = useState({});
  const [anchoVentana, setAnchoVentana] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [mostrarFiltrosMovil, setMostrarFiltrosMovil] = useState(false);

  // Estado de modales
  const [modalCrearPedidoAbierto, setModalCrearPedidoAbierto] = useState(false);
  const [modalSeleccionarProductoAbierto, setModalSeleccionarProductoAbierto] = useState(false);
  const [modalSeleccionarClienteAbierto, setModalSeleccionarClienteAbierto] = useState(false);
  const [modalSeleccionarSubServicioAbierto, setModalSeleccionarSubServicioAbierto] = useState(false);
  const [modalSeleccionarSubUbicacionAbierto, setModalSeleccionarSubUbicacionAbierto] = useState(false);
  const [modalConfirmarEliminarAbierto, setModalConfirmarEliminarAbierto] = useState(false);
  const [pedidoAEliminar, setPedidoAEliminar] = useState(null);
  const [selectorSupervisorAbierto, setSelectorSupervisorAbierto] = useState(false);

  // Estado del formulario
  const [idPedidoActual, setIdPedidoActual] = useState(null);
  const [formularioPedido, setFormularioPedido] = useState<FormularioPedido>({
    clienteId: '',
    nombreCliente: '',
    servicio: '',
    seccionDelServicio: '',
    userId: '',
    productos: [],
    detalle: ''
  });
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [cantidadProducto, setCantidadProducto] = useState(1);
  const [supervisorSeleccionado, setSupervisorSeleccionado] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [subServicioSeleccionado, setSubServicioSeleccionado] = useState<SubServicio | null>(null);
  const [subUbicacionSeleccionada, setSubUbicacionSeleccionada] = useState<SubUbicacion | null>(null);

  // Referencias
  const refListaMovil = useRef(null);
  const colaProductos = useRef(new Set());
  const procesandoCola = useRef(false);

  // ======== HOOKS DE REACT QUERY ========

  // Cargar usuario actual
  const {
    data: usuarioActual,
    isLoading: cargandoUsuario
  } = useQuery('usuarioActual', ServicioPedidos.obtenerUsuarioActual, {
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      // Si es admin o supervisor de supervisores, cargar lista de supervisores
      if (data?.role === 'admin' || data?.role === 'supervisor_de_supervisores') {
        queryClient.prefetchQuery('supervisores', ServicioPedidos.obtenerSupervisores);
      }

      // Actualizar ID de usuario en formulario si no hay supervisor seleccionado
      if (!supervisorSeleccionado) {
        setFormularioPedido(prev => ({
          ...prev,
          userId: data?._id || ''
        }));
      }
    }
  });

  // Determinar si el usuario actual es admin o supervisor de supervisores
  const esAdminOSuperSupervisor = usuarioActual?.role === 'admin' || usuarioActual?.role === 'supervisor_de_supervisores';

  // Cargar supervisores
  const {
    data: supervisores = [],
    isLoading: cargandoSupervisores
  } = useQuery('supervisores', ServicioPedidos.obtenerSupervisores, {
    enabled: esAdminOSuperSupervisor,
    refetchOnWindowFocus: false
  });

  // Cargar pedidos
  const {
    data: pedidos = [],
    isLoading: cargandoPedidos,
    isRefetching: actualizandoPedidos,
    refetch: refrescarPedidos
  } = useQuery(
    ['pedidos', filtroFecha, filtroEstado, filtroSupervisor, filtroServicio, filtroCliente],
    () => ServicioPedidos.obtenerPedidos({
      from: filtroFecha.from,
      to: filtroFecha.to,
      estado: filtroEstado !== 'todos' ? filtroEstado : undefined,
      // Solo incluir filtroSupervisor si existe Y no es 'all'
      supervisor: filtroSupervisor && filtroSupervisor !== 'all' ? filtroSupervisor : undefined,
      servicio: filtroServicio || undefined,
      clienteId: filtroCliente.clienteId,
      subServicioId: filtroCliente.subServicioId,
      subUbicacionId: filtroCliente.subUbicacionId
    }),
    {
      refetchOnWindowFocus: false,
      onError: (error) => {
        addNotification(`Error cargando pedidos: ${error.message}`, "error");
      }
    }
  );

  // Cargar productos
  const {
    data: productos = [],
    isLoading: cargandoProductos
  } = useQuery('productos', ServicioPedidos.obtenerProductos, {
    refetchOnWindowFocus: false,
    onError: (error) => {
      addNotification(`Error cargando productos: ${error.message}`, "warning");
    }
  });

  // Cargar todos los clientes
  const {
    data: todosLosClientes = [],
    isLoading: cargandoTodosLosClientes
  } = useQuery('todosLosClientes', ServicioPedidos.obtenerClientes, {
    refetchOnWindowFocus: false,
    onError: (error) => {
      addNotification(`Error cargando todos los clientes: ${error.message}`, "warning");
    }
  });

  // Cargar clientes por supervisor
  const {
    data: clientes = [],
    isLoading: cargandoClientes
  } = useQuery(
    ['clientes', supervisorSeleccionado || usuarioActual?._id],
    () => ServicioPedidos.obtenerClientesPorSupervisor(supervisorSeleccionado || usuarioActual?._id),
    {
      enabled: !!supervisorSeleccionado || !!usuarioActual?._id,
      refetchOnWindowFocus: false,
      onError: (error) => {
        addNotification(`Error cargando clientes: ${error.message}`, "warning");
      }
    }
  );

  // Mutaciones CRUD
  const crearPedidoMutation = useMutation(ServicioPedidos.crearPedido, {
    onSuccess: () => {
      queryClient.invalidateQueries(['pedidos']);
      resetearFormularioPedido();
      setModalCrearPedidoAbierto(false);
      addNotification("¡Pedido creado exitosamente!", "success");
    },
    onError: (error) => {
      addNotification(`Error creando pedido: ${error.message}`, "error");
    }
  });

  const actualizarPedidoMutation = useMutation(
    ({ id, data }) => ServicioPedidos.actualizarPedido(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pedidos']);
        resetearFormularioPedido();
        setModalCrearPedidoAbierto(false);
        addNotification("Pedido actualizado correctamente", "success");
      },
      onError: (error) => {
        addNotification(`Error actualizando pedido: ${error.message}`, "error");
      }
    }
  );

  const eliminarPedidoMutation = useMutation(ServicioPedidos.eliminarPedido, {
    onSuccess: () => {
      queryClient.invalidateQueries(['pedidos']);
      setPedidoAEliminar(null);
      setModalConfirmarEliminarAbierto(false);
      addNotification("Pedido eliminado correctamente", "success");
    },
    onError: (error) => {
      addNotification(`Error eliminando pedido: ${error.message}`, "error");
    }
  });

  const descargarRemitoMutation = useMutation(ServicioPedidos.descargarRemito, {
    onSuccess: () => {
      addNotification("Comenzando descarga...", "success");
    },
    onError: (error) => {
      addNotification(`Error al descargar el remito: ${error.message}`, "error");
    }
  });

  // ======== EFECTOS ========

  // Efecto para cargar producto específico
  const obtenerProductoPorId = useCallback(async (productoId) => {
    try {
      const producto = await ServicioPedidos.obtenerProductoPorId(productoId);

      // Actualizar mapa de productos
      queryClient.setQueryData('productos', (oldData) => {
        const nuevosProductos = [...(oldData || [])];
        const indiceExistente = nuevosProductos.findIndex(p => p._id === productoId);

        if (indiceExistente >= 0) {
          nuevosProductos[indiceExistente] = producto;
        } else {
          nuevosProductos.push(producto);
        }

        return nuevosProductos;
      });

      return producto;
    } catch (error) {
      console.error(`Error cargando producto ${productoId}:`, error);
      return null;
    }
  }, [queryClient]);

  // Procesar cola de productos
  const procesarColaProductos = useCallback(async () => {
    if (procesandoCola.current || colaProductos.current.size === 0) {
      return;
    }

    procesandoCola.current = true;

    try {
      const tamañoLote = 5;
      const idsProductos = Array.from(colaProductos.current);
      colaProductos.current.clear();

      // Obtener productos actuales desde queryClient
      const productosActuales = queryClient.getQueryData('productos') || [];
      const mapaProductos = {};
      productosActuales.forEach(p => {
        if (p && p._id) {
          mapaProductos[p._id] = p;
        }
      });

      // Procesar en lotes
      for (let i = 0; i < idsProductos.length; i += tamañoLote) {
        const lote = idsProductos.slice(i, i + tamañoLote);
        const loteFiltrado = lote.filter(id => !mapaProductos[id]);

        if (loteFiltrado.length === 0) continue;

        // Cargar productos en paralelo
        const promesasProductos = loteFiltrado.map(id => obtenerProductoPorId(id));
        await Promise.all(promesasProductos);
      }
    } catch (error) {
      console.error("Error al procesar la cola de productos.:", error);
    } finally {
      procesandoCola.current = false;

      // Si quedan productos en la cola, procesarlos
      if (colaProductos.current.size > 0) {
        setTimeout(procesarColaProductos, 100);
      }
    }
  }, [obtenerProductoPorId, queryClient]);

  // Precargar productos de pedidos
  const precargarProductosDePedidos = useCallback((datosPedidos) => {
    if (!Array.isArray(datosPedidos) || datosPedidos.length === 0) return;

    // Obtener productos actuales
    const productosActuales = queryClient.getQueryData('productos') || [];
    const mapaProductos = {};
    productosActuales.forEach(p => {
      if (p && p._id) {
        mapaProductos[p._id] = p;
      }
    });

    // Limitar a los primeros 20 pedidos para evitar sobrecarga
    const pedidosAProcesar = datosPedidos.slice(0, 20);

    pedidosAProcesar.forEach(pedido => {
      if (Array.isArray(pedido.productos)) {
        pedido.productos.forEach(item => {
          const productoId = typeof item.productoId === 'object' && item.productoId
            ? item.productoId._id
            : (typeof item.productoId === 'string' ? item.productoId : '');

          if (productoId && !mapaProductos[productoId]) {
            colaProductos.current.add(productoId);
          }
        });
      }
    });

    if (colaProductos.current.size > 0) {
      procesarColaProductos();
    }
  }, [queryClient, procesarColaProductos]);

  // Efecto para detectar cambios de tamaño de ventana
  useEffect(() => {
    const handleResize = () => {
      setAnchoVentana(window.innerWidth);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Efecto para cargar productos de pedidos al montar
  useEffect(() => {
    if (pedidos && pedidos.length > 0) {
      precargarProductosDePedidos(pedidos);
    }
  }, [pedidos, precargarProductosDePedidos]);

  // ======== FUNCIONES MANEJADORAS ========

  // Obtener información de usuario
  const obtenerInfoUsuario = useCallback((userId) => {
    // Si es un objeto con usuario y nombre
    if (typeof userId === 'object' && userId) {
      return {
        usuario: userId.usuario || "Usuario",
        name: userId.usuario || (userId.nombre
          ? `${userId.nombre} ${userId.apellido || ''}`
          : "Usuario")
      };
    }

    // Si es una cadena (ID), buscarlo en supervisores
    if (typeof userId === 'string') {
      // Buscar en supervisores
      const supervisorEncontrado = supervisores.find(s => s._id === userId);
      if (supervisorEncontrado) {
        return {
          usuario: supervisorEncontrado.usuario || "Supervisor",
          name: supervisorEncontrado.usuario || (supervisorEncontrado.nombre
            ? `${supervisorEncontrado.nombre} ${supervisorEncontrado.apellido || ''}`
            : "Supervisor")
        };
      }

      // Si es el usuario actual
      if (usuarioActual && usuarioActual._id === userId) {
        return {
          usuario: usuarioActual.usuario || "Usuario actual",
          name: usuarioActual.usuario || (usuarioActual.nombre
            ? `${usuarioActual.nombre} ${usuarioActual.apellido || ''}`
            : "Usuario actual")
        };
      }
    }

    // Si no se encuentra información
    return { usuario: "Usuario", name: "Usuario" };
  }, [supervisores, usuarioActual]);

  // Crear un nuevo pedido
  const manejarCrearPedido = async () => {
    // Validar estructura básica
    if (!formularioPedido.clienteId || !formularioPedido.nombreCliente) {
      addNotification("Debes seleccionar un cliente.", "warning");
      return;
    }

    if (!formularioPedido.productos || formularioPedido.productos.length === 0) {
      addNotification("Debes agregar al menos un producto.", "warning");
      return;
    }

    // Validar que haya un usuario asignado (supervisor seleccionado o usuario actual)
    if (!formularioPedido.userId) {
      addNotification("Error: Usuario no asignado", "error");
      return;
    }

    // Crear pedido con mutación
    crearPedidoMutation.mutate(formularioPedido);
  };

  // Actualizar un pedido existente
  const manejarActualizarPedido = async () => {
    if (!idPedidoActual) {
      addNotification("Ningún pedido seleccionado para actualizar.", "error");
      return;
    }

    // Actualizar pedido con mutación
    actualizarPedidoMutation.mutate({ id: idPedidoActual, data: formularioPedido });
  };

  // Preparar para eliminar pedido
  const confirmarEliminarPedido = (pedidoId) => {
    setPedidoAEliminar(pedidoId);
    setModalConfirmarEliminarAbierto(true);
  };

  // Eliminar pedido
  const manejarEliminarPedido = () => {
    if (!pedidoAEliminar) return;
    eliminarPedidoMutation.mutate(pedidoAEliminar);
  };

  // Preparar para editar pedido
  const manejarEditarPedido = async (pedido) => {
    setIdPedidoActual(pedido._id);

    try {
      // Determinar userId de forma segura
      const userId = typeof pedido.userId === 'object' && pedido.userId
        ? pedido.userId._id
        : (typeof pedido.userId === 'string' ? pedido.userId : '');

      // Si es un pedido de un supervisor y no el usuario actual, cargar sus clientes
      if (userId && userId !== usuarioActual?._id && esAdminOSuperSupervisor) {
        console.log(`Cargando clientes de supervisor ${userId} para editar`);
        setSupervisorSeleccionado(userId);

        // Forzar recarga de clientes
        queryClient.invalidateQueries(['clientes', userId]);
      }

      // Preparar productos con nombres y precios
      const productos = pedido.productos.map(p => {
        const productoId = typeof p.productoId === 'object' && p.productoId
          ? p.productoId._id
          : (typeof p.productoId === 'string' ? p.productoId : '');

        let nombre = p.nombre;
        let precio = p.precio || p.precioUnitario;

        // Si es un producto poblado, extraer datos
        if (typeof p.productoId === 'object' && p.productoId) {
          nombre = nombre || p.productoId.nombre;
          precio = typeof precio === 'number' ? precio : p.productoId.precio;
        }

        // Producto del catálogo
        const datosProductos = queryClient.getQueryData('productos') || [];
        const catalogoProductos = {};
        datosProductos.forEach(prod => {
          if (prod && prod._id) catalogoProductos[prod._id] = prod;
        });

        if (productoId && catalogoProductos[productoId]) {
          nombre = nombre || catalogoProductos[productoId].nombre;
          precio = typeof precio === 'number' ? precio : catalogoProductos[productoId].precio;
        }

        return {
          productoId: productoId,
          cantidad: typeof p.cantidad === 'number' ? p.cantidad : 0,
          nombre: nombre || "Producto no encontrado",
          precio: typeof precio === 'number' ? precio : 0
        };
      });

      // Encontrar cliente actual
      let datosCliente = null;
      let datosSubServicio = null;
      let datosSubUbicacion = null;

      // Si tiene estructura jerárquica completa
      if (pedido.cliente && pedido.cliente.clienteId) {
        // Encontrar el cliente en la lista completa
        const objetoCliente = typeof pedido.cliente.clienteId === 'string'
          ? todosLosClientes.find(c => c._id === pedido.cliente.clienteId)
          : pedido.cliente.clienteId;

        datosCliente = objetoCliente || null;

        // Encontrar el subservicio si existe
        if (datosCliente && pedido.cliente.subServicioId) {
          const subServicioId = typeof pedido.cliente.subServicioId === 'string'
            ? pedido.cliente.subServicioId
            : pedido.cliente.subServicioId._id;

          datosSubServicio = datosCliente.subServicios?.find(ss => ss._id === subServicioId) || null;

          // Encontrar la sublocation si existe
          if (datosSubServicio && pedido.cliente.subUbicacionId) {
            const subUbicacionId = typeof pedido.cliente.subUbicacionId === 'string'
              ? pedido.cliente.subUbicacionId
              : pedido.cliente.subUbicacionId._id;

            datosSubUbicacion = datosSubServicio.subUbicaciones?.find(su => su._id === subUbicacionId) || null;
          }
        }
      }

      // Actualizar formulario con estructura completa
      setFormularioPedido({
        // Cliente jerárquico
        clienteId: pedido.cliente?.clienteId?._id || pedido.cliente?.clienteId || '',
        subServicioId: pedido.cliente?.subServicioId?._id || pedido.cliente?.subServicioId || undefined,
        subUbicacionId: pedido.cliente?.subUbicacionId?._id || pedido.cliente?.subUbicacionId || undefined,
        nombreCliente: pedido.cliente?.nombreCliente || pedido.servicio || '',
        nombreSubServicio: pedido.cliente?.nombreSubServicio || pedido.seccionDelServicio || undefined,
        nombreSubUbicacion: pedido.cliente?.nombreSubUbicacion || undefined,

        // Campos de compatibilidad
        servicio: pedido.servicio || '',
        seccionDelServicio: pedido.seccionDelServicio || '',

        // Información de usuario
        userId: userId,
        supervisorId: typeof pedido.supervisorId === 'object' ? pedido.supervisorId._id : pedido.supervisorId,

        // Productos y estado
        productos: productos,
        detalle: pedido.detalle || " ",
        estado: pedido.estado || 'pendiente'
      });

      // Actualizar selecciones
      setClienteSeleccionado(datosCliente);
      setSubServicioSeleccionado(datosSubServicio);
      setSubUbicacionSeleccionada(datosSubUbicacion);

      // Abrir modal
      setModalCrearPedidoAbierto(true);
    } catch (error) {
      console.error("Error al preparar el pedido para edición.:", error);
      addNotification(`Error al preparar el pedido para la edición: ${error.message}`, "error");
    }
  };

  // Seleccionar cliente
  const manejarSeleccionCliente = (cliente) => {
    if (!cliente) return;

    // Actualizar estado de cliente seleccionado
    setClienteSeleccionado(cliente);
    setSubServicioSeleccionado(null);
    setSubUbicacionSeleccionada(null);

    // Actualizar formulario
    setFormularioPedido(prev => ({
      ...prev,
      clienteId: cliente._id,
      nombreCliente: cliente.nombre,
      servicio: cliente.servicio || cliente.nombre,
      seccionDelServicio: '',
      subServicioId: undefined,
      nombreSubServicio: undefined,
      subUbicacionId: undefined,
      nombreSubUbicacion: undefined
    }));

    // Si hay subservicios, mostrar modal para seleccionar
    if (cliente.subServicios && cliente.subServicios.length > 0) {
      setModalSeleccionarSubServicioAbierto(true);
    } else {
      // Si no hay subservicios, cerrar modal actual
      setModalSeleccionarClienteAbierto(false);
    }
  };

  // Seleccionar subservicio
  const manejarSeleccionSubServicio = (subServicio) => {
    if (!subServicio) return;

    // Actualizar estado de subservicio seleccionado
    setSubServicioSeleccionado(subServicio);
    setSubUbicacionSeleccionada(null);

    // Actualizar formulario
    setFormularioPedido(prev => ({
      ...prev,
      subServicioId: subServicio._id,
      nombreSubServicio: subServicio.nombre,
      seccionDelServicio: subServicio.nombre, // Para compatibilidad
      subUbicacionId: undefined,
      nombreSubUbicacion: undefined
    }));

    // Si hay sublocations, mostrar modal para seleccionar
    if (subServicio.subUbicaciones && subServicio.subUbicaciones.length > 0) {
      setModalSeleccionarSubUbicacionAbierto(true);
      setModalSeleccionarSubServicioAbierto(false);
    } else {
      // Si no hay sublocations, cerrar modales
      setModalSeleccionarSubServicioAbierto(false);
      setModalSeleccionarClienteAbierto(false);
    }
  };

  // Seleccionar sublocation
  const manejarSeleccionSubUbicacion = (subUbicacion) => {
    if (!subUbicacion) return;

    // Actualizar estado de sublocation seleccionada
    setSubUbicacionSeleccionada(subUbicacion);

    // Actualizar formulario
    setFormularioPedido(prev => ({
      ...prev,
      subUbicacionId: subUbicacion._id,
      nombreSubUbicacion: subUbicacion.nombre
    }));

    // Cerrar modales
    setModalSeleccionarSubUbicacionAbierto(false);
    setModalSeleccionarClienteAbierto(false);
  };

  // Añadir producto al pedido
  const manejarAgregarProducto = () => {
    if (!productoSeleccionado || productoSeleccionado === "none" || cantidadProducto <= 0) {
      addNotification("Selecciona un producto y una cantidad válida.", "warning");
      return;
    }

    // Encontrar producto en los datos
    const datosProductos = queryClient.getQueryData('productos') || [];
    const mapaProductos = {};
    datosProductos.forEach(p => {
      if (p && p._id) mapaProductos[p._id] = p;
    });

    const producto = mapaProductos[productoSeleccionado];
    if (!producto) {
      addNotification("Producto no encontrado.", "warning");
      return;
    }

    // Verificar stock
    if (producto.stock < cantidadProducto) {
      addNotification(`Stock insuficiente. Solo hay disponibles ${producto.stock} unidades.`, "warning");
      return;
    }

    // Verificar si el producto ya está en el pedido
    const indiceExistente = formularioPedido.productos.findIndex(p => {
      const id = typeof p.productoId === 'object' && p.productoId ? p.productoId._id : p.productoId;
      return id === productoSeleccionado;
    });

    if (indiceExistente >= 0) {
      // Actualizar cantidad
      const nuevaCantidad = formularioPedido.productos[indiceExistente].cantidad + cantidadProducto;

      // Verificar stock para cantidad total
      if (producto.stock < nuevaCantidad) {
        addNotification(`Stock insuficiente. Solo hay disponibles ${producto.stock} unidades.`, "warning");
        return;
      }

      const productosActualizados = [...formularioPedido.productos];
      productosActualizados[indiceExistente] = {
        ...productosActualizados[indiceExistente],
        cantidad: nuevaCantidad
      };

      setFormularioPedido(prev => ({
        ...prev,
        productos: productosActualizados
      }));

      addNotification(`Cantidad actualizada: ${producto.nombre} (${nuevaCantidad})`, "success");
    } else {
      // Añadir nuevo producto
      setFormularioPedido(prev => ({
        ...prev,
        productos: [
          ...prev.productos,
          {
            productoId: productoSeleccionado,
            cantidad: cantidadProducto,
            nombre: producto.nombre,
            precio: producto.precio
          }
        ]
      }));

      addNotification(`Producto agregado: ${producto.nombre} (${cantidadProducto})`, "success");
    }

    // Resetear selección
    setProductoSeleccionado("none");
    setCantidadProducto(1);
    setModalSeleccionarProductoAbierto(false);
  };

  // Eliminar producto del pedido
  const manejarEliminarProducto = (index) => {
    if (index < 0 || index >= formularioPedido.productos.length) {
      console.error(`Índice de producto no válido: ${index}`);
      return;
    }

    const productoAEliminar = formularioPedido.productos[index];
    const productoId = typeof productoAEliminar.productoId === 'object' && productoAEliminar.productoId
      ? productoAEliminar.productoId._id
      : (typeof productoAEliminar.productoId === 'string' ? productoAEliminar.productoId : '');

    // Obtener nombre del producto
    const datosProductos = queryClient.getQueryData('productos') || [];
    const mapaProductos = {};
    datosProductos.forEach(p => {
      if (p && p._id) mapaProductos[p._id] = p;
    });

    const nombreProducto = productoAEliminar.nombre ||
      (productoId && mapaProductos[productoId] ? mapaProductos[productoId].nombre : "Producto desconocido");

    const productosActualizados = [...formularioPedido.productos];
    productosActualizados.splice(index, 1);

    setFormularioPedido(prev => ({
      ...prev,
      productos: productosActualizados
    }));

    addNotification(`Producto eliminado: ${nombreProducto}`, "info");
  };

  // Resetear formulario de pedido
  const resetearFormularioPedido = () => {
    setFormularioPedido({
      clienteId: '',
      nombreCliente: '',
      servicio: '',
      seccionDelServicio: '',
      userId: usuarioActual?._id || '',
      supervisorId: supervisorSeleccionado || undefined,
      productos: [],
      detalle: ''
    });

    setIdPedidoActual(null);
    setProductoSeleccionado("none");
    setCantidadProducto(1);
    setClienteSeleccionado(null);
    setSubServicioSeleccionado(null);
    setSubUbicacionSeleccionada(null);
  };

  // Limpiar supervisor seleccionado
  const limpiarSupervisorSeleccionado = () => {
    if (esAdminOSuperSupervisor) {
      setSupervisorSeleccionado(null);

      // Recargar clientes para usuario actual
      if (usuarioActual?._id) {
        queryClient.invalidateQueries(['clientes', usuarioActual._id]);
      }
    }
  };

  // Calcular total del pedido
  const calcularTotalPedido = useCallback((productos) => {
    if (!productos || !Array.isArray(productos)) return 0;

    // Obtener productos del catálogo
    const datosProductos = queryClient.getQueryData('productos') || [];
    const mapaProductos = {};
    datosProductos.forEach(p => {
      if (p && p._id) mapaProductos[p._id] = p;
    });

    return productos.reduce((total, item) => {
      let precio = 0;
      let cantidad = 0;

      // Extraer precio de forma segura
      if (typeof item.precio === 'number') {
        precio = item.precio;
      } else if (typeof item.precioUnitario === 'number') {
        precio = item.precioUnitario;
      } else {
        const productoId = typeof item.productoId === 'object' && item.productoId
          ? item.productoId._id
          : (typeof item.productoId === 'string' ? item.productoId : '');

        if (productoId && mapaProductos[productoId]) {
          precio = mapaProductos[productoId].precio;
        }
      }

      // Extraer cantidad de forma segura
      cantidad = typeof item.cantidad === 'number' ? item.cantidad : 0;

      return total + (precio * cantidad);
    }, 0);
  }, [queryClient]);

  // Filtrar pedidos por fecha
  const manejarFiltroFecha = async () => {
    if (!filtroFecha.from || !filtroFecha.to) {
      addNotification("Selecciona ambas fechas para filtrar", "warning");
      return;
    }

    refrescarPedidos();
    setMostrarFiltrosMovil(false);
  };

  // Limpiar todos los filtros
  const limpiarTodosFiltros = () => {
    setTerminoBusqueda('');
    setFiltroFecha({ from: '', to: '' });
    setFiltroEstado('todos');
    setFiltroSupervisor('');
    setFiltroServicio('');
    setFiltroCliente({});
    refrescarPedidos();
    setMostrarFiltrosMovil(false);
    setPaginaActual(1);

    addNotification("Filtros limpiados", "info");
  };

  // Alternar vista de detalles del pedido
  const alternarDetallesPedido = useCallback((pedidoId) => {
    setDetallesPedidoAbierto(prev => ({
      ...prev,
      [pedidoId]: !prev[pedidoId]
    }));

    // Obtener productos actuales
    const datosProductos = queryClient.getQueryData('productos') || [];
    const mapaProductos = {};
    datosProductos.forEach(p => {
      if (p && p._id) mapaProductos[p._id] = p;
    });

    // Cargar productos faltantes
    const pedido = pedidos.find(o => o._id === pedidoId);
    if (pedido && Array.isArray(pedido.productos)) {
      pedido.productos.forEach(item => {
        const productoId = typeof item.productoId === 'object' && item.productoId
          ? item.productoId._id
          : (typeof item.productoId === 'string' ? item.productoId : '');

        if (productoId && !mapaProductos[productoId]) {
          colaProductos.current.add(productoId);
          procesarColaProductos();
        }
      });
    }
  }, [pedidos, queryClient, procesarColaProductos]);

  // Seleccionar supervisor
  const manejarSeleccionSupervisor = async (supervisorId) => {
    // Encontrar supervisor en la lista
    const supervisor = supervisores.find(s => s._id === supervisorId);

    setSupervisorSeleccionado(supervisorId);
    setFormularioPedido(prev => ({
      ...prev,
      userId: supervisorId,
      supervisorId: undefined, // Limpiar supervisorId si existía
      clienteId: '',
      nombreCliente: '',
      servicio: '',
      seccionDelServicio: '',
      productos: []
    }));

    // Cerrar modal de selección
    setSelectorSupervisorAbierto(false);

    // Cargar clientes para supervisor seleccionado
    try {
      await queryClient.invalidateQueries(['clientes', supervisorId]);

      // Abrir modal de creación después de cargar clientes
      setModalCrearPedidoAbierto(true);
    } catch (error) {
      console.error("Error al cargar los clientes del supervisor.", error);
      addNotification("Error al cargar los clientes del supervisor.", "error");
    }
  };

  // Crear nuevo pedido
  const manejarClickNuevoPedido = () => {
    resetearFormularioPedido();

    // Si es admin o supervisor de supervisores, primero mostrar selector de supervisor
    if (esAdminOSuperSupervisor) {
      setSelectorSupervisorAbierto(true);
    } else {
      // Para usuarios normales, abrir modal de creación directamente
      setModalCrearPedidoAbierto(true);
    }
  };

  // Descargar remito
  const manejarDescargarRemito = (pedidoId) => {
    descargarRemitoMutation.mutate(pedidoId);
  };

  // Cambiar página de tabla
  const manejarCambioPagina = (numeroPagina) => {
    setPaginaActual(numeroPagina);

    // Desplazar al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // En móvil, desplazar al inicio de la lista
    if (anchoVentana < 640 && refListaMovil.current) {
      refListaMovil.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ======== FILTRADO Y PAGINACIÓN ========

  // Productos en un mapa para acceso rápido
  const mapaProductos = useMemo(() => {
    const mapa = {};
    productos.forEach(producto => {
      if (producto && producto._id) {
        mapa[producto._id] = producto;
      }
    });
    return mapa;
  }, [productos]);

  // Filtrar pedidos por términos de búsqueda local
  const pedidosFiltrados = useMemo(() => {
    if (!Array.isArray(pedidos)) return [];

    return pedidos.filter(pedido => {
      if (!terminoBusqueda) return true;

      const busquedaMinuscula = terminoBusqueda.toLowerCase();
      const infoUsuario = obtenerInfoUsuario(pedido.userId);

      // Buscar en datos del pedido
      return (
        // Buscar en servicio o número de pedido
        (pedido.servicio || '').toLowerCase().includes(busquedaMinuscula) ||
        String(pedido.nPedido || '').includes(terminoBusqueda) ||

        // Buscar en sección
        (pedido.seccionDelServicio || '').toLowerCase().includes(busquedaMinuscula) ||

        // Buscar en estructura jerárquica
        (pedido.cliente?.nombreCliente || '').toLowerCase().includes(busquedaMinuscula) ||
        (pedido.cliente?.nombreSubServicio || '').toLowerCase().includes(busquedaMinuscula) ||
        (pedido.cliente?.nombreSubUbicacion || '').toLowerCase().includes(busquedaMinuscula) ||

        // Buscar por usuario
        infoUsuario.usuario.toLowerCase().includes(busquedaMinuscula) ||
        infoUsuario.name.toLowerCase().includes(busquedaMinuscula)
      );
    });
  }, [pedidos, terminoBusqueda, obtenerInfoUsuario]);

  // Configuración de elementos por página basada en tamaño de pantalla
  const elementosPorPagina = useMemo(() => {
    if (anchoVentana < 640) return 4; // Móvil
    if (anchoVentana < 1024) return 8; // Tablet
    return 12; // Escritorio
  }, [anchoVentana]);

  // Calcular paginación
  const pedidosPaginados = useMemo(() => {
    if (!Array.isArray(pedidosFiltrados)) return [];

    const indiceInicio = (paginaActual - 1) * elementosPorPagina;
    const indiceFin = indiceInicio + elementosPorPagina;
    return pedidosFiltrados.slice(indiceInicio, indiceFin);
  }, [pedidosFiltrados, paginaActual, elementosPorPagina]);

  // Calcular total de páginas
  const totalPaginas = useMemo(() => {
    return Math.ceil(pedidosFiltrados.length / elementosPorPagina);
  }, [pedidosFiltrados.length, elementosPorPagina]);

  // Información de paginación
  const infoPaginacion = useMemo(() => {
    const total = pedidosFiltrados.length;
    const inicio = (paginaActual - 1) * elementosPorPagina + 1;
    const fin = Math.min(inicio + elementosPorPagina - 1, total);

    return {
      total,
      inicio: total > 0 ? inicio : 0,
      fin: total > 0 ? fin : 0,
      rango: total > 0 ? `${inicio}-${fin} de ${total}` : "0 de 0"
    };
  }, [pedidosFiltrados.length, paginaActual, elementosPorPagina]);

  // ======== RENDERIZADO ========

  // Mostrar pantalla de carga
  const cargando = cargandoUsuario || (cargandoPedidos && pedidos.length === 0);
  if (cargando) {
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
              placeholder="Buscar por cliente, sección, usuario, celular..."
              className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refrescarPedidos()}
              disabled={actualizandoPedidos}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${actualizandoPedidos ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>

            <Button
              onClick={manejarClickNuevoPedido}
              className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              disabled={productos.length === 0 || (esAdminOSuperSupervisor ? supervisores.length === 0 : clientes.length === 0)}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Nuevo Pedido
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          {/* Filtros de fecha */}
          <div>
            <Label htmlFor="fechaInicio" className="text-[#29696B]">Fecha de inicio</Label>
            <Input
              id="fechaInicio"
              type="date"
              value={filtroFecha.from}
              onChange={(e) => setFiltroFecha({ ...filtroFecha, from: e.target.value })}
              className="w-full border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
            />
          </div>

          <div>
            <Label htmlFor="fechaFin" className="text-[#29696B]">Fecha de Fin</Label>
            <Input
              id="fechaFin"
              type="date"
              value={filtroFecha.to}
              onChange={(e) => setFiltroFecha({ ...filtroFecha, to: e.target.value })}
              className="w-full border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
            />
          </div>

          {/* Filtro de estado */}
          <div>
            <Label htmlFor="estado" className="text-[#29696B]">Estado</Label>
            <Select
              value={filtroEstado}
              onValueChange={setFiltroEstado}
            >
              <SelectTrigger id="estado" className="border-[#91BEAD] focus:ring-[#29696B]/20">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="aprobado">Aprobado</SelectItem>
                <SelectItem value="rechazado">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro de supervisor (solo admin) */}
          {esAdminOSuperSupervisor && (
            <div>
              <Label htmlFor="supervisor" className="text-[#29696B]">Supervisor</Label>
              <Select
                value={filtroSupervisor}
                onValueChange={setFiltroSupervisor}
              >
                <SelectTrigger id="supervisor" className="border-[#91BEAD] focus:ring-[#29696B]/20">
                  <SelectValue placeholder="Todos los supervisores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {supervisores.map(supervisor => (
                    <SelectItem key={supervisor._id} value={supervisor._id}>
                      {supervisor.usuario || (supervisor.nombre ? `${supervisor.nombre} ${supervisor.apellido || ''}` : 'Sin Nombre')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filtro de cliente */}
          <div>
            <Label htmlFor="cliente" className="text-[#29696B]">Cliente</Label>
            <Select
              value={filtroCliente.clienteId || ''}
              onValueChange={(value) => {
                if (value && value !== 'all') {
                  // Si selecciona un cliente específico
                  setFiltroCliente({ clienteId: value });
                } else {
                  // Si selecciona "Todos"
                  setFiltroCliente({});
                }
              }}
            >
              <SelectTrigger id="cliente" className="border-[#91BEAD] focus:ring-[#29696B]/20">
                <SelectValue placeholder="Todos los clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {todosLosClientes.map(cliente => (
                  <SelectItem key={cliente._id} value={cliente._id}>
                    {cliente.nombre || cliente.servicio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={manejarFiltroFecha}
            className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
          >
            <Filter className="w-4 h-4 mr-2" />
            Aplicar Filtros
          </Button>

          {(filtroFecha.from || filtroFecha.to || terminoBusqueda || filtroEstado !== 'todos' || filtroSupervisor || filtroCliente.clienteId) && (
            <Button
              variant="ghost"
              onClick={limpiarTodosFiltros}
              className="text-[#7AA79C] hover:text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Limpiar Filtros
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
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setMostrarFiltrosMovil(!mostrarFiltrosMovil)}
            className="flex-shrink-0 border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
          >
            <Filter className="w-4 h-4" />
          </Button>

          <Button
            size="icon"
            onClick={manejarClickNuevoPedido}
            className="flex-shrink-0 bg-[#29696B] hover:bg-[#29696B]/90 text-white"
            disabled={!esAdminOSuperSupervisor && (clientes.length === 0 || productos.length === 0)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {mostrarFiltrosMovil && (
          <div className="p-4 bg-[#DFEFE6]/30 rounded-lg border border-[#91BEAD]/20 space-y-4">
            <h3 className="font-medium text-sm text-[#29696B]">Filtros Avanzados</h3>

            {/* Filtros de fecha */}
            <div className="space-y-2">
              <div>
                <Label htmlFor="mFechaInicio" className="text-xs text-[#29696B]">Fecha de Inicio</Label>
                <Input id="mFechaInicio"
                  type="date"
                  value={filtroFecha.from}
                  onChange={(e) => setFiltroFecha({ ...filtroFecha, from: e.target.value })}
                  className="w-full text-sm border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                />
              </div>

              <div>
                <Label htmlFor="mFechaFin" className="text-xs text-[#29696B]">Fecha de Fin</Label>
                <Input
                  id="mFechaFin"
                  type="date"
                  value={filtroFecha.to}
                  onChange={(e) => setFiltroFecha({ ...filtroFecha, to: e.target.value })}
                  className="w-full text-sm border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                />
              </div>

              {/* Filtro de estado */}
              <div>
                <Label htmlFor="mEstado" className="text-xs text-[#29696B]">Estado</Label>
                <Select
                  value={filtroEstado}
                  onValueChange={setFiltroEstado}
                >
                  <SelectTrigger id="mEstado" className="text-sm border-[#91BEAD] focus:ring-[#29696B]/20">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="aprobado">Aprobado</SelectItem>
                    <SelectItem value="rechazado">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de supervisor (solo admin) */}
              {esAdminOSuperSupervisor && (
                <div>
                  <Label htmlFor="mSupervisor" className="text-xs text-[#29696B]">Supervisor</Label>
                  <Select
                    value={filtroSupervisor}
                    onValueChange={setFiltroSupervisor}
                  >
                    <SelectTrigger id="mSupervisor" className="text-sm border-[#91BEAD] focus:ring-[#29696B]/20">
                      <SelectValue placeholder="Todos los supervisores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {supervisores.map(supervisor => (
                        <SelectItem key={supervisor._id} value={supervisor._id}>
                          {supervisor.usuario || (supervisor.nombre ? `${supervisor.nombre} ${supervisor.apellido || ''}` : 'Sin Nombre')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Filtro de cliente */}
              <div>
                <Label htmlFor="mCliente" className="text-xs text-[#29696B]">Cliente</Label>
                <Select
                  value={filtroCliente.clienteId || ''}
                  onValueChange={(value) => {
                    if (value) {
                      setFiltroCliente({ clienteId: value });
                    } else {
                      setFiltroCliente({});
                    }
                  }}
                >
                  <SelectTrigger id="mCliente" className="text-sm border-[#91BEAD] focus:ring-[#29696B]/20">
                    <SelectValue placeholder="Todos los clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {todosLosClientes.map(cliente => (
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
                onClick={limpiarTodosFiltros}
                className="text-xs border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/50"
              >
                Limpiar
              </Button>

              <Button
                size="sm"
                onClick={manejarFiltroFecha}
                className="text-xs bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              >
                Aplicar Filtros
              </Button>
            </div>
          </div>
        )}

        {/* Indicador de filtros activos */}
        {(filtroFecha.from || filtroFecha.to || filtroEstado !== 'todos' || filtroSupervisor || filtroCliente.clienteId) && (
          <div className="px-3 py-2 bg-[#DFEFE6]/50 rounded-md text-xs text-[#29696B] flex items-center justify-between border border-[#91BEAD]/20">
            <div className="flex items-center space-x-2">
              {(filtroFecha.from || filtroFecha.to) && (
                <span className="flex items-center">
                  <CalendarRange className="w-3 h-3 mr-1" />
                  {filtroFecha.from && new Date(filtroFecha.from).toLocaleDateString()}
                  {filtroFecha.from && filtroFecha.to && ' - '}
                  {filtroFecha.to && new Date(filtroFecha.to).toLocaleDateString()}
                </span>
              )}

              {filtroEstado !== 'todos' && (
                <span className="flex items-center">
                  {filtroEstado === 'pendiente' && <Clock className="w-3 h-3 mr-1 text-yellow-600" />}
                  {filtroEstado === 'aprobado' && <CheckCircle className="w-3 h-3 mr-1 text-green-600" />}
                  {filtroEstado === 'rechazado' && <XCircle className="w-3 h-3 mr-1 text-red-600" />}
                  {filtroEstado}
                </span>
              )}

              {filtroSupervisor && (
                <span className="flex items-center">
                  <User className="w-3 h-3 mr-1" />
                  {supervisores.find(s => s._id === filtroSupervisor)?.usuario || 'Supervisor'}
                </span>
              )}

              {filtroCliente.clienteId && (
                <span className="flex items-center">
                  <Building className="w-3 h-3 mr-1" />
                  {todosLosClientes.find(c => c._id === filtroCliente.clienteId)?.nombre || 'Cliente'}
                </span>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={limpiarTodosFiltros}
              className="h-6 text-xs px-2 text-[#7AA79C] hover:text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Indicador de carga o actualización */}
      {actualizandoPedidos && (
        <div className="bg-[#DFEFE6]/30 rounded-lg p-2 mb-4 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-[#29696B] animate-spin mr-2" />
          <span className="text-sm text-[#29696B]">Actualizando datos...</span>
        </div>
      )}

      {/* Sin resultados */}
      {!cargando && pedidosFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-[#7AA79C] border border-[#91BEAD]/20">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
            <ShoppingCart className="w-6 h-6 text-[#29696B]" />
          </div>

          <p>
            No existen pedidos
            {terminoBusqueda && ` que coincidan con "${terminoBusqueda}"`}
            {(filtroFecha.from || filtroFecha.to) && " en el rango de fechas seleccionado"}
            {filtroEstado !== 'todos' && ` con estado ${filtroEstado}`}
            {filtroSupervisor && " para el supervisor seleccionado"}
            {filtroCliente.clienteId && " para el cliente seleccionado"}
          </p>

          {(clientes.length === 0 || productos.length === 0) && (
            <p className="mt-4 text-sm text-red-500 flex items-center justify-center">
              <Info className="w-4 h-4 mr-2" />
              {clientes.length === 0
                ? "No tienes clientes asignados. Contacta a un administrador."
                : "No hay productos disponibles para crear pedidos."}
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Tabla de pedidos para pantallas medianas y grandes */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden hidden md:block border border-[#91BEAD]/20">
            <div className="w-full">
              <table className="w-full table-auto">
                <thead className="bg-[#DFEFE6]/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                      Pedido #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                      Cliente / Ubicación
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
                  {pedidosPaginados.map((pedido) => (
                    <React.Fragment key={pedido._id}>
                      <tr className="hover:bg-[#DFEFE6]/10 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Hash className="w-4 h-4 text-[#7AA79C] mr-2" />
                            <div className="text-sm font-medium text-[#29696B]">
                              {pedido.nPedido}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[#29696B]">
                            {new Date(pedido.fecha).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-[#7AA79C]">
                            {new Date(pedido.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Columna unificada Cliente/Ubicación */}
                        <td className="px-6 py-4 whitespace-normal">
                          <InformacionClienteUbicacion order={pedido} />
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[#29696B]">
                            {obtenerInfoUsuario(pedido.userId).usuario}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <BadgeEstadoPedido
                            status={pedido.estado || 'pendiente'}
                            orderId={pedido._id}
                          />
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-[#91BEAD] text-[#29696B] bg-[#DFEFE6]/30">
                              {pedido.productos && Array.isArray(pedido.productos)
                                ? `${pedido.productos.length} Producto${pedido.productos.length !== 1 ? 's' : ''}`
                                : '0 productos'}
                            </Badge>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => alternarDetallesPedido(pedido._id)}
                              className="text-[#7AA79C] hover:text-[#29696B] hover:bg-[#DFEFE6]/30"
                            >
                              {detallesPedidoAbierto[pedido._id] ? (
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
                                    onClick={() => manejarDescargarRemito(pedido._id)}
                                    className="text-[#29696B] hover:bg-[#DFEFE6]/30"
                                    disabled={descargarRemitoMutation.isLoading}
                                  >
                                    {descargarRemitoMutation.isLoading ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Download className="w-4 h-4" />
                                    )}
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
                                    onClick={() => manejarEditarPedido(pedido)}
                                    disabled={actualizarPedidoMutation.isLoading}
                                    className="text-[#29696B] hover:bg-[#DFEFE6]/30"
                                  >
                                    {actualizarPedidoMutation.isLoading ? (
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
                                    onClick={() => confirmarEliminarPedido(pedido._id)}
                                    disabled={eliminarPedidoMutation.isLoading}
                                    className="text-red-600 hover:bg-red-50"
                                  >
                                    {eliminarPedidoMutation.isLoading && pedidoAEliminar === pedido._id ? (
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

                      {/* Detalles expandibles del pedido */}
                      {detallesPedidoAbierto[pedido._id] && (
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
                                      <th className="px-4 py-2 text-right text-xs font-medium text-[#29696B]">Precio x Unidad</th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-[#29696B]">Subtotal</th>
                                    </tr>
                                  </thead>

                                  <tbody className="divide-y divide-[#91BEAD]/20 bg-white">
                                    {Array.isArray(pedido.productos) && pedido.productos.map((item, index) => (
                                      <tr key={index} className="hover:bg-[#DFEFE6]/20">
                                        <DetalleProducto
                                          item={item}
                                          mapaProductos={mapaProductos}
                                          onProductLoad={obtenerProductoPorId}
                                        />
                                      </tr>
                                    ))}

                                    {/* Total */}
                                    <tr className="bg-[#DFEFE6]/40 font-medium">
                                      <td colSpan={3} className="px-4 py-2 text-right text-[#29696B]">Total:</td>
                                      <td className="px-4 py-2 text-right font-bold text-[#29696B]">
                                        <TotalPedido
                                          order={pedido}
                                          mapaProductos={mapaProductos}
                                          onProductLoad={obtenerProductoPorId}
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
                                  onClick={() => manejarDescargarRemito(pedido._id)}
                                  className="text-xs h-8 border-[#29696B] text-[#29696B] hover:bg-[#DFEFE6]/30"
                                  disabled={descargarRemitoMutation.isLoading}
                                >
                                  {descargarRemitoMutation.isLoading ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <Download className="w-3 h-3 mr-1" />
                                  )}
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

            {/* Paginación para tabla */}
            {pedidosFiltrados.length > elementosPorPagina && (
              <div className="py-4 border-t border-[#91BEAD]/20 px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
                <div className="text-sm text-[#7AA79C]">
                  Mostrando {infoPaginacion.rango}
                </div>

                <Pagination
                  totalItems={pedidosFiltrados.length}
                  itemsPerPage={elementosPorPagina}
                  currentPage={paginaActual}
                  onPageChange={manejarCambioPagina}
                />
              </div>
            )}
          </div>

          {/* Vista de tarjetas para móvil */}
          <div ref={refListaMovil} id="mobile-orders-list" className="md:hidden grid grid-cols-1 gap-4">
            {/* Paginación superior en móvil */}
            {pedidosFiltrados.length > elementosPorPagina && (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20">
                <Pagination
                  totalItems={pedidosFiltrados.length}
                  itemsPerPage={elementosPorPagina}
                  currentPage={paginaActual}
                  onPageChange={manejarCambioPagina}
                  showFirstLast={false}
                  showNumbers={false}
                />
              </div>
            )}

            {actualizandoPedidos && pedidosFiltrados.length === 0 ? (
              <EsqueletoPedidos count={3} />
            ) : (
              pedidosPaginados.map(pedido => (
                <Card key={pedido._id} className="overflow-hidden shadow-sm border border-[#91BEAD]/20">
                  <CardHeader className="pb-2 bg-[#DFEFE6]/20">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-sm font-medium flex items-center text-[#29696B]">
                          <Building className="w-4 h-4 text-[#7AA79C] mr-1 flex-shrink-0" />
                          <span className="truncate">
                            {truncarTexto(pedido.cliente?.nombreCliente || pedido.servicio || "Ningún cliente.")}
                          </span>
                        </CardTitle>

                        {(pedido.cliente?.nombreSubServicio || pedido.seccionDelServicio) && (
                          <div className="text-xs text-[#7AA79C] flex items-center mt-1">
                            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">
                              {truncarTexto(pedido.cliente?.nombreSubServicio || pedido.seccionDelServicio)}
                              {pedido.cliente?.nombreSubUbicacion && ` (${truncarTexto(pedido.cliente.nombreSubUbicacion, 15)})`}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {/* Badge para número de pedido */}
                        <Badge variant="outline" className="text-xs border-[#91BEAD] text-[#29696B] bg-[#DFEFE6]/20">
                          <Hash className="w-3 h-3 mr-1" />
                          {pedido.nPedido}
                        </Badge>

                        {/* Badge para fecha */}
                        <Badge variant="outline" className="text-xs border-[#91BEAD] text-[#29696B] bg-[#DFEFE6]/20">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(pedido.fecha).toLocaleDateString()}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="py-2">
                    <div className="text-xs space-y-1">
                      <div className="flex items-center">
                        <User className="w-3 h-3 text-[#7AA79C] mr-1" />
                        <span className="text-[#29696B]">{obtenerInfoUsuario(pedido.userId).usuario}</span>
                      </div>

                      {/* Estado del pedido */}
                      <div className="flex items-center">
                        {pedido.estado === 'aprobado' && <CheckCircle className="w-3 h-3 text-green-600 mr-1" />}
                        {pedido.estado === 'rechazado' && <XCircle className="w-3 h-3 text-red-600 mr-1" />}
                        {(!pedido.estado || pedido.estado === 'pendiente') && <Clock className="w-3 h-3 text-yellow-600 mr-1" />}
                        <span className={`text-[#29696B] flex items-center`}>
                          Estado:
                          <span
                            className={`ml-1 ${pedido.estado === 'aprobado'
                                ? 'text-green-600'
                                : pedido.estado === 'rechazado'
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                              }`}
                          >
                            {pedido.estado === 'aprobado'
                              ? 'Aprobado'
                              : pedido.estado === 'rechazado'
                                ? 'Rechazado'
                                : 'Pendiente'
                            }
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center">
                        <ShoppingCart className="w-3 h-3 text-[#7AA79C] mr-1" />
                        <span className="text-[#29696B]">
                          {Array.isArray(pedido.productos)
                            ? `${pedido.productos.length} producto${pedido.productos.length !== 1 ? 's' : ''}`
                            : '0 productos'}
                        </span>
                      </div>
                    </div>

                    {/* Detalles expandibles en móvil con Accordion */}
                    <Accordion
                      type="single"
                      collapsible
                      className="mt-2"
                      value={detallesPedidoAbierto[pedido._id] ? "details" : ""}
                    >
                      <AccordionItem value="details" className="border-0">
                        <AccordionTrigger
                          onClick={() => alternarDetallesPedido(pedido._id)}
                          className="py-1 text-xs font-medium text-[#29696B]"
                        >
                          Ver detalles
                        </AccordionTrigger>

                        <AccordionContent>
                          <div className="text-xs pt-2 pb-1">
                            <div className="font-medium mb-2 text-[#29696B]">Productos:</div>

                            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                              {Array.isArray(pedido.productos) && pedido.productos.map((item, index) => (
                                <DetalleProductoMovil
                                  key={index}
                                  item={item}
                                  mapaProductos={mapaProductos}
                                  onProductLoad={obtenerProductoPorId}
                                />
                              ))}
                            </div>

                            <div className="flex justify-between items-center pt-2 font-medium text-sm border-t border-[#91BEAD]/20 mt-2">
                              <span className="text-[#29696B]">Total:</span>
                              <div className="flex items-center text-[#29696B]">
                                <DollarSign className="w-3 h-3 mr-1" />
                                <TotalPedido
                                  order={pedido}
                                  mapaProductos={mapaProductos}
                                  onProductLoad={obtenerProductoPorId}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 pt-2 border-t border-[#91BEAD]/20">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => manejarDescargarRemito(pedido._id)}
                              className="w-full text-xs h-8 border-[#29696B] text-[#29696B] hover:bg-[#DFEFE6]/30"
                              disabled={descargarRemitoMutation.isLoading}
                            >
                              {descargarRemitoMutation.isLoading ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3 mr-1" />
                              )}
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
                      value={pedido.estado || 'pendiente'}
                      onValueChange={(value) => {
                        // Actualizar estado del pedido
                        queryClient.setQueryData(['pedidos'], (oldData) => {
                          return oldData?.map(o => o._id === pedido._id ? { ...o, estado: value } : o);
                        });
                        // Llamar a API para actualizar estado
                        ServicioPedidos.actualizarEstadoPedido(pedido._id, value)
                          .then(() => {
                            queryClient.invalidateQueries(['pedidos']);
                          })
                          .catch((error) => {
                            addNotification(`Error al actualizar estado: ${error.message}`, "error");
                            // Revertir actualización optimista
                            queryClient.invalidateQueries(['pedidos']);
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
                      onClick={() => manejarEditarPedido(pedido)}
                      disabled={actualizarPedidoMutation.isLoading}
                    >
                      {actualizarPedidoMutation.isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileEdit className="w-4 h-4" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-red-600 hover:bg-red-50"
                      onClick={() => confirmarEliminarPedido(pedido._id)}
                      disabled={eliminarPedidoMutation.isLoading}
                    >
                      {eliminarPedidoMutation.isLoading && pedidoAEliminar === pedido._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}

            {/* Mensaje mostrando página actual y total */}
            {pedidosFiltrados.length > elementosPorPagina && (
              <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm">
                <span className="text-[#29696B] font-medium">
                  Página {paginaActual} de {totalPaginas}
                </span>
              </div>
            )}

            {/* Paginación inferior para móvil */}
            {pedidosFiltrados.length > elementosPorPagina && (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20 mt-2">
                <Pagination
                  totalItems={pedidosFiltrados.length}
                  itemsPerPage={elementosPorPagina}
                  currentPage={paginaActual}
                  onPageChange={manejarCambioPagina}
                  showFirstLast={false}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* ======== MODALES ======== */}

      {/* Modal Crear/Editar Pedido */}
      <Dialog
        open={modalCrearPedidoAbierto}
        onOpenChange={(open) => {
          setModalCrearPedidoAbierto(open);
          if (!open) {
            // Limpiar supervisor seleccionado al cerrar modal
            limpiarSupervisorSeleccionado();
          }
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">
              {idPedidoActual
                ? `Editar pedido #${pedidos.find(o => o._id === idPedidoActual)?.nPedido || ''}`
                : esAdminOSuperSupervisor && supervisorSeleccionado
                  ? `Nuevo Pedido (Para: ${supervisores.find(s => s._id === supervisorSeleccionado)?.usuario || 'Supervisor'})`
                  : 'Nuevo Pedido'
              }
            </DialogTitle>
            {idPedidoActual && (
              <DialogDescription className="text-[#7AA79C]">
                Modificar los detalles del pedido
              </DialogDescription>
            )}
            {esAdminOSuperSupervisor && supervisorSeleccionado && !idPedidoActual && (
              <DialogDescription className="text-[#7AA79C]">
                Creando pedido para el Supervisor: {
                  supervisores.find(s => s._id === supervisorSeleccionado)?.usuario ||
                  'Supervisor seleccionado'
                }
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Indicador de supervisor seleccionado */}
          {esAdminOSuperSupervisor && supervisorSeleccionado && (
            <div className="bg-[#DFEFE6]/30 p-3 rounded-md border border-[#91BEAD]/30 mb-4">
              <div className="flex items-center text-[#29696B]">
                <User className="w-4 h-4 text-[#7AA79C] mr-2" />
                <span className="font-medium">
                  {(() => {
                    // Encontrar supervisor en la lista de supervisores
                    const supervisor = supervisores.find(s => s._id === supervisorSeleccionado);
                    if (!supervisor) return "Supervisor seleccionado";

                    return supervisor.usuario || "Supervisor seleccionado";
                  })()}
                </span>
              </div>
            </div>
          )}

          <div className="py-4 space-y-6">
            {/* Sección para cambiar supervisor (solo admin y al editar) */}
            {esAdminOSuperSupervisor && idPedidoActual && (
              <div>
                <h2 className="text-lg font-medium mb-4 flex items-center text-[#29696B]">
                  <User className="w-5 h-5 mr-2 text-[#7AA79C]" />
                  Supervisor Asignado
                </h2>

                <Select
                  value={formularioPedido.userId}
                  onValueChange={(value) => {
                    // Cambiar supervisor y recargar sus clientes
                    setFormularioPedido(prev => ({
                      ...prev,
                      userId: value,
                      clienteId: '',
                      nombreCliente: '',
                      servicio: '',
                      seccionDelServicio: '',
                      subServicioId: undefined,
                      subUbicacionId: undefined
                    }));
                    setSupervisorSeleccionado(value);
                    setClienteSeleccionado(null);
                    setSubServicioSeleccionado(null);
                    setSubUbicacionSeleccionada(null);
                    queryClient.invalidateQueries(['clientes', value]);
                  }}
                >
                  <SelectTrigger className="border-[#91BEAD] focus:ring-[#29696B]/20">
                    <SelectValue placeholder="Seleccionar Supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisores.map(supervisor => (
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
                Seleccionar Cliente
              </h2>

              {cargandoClientes ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-6 h-6 text-[#29696B] animate-spin" />
                </div>
              ) : clientes.length === 0 ? (
                <Alert className="bg-[#DFEFE6]/30 border border-[#91BEAD] text-[#29696B]">
                  <AlertDescription>
                    {esAdminOSuperSupervisor && supervisorSeleccionado
                      ? "El supervisor seleccionado no tiene clientes asignados."
                      : "No tienes clientes asignados. Contacta a un administrador para que te asigne clientes."
                    }
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {/* Cliente actualmente seleccionado */}
                  {clienteSeleccionado && (
                    <div className="p-3 bg-[#DFEFE6]/30 rounded-md border border-[#91BEAD]/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-[#29696B] flex items-center">
                            <Building className="w-4 h-4 text-[#7AA79C] mr-2" />
                            {clienteSeleccionado.nombre || clienteSeleccionado.servicio || 'Cliente seleccionado'}
                          </div>

                          {/* Mostrar subservicio si está seleccionado */}
                          {subServicioSeleccionado && (
                            <div className="text-sm text-[#7AA79C] flex items-center mt-1">
                              <MapPin className="w-3 h-3 text-[#7AA79C] mr-1" />
                              {subServicioSeleccionado.nombre}

                              {/* Mostrar sububicación si está seleccionada */}
                              {subUbicacionSeleccionada && (
                                <span className="ml-1">
                                  ({subUbicacionSeleccionada.nombre})
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setModalSeleccionarClienteAbierto(true)}
                          className="text-xs text-[#29696B] hover:bg-[#DFEFE6]/40"
                        >
                          Cambiar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Botón para seleccionar cliente si no hay ninguno seleccionado */}
                  {!clienteSeleccionado && (
                    <Button
                      variant="outline"
                      onClick={() => setModalSeleccionarClienteAbierto(true)}
                      className="w-full border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
                    >
                      <Building className="w-4 h-4 mr-2 text-[#7AA79C]" />
                      Seleccionar Cliente
                    </Button>
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
                value={formularioPedido.estado || 'pendiente'}
                onValueChange={(value) => setFormularioPedido(prev => ({ ...prev, estado: value }))}
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
                  onClick={() => setModalSeleccionarProductoAbierto(true)}
                  disabled={!clienteSeleccionado || productos.length === 0}
                  className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Producto
                </Button>
              </div>

              {!formularioPedido.productos || formularioPedido.productos.length === 0 ? (
                <div className="text-center py-8 text-[#7AA79C] border border-dashed border-[#91BEAD]/40 rounded-md bg-[#DFEFE6]/10">
                  No hay productos en el pedido.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {formularioPedido.productos.map((item, index) => {
                    const productoId = typeof item.productoId === 'object' && item.productoId
                      ? item.productoId._id
                      : (typeof item.productoId === 'string' ? item.productoId : '');

                    const producto = productoId ? mapaProductos[productoId] : undefined;
                    const nombre = item.nombre || (producto?.nombre || 'Producto no encontrado');
                    const precio = typeof item.precio === 'number' ? item.precio :
                      (typeof item.precioUnitario === 'number' ? item.precioUnitario :
                        (producto?.precio || 0));
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
                            onClick={() => manejarEliminarProducto(index)}
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
              {formularioPedido.productos && formularioPedido.productos.length > 0 && (
                <div className="flex justify-between items-center p-3 bg-[#DFEFE6]/40 rounded-md mt-4 border border-[#91BEAD]/30">
                  <div className="font-medium text-[#29696B]">Total</div>
                  <div className="font-bold text-lg text-[#29696B]">${calcularTotalPedido(formularioPedido.productos).toFixed(2)}</div>
                </div>
              )}
            </div>

            {/* Notas */}
            <div>
              <Label htmlFor="detalle" className="text-[#29696B]">Notas (opcional)</Label>
              <textarea
                id="detalle"
                value={formularioPedido.detalle === ' ' ? '' : formularioPedido.detalle}
                onChange={(e) => setFormularioPedido(prev => ({ ...prev, detalle: e.target.value }))}
                className="w-full border-[#91BEAD] rounded-md p-2 mt-1 focus:ring-[#29696B]/20 focus:border-[#29696B]"
                rows={3}
                placeholder="Agrega notas adicionales aquí..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setModalCrearPedidoAbierto(false);
                resetearFormularioPedido();
                if (esAdminOSuperSupervisor) {
                  limpiarSupervisorSeleccionado();
                }
              }}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Cancelar
            </Button>

            <Button
              onClick={idPedidoActual ? manejarActualizarPedido : manejarCrearPedido}
              disabled={
                crearPedidoMutation.isLoading ||
                actualizarPedidoMutation.isLoading ||
                !formularioPedido.productos ||
                formularioPedido.productos.length === 0 ||
                !formularioPedido.clienteId
              }
              className="bg-[#29696B] hover:bg-[#29696B]/90 text-white disabled:bg-[#8DB3BA] disabled:text-white/70"
            >
              {crearPedidoMutation.isLoading || actualizarPedidoMutation.isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </span>
              ) : idPedidoActual ? 'Actualizar Pedido' : 'Crear Pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Selección de Supervisor */}
      <Dialog open={selectorSupervisorAbierto} onOpenChange={setSelectorSupervisorAbierto}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">Seleccionar Supervisor</DialogTitle>
            <DialogDescription className="text-[#7AA79C]">
              Elige el supervisor para quien deseas crear el pedido.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {cargandoSupervisores ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-8 w-8 text-[#29696B] animate-spin" />
              </div>
            ) : supervisores.length === 0 ? (
              <Alert className="bg-[#DFEFE6]/30 border border-[#91BEAD] text-[#29696B]">
                <AlertDescription>
                  No hay supervisores disponibles. Contacta al administrador del sistema.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {supervisores.map((supervisor) => (
                  <div
                    key={supervisor._id}
                    className="p-3 border border-[#91BEAD] rounded-md hover:bg-[#DFEFE6]/30 cursor-pointer transition-colors"
                    onClick={() => manejarSeleccionSupervisor(supervisor._id)}
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
              onClick={() => setSelectorSupervisorAbierto(false)}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Selección de Cliente */}
      <Dialog open={modalSeleccionarClienteAbierto} onOpenChange={setModalSeleccionarClienteAbierto}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">Seleccionar Cliente</DialogTitle>
            <DialogDescription className="text-[#7AA79C]">
              Selecciona el cliente para este pedido
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Búsqueda de clientes */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar clientes..."
                className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
              />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {clientes.map((cliente) => (
                <div
                  key={cliente._id}
                  className="p-3 border border-[#91BEAD] rounded-md hover:bg-[#DFEFE6]/30 cursor-pointer transition-colors"
                  onClick={() => manejarSeleccionCliente(cliente)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[#29696B]">
                        {cliente.nombre || cliente.servicio}
                      </div>
                      {cliente.subServicios?.length > 0 && (
                        <div className="text-xs text-[#7AA79C]">
                          {cliente.subServicios.length}
                          {cliente.subServicios.length === 1 ? ' subservicio' : ' subservicios'}
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
              onClick={() => setModalSeleccionarClienteAbierto(false)}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Selección de Subservicio */}
      <Dialog open={modalSeleccionarSubServicioAbierto} onOpenChange={setModalSeleccionarSubServicioAbierto}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">Seleccionar Subservicio</DialogTitle>
            <DialogDescription className="text-[#7AA79C]">
              Selecciona el subservicio para {clienteSeleccionado?.nombre || clienteSeleccionado?.servicio || 'este cliente'}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {/* Opción para "ningún subservicio" */}
              <div
                className="p-3 border border-[#91BEAD] rounded-md hover:bg-[#DFEFE6]/30 cursor-pointer transition-colors"
                onClick={() => {
                  // Actualizar formulario sin subservicio
                  setFormularioPedido(prev => ({
                    ...prev,
                    subServicioId: undefined,
                    nombreSubServicio: undefined,
                    seccionDelServicio: '',
                    subUbicacionId: undefined,
                    nombreSubUbicacion: undefined
                  }));

                  setSubServicioSeleccionado(null);
                  setSubUbicacionSeleccionada(null);
                  setModalSeleccionarSubServicioAbierto(false);
                  setModalSeleccionarClienteAbierto(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-[#29696B]">
                    Ningún subservicio específico
                  </div>
                  <Check className="w-4 h-4 text-[#7AA79C]" />
                </div>
              </div>

              {/* Lista de subservicios */}
              {clienteSeleccionado?.subServicios?.map((subServicio) => (
                <div
                  key={subServicio._id}
                  className="p-3 border border-[#91BEAD] rounded-md hover:bg-[#DFEFE6]/30 cursor-pointer transition-colors"
                  onClick={() => manejarSeleccionSubServicio(subServicio)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[#29696B]">
                        {subServicio.nombre}
                      </div>
                      {subServicio.subUbicaciones?.length > 0 && (
                        <div className="text-xs text-[#7AA79C]">
                          {subServicio.subUbicaciones.length}
                          {subServicio.subUbicaciones.length === 1 ? ' sububicación' : ' sububicaciones'}
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
                setModalSeleccionarSubServicioAbierto(false);
                // Si se cancela, volver al modal de cliente
                setModalSeleccionarClienteAbierto(true);
              }}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Volver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Selección de Sububicación */}
      <Dialog open={modalSeleccionarSubUbicacionAbierto} onOpenChange={setModalSeleccionarSubUbicacionAbierto}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">Seleccionar Sububicación</DialogTitle>
            <DialogDescription className="text-[#7AA79C]">
              Selecciona la sububicación para {subServicioSeleccionado?.nombre || 'este subservicio'}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {/* Opción para "ninguna sububicación" */}
              <div
                className="p-3 border border-[#91BEAD] rounded-md hover:bg-[#DFEFE6]/30 cursor-pointer transition-colors"
                onClick={() => {
                  // Actualizar formulario sin sububicación
                  setFormularioPedido(prev => ({
                    ...prev,
                    subUbicacionId: undefined,
                    nombreSubUbicacion: undefined
                  }));

                  setSubUbicacionSeleccionada(null);
                  setModalSeleccionarSubUbicacionAbierto(false);
                  setModalSeleccionarClienteAbierto(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-[#29696B]">
                    Ninguna sububicación específica
                  </div>
                  <Check className="w-4 h-4 text-[#7AA79C]" />
                </div>
              </div>

              {/* Lista de sububicaciones */}
              {subServicioSeleccionado?.subUbicaciones?.map((subUbicacion) => (
                <div
                  key={subUbicacion._id}
                  className="p-3 border border-[#91BEAD] rounded-md hover:bg-[#DFEFE6]/30 cursor-pointer transition-colors"
                  onClick={() => manejarSeleccionSubUbicacion(subUbicacion)}
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
                setModalSeleccionarSubUbicacionAbierto(false);
                // Si se cancela, volver al modal de subservicio
                setModalSeleccionarSubServicioAbierto(true);
              }}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Volver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Selección de Producto */}
      <Dialog open={modalSeleccionarProductoAbierto} onOpenChange={setModalSeleccionarProductoAbierto}>
        <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
          <DialogHeader>
            <DialogTitle className="text-[#29696B]">Agregar Producto</DialogTitle>
            <DialogDescription className="text-[#7AA79C]">
              Selecciona el producto y la cantidad que deseas agregar.
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
                  const terminoBusqueda = e.target.value.toLowerCase();
                  // Aquí se implementaría lógica de filtrado de productos
                }}
              />
            </div>

            <div>
              <Label htmlFor="producto" className="text-[#29696B]">Producto</Label>
              <Select
                value={productoSeleccionado || "none"}
                onValueChange={setProductoSeleccionado}
              >
                <SelectTrigger id="producto" className="border-[#91BEAD] focus:ring-[#29696B]/20">
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="none" disabled>Seleccionar producto</SelectItem>
                  {cargandoProductos ? (
                    <SelectItem value="loading" disabled>Cargando productos...</SelectItem>
                  ) : productos.length > 0 ? (
                    productos.map(producto => (
                      <SelectItem
                        key={producto._id}
                        value={producto._id}
                        disabled={producto.stock <= 0}
                      >
                        {producto.nombre} - ${producto.precio.toFixed(2)} {producto.stock <= 0 ? '(Sin stock)' : `(Stock: ${producto.stock})`}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-products" disabled>No hay productos disponibles.</SelectItem>
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
                value={cantidadProducto}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setCantidadProducto(isNaN(value) || value < 1 ? 1 : value);
                }}
                className="border-[#91BEAD] focus:ring-[#29696B]/20 focus:border-[#29696B]"
              />
            </div>

            {/* Información del producto seleccionado */}
            {productoSeleccionado && productoSeleccionado !== "none" && mapaProductos[productoSeleccionado] && (
              <div className="p-3 bg-[#DFEFE6]/20 rounded-md border border-[#91BEAD]/30">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-[#29696B]">Producto seleccionado:</span>
                  <span className="text-sm text-[#29696B]">{mapaProductos[productoSeleccionado].nombre}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm font-medium text-[#29696B]">Precio:</span>
                  <span className="text-sm text-[#29696B]">${mapaProductos[productoSeleccionado].precio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm font-medium text-[#29696B]">Stock disponible:</span>
                  <span className="text-sm text-[#29696B]">{mapaProductos[productoSeleccionado].stock}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm font-medium text-[#29696B]">Total:</span>
                  <span className="text-sm font-medium text-[#29696B]">
                    ${(mapaProductos[productoSeleccionado].precio * cantidadProducto).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalSeleccionarProductoAbierto(false)}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            >
              Cancelar
            </Button>

            <Button
              onClick={manejarAgregarProducto}
              className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              disabled={!productoSeleccionado || productoSeleccionado === "none" || cantidadProducto <= 0}
            >
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación para Eliminar */}
      <ConfirmationDialog
        open={modalConfirmarEliminarAbierto}
        onOpenChange={setModalConfirmarEliminarAbierto}
        title="Eliminar Pedido"
        description="¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer y devolverá el stock al inventario."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={manejarEliminarPedido}
        variant="destructive"
      />
    </div>
  );
};

export default OrdersSection;