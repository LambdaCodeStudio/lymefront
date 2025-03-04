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
  Image as ImageIcon,
  X,
  Loader2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Pagination from "@/components/ui/pagination";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { Product, ProductFilters } from '@/types/inventory';
import { useNotification } from '@/context/NotificationContext';
import { inventoryObservable, getAuthToken } from '@/utils/inventoryUtils';
import { imageService } from '@/services/imageService';

// Componente para input de stock con límite máximo
const ProductStockInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  id?: string;
  required?: boolean;
  maxStock?: number;
}> = ({
  value,
  onChange,
  id = "stock",
  required = true,
  maxStock = 999999999
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    if (inputValue === '') {
      onChange('');
      return;
    }
    
    const numValue = parseInt(inputValue, 10);
    
    if (isNaN(numValue)) {
      return;
    }
    
    if (numValue > maxStock) {
      onChange(maxStock.toString());
    } else if (numValue < 0) {
      onChange('0');
    } else {
      onChange(numValue.toString());
    }
  };

  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        min="0"
        max={maxStock}
        value={value}
        onChange={handleChange}
        required={required}
        className="mt-1"
      />
      <p className="mt-1 text-xs text-[#7AA79C]">
        Máximo: {maxStock.toLocaleString()}
      </p>
    </div>
  );
};

interface ProductExtended extends Product {
  imagen?: string | Buffer | null;
  vendidos?: number;
  hasImage?: boolean; // Nueva propiedad para precalcular si tiene imagen
}

interface FormData {
  nombre: string;
  descripcion: string;
  categoria: string; 
  subCategoria: string;
  precio: string;
  stock: string;
  proovedorInfo: string;
  imagen?: File | null;
  imagenPreview?: string | null;
}

// Definir umbral de stock bajo
const LOW_STOCK_THRESHOLD = 10;

