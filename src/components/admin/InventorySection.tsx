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
  Layers,
  ListChecks,
  ShoppingCart,
  Calculator,
  PlusCircle,
  MinusCircle,
  Tag
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import Pagination from "@/components/ui/pagination";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { Product, ProductFilters } from '@/types/inventory';
import { useNotification } from '@/context/NotificationContext';
import { inventoryObservable, getAuthToken } from '@/utils/inventoryUtils';
import { imageService } from '@/services/imageService';
import ProductImage from '@/components/admin/components/ProductImage';
import ImageUpload from '@/components/admin/components/ImageUpload';

// Interfaces
interface ComboItem {
  productoId: string | Product;
  cantidad: number;
}

interface ProductExtended extends Product {
  imagen?: string | Buffer | null;
  vendidos?: number;
  hasImage?: boolean;
  imageBase64?: string;
  esCombo?: boolean;
  itemsCombo?: ComboItem[];
}

interface ComboItemExtended extends ComboItem {
  producto?: ProductExtended;
  subtotal?: number;
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
  esCombo: boolean;
  itemsCombo: ComboItemExtended[];
}

// Componentes internos
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

// Componente de búsqueda y selección de productos para combo
const ProductSelector: React.FC<{
  selectedProductIds: string[];
  onSelectProduct: (product: ProductExtended) => void;
  categoryFilter?: string | null;
  excludeComboProducts?: boolean;
}> = ({ selectedProductIds, onSelectProduct, categoryFilter = null, excludeComboProducts = true }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [availableProducts, setAvailableProducts] = useState<ProductExtended[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { addNotification } = useNotification();

  // Cargar productos disponibles
  useEffect(() => {
    const fetchAvailableProducts = async () => {
      try {
        setLoading(true);
        const token = getAuthToken();
        if (!token) {
          throw new Error('No hay token de autenticación');
        }

        const response = await fetch('https://lyme-back.vercel.app/api/producto', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error('Error al cargar productos');
        }
        
        const data = await response.json();
        if (Array.isArray(data)) {
          // Filtrar productos que ya están seleccionados y que no son combos (si aplica)
          const filtered = data.filter(p => 
            !selectedProductIds.includes(p._id) && 
            (!excludeComboProducts || !p.esCombo) &&
            (!categoryFilter || p.categoria === categoryFilter)
          );
          setAvailableProducts(filtered);
        } else {
          console.error('API no devolvió un array de productos:', data);
          setAvailableProducts([]);
        }
      } catch (error: any) {
        console.error('Error al cargar productos para selector:', error);
        addNotification('Error al cargar productos disponibles', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableProducts();
  }, [selectedProductIds, categoryFilter, excludeComboProducts, addNotification]);

  // Filtrar productos por término de búsqueda
  const filteredProducts = availableProducts.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mt-2 border border-[#91BEAD]/30 rounded-md p-3 bg-[#DFEFE6]/10">
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" />
          <Input
            type="text"
            placeholder="Buscar productos para añadir..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 text-[#29696B] animate-spin" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <p className="text-center text-sm text-[#7AA79C] py-4">
          {searchTerm 
            ? 'No se encontraron productos que coincidan con la búsqueda' 
            : 'No hay productos disponibles para añadir'}
        </p>
      ) : (
        <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
          {filteredProducts.slice(0, 8).map(product => (
            <div 
              key={product._id}
              className="flex items-center justify-between p-2 rounded-md bg-white border border-[#91BEAD]/20 hover:bg-[#DFEFE6]/20 cursor-pointer"
              onClick={() => onSelectProduct(product)}
            >
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8">
                  <ProductImage
                    productId={product._id}
                    alt={product.nombre}
                    width={32}
                    height={32}
                    quality={60}
                    className="w-8 h-8 rounded-md object-cover border border-[#91BEAD]/30"
                    fallbackClassName="w-8 h-8 rounded-md bg-[#DFEFE6]/50 flex items-center justify-center border border-[#91BEAD]/30"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#29696B] truncate max-w-[180px]">{product.nombre}</p>
                  <div className="flex items-center text-xs text-[#7AA79C]">
                    <span>${product.precio.toFixed(2)}</span>
                    <span className="mx-1">•</span>
                    <span>Stock: {product.stock}</span>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-[#29696B] hover:bg-[#DFEFE6]/50"
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {filteredProducts.length > 8 && (
            <p className="text-xs text-center text-[#7AA79C] mt-1">
              Y {filteredProducts.length - 8} productos más. Refina tu búsqueda.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// Componente principal
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
  const [editingProduct, setEditingProduct] = useState<ProductExtended | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [comboTotalPrice, setComboTotalPrice] = useState<number>(0);
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: 'all',
    stockStatus: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para la paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  // Referencias para el scroll en móvil
  const mobileListRef = useRef<HTMLDivElement>(null);
  
  // IMPORTANTE: Tamaños fijos para cada tipo de dispositivo
  const ITEMS_PER_PAGE_MOBILE = 5;
  const ITEMS_PER_PAGE_DESKTOP = 10;
  
  // Estado para controlar el ancho de la ventana
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  
  // Calculamos dinámicamente itemsPerPage basado en el ancho de la ventana
  const itemsPerPage = windowWidth < 768 ? ITEMS_PER_PAGE_MOBILE : ITEMS_PER_PAGE_DESKTOP;
  
  // Umbral de stock bajo
  const LOW_STOCK_THRESHOLD = 10;
  
  // Estado del formulario con soporte para combos
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    descripcion: '',
    categoria: 'limpieza',
    subCategoria: 'aerosoles',
    precio: '',
    stock: '',
    proovedorInfo: '',
    imagen: null,
    imagenPreview: null,
    esCombo: false,
    itemsCombo: []
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

  // Verificar productos con stock bajo y enviar notificación
  useEffect(() => {
    if (!Array.isArray(products)) {
      console.error('products no es un array:', products);
      return;
    }
    
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
  }, [searchTerm, selectedCategory]);

  // Asegurarnos de que la página actual no exceda el número total de páginas
  useEffect(() => {
    const filteredProducts = getFilteredProducts();
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, searchTerm, selectedCategory, products, itemsPerPage]);

  // Calcular precio total del combo cuando cambian los items
  useEffect(() => {
    if (formData.esCombo) {
      calculateComboTotalPrice();
    }
  }, [formData.itemsCombo]);

  // Función para calcular el precio total del combo
  const calculateComboTotalPrice = () => {
    if (!formData.esCombo || !formData.itemsCombo || !Array.isArray(formData.itemsCombo)) {
      setComboTotalPrice(0);
      return;
    }
    
    const total = formData.itemsCombo.reduce((sum, item) => {
      // Si tenemos el producto completo (objeto)
      if (item.producto && typeof item.producto === 'object') {
        return sum + (item.producto.precio * item.cantidad);
      }
      // Si solo tenemos el subtotal calculado
      else if (item.subtotal) {
        return sum + item.subtotal;
      }
      // Si no tenemos suficiente información
      return sum;
    }, 0);
    
    setComboTotalPrice(total);
  };

  // Función para cargar productos
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('https://lyme-back.vercel.app/api/producto', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-store'
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
      
      // Verificar que data sea un array
      if (Array.isArray(data)) {
        // Establecer productos
        setProducts(data);
        
        // Verificar imágenes en segundo plano para mejorar UX
        const productIds = data.map((product: ProductExtended) => product._id);
        
        // Limpiar caché para todos los productos
        productIds.forEach(id => {
          imageService.invalidateCache(id);
        });
        
        // Verificar y precargar imágenes
        Promise.all([
          imageService.batchCheckImages(productIds),
          imageService.batchLoadBase64Images(productIds.slice(0, 10)) // Precargar las primeras 10
        ]).catch(err => {
          console.log('Error al procesar imágenes:', err);
        });
      } else {
        console.error('La API no devolvió un array:', data);
        setProducts([]);
      }
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

  // Cargar detalles completos de un producto individual
  const fetchProductDetails = async (productId: string) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`https://lyme-back.vercel.app/api/producto/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar detalles del producto');
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error al cargar detalles del producto ${productId}:`, error);
      throw error;
    }
  };

  // Calcular el precio de un combo desde el servidor
  const fetchComboPrice = async (comboId: string) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`https://lyme-back.vercel.app/api/producto/${comboId}/calcular-precio-combo`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al calcular precio del combo');
      }
      
      const data = await response.json();
      return data.precioCalculado;
    } catch (error) {
      console.error(`Error al calcular precio del combo ${comboId}:`, error);
      return null;
    }
  };

  // Cargar la imagen en Base64 para productos específicos
  const fetchProductImageBase64 = async (productId: string) => {
    try {
      const base64Image = await imageService.getImageBase64(productId);
      return base64Image;
    } catch (error) {
      console.error(`Error al obtener imagen base64 para producto ${productId}:`, error);
      return null;
    }
  };

  // Manejar cambio de imagen
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Agregar producto al combo
  const handleAddProductToCombo = async (product: ProductExtended) => {
    try {
      // Si el producto ya está en el combo, incrementar cantidad
      const existingItem = formData.itemsCombo.find(item => 
        (typeof item.productoId === 'string' && item.productoId === product._id) ||
        (typeof item.productoId === 'object' && item.productoId._id === product._id)
      );
      
      if (existingItem) {
        setFormData({
          ...formData,
          itemsCombo: formData.itemsCombo.map(item => {
            if ((typeof item.productoId === 'string' && item.productoId === product._id) ||
                (typeof item.productoId === 'object' && item.productoId._id === product._id)) {
              return {
                ...item,
                cantidad: item.cantidad + 1,
                subtotal: (item.cantidad + 1) * product.precio
              };
            }
            return item;
          })
        });
      } else {
        // Agregar nuevo producto al combo
        setFormData({
          ...formData,
          itemsCombo: [
            ...formData.itemsCombo, 
            {
              productoId: product._id,
              cantidad: 1,
              producto: product,
              subtotal: product.precio
            }
          ]
        });
      }
      
      addNotification(`${product.nombre} agregado al combo`, 'success');
    } catch (error) {
      console.error('Error al agregar producto al combo:', error);
      addNotification('Error al agregar producto al combo', 'error');
    }
  };

  // Manejar cambio de cantidad en un item del combo
  const handleComboItemQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity < 1) {
      newQuantity = 1;
    }
    
    const updatedItems = [...formData.itemsCombo];
    const item = updatedItems[index];
    
    if (item) {
      const precio = item.producto?.precio || 0;
      updatedItems[index] = {
        ...item,
        cantidad: newQuantity,
        subtotal: precio * newQuantity
      };
      
      setFormData({
        ...formData,
        itemsCombo: updatedItems
      });
    }
  };

  // Eliminar producto del combo
  const handleRemoveComboItem = (index: number) => {
    const updatedItems = formData.itemsCombo.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      itemsCombo: updatedItems
    });
  };

  // Eliminar imagen del producto ya guardado
  const handleDeleteProductImage = async (productId: string) => {
    try {
      setImageLoading(true);
      await imageService.deleteImage(productId);
      
      // Actualizar la vista del formulario
      setFormData(prev => ({
        ...prev,
        imagen: null,
        imagenPreview: null
      }));
      
      // Invalidar caché de imagen
      imageService.invalidateCache(productId);
      
      // Actualizar la lista de productos con un pequeño retraso
      setTimeout(async () => {
        await fetchProducts();
        inventoryObservable.notify();
      }, 300);
      
      addNotification('Imagen eliminada correctamente', 'success');
      setDeleteImageDialogOpen(false);
    } catch (error: any) {
      console.error('Error al eliminar la imagen:', error);
      addNotification('Error al eliminar la imagen', 'error');
    } finally {
      setImageLoading(false);
    }
  };

  // Manejar subida de imagen después de crear/editar producto
  const handleImageUpload = async (productId: string) => {
    if (!formData.imagen) return true;
    
    try {
      setImageLoading(true);
      // Convertir a base64 y subir
      const base64Data = await imageService.fileToBase64(formData.imagen);
      await imageService.uploadImageBase64(productId, base64Data);
      
      return true;
    } catch (error: any) {
      console.error('Error al subir imagen:', error);
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
        ? `https://lyme-back.vercel.app/api/producto/${editingProduct._id}`
        : 'https://lyme-back.vercel.app/api/producto';
      
      const method = editingProduct ? 'PUT' : 'POST';
      
      // Validar que el combo tenga al menos un producto
      if (formData.esCombo && (!formData.itemsCombo || formData.itemsCombo.length === 0)) {
        throw new Error('Un combo debe tener al menos un producto');
      }
      
      // Crear payload para la API
      // Formatear itemsCombo para la API
      const formattedComboItems = formData.esCombo 
        ? formData.itemsCombo.map(item => ({
            productoId: typeof item.productoId === 'string' 
              ? item.productoId 
              : (item.productoId as Product)._id,
            cantidad: item.cantidad
          }))
        : [];
      
      // Datos básicos del producto
      const payload = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        categoria: formData.categoria,
        subCategoria: formData.subCategoria,
        precio: Number(formData.precio),
        stock: Number(formData.stock),
        proovedorInfo: formData.proovedorInfo,
        esCombo: formData.esCombo,
        itemsCombo: formattedComboItems
      };
      
      console.log('Enviando payload:', payload);
      
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
        const imageUploaded = await handleImageUpload(savedProduct._id);
        if (!imageUploaded) {
          console.log('Hubo un problema al subir la imagen, pero el producto se guardó correctamente');
        }
      }
      
      setShowModal(false);
      resetForm();
      
      // Importante: damos un pequeño retraso antes de recargar los productos
      setTimeout(async () => {
        // Invalidar caché de imagen
        if (editingProduct) {
          imageService.invalidateCache(editingProduct._id);
        }
        
        // Recargar productos
        await fetchProducts();
        inventoryObservable.notify();
      }, 500);
      
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
  const handleEdit = async (product: ProductExtended) => {
    setEditingProduct(product);
    
    try {
      let productDetails = product;
      
      // Si es un combo, cargar detalles completos
      if (product.esCombo) {
        try {
          productDetails = await fetchProductDetails(product._id);
        } catch (error) {
          console.error('Error al cargar detalles del combo:', error);
          addNotification('Error al cargar detalles del combo', 'error');
        }
      }
      
      // Obtener items del combo con información completa
      let comboItems: ComboItemExtended[] = [];
      
      if (productDetails.esCombo && Array.isArray(productDetails.itemsCombo)) {
        comboItems = await Promise.all(
          productDetails.itemsCombo.map(async (item: ComboItem) => {
            let productoCompleto: ProductExtended | undefined;
            
            // Si el producto ya está poblado
            if (typeof item.productoId === 'object' && item.productoId._id) {
              productoCompleto = item.productoId as ProductExtended;
            } 
            // Si solo tenemos el ID, cargamos el producto completo
            else if (typeof item.productoId === 'string') {
              try {
                productoCompleto = await fetchProductDetails(item.productoId);
              } catch (error) {
                console.error(`Error al cargar detalles del producto ${item.productoId}:`, error);
              }
            }
            
            const subtotal = productoCompleto 
              ? productoCompleto.precio * item.cantidad 
              : 0;
            
            return {
              productoId: item.productoId,
              cantidad: item.cantidad,
              producto: productoCompleto,
              subtotal
            };
          })
        );
      }
      
      // Intentar cargar la imagen
      let imagePreview = null;
      if (imageService.hasImage(product)) {
        try {
          // Cargar imagen base64 para vista previa
          const base64Image = await fetchProductImageBase64(product._id);
          if (base64Image) {
            imagePreview = `data:image/jpeg;base64,${base64Image}`;
          } else {
            // Fallback a la URL normal
            imagePreview = imageService.getImageUrl(product._id);
          }
        } catch (error) {
          console.error('Error al cargar imagen:', error);
          // Fallback a la URL normal
          imagePreview = imageService.getImageUrl(product._id);
        }
      }
      
      setFormData({
        nombre: product.nombre,
        descripcion: product.descripcion || '',
        categoria: product.categoria,
        subCategoria: product.subCategoria,
        precio: product.precio.toString(),
        stock: product.stock.toString(),
        proovedorInfo: product.proovedorInfo || '',
        imagen: null,
        imagenPreview: imagePreview,
        esCombo: product.esCombo || false,
        itemsCombo: comboItems
      });
      
      // Si es combo, calcular precio total
      if (product.esCombo) {
        setComboTotalPrice(comboItems.reduce((sum, item) => sum + (item.subtotal || 0), 0));
      }
      
      setShowModal(true);
    } catch (error) {
      console.error('Error al preparar edición:', error);
      addNotification('Error al cargar datos del producto', 'error');
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
      imagenPreview: null,
      esCombo: false,
      itemsCombo: []
    });
    setComboTotalPrice(0);
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

  // Manejar cambio en el switch de combo
  const handleComboToggle = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      esCombo: checked,
      // Si activamos el combo y no teníamos items, inicializamos el array
      itemsCombo: checked && (!prev.itemsCombo || !Array.isArray(prev.itemsCombo)) ? [] : prev.itemsCombo
    }));
    
    // Si desactivamos el combo, reseteamos el precio total
    if (!checked) {
      setComboTotalPrice(0);
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

  // Función para obtener productos filtrados
  const getFilteredProducts = () => {
    // Asegurarnos de que products sea un array
    if (!Array.isArray(products)) {
      console.error('products no es un array:', products);
      return [];
    }
    
    return products.filter(product => {
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
  };

  // Obtener productos filtrados
  const filteredProducts = getFilteredProducts();
  
  // Calcular paginación
  const indexOfLastProduct = currentPage * itemsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  
  // Calcular el total de páginas
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

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

  // Manejar la subida de imagen con el nuevo componente
  const handleImageUploaded = (success: boolean) => {
    if (success) {
      fetchProducts(); // Recargar productos después de subir la imagen
    }
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

        <div className="w-full md:w-auto">          
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
                          <ProductImage
                            productId={product._id}
                            alt={product.nombre}
                            width={40}
                            height={40}
                            quality={80}
                            className="h-10 w-10 rounded-full object-cover border border-[#91BEAD]/30"
                            fallbackClassName="h-10 w-10 rounded-full bg-[#DFEFE6]/50 flex items-center justify-center border border-[#91BEAD]/30"
                            containerClassName="h-10 w-10"
                            useBase64={true}
                          />
                        </div>
                        <div>
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-[#29696B]">
                              {product.nombre}
                            </div>
                            {product.esCombo && (
                              <Badge className="ml-2 bg-[#DFEFE6] text-[#29696B] border-[#29696B] text-xs">
                                <Layers className="w-3 h-3 mr-1" />
                                Combo
                              </Badge>
                            )}
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
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base truncate mr-2 text-[#29696B]">{product.nombre}</CardTitle>
                  {product.esCombo && (
                    <Badge className="bg-[#DFEFE6] text-[#29696B] border-[#29696B] text-xs">
                      <Layers className="w-3 h-3 mr-1" />
                      Combo
                    </Badge>
                  )}
                </div>
                <Badge variant="outline" className="capitalize text-xs border-[#91BEAD] text-[#29696B]">
                  {product.categoria}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 pb-3">
              <div className="flex gap-4 mb-3">
                <div className="flex-shrink-0 h-16 w-16">
                  <ProductImage
                    productId={product._id}
                    alt={product.nombre}
                    width={64}
                    height={64}
                    quality={80}
                    className="h-16 w-16 rounded-md object-cover border border-[#91BEAD]/30"
                    fallbackClassName="h-16 w-16 rounded-md bg-[#DFEFE6]/50 flex items-center justify-center border border-[#91BEAD]/30"
                    containerClassName="h-16 w-16"
                    useBase64={true}
                  />
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

              {/* Selector de tipo (Combo o Producto normal) */}
              <div className="bg-[#DFEFE6]/20 border border-[#91BEAD]/30 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="esCombo" className="text-sm font-medium text-[#29696B] flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-[#7AA79C]" />
                    <span>¿Es un combo de productos?</span>
                  </Label>
                  <Switch
                    id="esCombo"
                    checked={formData.esCombo}
                    onCheckedChange={handleComboToggle}
                  />
                </div>
                {formData.esCombo && (
                  <div className="mt-3">
                    <p className="text-xs text-[#7AA79C] mb-2">Un combo es un conjunto de productos que se venden como una unidad. Agrega productos al combo.</p>
                    
                    <div className="mt-4">
                      <Label className="text-sm text-[#29696B] flex items-center gap-2 mb-2">
                        <ListChecks className="w-4 h-4" />
                        Productos en el combo:
                      </Label>
                      
                      {formData.itemsCombo.length > 0 ? (
                        <div className="space-y-2 mb-3">
                          {formData.itemsCombo.map((item, index) => {
                            const productoNombre = item.producto?.nombre || 'Producto';
                            const productoPrecio = item.producto?.precio || 0;
                            const subtotal = (productoPrecio * item.cantidad);
                            
                            return (
                              <div 
                                key={index} 
                                className="flex items-center justify-between p-2 bg-white border border-[#91BEAD]/20 rounded-md"
                              >
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8">
                                    <ProductImage
                                      productId={typeof item.productoId === 'string' ? item.productoId : item.productoId._id}
                                      alt={productoNombre}
                                      width={32}
                                      height={32}
                                      quality={60}
                                      className="w-8 h-8 rounded-md object-cover border border-[#91BEAD]/30"
                                      fallbackClassName="w-8 h-8 rounded-md bg-[#DFEFE6]/50 flex items-center justify-center border border-[#91BEAD]/30"
                                    />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-[#29696B]">{productoNombre}</p>
                                    <div className="flex items-center text-xs text-[#7AA79C]">
                                      <span>${productoPrecio.toFixed(2)} x {item.cantidad}</span>
                                      <span className="mx-1">•</span>
                                      <span className="font-medium">${subtotal.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center border border-[#91BEAD]/30 rounded-md">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-[#29696B] hover:bg-[#DFEFE6]/50 rounded-r-none"
                                      onClick={() => handleComboItemQuantityChange(index, Math.max(1, item.cantidad - 1))}
                                    >
                                      <MinusCircle className="h-3 w-3" />
                                    </Button>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={item.cantidad}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        if (!isNaN(value) && value >= 1) {
                                          handleComboItemQuantityChange(index, value);
                                        }
                                      }}
                                      className="h-7 w-12 text-center border-0 p-0"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-[#29696B] hover:bg-[#DFEFE6]/50 rounded-l-none"
                                      onClick={() => handleComboItemQuantityChange(index, item.cantidad + 1)}
                                    >
                                      <PlusCircle className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                                    onClick={() => handleRemoveComboItem(index)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                          
                          <div className="flex justify-between items-center p-2 bg-[#DFEFE6]/20 rounded-md">
                            <span className="text-sm font-medium text-[#29696B]">Total calculado:</span>
                            <span className="text-sm font-bold text-[#29696B]">${comboTotalPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 text-center text-[#7AA79C] bg-[#DFEFE6]/10 rounded-md border border-dashed border-[#91BEAD]/30 mb-3">
                          <ShoppingCart className="w-4 h-4 mx-auto mb-1" />
                          <p className="text-xs">No hay productos en el combo</p>
                        </div>
                      )}
                      
                      {/* Selector de productos para el combo */}
                      <div>
                        <Label className="text-sm text-[#29696B] flex items-center gap-2 mb-2">
                          <PlusCircle className="w-4 h-4" />
                          Agregar productos al combo:
                        </Label>
                        <ProductSelector 
                          selectedProductIds={formData.itemsCombo.map(item => 
                            typeof item.productoId === 'string' 
                              ? item.productoId 
                              : item.productoId._id
                          )}
                          onSelectProduct={handleAddProductToCombo}
                          categoryFilter={formData.categoria}
                          excludeComboProducts={true}
                        />
                      </div>
                      
                      {/* Nota sobre el precio */}
                      <div className="mt-3 flex items-start gap-2 p-2 bg-[#DFEFE6]/20 rounded-md text-xs text-[#29696B]">
                        <Calculator className="w-4 h-4 text-[#7AA79C] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Nota sobre el precio:</p>
                          <p>El precio total de los productos es ${comboTotalPrice.toFixed(2)}. Puede asignar un precio diferente al combo si desea ofrecer un descuento.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                  <Label htmlFor="precio" className="text-sm text-[#29696B] flex items-center gap-1">
                    <Tag className="w-4 h-4 text-[#7AA79C]" />
                    <span>Precio asignado</span>
                  </Label>
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
                  {formData.esCombo && comboTotalPrice > 0 && parseFloat(formData.precio) < comboTotalPrice && (
                    <p className="mt-1 text-xs text-green-600">
                      Descuento de ${(comboTotalPrice - parseFloat(formData.precio)).toFixed(2)} 
                      ({Math.round((1 - parseFloat(formData.precio) / comboTotalPrice) * 100)}%)
                    </p>
                  )}
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
                
                {/* Mostrar el componente de carga de imágenes cuando estamos editando */}
                {editingProduct ? (
                  <div className="mt-2">
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
                          onClick={() => confirmDeleteImage(editingProduct._id)}
                          className="absolute top-2 right-2 h-8 w-8 p-0 bg-red-500 hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <ImageUpload 
                        productId={editingProduct._id}
                        useBase64={true}
                        onImageUploaded={handleImageUploaded}
                      />
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