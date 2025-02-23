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
  ShoppingCart
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { orderService } from '../../services/orderService';
import type { Order, CreateOrderData, UpdateOrderData, OrderProduct } from '../../types/order';

const OrdersSection = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [dateFilter, setDateFilter] = useState({
    fechaInicio: '',
    fechaFin: ''
  });
  const [formData, setFormData] = useState<CreateOrderData>({
    servicio: '',
    seccionDelServicio: '',
    userId: '',
    productos: []
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getOrders();
      setOrders(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar los pedidos: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const fetchOrdersByDate = async () => {
    if (!dateFilter.fechaInicio || !dateFilter.fechaFin) {
      setError('Por favor seleccione ambas fechas');
      return;
    }
    
    try {
      setLoading(true);
      const data = await orderService.getOrdersByDate(dateFilter.fechaInicio, dateFilter.fechaFin);
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await orderService.createOrder(formData);
      await fetchOrders();
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrder?._id) return;

    try {
      await orderService.updateOrder({
        id: currentOrder._id,
        ...formData
      });
      await fetchOrders();
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este pedido?')) return;
    
    try {
      await orderService.deleteOrder(id);
      await fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleEditOrder = (order: Order) => {
    setCurrentOrder(order);
    setFormData({
      servicio: order.servicio,
      seccionDelServicio: order.seccionDelServicio,
      userId: order.userId,
      productos: order.productos
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      servicio: '',
      seccionDelServicio: '',
      userId: '',
      productos: []
    });
    setCurrentOrder(null);
  };

  const addProductToOrder = () => {
    setFormData({
      ...formData,
      productos: [...formData.productos, { productoId: '', cantidad: 1 }]
    });
  };

  const removeProductFromOrder = (index: number) => {
    const newProductos = formData.productos.filter((_, i) => i !== index);
    setFormData({ ...formData, productos: newProductos });
  };

  const updateProductInOrder = (index: number, field: keyof OrderProduct, value: string | number) => {
    const newProductos = [...formData.productos];
    newProductos[index] = {
      ...newProductos[index],
      [field]: field === 'cantidad' ? parseInt(value.toString()) : value
    };
    setFormData({ ...formData, productos: newProductos });
  };

  const filteredOrders = orders.filter(order => 
    order.servicio.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.seccionDelServicio.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar pedidos..."
                className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            Nuevo Pedido
          </button>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha Inicio</label>
            <input
              type="date"
              value={dateFilter.fechaInicio}
              onChange={(e) => setDateFilter({...dateFilter, fechaInicio: e.target.value})}
              className="border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha Fin</label>
            <input
              type="date"
              value={dateFilter.fechaFin}
              onChange={(e) => setDateFilter({...dateFilter, fechaFin: e.target.value})}
              className="border rounded-lg px-3 py-2"
            />
          </div>
          <button
            onClick={fetchOrdersByDate}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Filtrar por Fecha
          </button>
          {(dateFilter.fechaInicio || dateFilter.fechaFin) && (
            <button
              onClick={() => {
                setDateFilter({ fechaInicio: '', fechaFin: '' });
                fetchOrders();
              }}
              className="text-gray-600 hover:text-gray-800"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Servicio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sección
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Productos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(order.fecha).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.servicio}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.seccionDelServicio}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.userId?.email || 'No asignado'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.productos.length} productos
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditOrder(order)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FileEdit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {currentOrder ? 'Editar Pedido' : 'Nuevo Pedido'}
              </h2>
              <form onSubmit={currentOrder ? handleUpdateOrder : handleCreateOrder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Servicio</label>
                  <input
                    type="text"
                    value={formData.servicio}
                    onChange={(e) => setFormData({...formData, servicio: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Sección del Servicio</label>
                  <input
                    type="text"
                    value={formData.seccionDelServicio}
                    onChange={(e) => setFormData({...formData, seccionDelServicio: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">ID de Usuario</label>
                  <input
                    type="text"
                    value={formData.userId}
                    onChange={(e) => setFormData({...formData, userId: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Productos</label>
                  <div className="space-y-2">
                    {formData.productos.map((producto, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="ID del producto"
                          value={producto.productoId}
                          onChange={(e) => updateProductInOrder(index, 'productoId', e.target.value)}
                          className="flex-1 border rounded-lg px-3 py-2"
                          required
                        />
                        <input
                          type="number"
                          placeholder="Cantidad"
                          value={producto.cantidad}
                          onChange={(e) => updateProductInOrder(index, 'cantidad', e.target.value)}
                          className="w-24 border rounded-lg px-3 py-2"
                          min="1"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => removeProductFromOrder(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    type="button"
                    onClick={addProductToOrder}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Producto
                  </button>
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    {currentOrder ? 'Actualizar Pedido' : 'Crear Pedido'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersSection;