// hooks/useProductForm.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Product, 
  ProductFormData, 
  ComboItem 
} from '../types/inventory.types';
import { 
    validateImageFile, 
    readFileAsDataURL 
} from '../utils/product-image.utils';
import { getProductImageUrl } from '../utils/product-image.utils';

interface UseProductFormProps {
  product: Product | null;
  isCombo: boolean;
  onSubmit: (productData: Partial<Product>, imageFile?: File | null) => Promise<void>;
}

interface UseProductFormReturn {
  formData: ProductFormData;
  selectedComboItems: ComboItem[];
  isAddingStock: boolean;
  hasStockIssues: boolean;
  stockWarnings: string[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  setSelectedComboItems: React.Dispatch<React.SetStateAction<ComboItem[]>>;
  setIsAddingStock: React.Dispatch<React.SetStateAction<boolean>>;
  
  resetForm: () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleCategoryChange: (value: string) => void;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveImage: () => void;
  
  calculateComboTotal: (items: ComboItem[]) => number;
  validateComboStock: (items: ComboItem[], availableProducts: Product[]) => { valid: boolean; warnings: string[] };
}

/**
 * Hook personalizado para manejar el formulario de productos
 */
export const useProductForm = ({
  product,
  isCombo,
  onSubmit
}: UseProductFormProps): UseProductFormReturn => {
  // Estado inicial del formulario
  const [formData, setFormData] = useState<ProductFormData>({
    nombre: '',
    descripcion: '',
    categoria: '',
    subCategoria: '',
    marca: '',
    precio: '',
    stock: '',
    stockMinimo: '5', // Valor predeterminado
    proveedor: {
      nombre: '',
      contacto: '',
      telefono: '',
      email: ''
    },
    estado: 'activo', // Valor predeterminado
    imagen: null,
    imagenPreview: null
  });
  
  // Estado para combos
  const [selectedComboItems, setSelectedComboItems] = useState<ComboItem[]>([]);
  
  // Estado para modo de stock
  const [isAddingStock, setIsAddingStock] = useState(false);
  
  // Estado para validación de stock
  const [hasStockIssues, setHasStockIssues] = useState(false);
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);
  
  // Referencias
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  /**
   * Inicializa el formulario cuando cambia el producto
   */
  useEffect(() => {
    if (product) {
      // Detectar si es un combo
      const isProductCombo = product.esCombo || false;
      
      // Cargar los ítems del combo si es uno
      if (isProductCombo && Array.isArray(product.itemsCombo)) {
        const comboItems = product.itemsCombo.map(item => {
          // Si el item está poblado
          if (item.productoId && typeof item.productoId === 'object') {
            return {
              productoId: item.productoId._id,
              nombre: item.productoId.nombre,
              cantidad: item.cantidad,
              precio: item.productoId.precio
            };
          }
          // Si no está poblado, usar la información disponible
          else {
            const productId = typeof item.productoId === 'string' 
              ? item.productoId 
              : String(item.productoId);
              
            return {
              productoId: productId,
              nombre: 'Producto',
              cantidad: item.cantidad,
              precio: 0
            };
          }
        });
        
        setSelectedComboItems(comboItems);
      } else {
        setSelectedComboItems([]);
      }
      
      // Preparar vista previa de imagen si existe
      let imagePreview = null;
      
      if (product.hasImage || product.imageUrl) {
        imagePreview = getProductImageUrl(product, true);
      }
      
      // Llenar formulario con datos del producto
      setFormData({
        nombre: product.nombre || '',
        descripcion: product.descripcion || '',
        categoria: product.categoria || '',
        subCategoria: product.subCategoria || '',
        marca: product.marca || '',
        precio: product.precio ? product.precio.toString() : '',
        stock: product.stock ? product.stock.toString() : '0',
        stockMinimo: (product.stockMinimo || 5).toString(),
        proveedor: {
          nombre: product.proveedor?.nombre || '',
          contacto: product.proveedor?.contacto || '',
          telefono: product.proveedor?.telefono || '',
          email: product.proveedor?.email || ''
        },
        estado: product.estado || 'activo',
        imagen: null,
        imagenPreview: imagePreview
      });
    } else {
      // Resetear el formulario si no hay producto
      resetForm();
    }
  }, [product]);