const InventorySection: React.FC = () => {
  const { addNotification } = useNotification();
  const [products, setProducts] = useState<ProductExtended[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deleteImageDialogOpen, setDeleteImageDialogOpen] = useState<boolean>(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [productsPerPage] = useState<number>(10);
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
  
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    descripcion: '',
    categoria: 'limpieza',
    subCategoria: 'aerosoles',
    precio: '',
    stock: '',
    proovedorInfo: '',
    imagen: null,
    imagenPreview: null
  });

  // Función para verificar si un producto tiene imagen
  const hasProductImage = (product: ProductExtended): boolean => {
    if (!product) return false;
    
    // Verifica si el producto tiene una propiedad imagen que no sea null/undefined
    return !!product.imagen;
  };

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

  // Verificar productos con stock bajo y enviar notificación
  useEffect(() => {
    const lowStockProducts = products.filter(product => 
      product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD
    );
    
    if (lowStockProducts.length > 0) {
      const productNames = lowStockProducts.map(p => p.nombre).join(', ');
      const message = `Alerta: ${lowStockProducts.length} producto${lowStockProducts.length > 1 ? 's' : ''} con stock bajo: ${productNames}`;
      
      if (!loading && addNotification) {
        addNotification(message, 'warning');
      }
    }
  }, [products, loading, addNotification]);

  // Cargar productos y suscribirse al observable
  useEffect(() => {
    fetchProducts();
    
    const unsubscribe = inventoryObservable.subscribe(() => {
      console.log('InventorySection: Actualización de inventario notificada por observable');
      fetchProducts();
    });
    
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
      
      // Precalcular qué productos tienen imágenes para evitar solicitudes innecesarias
      const productsWithImageInfo = data.map((product: ProductExtended) => ({
        ...product,
        hasImage: hasProductImage(product)
      }));
      
      setProducts(productsWithImageInfo);
    } catch (err: any) {
      const errorMsg = 'Error al cargar productos: ' + err.message;
      setError(errorMsg);
      
      if (typeof addNotification === 'function') {
        addNotification(errorMsg, 'error');
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
      
      // Validar tamaño del archivo (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        addNotification('La imagen no debe superar los 5MB', 'error');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        addNotification('El archivo debe ser una imagen', 'error');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      // Crear URL para vista previa
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          imagen: file,
          imagenPreview: reader.result as string
        });
      };
      
      reader.readAsDataURL(file);
    }
  };

  // Eliminar imagen del formulario
  const handleRemoveImage = () => {
    setFormData({
      ...formData,
      imagen: null,
      imagenPreview: null
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Eliminar imagen del producto ya guardado
  const handleDeleteProductImage = async (productId: string) => {
    try {
      setImageLoading(true);
      await imageService.deleteImage(productId);
      
      // Actualizar la lista de productos
      await fetchProducts();
      
      addNotification('Imagen eliminada correctamente', 'success');
      setDeleteImageDialogOpen(false);
    } catch (error: any) {
      addNotification('Error al eliminar la imagen: ' + error.message, 'error');
    } finally {
      setImageLoading(false);
    }
  };

  // Manejar subida de imagen después de crear/editar producto
  const handleImageUpload = async (productId: string) => {
    if (!formData.imagen) return true;
    
    try {
      setImageLoading(true);
      await imageService.uploadImage(productId, formData.imagen);
      return true;
    } catch (error: any) {
      addNotification('Error al subir imagen: ' + error.message, 'error');
      return false;
    } finally {
      setImageLoading(false);
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
      
      // Datos básicos del producto (sin la imagen que se manejará por separado)
      const payload = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        categoria: formData.categoria,
        subCategoria: formData.subCategoria,
        precio: Number(formData.precio),
        stock: Number(formData.stock),
        proovedorInfo: formData.proovedorInfo
      };
      
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
      
      const savedProduct = await response.json();
      
      // Manejar la subida de imagen si hay una imagen nueva
      if (formData.imagen) {
        await handleImageUpload(savedProduct._id);
      }
      
      setShowModal(false);
      resetForm();
      await fetchProducts(); // Actualizar datos localmente
      
      const successMsg = `Producto ${editingProduct ? 'actualizado' : 'creado'} correctamente`;
      setSuccessMessage(successMsg);
      
      addNotification(successMsg, 'success');
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      const errorMsg = 'Error al guardar producto: ' + err.message;
      setError(errorMsg);
      
      addNotification(errorMsg, 'error');
    }
  };

  // Iniciar el proceso de eliminación mostrando el diálogo de confirmación
  const confirmDelete = (id: string) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Confirmar eliminación de imagen
  const confirmDeleteImage = (id: string) => {
    setProductToDelete(id);
    setDeleteImageDialogOpen(true);
  };

  // Eliminar producto (después de confirmación)
  const handleDelete = async (id: string) => {
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
      
      addNotification(successMsg, 'success');
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      const errorMsg = 'Error al eliminar producto: ' + err.message;
      setError(errorMsg);
      
      addNotification(errorMsg, 'error');
    } finally {
      // Cerrar diálogo de confirmación
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  // Preparar edición de producto
  const handleEdit = (product: ProductExtended) => {
    setEditingProduct(product);
    
    // Verificar si el producto tiene imagen
    const hasImage = product.hasImage || false;
    
    setFormData({
      nombre: product.nombre,
      descripcion: product.descripcion || '',
      categoria: product.categoria,
      subCategoria: product.subCategoria,
      precio: product.precio.toString(),
      stock: product.stock.toString(),
      proovedorInfo: product.proovedorInfo || '',
      imagen: null,
      imagenPreview: hasImage ? imageService.getImageUrl(product._id) : null
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
      imagen: null,
      imagenPreview: null
    });
    setEditingProduct(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Manejar cambio de categoría
  const handleCategoryChange = (value: string) => {
    try {
      if (!subCategorias[value]) {
        console.error(`Categoría no válida: ${value}`);
        addNotification(`Error: Categoría '${value}' no válida`, 'error');
        return;
      }
      
      const defaultSubcategoria = subCategorias[value][0].value;
      
      setFormData(prevState => ({
        ...prevState,
        categoria: value
      }));
      
      setTimeout(() => {
        setFormData(prevState => ({
          ...prevState,
          subCategoria: defaultSubcategoria
        }));
      }, 0);
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
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-[#DFEFE6] text-[#29696B]">
          {stock} unidades
        </span>
      );
    }
  };

  // Filtrar productos
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.descripcion ? product.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
      (product.proovedorInfo ? product.proovedorInfo.toLowerCase().includes(searchTerm.toLowerCase()) : false);
      
    const matchesCategory = 
      selectedCategory === 'all' || 
      product.categoria === selectedCategory ||
      (selectedCategory === product.categoria) || 
      (selectedCategory === product.subCategoria);
      
    return matchesSearch && matchesCategory;
  });
  
  // Calcular paginación
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  // Función para cambiar de página
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    // Al cambiar de página, hacemos scroll hacia arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-[#DFEFE6]/30">
      {/* Alertas */}
      {error && (
        <Alert className="bg-red-50 border border-red-200 text-red-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert className="bg-[#DFEFE6] border border-[#91BEAD] text-[#29696B] rounded-lg">
          <CheckCircle className="h-4 w-4 text-[#29696B]" />
          <AlertDescription className="ml-2">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Barra de herramientas */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 bg-white rounded-xl shadow-sm p-4 border border-[#91BEAD]/20">
        <div className="w-full md:w-64">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
            />
          </div>
          
          <Tabs 
            defaultValue="all" 
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            className="w-full"
          >
            <TabsList className="w-full mb-2 flex flex-wrap h-auto bg-[#DFEFE6]/50">
              <TabsTrigger 
                value="all" 
                className="flex-1 data-[state=active]:bg-[#29696B] data-[state=active]:text-white"
              >
                Todos
              </TabsTrigger>
              <TabsTrigger 
                value="limpieza" 
                className="flex-1 data-[state=active]:bg-[#29696B] data-[state=active]:text-white"
              >
                Limpieza
              </TabsTrigger>
              <TabsTrigger 
                value="mantenimiento" 
                className="flex-1 data-[state=active]:bg-[#29696B] data-[state=active]:text-white"
              >
                Mantenimiento
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <Button 
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="w-full md:w-auto bg-[#29696B] hover:bg-[#29696B]/90 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      {/* Alerta para productos con stock bajo */}
      {!loading && products.some(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD) && (
        <Alert className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="ml-2">
            Hay productos con stock bajo. Por favor, revise el inventario.
          </AlertDescription>
        </Alert>
      )}

      {/* Mensaje cuando no hay productos */}
      {!loading && filteredProducts.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-[#91BEAD]/20">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#DFEFE6] rounded-full mb-4">
            <Search className="w-6 h-6 text-[#29696B]" />
          </div>
          <p className="text-[#7AA79C]">No se encontraron productos que coincidan con la búsqueda</p>
        </div>
      )}

      {/* Tabla para pantallas medianas y grandes */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-[#91BEAD]/20">
        {!loading && currentProducts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#DFEFE6]/50 border-b border-[#91BEAD]/20">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#29696B] uppercase tracking-wider">
                    Vendidos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#29696B] uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#91BEAD]/20">
                {currentProducts.map((product) => (
                  <tr 
                    key={product._id} 
                    className={`hover:bg-[#DFEFE6]/20 transition-colors ${
                      product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD 
                        ? 'bg-yellow-50 hover:bg-yellow-100' 
                        : product.stock <= 0 
                          ? 'bg-red-50 hover:bg-red-100'
                          : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {product.hasImage ? (
                          <div className="flex-shrink-0 h-10 w-10 mr-3">
                            <img 
                              className="h-10 w-10 rounded-full object-cover border border-[#91BEAD]/30" 
                              src={imageService.getImageUrl(product._id, { width: 80, height: 80, quality: 80 })}
                              alt={product.nombre}
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 h-10 w-10 mr-3 rounded-full bg-[#DFEFE6]/50 flex items-center justify-center border border-[#91BEAD]/30">
                            <PackageOpen className="w-5 h-5 text-[#91BEAD]" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-[#29696B]">
                            {product.nombre}
                          </div>
                          {product.descripcion && (
                            <div className="text-sm text-[#7AA79C] truncate max-w-xs">
                              {product.descripcion}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#7AA79C]">
                      <Badge variant="outline" className="capitalize border-[#91BEAD] text-[#29696B]">
                        {product.categoria}
                      </Badge>
                      <div className="text-xs mt-1 capitalize text-[#7AA79C]">{product.subCategoria}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[#29696B]">
                      ${product.precio.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {renderStockIndicator(product.stock)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#7AA79C]">
                      {product.vendidos || 0}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(product)}
                          className="text-[#29696B] hover:text-[#29696B] hover:bg-[#DFEFE6]"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDelete(product._id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
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
        
        {/* Paginación para la tabla */}
        {filteredProducts.length > productsPerPage && (
          <div className="p-4 border-t border-[#91BEAD]/20">
            <Pagination
              totalItems={filteredProducts.length}
              itemsPerPage={productsPerPage}
              currentPage={currentPage}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Vista de Tarjetas para dispositivos móviles */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {!loading && currentProducts.map(product => (
          <Card 
            key={product._id} 
            className={`overflow-hidden shadow-sm border ${
              product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD 
                ? 'border-yellow-300 bg-yellow-50' 
                : product.stock <= 0 
                  ? 'border-red-300 bg-red-50'
                  : 'border-[#91BEAD]/20 bg-white'
            }`}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base truncate mr-2 text-[#29696B]">{product.nombre}</CardTitle>
                <Badge variant="outline" className="capitalize text-xs border-[#91BEAD] text-[#29696B]">
                  {product.categoria}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 pb-3">
              <div className="flex gap-4 mb-3">
                {product.hasImage ? (
                  <div className="flex-shrink-0 h-16 w-16">
                    <img 
                      className="h-16 w-16 rounded-md object-cover border border-[#91BEAD]/30" 
                      src={imageService.getImageUrl(product._id, { width: 120, height: 120, quality: 80 })}
                      alt={product.nombre}
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 h-16 w-16 rounded-md bg-[#DFEFE6]/50 flex items-center justify-center border border-[#91BEAD]/30">
                    <PackageOpen className="w-8 h-8 text-[#91BEAD]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {product.descripcion && (
                    <p className="text-sm text-[#7AA79C] line-clamp-2 mb-2">
                      {product.descripcion}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 text-[#91BEAD] mr-1" />
                      <span className="font-medium text-[#29696B]">${product.precio.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center">
                      <PackageOpen className="w-4 h-4 text-[#91BEAD] mr-1" />
                      <span className={`font-medium ${
                        product.stock <= 0 
                          ? 'text-red-600' 
                          : product.stock <= LOW_STOCK_THRESHOLD
                            ? 'text-yellow-600 flex items-center gap-1'
                            : 'text-[#29696B]'
                      }`}>
                        {product.stock <= LOW_STOCK_THRESHOLD && product.stock > 0 && (
                          <AlertTriangle className="w-3 h-3 text-yellow-500 animate-pulse" />
                        )}
                        {product.stock <= 0 ? 'Sin stock' : `${product.stock} unid.`}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-[#7AA79C]">
                    <span className="block">Subcategoría: <span className="capitalize">{product.subCategoria}</span></span>
                    <span className="block">Vendidos: {product.vendidos || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-2 flex justify-end gap-2 bg-[#DFEFE6]/20 border-t border-[#91BEAD]/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(product)}
                className="text-[#29696B] hover:bg-[#DFEFE6]"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => confirmDelete(product._id)}
                className="text-red-600 hover:text-red-800 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
        
        {/* Paginación para móviles */}
        {filteredProducts.length > productsPerPage && (
          <div className="mt-4">
            <Pagination
              totalItems={filteredProducts.length}
              itemsPerPage={productsPerPage}
              currentPage={currentPage}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Modal de Producto */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto bg-white border border-[#91BEAD]/20">
          <DialogHeader className="sticky top-0 bg-white pt-4 pb-2 z-10">
            <DialogTitle className="text-[#29696B]">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid gap-3">
              <div>
                <Label htmlFor="nombre" className="text-sm text-[#29696B]">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
                />
              </div>

              <div>
                <Label htmlFor="descripcion" className="text-sm text-[#29696B]">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={2}
                  className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="categoria" className="text-sm text-[#29696B]">Categoría</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger id="categoria" className="mt-1 border-[#91BEAD] focus:ring-[#29696B]/20">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent className="border-[#91BEAD]">
                      <SelectItem value="limpieza">Limpieza</SelectItem>
                      <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subCategoria" className="text-sm text-[#29696B]">Subcategoría</Label>
                  <Select
                    value={formData.subCategoria}
                    onValueChange={(value) => setFormData({ ...formData, subCategoria: value })}
                  >
                    <SelectTrigger id="subCategoria" className="mt-1 border-[#91BEAD] focus:ring-[#29696B]/20">
                      <SelectValue placeholder="Seleccionar subcategoría" />
                    </SelectTrigger>
                    <SelectContent className="border-[#91BEAD]">
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
                  <Label htmlFor="precio" className="text-sm text-[#29696B]">Precio</Label>
                  <Input
                    id="precio"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    required
                    className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
                    maxLength={10}
                  />
                </div>

                <div>
                  <Label htmlFor="stock" className="text-sm text-[#29696B]">Stock</Label>
                  <ProductStockInput
                    id="stock"
                    value={formData.stock}
                    onChange={(value) => setFormData({ ...formData, stock: value })}
                    required
                    maxStock={999999999}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="proovedorInfo" className="text-sm text-[#29696B]">Información del Proveedor</Label>
                <Input
                  id="proovedorInfo"
                  value={formData.proovedorInfo}
                  onChange={(e) => setFormData({ ...formData, proovedorInfo: e.target.value })}
                  className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
                />
              </div>

              <div>
                <Label htmlFor="imagen" className="text-sm text-[#29696B]">Imagen del Producto</Label>
                <div className="mt-1 flex flex-col space-y-2">
                  {formData.imagenPreview ? (
                    <div className="relative w-full h-32 bg-[#DFEFE6]/20 rounded-md overflow-hidden border border-[#91BEAD]/30">
                      <img 
                        src={formData.imagenPreview} 
                        alt="Vista previa" 
                        className="w-full h-full object-contain" 
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={
                          // Para producto existente con imagen previa pero sin cambios
                          editingProduct && !formData.imagen 
                            ? () => confirmDeleteImage(editingProduct._id)
                            : handleRemoveImage
                        }
                        className="absolute top-2 right-2 h-8 w-8 p-0 bg-red-500 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-[#91BEAD]/30 border-dashed rounded-md cursor-pointer bg-[#DFEFE6]/20 hover:bg-[#DFEFE6]/40 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-3 pb-4">
                          <ImageIcon className="w-8 h-8 text-[#7AA79C] mb-1" />
                          <p className="text-xs text-[#7AA79C]">
                            Haz clic para subir una imagen
                          </p>
                          <p className="text-xs text-[#7AA79C]">
                            Máximo 5MB
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
                className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
                disabled={imageLoading}
              >
                {imageLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando imagen...
                  </>
                ) : (
                  editingProduct ? 'Guardar Cambios' : 'Crear Producto'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar producto"
        description="¿Está seguro de que desea eliminar este producto? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar" 
        onConfirm={() => productToDelete && handleDelete(productToDelete)}
        variant="destructive"
      />

      {/* Diálogo de confirmación de eliminación de imagen */}
      <ConfirmationDialog
        open={deleteImageDialogOpen}
        onOpenChange={setDeleteImageDialogOpen}
        title="Eliminar imagen"
        description="¿Está seguro de que desea eliminar la imagen de este producto?"
        confirmText="Eliminar"
        cancelText="Cancelar" 
        onConfirm={() => productToDelete && handleDeleteProductImage(productToDelete)}
        variant="destructive"
      />
    </div>
  );
};

export default InventorySection;