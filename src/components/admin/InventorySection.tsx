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
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Pagination from "@/components/ui/pagination";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useNotification } from '@/context/NotificationContext';
import { inventoryObservable, getAuthToken } from '@/utils/inventoryUtils';
import ProductImage from '@/components/admin/components/ProductImage';
import ImageUpload from '@/components/admin/components/ImageUpload';

// Definir umbral de stock bajo
const LOW_STOCK_THRESHOLD = 10;

// Componente para input de stock con límite máximo
const ProductStockInput = ({
  value,
  onChange,
  id = "stock",
  required = true,
  maxStock = 999999999
}) => {
  const handleChange = (e) => {
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

const InventorySection = () => {
  const { addNotification } = useNotification();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteImageDialogOpen, setDeleteImageDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const fileInputRef = useRef(null);
  
  // Estado para la paginación
  const [currentPage, setCurrentPage] = useState(1);
  
  // Referencias para el scroll en móvil
  const mobileListRef = useRef(null);
  
  // IMPORTANTE: Tamaños fijos para cada tipo de dispositivo
  const ITEMS_PER_PAGE_MOBILE = 5;
  const ITEMS_PER_PAGE_DESKTOP = 10;
  
  // Estado para controlar el ancho de la ventana
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  
  // Calculamos dinámicamente itemsPerPage basado en el ancho de la ventana
  const itemsPerPage = windowWidth < 768 ? ITEMS_PER_PAGE_MOBILE : ITEMS_PER_PAGE_DESKTOP;
  
  const [formData, setFormData] = useState({
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

  // Subcategorías organizadas por categoría
  const subCategorias = {
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

  // Función básica para cargar productos
  const fetchProducts = async (forceRefresh = false) => {
    try {
      // Si ya estamos cargando, no iniciar otra carga
      if (loading && !forceRefresh) return;
      
      setLoading(true);
      setRefreshing(forceRefresh);
      setError('');
      
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('https://lyme-back.vercel.app/api/producto', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
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
      
      // Obtenemos el JSON de la respuesta
      let data;
      try {
        data = await response.json();
        console.log(`Productos actualizados: ${data.length}`);
      } catch (jsonError) {
        console.error("Error al parsear JSON:", jsonError);
        throw new Error('Error al procesar datos de productos');
      }
      
      // Validamos que la respuesta sea un array
      if (!Array.isArray(data)) {
        console.error("La respuesta no es un array:", data);
        data = Array.isArray(data.items) ? data.items : [];
        
        if (data.length === 0) {
          console.warn("No se encontraron productos o formato inesperado");
        }
      }
      
      // Establecer productos
      setProducts(data);
      
      // Si hay pocos productos, mostrar una alerta
      if (data.length === 0) {
        addNotification('No se encontraron productos', 'info');
      }
      
    } catch (err) {
      const errorMsg = 'Error al cargar productos: ' + err.message;
      console.error(errorMsg);
      setError(errorMsg);
      
      if (typeof addNotification === 'function') {
        addNotification(errorMsg, 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Verificar productos con stock bajo y enviar notificación (con manejo de errores robusto)
  useEffect(() => {
    if (loading || !Array.isArray(products)) return;
    
    try {
      const lowStockProducts = products.filter(product => 
        product && 
        typeof product === 'object' && 
        typeof product.stock === 'number' && 
        product.stock > 0 && 
        product.stock <= LOW_STOCK_THRESHOLD
      );
      
      if (lowStockProducts.length > 0) {
        const productNames = lowStockProducts.slice(0, 3).map(p => p.nombre || 'Producto sin nombre').join(', ');
        const extraCount = lowStockProducts.length > 3 ? ` y ${lowStockProducts.length - 3} más` : '';
        const message = `Alerta: ${lowStockProducts.length} producto${lowStockProducts.length > 1 ? 's' : ''} con stock bajo: ${productNames}${extraCount}`;
        
        if (addNotification) {
          addNotification(message, 'warning');
        }
      }
    } catch (err) {
      console.error('Error al procesar alerta de stock bajo:', err);
    }
  }, [products, loading, addNotification]);

  // Cargar productos al montar el componente y suscribirse al observable para actualizaciones
  useEffect(() => {
    // Cargar productos inicialmente
    fetchProducts();
    
    // Suscribirse a actualizaciones
    const unsubscribe = inventoryObservable.subscribe(() => {
      console.log('InventorySection: Actualización de inventario notificada por observable');
      fetchProducts(true);
    });
    
    // Limpiar suscripción al desmontar
    return () => {
      unsubscribe();
    };
  }, []);

  // Efecto para detectar el tamaño de la ventana y ajustar la visualización en consecuencia
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
  }, [searchTerm, selectedCategory]);

  // Función segura para obtener productos filtrados
  const getFilteredProducts = () => {
    // Protección contra productos indefinidos o no array
    if (!products || !Array.isArray(products)) {
      return [];
    }
    
    return products.filter(product => {
      // Verificación de seguridad para producto
      if (!product || typeof product !== 'object') return false;
      
      // Buscar coincidencias en nombre, descripción y proveedor (con verificación segura)
      const matchesSearch = 
        searchTerm === '' || (
          (product.nombre && product.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (product.descripcion && product.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (product.proovedorInfo && product.proovedorInfo.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
      // Verificar categoría
      const matchesCategory = 
        selectedCategory === 'all' || 
        (product.categoria && product.categoria === selectedCategory) ||
        (product.subCategoria && product.subCategoria === selectedCategory);
        
      return matchesSearch && matchesCategory;
    });
  };

  // Manejar cambio de imagen
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar tamaño del archivo (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        console.log('La imagen no debe superar los 5MB');
        addNotification('La imagen no debe superar los 5MB', 'error');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        console.log('El archivo debe ser una imagen');
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
          imagenPreview: reader.result
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
  const handleDeleteProductImage = async (productId) => {
    try {
      setImageLoading(true);
      
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await fetch(`https://lyme-back.vercel.app/api/producto/${productId}/imagen`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error al eliminar imagen (${response.status})`);
      }
      
      // Actualizar la vista del formulario para permitir subir una nueva imagen
      setFormData(prev => ({
        ...prev,
        imagen: null,
        imagenPreview: null
      }));
      
      // Actualizar productos
      await fetchProducts(true);
      
      addNotification('Imagen eliminada correctamente', 'success');
      setDeleteImageDialogOpen(false);
    } catch (error) {
      console.error('Error al eliminar la imagen:', error);
      addNotification(`Error al eliminar la imagen: ${error.message}`, 'error');
    } finally {
      setImageLoading(false);
    }
  };

  // Manejar subida de imagen después de crear/editar producto
  const handleImageUpload = async (productId) => {
    if (!formData.imagen) return true;
    
    try {
      setImageLoading(true);
      
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      // Crear FormData para enviar la imagen
      const formDataObj = new FormData();
      formDataObj.append('imagen', formData.imagen);
      
      const response = await fetch(`https://lyme-back.vercel.app/api/producto/${productId}/imagen`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataObj
      });
      
      if (!response.ok) {
        throw new Error(`Error al subir imagen (${response.status})`);
      }
      
      return true;
    } catch (error) {
      console.error('Error al subir imagen:', error);
      addNotification(`Error al subir imagen: ${error.message}`, 'error');
      return false;
    } finally {
      setImageLoading(false);
    }
  };

  // Manejar envío del formulario (crear/editar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const url = editingProduct
        ? `https://lyme-back.vercel.app/api/producto/${editingProduct._id}`
        : 'https://lyme-back.vercel.app/api/producto';
      
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
      
      // Parsear la respuesta JSON
      let savedProduct;
      try {
        savedProduct = await response.json();
      } catch (jsonError) {
        console.error("Error al parsear JSON:", jsonError);
        throw new Error('Error al procesar datos del producto guardado');
      }
      
      // Manejar la subida de imagen si hay una imagen nueva
      if (formData.imagen) {
        const imageUploaded = await handleImageUpload(savedProduct._id);
        if (!imageUploaded) {
          console.log('Hubo un problema al subir la imagen, pero el producto se guardó correctamente');
        }
      }
      
      setShowModal(false);
      resetForm();
      
      // Recargar productos después de guardar
      fetchProducts(true);
      
      // Notificar a otros componentes que deben actualizarse
      inventoryObservable.notify();
      
      const successMsg = `Producto ${editingProduct ? 'actualizado' : 'creado'} correctamente`;
      setSuccessMessage(successMsg);
      
      addNotification(successMsg, 'success');
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      const errorMsg = 'Error al guardar producto: ' + err.message;
      setError(errorMsg);
      
      addNotification(errorMsg, 'error');
    }
  };

  // Iniciar el proceso de eliminación mostrando el diálogo de confirmación
  const confirmDelete = (id) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Confirmar eliminación de imagen
  const confirmDeleteImage = (id) => {
    setProductToDelete(id);
    setDeleteImageDialogOpen(true);
  };

  // Eliminar producto (después de confirmación)
  const handleDelete = async (id) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await fetch(`https://lyme-back.vercel.app/api/producto/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar producto');
      }
      
      // Recargar productos
      fetchProducts(true);
      
      const successMsg = 'Producto eliminado correctamente';
      setSuccessMessage(successMsg);
      
      addNotification(successMsg, 'success');
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
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
  const handleEdit = async (product) => {
    try {
      setEditingProduct(product);
      
      // Intentar cargar vista previa de la imagen si el producto tiene una
      let imagePreview = null;
      if (product.hasImage) {
        try {
          // Usar la URL de la imagen (sin cargar base64)
          imagePreview = `https://lyme-back.vercel.app/api/producto/${product._id}/imagen?cache=${Date.now()}`;
        } catch (error) {
          console.error('Error al preparar imagen:', error);
          // No establecer imagen si hay error
          imagePreview = null;
        }
      }
      
      setFormData({
        nombre: product.nombre || '',
        descripcion: product.descripcion || '',
        categoria: product.categoria || 'limpieza',
        subCategoria: product.subCategoria || 'aerosoles',
        precio: product.precio ? product.precio.toString() : '',
        stock: product.stock ? product.stock.toString() : '',
        proovedorInfo: product.proovedorInfo || '',
        imagen: null,
        imagenPreview: imagePreview
      });
      
      setShowModal(true);
    } catch (error) {
      console.error("Error al preparar edición:", error);
      addNotification("Error al preparar edición del producto", "error");
    }
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
  const handleCategoryChange = (value) => {
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
  const renderStockIndicator = (stock) => {
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

  // Obtener productos filtrados de manera segura
  const filteredProducts = getFilteredProducts();
  
  // Calcular paginación
  const indexOfLastProduct = currentPage * itemsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  
  // Calcular el total de páginas
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Función para cambiar de página
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    
    // Al cambiar de página, hacemos scroll hacia arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Hacer scroll al inicio de la lista en móvil
    if (windowWidth < 768 && mobileListRef.current) {
      mobileListRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Manejar la subida de imagen con el nuevo componente
  const handleImageUploaded = (success) => {
    if (success) {
      fetchProducts(true); // Recargar productos después de subir la imagen
    }
  };

  // Función para recargar manualmente los productos
  const handleManualRefresh = () => {
    fetchProducts(true);
  };

  // Mostrar información detallada sobre la paginación
  const showingFromTo = filteredProducts.length > 0 
    ? `${indexOfFirstProduct + 1}-${Math.min(indexOfLastProduct, filteredProducts.length)} de ${filteredProducts.length}`
    : '0 de 0';

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

        <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={handleManualRefresh}
            variant="outline"
            className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            disabled={loading || refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
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
      </div>

      {/* Indicador de carga */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-[#91BEAD]/20">
          <div className="inline-flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#29696B] animate-spin mr-2" />
            <p className="text-[#29696B]">Cargando productos...</p>
          </div>
        </div>
      )}

      {/* Alerta para productos con stock bajo */}
      {!loading && Array.isArray(products) && products.some(p => p && typeof p === 'object' && p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD) && (
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
          <p className="text-[#7AA79C]">
            {searchTerm || selectedCategory !== 'all' 
              ? 'No se encontraron productos que coincidan con la búsqueda' 
              : 'No hay productos disponibles'}
          </p>
        </div>
      )}

      {/* Contador de resultados con información detallada */}
      {!loading && filteredProducts.length > 0 && (
        <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm text-[#29696B] flex flex-col sm:flex-row sm:justify-between items-center">
          <span>
            Total: {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
          </span>
          <span className="text-[#29696B] font-medium">
            Mostrando: {showingFromTo}
          </span>
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
                        <div className="flex-shrink-0 h-10 w-10 mr-3">
                          {/* Usamos la imagen directamente en lugar de ProductImage */}
                          <div className="h-10 w-10 rounded-full bg-[#DFEFE6]/50 flex items-center justify-center border border-[#91BEAD]/30 overflow-hidden">
                            {product.hasImage ? (
                              <img 
                                src={`https://lyme-back.vercel.app/api/producto/${product._id}/imagen?width=40&height=40&quality=75`} 
                                alt={product.nombre}
                                className="h-10 w-10 object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`h-10 w-10 rounded-full bg-[#DFEFE6]/50 flex items-center justify-center text-xs text-[#29696B] ${product.hasImage ? 'hidden' : ''}`}>
                              Sin img
                            </div>
                          </div>
                        </div>
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
        {filteredProducts.length > itemsPerPage && (
          <div className="py-4 border-t border-[#91BEAD]/20">
            <Pagination
              totalItems={filteredProducts.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              className="px-6"
            />
          </div>
        )}
      </div>

      {/* Vista de Tarjetas para dispositivos móviles */}
      <div ref={mobileListRef} id="mobile-products-list" className="md:hidden grid grid-cols-1 gap-4">
        {/* Paginación visible en la parte superior para móvil */}
        {!loading && filteredProducts.length > itemsPerPage && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20">
            <Pagination
              totalItems={filteredProducts.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={handlePageChange}
            />
          </div>
        )}
        
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
                <div className="flex-shrink-0 h-16 w-16">
                  {/* Usar enfoque más simplificado para imágenes en móvil */}
                  <div className="h-16 w-16 rounded-md bg-[#DFEFE6]/50 flex items-center justify-center border border-[#91BEAD]/30 overflow-hidden">
                    {product.hasImage ? (
                      <img 
                        src={`https://lyme-back.vercel.app/api/producto/${product._id}/imagen?width=64&height=64&quality=60`} 
                        alt={product.nombre}
                        className="h-16 w-16 object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`h-16 w-16 rounded-md bg-[#DFEFE6]/50 flex items-center justify-center text-xs text-[#29696B] ${product.hasImage ? 'hidden' : ''}`}>
                      Sin imagen
                    </div>
                  </div>
                </div>
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
        
        {/* Mensaje que muestra la página actual y el total */}
        {!loading && filteredProducts.length > itemsPerPage && (
          <div className="bg-[#DFEFE6]/30 py-2 px-4 rounded-lg text-center text-sm">
            <span className="text-[#29696B] font-medium">
              Página {currentPage} de {totalPages}
            </span>
          </div>
        )}
        
        {/* Paginación duplicada al final de la lista para mayor visibilidad */}
        {!loading && filteredProducts.length > itemsPerPage && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-[#91BEAD]/20 mt-2">
            <Pagination
              totalItems={filteredProducts.length}
              itemsPerPage={itemsPerPage}
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
                <Label className="text-sm text-[#29696B] block mb-2">Imagen del Producto</Label>
                
                {/* Simplificamos la gestión de imágenes */}
                {editingProduct ? (
                  <div className="mt-2">
                    {formData.imagenPreview ? (
                      <div className="relative w-full h-32 bg-[#DFEFE6]/20 rounded-md overflow-hidden border border-[#91BEAD]/30">
                        <img 
                          src={formData.imagenPreview} 
                          alt="Vista previa" 
                          className="w-full h-full object-contain" 
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-sm text-[#7AA79C] hidden">
                          No se pudo cargar la imagen
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => confirmDeleteImage(editingProduct._id)}
                          className="absolute top-2 right-2 h-8 w-8 p-0 bg-red-500 hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      // Usar input file simple en lugar del componente complejo
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
                ) : (
                  // Para nuevos productos, mantenemos la UI original
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
                          onClick={handleRemoveImage}
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
                )}
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