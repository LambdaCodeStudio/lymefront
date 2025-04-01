// utils/product-validation.utils.ts
import { Product, ComboItem } from '../types/inventory.types';
import { LOW_STOCK_THRESHOLD } from './constants';

/**
 * Valida un nuevo producto antes de enviar al servidor
 * @param product - Producto a validar
 * @returns Objeto con resultado de validación
 */
export const validateProduct = (product: Partial<Product>): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  // Validar campos obligatorios
  if (!product.nombre || product.nombre.trim() === '') {
    errors.push('El nombre del producto es obligatorio');
  }
  
  if (!product.categoria) {
    errors.push('La categoría del producto es obligatoria');
  }
  
  if (!product.subCategoria) {
    errors.push('La subcategoría del producto es obligatoria');
  }
  
  if (product.precio === undefined || product.precio < 0) {
    errors.push('El precio debe ser un número mayor o igual a cero');
  }
  
  // Validar stock según categoría
  if (product.categoria === 'limpieza' && (product.stock === undefined || product.stock < 0)) {
    errors.push('Los productos de limpieza deben tener stock mínimo de 0');
  }
  
  // Validar combos
  if (product.esCombo) {
    if (!product.itemsCombo || product.itemsCombo.length === 0) {
      errors.push('Un combo debe tener al menos un producto');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Valida todos los ítems del combo tienen suficiente stock
 * @param comboItems - Ítems del combo
 * @param allProducts - Todos los productos disponibles
 * @returns Objeto con resultado de validación y advertencias
 */
export const validateComboStock = (
  comboItems: ComboItem[],
  allProducts: Product[]
): { valid: boolean; warnings: string[]; critical: boolean; } => {
  const warnings: string[] = [];
  let isValid = true;
  let hasCriticalIssue = false;
  
  // Si no hay items en el combo, es válido
  if (!comboItems || comboItems.length === 0) {
    return { valid: true, warnings: [], critical: false };
  }
  
  // Verificar cada item del combo
  comboItems.forEach(item => {
    const productId = typeof item.productoId === 'string'
      ? item.productoId
      : (item.productoId as Product)._id;
      
    const product = allProducts.find(p => p._id === productId);
    
    if (product) {
      // Si el stock es menor que la cantidad requerida
      if (product.stock < item.cantidad) {
        isValid = false;
        hasCriticalIssue = true;
        warnings.push(`No hay suficiente stock de "${product.nombre}". Disponible: ${product.stock}, Requerido: ${item.cantidad}`);
      }
      // Si el stock es bajo (pero suficiente)
      else if (product.stock <= LOW_STOCK_THRESHOLD) {
        warnings.push(`Stock bajo de "${product.nombre}". Disponible: ${product.stock}, Requerido: ${item.cantidad}`);
      }
    } else {
      isValid = false;
      hasCriticalIssue = true;
      warnings.push(`No se pudo encontrar el producto para validar su stock`);
    }
  });
  
  return { valid: isValid, warnings, critical: hasCriticalIssue };
};

/**
 * Validación simple para la actualización de stock
 * @param currentStock - Stock actual
 * @param newStock - Nuevo stock
 * @param isAddition - Si es una adición al stock existente
 * @param categoria - Categoría del producto
 * @returns Objeto con resultado de validación
 */
export const validateStockUpdate = (
  currentStock: number,
  newStock: number,
  isAddition: boolean,
  categoria: string
): {
  valid: boolean;
  error?: string;
  finalStock: number;
} => {
  // Calcular stock final
  const finalStock = isAddition ? currentStock + newStock : newStock;
  
  // Para productos de limpieza, el stock no puede ser negativo
  if (categoria === 'limpieza' && finalStock < 0) {
    return {
      valid: false,
      error: 'Los productos de limpieza no pueden tener stock negativo',
      finalStock
    };
  }
  
  return { valid: true, finalStock };
};

/**
 * Sanitiza datos de producto antes de enviar al servidor
 * @param product - Producto a sanitizar
 * @returns Versión sanitizada del producto
 */
export const sanitizeProductData = (product: Partial<Product>): Partial<Product> => {
  const sanitized: Partial<Product> = { ...product };
  
  // Asegurar que el nombre no tenga espacios al inicio/final
  if (sanitized.nombre) {
    sanitized.nombre = sanitized.nombre.trim();
  }
  
  // Asegurar que la descripción no tenga espacios al inicio/final
  if (sanitized.descripcion) {
    sanitized.descripcion = sanitized.descripcion.trim();
  }
  
  // Convertir precio a número
  if (sanitized.precio !== undefined) {
    sanitized.precio = Number(sanitized.precio);
    
    // Si no es un número válido, establecer a 0
    if (isNaN(sanitized.precio)) {
      sanitized.precio = 0;
    }
  }
  
  // Convertir stock a entero
  if (sanitized.stock !== undefined) {
    sanitized.stock = parseInt(String(sanitized.stock));
    
    // Si no es un número válido, establecer a 0
    if (isNaN(sanitized.stock)) {
      sanitized.stock = 0;
    }
  }
  
  // Convertir stockMinimo a entero
  if (sanitized.stockMinimo !== undefined) {
    sanitized.stockMinimo = parseInt(String(sanitized.stockMinimo));
    
    // Si no es un número válido, establecer a un valor predeterminado
    if (isNaN(sanitized.stockMinimo)) {
      sanitized.stockMinimo = 5;
    }
  }
  
  // Sanitizar items de combo si es un combo
  if (sanitized.esCombo && sanitized.itemsCombo) {
    sanitized.itemsCombo = sanitized.itemsCombo.map(item => ({
      productoId: typeof item.productoId === 'string' 
        ? item.productoId 
        : (item.productoId as Product)._id,
      cantidad: parseInt(String(item.cantidad)) || 1
    }));
  }
  
  return sanitized;
};

/**
 * Valida un archivo de imagen
 * @param file - Archivo a validar
 * @returns Objeto con resultado de validación
 */
export const validateImageFile = (file: File | null): {
  valid: boolean;
  error?: string;
} => {
  if (!file) {
    return { valid: false, error: 'No se ha seleccionado ningún archivo' };
  }
  
  // Validar tamaño (5MB máximo)
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'La imagen no debe superar los 5MB' };
  }
  
  // Validar tipo
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'El archivo debe ser una imagen' };
  }
  
  // Validar formatos aceptados
  const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!ACCEPTED_FORMATS.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Formato no soportado. Use JPEG, PNG, WebP o GIF' 
    };
  }
  
  return { valid: true };
};