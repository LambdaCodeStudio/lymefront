// InventorySection.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Loader2, Plus, RefreshCw, Search, PackagePlus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

// Hooks personalizados
import { useProductAPI } from './hooks/useProductAPI';
import { useProductFilters } from './hooks/useProductFilters';
import { useNotification } from '@/context/NotificationContext';

// Componentes
import ProductList from './components/ProductList';
import ProductForm from './components/ProductForm';
import StockFilters from './components/StockFilters';
import { inventoryObservable } from '@/utils/inventoryUtils';

// Tipos y constantes
import { Product } from './types/inventory.types';
import { 
  ITEMS_PER_PAGE_MOBILE, 
  ITEMS_PER_PAGE_DESKTOP,
  MESSAGES,
  SUCCESS_MESSAGE_TIMEOUT
} from './utils/constants';

/**
 * Componente principal OPTIMIZADO para la sección de inventario
 * - Reducción de las recargas innecesarias
 * - Mejor manejo de dependencias de efectos
 * - Optimización de callbacks para evitar recreaciones
 */
const InventorySection: React.FC = () => {
  // Estado de la UI
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCombo, setIsCombo] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteImageDialogOpen, setDeleteImageDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  
  // Referencias para controlar el estado de montaje y evitar carreras
  const isMounted = useRef(true);
  const initialRenderComplete = useRef(false);
  const observerSetup = useRef(false);
  const lastFetchTimestamp = useRef(0);
  
  // Contextos
  const { addNotification } = useNotification();
  
  // Determinar tamaño de página basado en el ancho de la ventana (memoizado)
  const itemsPerPage = useMemo(() => 
    windowWidth < 768 ? ITEMS_PER_PAGE_MOBILE : ITEMS_PER_PAGE_DESKTOP,
  [windowWidth]);
  
  // Hooks para API
  const {
    products,
    loading,
    error,
    refreshing,
    currentPage,
    totalCount,
    lowStockCount,
    noStockCount,
    isLowStockLoading,
    isNoStockLoading,
    
    setCurrentPage,
    handlePageChange,
    fetchProducts,
    handleManualRefresh,
    
    createProduct,
    updateProduct,
    deleteProduct,
    fetchProductById,
    
    deleteProductImage,
    
    countLowStockProducts,
    countNoStockProducts
  } = useProductAPI({ itemsPerPage });
  
  // Manejador estable para cuando cambian los filtros
  const handleFiltersChanged = useCallback((params: URLSearchParams) => {
    // Evitar fetchs demasiado frecuentes (mínimo 50ms entre ellos)
    const now = Date.now();
    if (now - lastFetchTimestamp.current < 50) {
      return;
    }
    
    // Registrar el timestamp de esta solicitud
    lastFetchTimestamp.current = now;
    
    // El trabajo principal ahora lo hace el hook - solo necesitamos obtener los parámetros
    const searchTerm = params.get('regex') || '';
    const category = params.get('category') || (params.get('esCombo') === 'true' ? 'combos' : 'all');
    const showLowStock = params.get('lowStock') === 'true';
    const showNoStock = params.get('noStock') === 'true';
    
    // Hacer fetch con estos parámetros (solo después del montaje inicial)
    if (initialRenderComplete.current) {
      console.log('Filtros cambiados, solicitando actualización de productos');
      fetchProducts(true, 1, itemsPerPage, {
        searchTerm,
        category,
        showLowStockOnly: showLowStock,
        showNoStockOnly: showNoStock
      });
    }
  }, [fetchProducts, itemsPerPage]);
  
  // Hook de filtros
  const {
    searchTerm,
    selectedCategory,
    showLowStockOnly,
    showNoStockOnly,
    debouncedSearchTerm,
    
    setSearchTerm,
    setSelectedCategory,
    
    toggleLowStockFilter,
    toggleNoStockFilter
  } = useProductFilters({
    clientSideFiltering: false,
    onFiltersChange: handleFiltersChanged,
    itemsPerPage
  });
  
  // ========== EFECTOS OPTIMIZADOS ==========
  
  // Efecto para cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Efecto para actualizar el ancho de la ventana
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
  }, [windowWidth, setCurrentPage]);
  
  // Efecto para cargar datos iniciales y configurar observador
  // Solo se ejecuta una vez al montar el componente
  useEffect(() => {
    console.log('InventorySection: Componente montado, iniciando carga de productos...');
    
    // Cargar productos inmediatamente al montar
    fetchProducts(true);
    
    // Cargar contadores de stock
    countLowStockProducts();
    countNoStockProducts();
    
    // Marcar que la renderización inicial está completa
    initialRenderComplete.current = true;
    
    // Configurar observador solo una vez
    if (!observerSetup.current) {
      const unsubscribe = inventoryObservable.subscribe(() => {
        if (isMounted.current) {
          console.log('InventorySection: Actualización de inventario notificada por observable');
          fetchProducts(true);
          countLowStockProducts();
          countNoStockCount();
        }
      });
      
      observerSetup.current = true;
      
      // Cleanup
      return () => {
        unsubscribe();
      };
    }
  }, []); // Dependencia vacía para que solo se ejecute al montar
  
  // ========== CALLBACKS ESTABLES ==========
  
  /**
   * Función para abrir el modal de creación/edición
   */
  const handleOpenModal = useCallback((product: Product | null = null, asCombo = false) => {
    setEditingProduct(product);
    setIsEditing(!!product);
    setIsCombo(product ? !!product.esCombo : asCombo);
    setShowModal(true);
  }, []);
  
  /**
   * Guardar producto (crear o actualizar)
   */
  const handleSaveProduct = useCallback(async (
    productData: Partial<Product>, 
    imageFile?: File | null
  ) => {
    try {
      if (editingProduct) {
        // Actualizar producto existente
        await updateProduct(editingProduct._id, productData, imageFile);
        addNotification(MESSAGES.PRODUCT_SAVED(false), 'success');
      } else {
        // Crear nuevo producto
        await createProduct(productData, imageFile);
        addNotification(MESSAGES.PRODUCT_SAVED(true), 'success');
      }
      
      // Mostrar mensaje de éxito
      setSuccessMessage(MESSAGES.PRODUCT_SAVED(!!editingProduct));
      setTimeout(() => {
        if (isMounted.current) {
          setSuccessMessage('');
        }
      }, SUCCESS_MESSAGE_TIMEOUT);
      
      // Volver a cargar los datos después de guardar
      handleManualRefresh();
      
      // Cerrar modal y resetear estado
      setShowModal(false);
      setEditingProduct(null);
      setIsEditing(false);
      setIsCombo(false);
    } catch (error: any) {
      console.error('Error al guardar producto:', error);
      addNotification(`Error: ${error.message}`, 'error');
    }
  }, [editingProduct, createProduct, updateProduct, addNotification, handleManualRefresh]);
  
  /**
   * Inicia el proceso de eliminación de un producto
   */
  const confirmDeleteProduct = useCallback((id: string) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  }, []);
  
  /**
   * Ejecuta la eliminación de un producto
   */
  const handleDeleteProduct = useCallback(async () => {
    if (!productToDelete) return;
    
    try {
      await deleteProduct(productToDelete);
      
      addNotification(MESSAGES.PRODUCT_DELETED, 'success');
      setSuccessMessage(MESSAGES.PRODUCT_DELETED);
      setTimeout(() => {
        if (isMounted.current) {
          setSuccessMessage('');
        }
      }, SUCCESS_MESSAGE_TIMEOUT);
      
      // Actualizar contadores después de eliminar
      countLowStockProducts();
      countNoStockProducts();
    } catch (error: any) {
      console.error('Error al eliminar producto:', error);
      addNotification(`Error: ${error.message}`, 'error');
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  }, [productToDelete, deleteProduct, addNotification, countLowStockProducts, countNoStockProducts]);
  
  /**
   * Inicia el proceso de eliminación de una imagen
   */
  const confirmDeleteImage = useCallback((id: string) => {
    setProductToDelete(id);
    setDeleteImageDialogOpen(true);
  }, []);
  
  /**
   * Ejecuta la eliminación de una imagen
   */
  const handleDeleteImage = useCallback(async () => {
    if (!productToDelete) return;
    
    try {
      await deleteProductImage(productToDelete);
      
      addNotification(MESSAGES.IMAGE_DELETED, 'success');
      
      // Si el modal está abierto y es el mismo producto, actualizar la vista previa
      if (showModal && editingProduct && editingProduct._id === productToDelete) {
        // Recargar el producto para actualizar datos de imagen
        const updatedProduct = await fetchProductById(productToDelete);
        if (updatedProduct) {
          setEditingProduct(updatedProduct);
        }
      }
    } catch (error: any) {
      console.error('Error al eliminar imagen:', error);
      addNotification(`Error: ${error.message}`, 'error');
    } finally {
      setDeleteImageDialogOpen(false);
      setProductToDelete(null);
    }
  }, [productToDelete, deleteProductImage, addNotification, showModal, editingProduct, fetchProductById]);

  /**
   * Handlers de cambio de categoría optimizado
   */
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
  }, [setSelectedCategory]);
  
  /**
   * Handler de cambio de búsqueda optimizado
   */
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, [setSearchTerm]);

  // Memoizamos props para ProductList para evitar renders innecesarios
  const productListProps = useMemo(() => ({
    products,
    loading,
    error: error,
    totalCount,
    currentPage,
    itemsPerPage,
    windowWidth,
    searchTerm,
    selectedCategory,
    showLowStockOnly,
    showNoStockOnly,
    onEdit: handleOpenModal,
    onDelete: confirmDeleteProduct,
    onEditImage: handleOpenModal,
    onDeleteImage: confirmDeleteImage,
    onPageChange: handlePageChange
  }), [
    products, 
    loading, 
    error, 
    totalCount,
    currentPage,
    itemsPerPage,
    windowWidth,
    searchTerm,
    selectedCategory,
    showLowStockOnly,
    showNoStockOnly,
    handleOpenModal,
    confirmDeleteProduct,
    confirmDeleteImage,
    handlePageChange
  ]);

  // Memoizamos props para StockFilters para evitar renders innecesarios
  const stockFiltersProps = useMemo(() => ({
    showLowStockOnly,
    showNoStockOnly,
    lowStockCount,
    noStockCount,
    isLowStockLoading,
    isNoStockLoading,
    onLowStockToggle: toggleLowStockFilter,
    onNoStockToggle: toggleNoStockFilter
  }), [
    showLowStockOnly,
    showNoStockOnly,
    lowStockCount,
    noStockCount,
    isLowStockLoading,
    isNoStockLoading,
    toggleLowStockFilter,
    toggleNoStockFilter
  ]);

  return (
    <div className="p-4 md:p-6 space-y-6 bg-[#DFEFE6]/30">
      {/* Alertas */}
      {error && (
        <Alert className="bg-red-50 border border-red-200 text-red-800 rounded-lg">
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="bg-[#DFEFE6] border border-[#91BEAD] text-[#29696B] rounded-lg">
          <CheckCircle className="h-4 w-4 text-[#29696B]" aria-hidden="true" />
          <AlertDescription className="ml-2">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Barra de herramientas */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 bg-white rounded-xl shadow-sm p-4 border border-[#91BEAD]/20">
        <div className="w-full md:w-64">
          <div className="relative mb-4">
            <Search 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" 
              aria-hidden="true" 
            />
            <Input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
              aria-label="Buscar productos"
            />
          </div>

          <Tabs
            defaultValue="all"
            value={selectedCategory}
            onValueChange={handleCategoryChange}
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
              <TabsTrigger
                value="combos"
                className="flex-1 data-[state=active]:bg-[#00888A] data-[state=active]:text-white"
              >
                Combos
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="w-full md:w-auto flex flex-wrap gap-2">
          {/* Filtros de stock */}
          <StockFilters {...stockFiltersProps} />

          {/* Botón de recarga manual */}
          <Button
            onClick={handleManualRefresh}
            variant="outline"
            className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            disabled={loading || refreshing}
            aria-label="Actualizar lista de productos"
          >
            <RefreshCw 
              className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} 
              aria-hidden="true" 
            />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          {/* Botón de nuevo producto */}
          <Button
            onClick={() => handleOpenModal(null, false)}
            className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
            aria-label="Crear nuevo producto"
          >
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">Nuevo Producto</span>
            <span className="sm:hidden">Producto</span>
          </Button>

          {/* Botón de nuevo combo */}
          <Button
            onClick={() => handleOpenModal(null, true)}
            className="bg-[#00888A] hover:bg-[#00888A]/90 text-white"
            aria-label="Crear nuevo combo"
          >
            <PackagePlus className="w-4 h-4 mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">Nuevo Combo</span>
            <span className="sm:hidden">Combo</span>
          </Button>
        </div>
      </div>

      {/* Lista de productos */}
      <ProductList {...productListProps} />

      {/* Formulario modal de producto */}
      <ProductForm
        product={editingProduct}
        onSave={handleSaveProduct}
        onCancel={() => {
          setShowModal(false);
          setEditingProduct(null);
          setIsEditing(false);
        }}
        isOpen={showModal}
        isCombo={isCombo}
      />

      {/* Diálogo de confirmación de eliminación */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar producto"
        description={MESSAGES.CONFIRM_DELETE}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteProduct}
        variant="destructive"
      />

      {/* Diálogo de confirmación de eliminación de imagen */}
      <ConfirmationDialog
        open={deleteImageDialogOpen}
        onOpenChange={setDeleteImageDialogOpen}
        title="Eliminar imagen"
        description={MESSAGES.CONFIRM_DELETE_IMAGE}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteImage}
        variant="destructive"
      />

      {/* Botones flotantes para filtros en móviles */}
      {!loading && (lowStockCount > 0 || noStockCount > 0) && 
       !showLowStockOnly && !showNoStockOnly && windowWidth < 768 && (
        <StockFilters
          {...stockFiltersProps}
          isMobile={true}
        />
      )}
    </div>
  );
};

export default InventorySection;