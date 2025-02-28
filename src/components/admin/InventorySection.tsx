import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  PackageOpen,
  DollarSign,
  AlertTriangle,
  Image,
  X
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { Product, ProductFilters } from '@/types/inventory';
// Importación correcta sin try/catch
import { useNotification } from '@/context/NotificationContext';
// Importar el observable
import { inventoryObservable, getAuthToken } from '@/utils/inventoryUtils';

// Extendemos la interfaz Product para incluir campos de imagen
interface ProductExtended extends Product {
  imagen?: string | Buffer | null;
  vendidos?: number;
}

interface FormData {
  nombre: string;
  descripcion: string;
  categoria: string; 
  subCategoria: string;
  precio: string;
  stock: string;
  proovedorInfo: string;
  imagen?: string | null;
}

// Definir umbral de stock bajo
const LOW_STOCK_THRESHOLD = 10;

const InventorySection: React.FC = () => {
  // Usar directamente el contexto de notificaciones sin fallback
  const { addNotification } = useNotification();
  // También podríamos verificar si está disponible
  console.log('NotificationContext disponible:', addNotification ? true : false);

  const [products, setProducts] = useState<ProductExtended[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<ProductExtended | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: 'all',
    stockStatus: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Inicializar formData con valores predeterminados
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    descripcion: '',
    categoria: 'limpieza',
    subCategoria: 'aerosoles',
    precio: '',
    stock: '',
    proovedorInfo: '',
    imagen: null
  });

  // Subcategorías organizadas por categoría
  const subCategorias: Record<string, Array<{value: string, label: string}>> = {
    limpieza: [
      { value: 'accesorios', label: 'Accesorios' },
      { value: 'aerosoles', label: 'Aerosoles' },
      { value: 'bolsas', label: 'Bolsas' },
      { value: 'estandar', label: 'Estándar' },
      { value: 'indumentaria', label: 'Indumentaria' },
      { value: 'liquidos', label: 'Líquidos' },
      { value: 'papeles', label: 'Papeles' },
      { value: 'sinClasificarLimpieza', label: 'Sin Clasificar' }
    ],
    mantenimiento: [
      { value: 'iluminaria', label: 'Iluminaria' },
      { value: 'electricidad', label: 'Electricidad' },
      { value: 'cerraduraCortina', label: 'Cerradura/Cortina' },
      { value: 'pintura', label: 'Pintura' },
      { value: 'superficiesConstruccion', label: 'Superficies/Construcción' },
      { value: 'plomeria', label: 'Plomería' }
    ]
  };

  // Debugging para ver cambios en el formulario
  useEffect(() => {
    console.log("Estado actual del formulario:", formData);
  }, [formData]);

  // Depuración específica para categorías
  useEffect(() => {
    console.log("Categoría actual:", formData.categoria);
    console.log("Subcategoría actual:", formData.subCategoria);
    console.log("Subcategorías disponibles:", subCategorias[formData.categoria] || 'No hay subcategorías');
  }, [formData.categoria, formData.subCategoria]);

  // Verificar productos con stock bajo y enviar notificación
  useEffect(() => {
    const lowStockProducts = products.filter(product => 
      product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD
    );
    
    if (lowStockProducts.length > 0) {
      const productNames = lowStockProducts.map(p => p.nombre).join(', ');
      const message = `Alerta: ${lowStockProducts.length} producto${lowStockProducts.length > 1 ? 's' : ''} con stock bajo: ${productNames}`;
      
      // Notificar solo si hay productos y es la primera carga (no en cada actualización)
      if (!loading && addNotification) {
        addNotification(message, 'warning');
      }
    }
  }, [products, loading]);

  // Cargar productos y suscribirse al observable
  useEffect(() => {
    fetchProducts();
    
    // Suscribirse al observable de inventario
    const unsubscribe = inventoryObservable.subscribe(() => {
      console.log('InventorySection: Actualización de inventario notificada por observable');
      fetchProducts();
    });
    
    // Limpiar la suscripción al desmontar el componente
    return () => {
      unsubscribe();
    };
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('http://localhost:4000/api/producto', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expirado o inválido
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            window.location.href = '/login';
          }
          return;
        }
        throw new Error('Error al cargar productos');
      }
      
      const data = await response.json();
      console.log(`Productos actualizados: ${data.length}`);
      setProducts(data);
    } catch (err: any) {
      const errorMsg = 'Error al cargar productos: ' + err.message;
      setError(errorMsg);
      
      // Asegurarnos de que addNotification sea una función antes de llamarla
      if (typeof addNotification === 'function') {
        addNotification(errorMsg, 'error');
        console.log('Notificación de error enviada:', errorMsg);
      } else {
        console.error('addNotification no está disponible:', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio de imagen
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData({
          ...formData,
          imagen: base64String
        });
      };
      
      reader.readAsDataURL(file);
    }
  };

  // Eliminar imagen del formulario
  const handleRemoveImage = () => {
    setFormData({
      ...formData,
      imagen: null
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Manejar envío del formulario (crear/editar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const url = editingProduct
        ? `http://localhost:4000/api/producto/${editingProduct._id}`
        : 'http://localhost:4000/api/producto';
      
      const method = editingProduct ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        precio: Number(formData.precio),
        stock: Number(formData.stock),
        imagen: formData.imagen?.split(',')[1] || null // Extraer la parte base64 sin el prefijo data:image
      };
      
      console.log("Enviando payload:", payload);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al procesar la solicitud');
      }
      
      setShowModal(false);
      resetForm();
      await fetchProducts(); // Actualizar datos localmente
      
      const successMsg = `Producto ${editingProduct ? 'actualizado' : 'creado'} correctamente`;
      setSuccessMessage(successMsg);
      
      // Notificación de éxito - VERIFICAR QUE SE LLAME CORRECTAMENTE
      console.log('Intentando mostrar notificación de éxito:', successMsg);
      addNotification(successMsg, 'success');
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      const errorMsg = 'Error al guardar producto: ' + err.message;
      setError(errorMsg);
      
      // Notificación de error
      console.log('Intentando mostrar notificación de error:', errorMsg);
      addNotification(errorMsg, 'error');
    }
  };

  // Eliminar producto
  const handleDelete = async (id: string) => {
    if (typeof window === 'undefined' || !window.confirm('¿Estás seguro de eliminar este producto?')) return;
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await fetch(`http://localhost:4000/api/producto/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar producto');
      }
      
      await fetchProducts(); // Actualizar datos localmente
      
      const successMsg = 'Producto eliminado correctamente';
      setSuccessMessage(successMsg);
      
      // Notificación de éxito
      console.log('Intentando mostrar notificación de éxito (eliminar):', successMsg);
      addNotification(successMsg, 'success');
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      const errorMsg = 'Error al eliminar producto: ' + err.message;
      setError(errorMsg);
      
      // Notificación de error
      console.log('Intentando mostrar notificación de error:', errorMsg);
      addNotification(errorMsg, 'error');
    }
  };

  // Preparar edición de producto
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      nombre: product.nombre,
      descripcion: product.descripcion || '',
      categoria: product.categoria,
      subCategoria: product.subCategoria,
      precio: product.precio.toString(),
      stock: product.stock.toString(),
      proovedorInfo: product.proovedorInfo || '',
      imagen: product.imagen ? `data:image/jpeg;base64,${product.imagen}` : null
    });
    setShowModal(true);
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      categoria: 'limpieza',
      subCategoria: 'aerosoles',
      precio: '',
      stock: '',
      proovedorInfo: '',
      imagen: null
    });
    setEditingProduct(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Manejar cambio de categoría
  const handleCategoryChange = (value: string) => {
    console.log("Cambiando categoría a:", value);
    
    try {
      // Validar que value es una categoría válida
      if (!subCategorias[value]) {
        console.error(`Categoría no válida: ${value}`);
        addNotification(`Error: Categoría '${value}' no válida`, 'error');
        return;
      }
      
      // Asegurarnos de que la subcategoría corresponda a la nueva categoría
      const defaultSubcategoria = subCategorias[value][0].value;
      console.log("Subcategorías disponibles:", subCategorias[value]);
      console.log("Nueva subcategoría seleccionada:", defaultSubcategoria);
      
      // Importante: actualizar primero la categoría y luego en un segundo estado la subcategoría
      // para evitar problemas de sincronización de estado en React
      setFormData(prevState => ({
        ...prevState,
        categoria: value
      }));
      
      // Actualizar la subcategoría en un segundo cambio de estado
      setTimeout(() => {
        setFormData(prevState => ({
          ...prevState,
          subCategoria: defaultSubcategoria
        }));
      }, 0);
      
      // Registrar cambio para depuración
      console.log(`Categoría cambiada a: ${value}, subcategoría a: ${defaultSubcategoria}`);
    } catch (error) {
      console.error("Error al cambiar categoría:", error);
      addNotification("Error al cambiar categoría", 'error');
    }
  };

  // Función para renderizar indicador de stock
  const renderStockIndicator = (stock: number) => {
    if (stock <= 0) {
      return (
        <div className="flex items-center gap-1">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            Sin stock
          </span>
        </div>
      );
    } else if (stock <= LOW_STOCK_THRESHOLD) {
      return (
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-4 h-4 text-yellow-500 animate-pulse" />
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
            {stock} unidades - ¡Stock bajo!
          </span>
        </div>
      );
    } else {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          {stock} unidades
        </span>
      );
    }
  };

  // Filtrar productos
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.proovedorInfo?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesCategory = 
      selectedCategory === 'all' || 
      product.categoria === selectedCategory ||
      (selectedCategory === product.categoria) || 
      (selectedCategory === product.subCategoria);
      
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Alertas */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert variant="default" className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Barra de herramientas */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="w-full md:w-64">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Tabs 
            defaultValue="all" 
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            className="w-full"
          >
            <TabsList className="w-full mb-2 flex flex-wrap h-auto">
              <TabsTrigger value="all" className="flex-1">Todos</TabsTrigger>
              <TabsTrigger value="limpieza" className="flex-1">Limpieza</TabsTrigger>
              <TabsTrigger value="mantenimiento" className="flex-1">Mantenimiento</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <Button 
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="w-full md:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      {/* Vista de Carga */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="ml-2 text-gray-600">Cargando productos...</span>
        </div>
      )}

      {/* Alerta para productos con stock bajo */}
      {!loading && products.some(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD) && (
        <Alert variant="warning" className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription>
            Hay productos con stock bajo. Por favor, revise el inventario.
          </AlertDescription>
        </Alert>
      )}

      {/* Mensaje cuando no hay productos */}
      {!loading && filteredProducts.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No se encontraron productos que coincidan con la búsqueda</p>
        </div>
      )}

      {/* Tabla para pantallas medianas y grandes */}
      <div className="hidden md:block bg-white rounded-lg shadow">
        {!loading && filteredProducts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendidos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr 
                    key={product._id} 
                    className={`hover:bg-gray-50 ${
                      product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD 
                        ? 'bg-yellow-50 hover:bg-yellow-100' 
                        : product.stock <= 0 
                          ? 'bg-red-50 hover:bg-red-100'
                          : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {product.imagen && (
                          <div className="flex-shrink-0 h-10 w-10 mr-3">
                            <img 
                              className="h-10 w-10 rounded-full object-cover" 
                              src={`data:image/jpeg;base64,${product.imagen}`} 
                              alt={product.nombre} 
                            />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {product.nombre}
                          </div>
                          {product.descripcion && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {product.descripcion}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <Badge variant="outline" className="capitalize">{product.categoria}</Badge>
                      <div className="text-xs mt-1 capitalize">{product.subCategoria}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      ${product.precio.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {renderStockIndicator(product.stock)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {product.vendidos || 0}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(product)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(product._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vista de Tarjetas para dispositivos móviles */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {!loading && filteredProducts.map(product => (
          <Card 
            key={product._id} 
            className={`overflow-hidden ${
              product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD 
                ? 'border-yellow-300 bg-yellow-50' 
                : product.stock <= 0 
                  ? 'border-red-300 bg-red-50'
                  : ''
            }`}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base truncate mr-2">{product.nombre}</CardTitle>
                <Badge variant="outline" className="capitalize text-xs">{product.categoria}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 pb-3">
              <div className="flex gap-4 mb-3">
                {product.imagen && (
                  <div className="flex-shrink-0 h-16 w-16">
                    <img 
                      className="h-16 w-16 rounded-md object-cover" 
                      src={`data:image/jpeg;base64,${product.imagen}`} 
                      alt={product.nombre} 
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {product.descripcion && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {product.descripcion}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                      <span className="font-medium">${product.precio.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center">
                      <PackageOpen className="w-4 h-4 text-gray-400 mr-1" />
                      <span className={`font-medium ${
                        product.stock <= 0 
                          ? 'text-red-600' 
                          : product.stock <= LOW_STOCK_THRESHOLD
                            ? 'text-yellow-600 flex items-center gap-1'
                            : 'text-green-600'
                      }`}>
                        {product.stock <= LOW_STOCK_THRESHOLD && product.stock > 0 && (
                          <AlertTriangle className="w-3 h-3 text-yellow-500 animate-pulse" />
                        )}
                        {product.stock <= 0 ? 'Sin stock' : `${product.stock} unid.`}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    <span className="block">Subcategoría: <span className="capitalize">{product.subCategoria}</span></span>
                    <span className="block">Vendidos: {product.vendidos || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-2 flex justify-end gap-2 bg-gray-50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(product)}
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(product._id)}
                className="text-red-600 hover:text-red-800 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Modal de Producto */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader className="sticky top-0 bg-white pt-4 pb-2 z-10">
            <DialogTitle>
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid gap-3">
              <div>
                <Label htmlFor="nombre" className="text-sm">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="descripcion" className="text-sm">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="categoria" className="text-sm">Categoría</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger id="categoria" className="mt-1">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="limpieza">Limpieza</SelectItem>
                      <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subCategoria" className="text-sm">Subcategoría</Label>
                  <Select
                    value={formData.subCategoria}
                    onValueChange={(value) => setFormData({ ...formData, subCategoria: value })}
                  >
                    <SelectTrigger id="subCategoria" className="mt-1">
                      <SelectValue placeholder="Seleccionar subcategoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {subCategorias[formData.categoria]?.map((sub) => (
                        <SelectItem key={sub.value} value={sub.value}>
                          {sub.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="precio" className="text-sm">Precio</Label>
                  <Input
                    id="precio"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="stock" className="text-sm">Stock</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="proovedorInfo" className="text-sm">Información del Proveedor</Label>
                <Input
                  id="proovedorInfo"
                  value={formData.proovedorInfo}
                  onChange={(e) => setFormData({ ...formData, proovedorInfo: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="imagen" className="text-sm">Imagen del Producto</Label>
                <div className="mt-1 flex flex-col space-y-2">
                  {formData.imagen ? (
                    <div className="relative w-full h-32 bg-gray-100 rounded-md overflow-hidden">
                      <img 
                        src={formData.imagen} 
                        alt="Vista previa" 
                        className="w-full h-full object-contain" 
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-md cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-3 pb-4">
                          <Image className="w-8 h-8 text-gray-400 mb-1" />
                          <p className="text-xs text-gray-500">
                            Haz clic para subir una imagen
                          </p>
                        </div>
                        <input 
                          ref={fileInputRef}
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleImageChange}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="sticky bottom-0 bg-white pt-2 pb-4 z-10 gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventorySection;