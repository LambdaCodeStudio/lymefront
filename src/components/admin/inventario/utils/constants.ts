// utils/constants.ts

// Configuración general
export const API_URL = "/api/";
export const DEFAULT_IMAGE_URL = "/lyme.png";

// Constantes relacionadas con el stock
export const LOW_STOCK_THRESHOLD = 10;
export const ITEMS_PER_PAGE_MOBILE = 5;
export const ITEMS_PER_PAGE_DESKTOP = 10;

// Categorías y subcategorías
export const PRODUCT_CATEGORIES = [
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'mantenimiento', label: 'Mantenimiento' }
];

export const PRODUCT_SUBCATEGORIES = {
  limpieza: [
    { value: 'accesorios', label: 'Accesorios' },
    { value: 'aerosoles', label: 'Aerosoles' },
    { value: 'bolsas', label: 'Bolsas' },
    { value: 'estandar', label: 'Estándar' },
    { value: 'indumentaria', label: 'Indumentaria' },
    { value: 'liquidos', label: 'Líquidos' },
    { value: 'papeles', label: 'Papeles' },
    { value: 'calzado', label: 'Calzado' },
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

// Mensajes para el usuario
export const MESSAGES = {
  LOADING: 'Cargando productos...',
  NO_PRODUCTS: 'No hay productos disponibles',
  NO_RESULTS: 'No se encontraron productos que coincidan con la búsqueda',
  PRODUCT_SAVED: (isNew: boolean) => `Producto ${isNew ? 'creado' : 'actualizado'} correctamente`,
  PRODUCT_DELETED: 'Producto eliminado correctamente',
  COMBO_REQUIREMENTS: 'Un combo debe tener al menos un producto',
  STOCK_WARNING: 'No hay suficiente stock para crear el combo',
  IMAGE_SIZE_LIMIT: 'La imagen no debe superar los 5MB',
  IMAGE_TYPE_INVALID: 'El archivo debe ser una imagen',
  IMAGE_UPLOADED: 'Imagen subida correctamente',
  IMAGE_DELETED: 'Imagen eliminada correctamente',
  CONFIRM_DELETE: '¿Está seguro de que desea eliminar este producto? Esta acción no se puede deshacer.',
  CONFIRM_DELETE_IMAGE: '¿Está seguro de que desea eliminar la imagen de este producto?',
  TOKEN_ERROR: 'No hay token de autenticación',
  UNAUTHORIZED: 'No tiene permisos para acceder a esta función'
};

// Colores y estilos (para mantener consistencia)
export const COLORS = {
  PRIMARY: '#29696B',
  PRIMARY_LIGHT: '#DFEFE6',
  PRIMARY_DARK: '#1A4A4C',
  SECONDARY: '#00888A',
  SECONDARY_LIGHT: '#00888A10',
  BORDER: '#91BEAD',
  BORDER_LIGHT: '#91BEAD20',
  TEXT: '#29696B',
  TEXT_LIGHT: '#7AA79C',
  WARNING: 'rgb(234 179 8)',
  ERROR: 'rgb(239 68 68)',
  SUCCESS: '#DFEFE6'
};

// Para validación de imágenes
export const IMAGE_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
};

// Timeouts
export const DEBOUNCE_DELAY = 300; // ms
export const SUCCESS_MESSAGE_TIMEOUT = 5000; // ms