import React, { useState, useEffect } from 'react';
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
  Eye
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
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

// Tipos
interface User {
  _id: string;
  email: string;
  nombre?: string;
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
}

interface OrderProduct {
  productoId: string;
  cantidad: number;
  nombre?: string;
  precio?: number;
}

interface Order {
  _id: string;
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

// Componente
const OrdersSection = () => {
  // Estados
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSections, setClientSections] = useState<{ [key: string]: Client[] }>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [cachedProducts, setCachedProducts] = useState<{ [key: string]: Product }>({});
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

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

  // Efecto inicial para cargar datos
  useEffect(() => {
    fetchCurrentUser();
    fetchProducts();
    fetchUsers(); // Cargar usuarios primero para tener los datos disponibles
    fetchOrders();
  }, []);

  // Cargar usuario actual
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('http://localhost:4000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Error al obtener información del usuario');
      }

      const userData = await response.json();
      console.log("Usuario cargado:", userData);
      setCurrentUser(userData);

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
    } catch (err) {
      setError('Error al cargar información del usuario: ' +
        (err instanceof Error ? err.message : String(err)));
    }
  };

  // Cargar pedidos
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('http://localhost:4000/api/pedido', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }
        throw new Error('Error al cargar los pedidos');
      }

      const data = await response.json();
      console.log("Pedidos recibidos:", data);
      setOrders(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar los pedidos: ' +
        (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Obtener detalles de producto por ID
  const getProductDetails = async (productId: string | { _id: string;[key: string]: any }) => {
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
      setCachedProducts(prev => ({
        ...prev,
        [id]: localProduct
      }));
      return localProduct;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return null;

      const response = await fetch(`http://localhost:4000/api/producto/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        console.error(`Error al obtener producto. Status: ${response.status}`);
        return null;
      }

      const product = await response.json();

      // Agregar a caché
      setCachedProducts(prev => ({
        ...prev,
        [id]: product
      }));

      return product;
    } catch (error) {
      console.error("Error obteniendo producto:", error);
      return null;
    }
  };

  // Cargar pedidos por rango de fechas
  const fetchOrdersByDate = async () => {
    if (!dateFilter.fechaInicio || !dateFilter.fechaFin) {
      setError('Por favor seleccione ambas fechas');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(
        `http://localhost:4000/api/pedido/fecha?fechaInicio=${dateFilter.fechaInicio}&fechaFin=${dateFilter.fechaFin}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        throw new Error('Error al filtrar pedidos por fecha');
      }

      const data = await response.json();
      setOrders(data);
      setError(null);

      // Mensaje de éxito mostrando cuántos pedidos se encontraron
      if (data.length === 0) {
        setSuccessMessage('No se encontraron pedidos en el rango de fechas seleccionado');
      } else {
        setSuccessMessage(`Se encontraron ${data.length} pedidos en el rango seleccionado`);
      }

      // Eliminar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Error al filtrar por fecha: ' +
        (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Cargar productos
  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('http://localhost:4000/api/producto', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Error al cargar productos');
      }

      const productsData = await response.json();
      // Filtrar productos con stock > 0
      setProducts(productsData.filter((p: Product) => p.stock > 0));

      // También añadirlos al caché
      const productsCache = productsData.reduce((cache: { [key: string]: Product }, product: Product) => {
        cache[product._id] = product;
        return cache;
      }, {});
      setCachedProducts(productsCache);

      console.log(`Productos cargados: ${productsData.length}, con stock > 0: ${productsData.filter((p: Product) => p.stock > 0).length}`);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      setDebugInfo(prev => prev + "\nError productos: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Cargar usuarios
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('http://localhost:4000/api/auth/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }

      const data = await response.json();
      setUsers(data);
      console.log("Usuarios cargados:", data.length);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      setDebugInfo(prev => prev + "\nError usuarios: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Cargar clientes del usuario
  const fetchClients = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      console.log(`Cargando clientes para usuario ID: ${userId}`);
      const response = await fetch(`http://localhost:4000/api/cliente/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Error al cargar clientes del usuario (status: ${response.status})`);
      }

      const clientsData = await response.json();
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
      setDebugInfo(`Clientes cargados: ${clientsData.length}, Servicios: ${Object.keys(grouped).length}`);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      setDebugInfo(prev => prev + "\nError clientes: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Crear pedido
  const handleCreateOrder = async () => {
    // Validaciones
    if (!orderForm.servicio) {
      setError('Debe seleccionar un cliente');
      return;
    }

    if (orderForm.productos.length === 0) {
      setError('Debe agregar al menos un producto');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
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
          productoId: p.productoId,
          cantidad: p.cantidad
        }))
      };

      console.log("Enviando pedido:", JSON.stringify(pedidoData));

      const response = await fetch('http://localhost:4000/api/pedido', {
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
      await fetchOrders();
      setShowCreateModal(false);
      resetOrderForm();
      setSuccessMessage('Pedido creado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Error al crear pedido: ' +
        (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Actualizar pedido
  const handleUpdateOrder = async () => {
    if (!currentOrder?._id) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
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
          productoId: p.productoId,
          cantidad: p.cantidad
        }))
      };

      console.log("Actualizando pedido:", currentOrder._id, "con datos:", updateData);

      const response = await fetch(`http://localhost:4000/api/pedido/${currentOrder._id}`, {
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

      await fetchOrders();
      setShowCreateModal(false);
      resetOrderForm();
      setSuccessMessage('Pedido actualizado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Error al actualizar pedido: ' +
        (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Eliminar pedido
  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este pedido?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`http://localhost:4000/api/pedido/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || 'Error al eliminar el pedido');
      }

      await fetchOrders();
      setSuccessMessage('Pedido eliminado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Error al eliminar pedido: ' +
        (err instanceof Error ? err.message : String(err)));
    }
  };

  // Preparar edición de pedido
  const handleEditOrder = (order: Order) => {
    setCurrentOrder(order);

    // Preparar los productos para edición
    const preppedProductos = Array.isArray(order.productos)
      ? order.productos.map(async (p) => {
        // Intentar obtener nombre y precio si no están en el producto
        try {
          if (!p.nombre || !p.precio) {
            const details = await getProductDetails(p.productoId);
            return {
              productoId: p.productoId,
              cantidad: p.cantidad,
              nombre: p.nombre || details?.nombre || "Producto no encontrado",
              precio: p.precio || details?.precio || 0
            };
          }
          return p;
        } catch (err) {
          console.error("Error al obtener detalles del producto:", err);
          return {
            productoId: p.productoId,
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
    });
  };

  // Ver detalles del pedido
  const toggleOrderDetails = (orderId: string) => {
    if (orderDetailsOpen === orderId) {
      setOrderDetailsOpen(null);
    } else {
      setOrderDetailsOpen(orderId);
    }
  };

  // Manejar selección de cliente
  const handleClientChange = (clienteId: string) => {
    if (clienteId === "none") return;

    const selectedClient = clients.find(c => c._id === clienteId);
    if (!selectedClient) {
      console.log(`Cliente no encontrado: ${clienteId}`);
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
  };

  // Agregar producto al pedido
  const handleAddProduct = () => {
    if (!selectedProduct || selectedProduct === "none" || productQuantity <= 0) {
      setError('Seleccione un producto y una cantidad válida');
      return;
    }

    const product = products.find(p => p._id === selectedProduct);
    if (!product) return;

    // Verificar si ya existe este producto en el pedido
    const existingProductIndex = orderForm.productos.findIndex(
      item => item.productoId === selectedProduct
    );

    if (existingProductIndex >= 0) {
      // Actualizar cantidad si ya existe
      const updatedProducts = [...orderForm.productos];
      updatedProducts[existingProductIndex].cantidad += productQuantity;

      setOrderForm(prev => ({
        ...prev,
        productos: updatedProducts
      }));
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
    }

    // Resetear selección
    setSelectedProduct("none");
    setProductQuantity(1);
    setShowProductModal(false);
  };

  // Eliminar producto del pedido
  const handleRemoveProduct = (index: number) => {
    const updatedProducts = [...orderForm.productos];
    updatedProducts.splice(index, 1);

    setOrderForm(prev => ({
      ...prev,
      productos: updatedProducts
    }));
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
  const calculateTotal = (productos: OrderProduct[]) => {
    return productos.reduce((total, item) => {
      const precio = item.precio || getProductPrice(item.productoId) || 0;
      return total + (precio * item.cantidad);
    }, 0);
  };

  // Obtener nombre de producto por ID
  const getProductName = (id: string) => {
    const product = cachedProducts[id] || products.find(p => p._id === id);
    return product?.nombre || 'Producto no encontrado';
  };

  // Obtener precio de producto por ID
  const getProductPrice = (id: string) => {
    const product = cachedProducts[id] || products.find(p => p._id === id);
    return product?.precio || 0;
  };

  // Obtener email de usuario por ID
  const getUserEmail = (userId: any) => {
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
  };

  // Filtrar pedidos por término de búsqueda
  const filteredOrders = orders.filter(order =>
    order.servicio.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.seccionDelServicio || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    getUserEmail(order.userId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Alertas */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="default" className="mb-4 bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-500" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Información de depuración */}
      {debugInfo && (
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <div className="text-sm text-blue-700 whitespace-pre-line">{debugInfo}</div>
        </Alert>
      )}

      {/* Barra de filtros y acciones */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar pedidos..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Button
            onClick={() => {
              resetOrderForm();
              setShowCreateModal(true);
            }}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Nuevo Pedido
          </Button>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <Label htmlFor="fechaInicio">Fecha Inicio</Label>
            <Input
              id="fechaInicio"
              type="date"
              value={dateFilter.fechaInicio}
              onChange={(e) => setDateFilter({ ...dateFilter, fechaInicio: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <Label htmlFor="fechaFin">Fecha Fin</Label>
            <Input
              id="fechaFin"
              type="date"
              value={dateFilter.fechaFin}
              onChange={(e) => setDateFilter({ ...dateFilter, fechaFin: e.target.value })}
              className="w-full"
            />
          </div>
          <Button
            variant="outline"
            onClick={fetchOrdersByDate}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtrar por Fecha
          </Button>
          {(dateFilter.fechaInicio || dateFilter.fechaFin) && (
            <Button
              variant="ghost"
              onClick={() => {
                setDateFilter({ fechaInicio: '', fechaFin: '' });
                fetchOrders();
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Tabla de pedidos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No se encontraron pedidos
            {searchTerm && ` que coincidan con "${searchTerm}"`}
            {(dateFilter.fechaInicio || dateFilter.fechaFin) && " en el rango de fechas seleccionado"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sección
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Productos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <React.Fragment key={order._id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(order.fecha).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(order.fecha).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building className="w-4 h-4 text-gray-400 mr-2" />
                          <div className="text-sm font-medium text-gray-900">
                            {order.servicio}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.seccionDelServicio ? (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                            <div className="text-sm text-gray-900">
                              {order.seccionDelServicio}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">Sin sección</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getUserEmail(order.userId)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {order.productos.length} producto{order.productos.length !== 1 ? 's' : ''}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleOrderDetails(order._id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditOrder(order)}
                          >
                            <FileEdit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOrder(order._id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {/* Detalles del pedido (expandible) */}
                    {orderDetailsOpen === order._id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-3">
                            <div className="font-medium text-gray-900">Detalles del Pedido</div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cantidad</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Precio</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {order.productos.map((item, index) => {
                                    // Componente inline para manejar los detalles del producto
                                    const ProductDetail = () => {
                                      const [productName, setProductName] = useState("Cargando...");
                                      const [productPrice, setProductPrice] = useState(0);

                                      useEffect(() => {
                                        const fetchProductDetails = async () => {
                                          try {
                                            // Primero verificar si ya tenemos nombre y precio
                                            if (item.nombre && item.precio) {
                                              setProductName(item.nombre);
                                              setProductPrice(item.precio);
                                              return;
                                            }

                                            // Verificar en caché
                                            const cachedProduct = cachedProducts[item.productoId];
                                            if (cachedProduct) {
                                              setProductName(cachedProduct.nombre);
                                              setProductPrice(cachedProduct.precio);
                                              return;
                                            }

                                            // Si no está en caché, obtener del backend
                                            const productDetails = await getProductDetails(item.productoId);
                                            if (productDetails) {
                                              setProductName(productDetails.nombre);
                                              setProductPrice(productDetails.precio);
                                            } else {
                                              setProductName("Producto no encontrado");
                                              setProductPrice(0);
                                            }
                                          } catch (error) {
                                            console.error("Error al cargar detalles del producto:", error);
                                            setProductName("Error al cargar");
                                            setProductPrice(0);
                                          }
                                        };

                                        fetchProductDetails();
                                      }, [item.productoId, item.nombre, item.precio]);

                                      return (
                                        <>
                                          <td className="px-4 py-2 text-sm">{productName}</td>
                                          <td className="px-4 py-2 text-sm">{item.cantidad}</td>
                                          <td className="px-4 py-2 text-sm">${productPrice.toFixed(2)}</td>
                                          <td className="px-4 py-2 text-sm font-medium">
                                            ${(productPrice * item.cantidad).toFixed(2)}
                                          </td>
                                        </>
                                      );
                                    };

                                    return (
                                      <tr key={index} className="hover:bg-gray-100">
                                        <ProductDetail />
                                      </tr>
                                    );
                                  })}

                                  {/* Total calculado dinámicamente */}
                                  <tr className="bg-blue-50">
                                    <td colSpan={3} className="px-4 py-2 text-right font-medium">Total del Pedido:</td>
                                    <td className="px-4 py-2 font-bold">
                                      ${(() => {
                                        // Función para obtener precio de forma síncrona
                                        const getProductPriceSync = (productoId: string) => {
                                          // Primero buscar en caché
                                          if (cachedProducts[productoId]) {
                                            return cachedProducts[productoId].precio;
                                          }

                                          // Luego buscar en lista de productos
                                          const product = products.find(p => p._id === productoId);
                                          if (product) {
                                            return product.precio;
                                          }

                                          // Si no se encuentra, usar función getProductPrice como último recurso
                                          return getProductPrice(productoId) || 0;
                                        };

                                        const total = order.productos.reduce((total, item) => {
                                          // Obtener precio de forma síncrona
                                          const price = item.precio || getProductPriceSync(item.productoId) || 0;
                                          return total + (price * item.cantidad);
                                        }, 0);

                                        return total.toFixed(2);
                                      })()}
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
        )}
      </div>

      {/* Modal de Crear/Editar Pedido */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {currentOrder ? 'Editar Pedido' : 'Nuevo Pedido'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* Sección de Cliente */}
            <div>
              <h2 className="text-lg font-medium mb-4 flex items-center">
                <Building className="w-5 h-5 mr-2 text-gray-500" />
                Selección de Cliente
              </h2>

              {clients.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No tiene clientes asignados o no se pudieron cargar. Contacte a un administrador para que le asigne clientes.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cliente">Cliente</Label>
                    <Select
                      value={
                        clients.find(c => c.servicio === orderForm.servicio)?._id ||
                        "none"
                      }
                      onValueChange={handleClientChange}
                    >
                      <SelectTrigger>
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
                    <div className="flex items-center p-3 bg-gray-50 rounded-md">
                      <MapPin className="w-4 h-4 text-gray-500 mr-2" />
                      <span>Sección: {orderForm.seccionDelServicio || 'Principal'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Estado del formulario para debug */}
            {orderForm.servicio && (
              <div className="p-3 bg-gray-50 rounded-md text-xs text-gray-600">
                <div><strong>Cliente:</strong> {orderForm.servicio}</div>
                <div><strong>Sección:</strong> {orderForm.seccionDelServicio || "No especificada"}</div>
                <div><strong>Usuario:</strong> {orderForm.userId || "No asignado"}</div>
              </div>
            )}

            {/* Productos del Pedido */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2 text-gray-500" />
                  Productos
                </h2>

                <Button
                  variant="outline"
                  onClick={() => {
                    setShowProductModal(true);
                    console.log("Productos disponibles:", products.length);
                  }}
                  disabled={!orderForm.servicio || products.length === 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Producto
                </Button>
              </div>

              {orderForm.productos.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border border-dashed rounded-md">
                  No hay productos en el pedido
                </div>
              ) : (
                <div className="space-y-2">
                  {orderForm.productos.map((item, index) => {
                    const product = products.find(p => p._id === item.productoId) || cachedProducts[item.productoId];
                    return (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-md"
                      >
                        <div>
                          <div className="font-medium">{item.nombre || product?.nombre || getProductName(item.productoId)}</div>
                          <div className="text-sm text-gray-500">
                            Cantidad: {item.cantidad} x ${item.precio || product?.precio || getProductPrice(item.productoId)}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="font-medium">
                            ${((item.precio || product?.precio || getProductPrice(item.productoId) || 0) * item.cantidad).toFixed(2)}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveProduct(index)}
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Total */}
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-md mt-4">
                    <div className="font-medium">Total</div>
                    <div className="font-bold text-lg">${calculateTotal(orderForm.productos).toFixed(2)}</div>
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
            >
              Cancelar
            </Button>
            <Button
              onClick={currentOrder ? handleUpdateOrder : handleCreateOrder}
              disabled={loading || orderForm.productos.length === 0 || !orderForm.servicio}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Seleccionar Sección</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
              Seleccione la sección para este pedido:
            </p>

            <div className="space-y-2">
              {orderForm.servicio &&
                clientSections[orderForm.servicio]?.map((client) => (
                  <div
                    key={client._id}
                    className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleSectionSelect(client.seccionDelServicio || "")}
                  >
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-gray-500 mr-2" />
                      <span>{client.seccionDelServicio || 'Principal'}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSectionModal(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para agregar producto */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Producto</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="producto">Producto</Label>
              <Select
                value={selectedProduct}
                onValueChange={setSelectedProduct}
              >
                <SelectTrigger>
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
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input
                id="cantidad"
                type="number"
                min="1"
                value={productQuantity}
                onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)}
              />
            </div>

            {/* Información de productos disponibles */}
            <div className="text-xs text-gray-500">
              Productos disponibles: {products.length}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowProductModal(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddProduct}>
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Función auxiliar para cerrar modales
const setShowModal = (value: boolean) => {
  const modalElements = document.querySelectorAll('[role="dialog"]');
  if (!value && modalElements.length) {
    // Cerrar todos los modales
    modalElements.forEach(el => {
      const closeButton = el.querySelector('button[aria-label="Close"]');
      if (closeButton instanceof HTMLElement) {
        closeButton.click();
      }
    });
  }
};

export default OrdersSection;