  /**
   * Resetea el formulario a sus valores iniciales
   */
  const resetForm = useCallback(() => {
    setFormData({
      nombre: '',
      descripcion: '',
      categoria: '',
      subCategoria: '',
      marca: '',
      precio: '',
      stock: '',
      stockMinimo: '5',
      proveedor: {
        nombre: '',
        contacto: '',
        telefono: '',
        email: ''
      },
      estado: 'activo',
      imagen: null,
      imagenPreview: null
    });
    
    setSelectedComboItems([]);
    setIsAddingStock(false);
    setHasStockIssues(false);
    setStockWarnings([]);
    
    // Limpiar input de archivo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /**
   * Maneja el cambio de categoría y resetea la subcategoría
   */
  const handleCategoryChange = useCallback((value: string) => {
    if (value === 'not-selected') {
      setFormData(prev => ({
        ...prev,
        categoria: '',
        subCategoria: ''
      }));
      return;
    }
    
    // Verificar que sea una categoría válida
    if (value !== 'limpieza' && value !== 'mantenimiento') {
      console.error(`Categoría no válida: ${value}`);
      return;
    }
    
    // Actualizar categoría y limpiar subcategoría
    setFormData(prev => ({
      ...prev,
      categoria: value,
      subCategoria: ''
    }));
  }, []);

  /**
   * Maneja el cambio de imagen en el formulario
   */
  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar el archivo
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        alert(validation.error);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      try {
        // Crear URL para vista previa
        const dataUrl = await readFileAsDataURL(file);
        
        setFormData(prev => ({
          ...prev,
          imagen: file,
          imagenPreview: dataUrl
        }));
      } catch (error) {
        console.error('Error al generar vista previa:', error);
        alert('Error al procesar la imagen');
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  }, []);

  /**
   * Elimina la imagen del formulario
   */
  const handleRemoveImage = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      imagen: null,
      imagenPreview: null
    }));
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /**
   * Calcula el precio total de un combo
   */
  const calculateComboTotal = useCallback((items: ComboItem[]): number => {
    if (!Array.isArray(items)) return 0;
    
    return items.reduce((total, item) => {
      const precio = item.precio || 0;
      const cantidad = item.cantidad || 0;
      return total + (precio * cantidad);
    }, 0);
  }, []);

  /**
   * Valida el stock disponible para un combo
   */
  const validateComboStock = useCallback((
    comboItems: ComboItem[], 
    availableProducts: Product[]
  ): { valid: boolean; warnings: string[] } => {
    const warnings: string[] = [];
    let isValid = true;
    
    // Si no hay items, es válido
    if (!comboItems || comboItems.length === 0) {
      return { valid: true, warnings: [] };
    }
    
    // Verificar cada item
    comboItems.forEach(item => {
      // Buscar el producto en la lista
      const product = availableProducts.find(p => {
        const itemId = typeof item.productoId === 'string'
          ? item.productoId
          : (item.productoId as Product)._id;
        return p._id === itemId;
      });
      
      if (product) {
        // Verificar stock suficiente
        if (product.stock < item.cantidad) {
          isValid = false;
          warnings.push(`No hay suficiente stock de "${product.nombre}". Disponible: ${product.stock}, Requerido: ${item.cantidad}`);
        }
        // Verificar stock bajo
        else if (product.stock <= 10) {
          warnings.push(`Stock bajo de "${product.nombre}". Disponible: ${product.stock}, Requerido: ${item.cantidad}`);
        }
      } else {
        isValid = false;
        warnings.push(`No se pudo encontrar el producto para validar su stock`);
      }
    });
    
    return { valid: isValid, warnings };
  }, []);

  /**
   * Maneja el envío del formulario
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validar campos obligatorios
      if (!formData.nombre) {
        throw new Error('El nombre del producto es obligatorio');
      }
      
      if (!formData.categoria) {
        throw new Error('Debe seleccionar una categoría');
      }
      
      if (!formData.subCategoria) {
        throw new Error('Debe seleccionar una subcategoría');
      }
      
      // Validar combo
      if (isCombo && selectedComboItems.length === 0) {
        throw new Error('Un combo debe tener al menos un producto');
      }
      
      // Procesar el stock
      let finalStock = parseInt(formData.stock || '0');
      
      // Si estamos editando y agregando stock, sumar al stock existente
      if (product && isAddingStock) {
        finalStock = product.stock + finalStock;
      }
      
      // Construir payload para API
      const payload: Partial<Product> = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        categoria: formData.categoria as any,
        subCategoria: formData.subCategoria as any,
        marca: formData.marca,
        precio: Number(formData.precio),
        stock: finalStock,
        stockMinimo: Number(formData.stockMinimo),
        proveedor: {
          nombre: formData.proveedor.nombre,
          contacto: formData.proveedor.contacto,
          telefono: formData.proveedor.telefono,
          email: formData.proveedor.email
        },
        estado: formData.estado as any,
        esCombo: isCombo,
        itemsCombo: isCombo 
          ? selectedComboItems.map(item => ({
              productoId: typeof item.productoId === 'string' 
                ? item.productoId 
                : (item.productoId as Product)._id,
              cantidad: item.cantidad
            })) 
          : []
      };
      
      // Llamar a la función de envío
      await onSubmit(payload, formData.imagen);
      
      // Resetear el formulario
      resetForm();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }, [formData, product, isCombo, isAddingStock, selectedComboItems, onSubmit, resetForm]);

  return {
    formData,
    selectedComboItems,
    isAddingStock,
    hasStockIssues,
    stockWarnings,
    fileInputRef,
    
    setFormData,
    setSelectedComboItems,
    setIsAddingStock,
    
    resetForm,
    handleSubmit,
    handleCategoryChange,
    handleImageChange,
    handleRemoveImage,
    
    calculateComboTotal,
    validateComboStock
  };
};

export default useProductForm;