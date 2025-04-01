// InventorySection.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
 * Componente principal optimizado para la sección de inventario
 * VERSIÓN OPTIMIZADA para prevenir actualizaciones múltiples
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
  
  // Referencias
  const mobileListRef = useRef<HTMLDivElement>(null);
  const initialFetchDone = useRef(false);
  const isInitialMount = useRef(true);
  const filtersChanged = useRef(false);
  const filterUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatePending = useRef(false);
  
  // Contextos
  const { addNotification } = useNotification();
  
  // Determinar tamaño de página basado en el ancho de la ventana
  const itemsPerPage = windowWidth < 768 ? ITEMS_PER_PAGE_MOBILE : ITEMS_PER_PAGE_DESKTOP;
  
  // Hooks para API y filtros
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
    
    deleteProductImage
  } = useProductAPI({ itemsPerPage });
  
  /**
   * Función mejorada para actualizar productos cuando cambian los filtros
   * Usa un timeout para agrupar múltiples cambios en una sola actualización
   */
  const scheduleFilterUpdate = useCallback(() => {
    // Si ya hay una actualización pendiente, no programar otra
    if (isUpdatePending.current) return;
    
    // Marcar que hay una actualización pendiente
    isUpdatePending.current = true;
    
    // Limpiar cualquier timeout previo
    if (filterUpdateTimeoutRef.current) {
      clearTimeout(filterUpdateTimeoutRef.current);
    }
    
    // Programar la actualización con un delay
    filterUpdateTimeoutRef.current = setTimeout(() => {
      if (!isInitialMount.current && initialFetchDone.current) {
        console.log('Filtros cambiados, actualizando productos...');
        fetchProducts(true, 1, itemsPerPage, {
          searchTerm: debouncedSearchTerm,
          category: selectedCategory,
          showLowStockOnly,
          showNoStockOnly
        });
      }
      
      // Marcar que ya no hay una actualización pendiente
      isUpdatePending.current = false;
    }, 300); // 300ms de espera para agrupar múltiples cambios
  }, [fetchProducts, itemsPerPage]);
  
  // Callback simplificado que marca que los filtros han cambiado
  const handleFilterChange = useCallback(() => {
    if (!isInitialMount.current) {
      filtersChanged.current = true;
      scheduleFilterUpdate();
    }
  }, [scheduleFilterUpdate]);
  
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
    onFiltersChange: handleFilterChange, // Callback simplificado 
    itemsPerPage
  });
  
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
  
  // Cargar productos iniciales
  useEffect(() => {
    console.log('InventorySection: Componente montado, iniciando carga de productos...');
    
    // Cargar productos inmediatamente al montar el componente
    if (isInitialMount.current) {
      isInitialMount.current = false;
      initialFetchDone.current = true;
      fetchProducts(true);
    }
    
    // Suscribirse a actualizaciones
    const unsubscribe = inventoryObservable.subscribe(() => {
      console.log('InventorySection: Actualización de inventario notificada por observable');
      fetchProducts(true);
    });
    
    // Limpiar suscripción y timeouts al desmontar
    return () => {
      unsubscribe();
      if (filterUpdateTimeoutRef.current) {
        clearTimeout(filterUpdateTimeoutRef.current);
      }
    };
  }, []); // Dependencia vacía para que solo se ejecute al montar
  
  /**
   * Efecto para manejar cambios en filtros - OPTIMIZADO
   * Ahora usando scheduleFilterUpdate para agrupar múltiples cambios
   */
  useEffect(() => {
    if (!isInitialMount.current && initialFetchDone.current) {
      scheduleFilterUpdate();
    }
  }, [debouncedSearchTerm, selectedCategory, showLowStockOnly, showNoStockOnly, scheduleFilterUpdate]);
  
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
      setTimeout(() => setSuccessMessage(''), SUCCESS_MESSAGE_TIMEOUT);
      
      // Cerrar modal y resetear estado
      setShowModal(false);
      setEditingProduct(null);
      setIsEditing(false);
      setIsCombo(false);
    } catch (error: any) {
      console.error('Error al guardar producto:', error);
      addNotification(`Error: ${error.message}`, 'error');
    }
  }, [editingProduct, createProduct, updateProduct, addNotification]);
  
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
      setTimeout(() => setSuccessMessage(''), SUCCESS_MESSAGE_TIMEOUT);
    } catch (error: any) {
      console.error('Error al eliminar producto:', error);
      addNotification(`Error: ${error.message}`, 'error');
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  }, [productToDelete, deleteProduct, addNotification]);
  
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
   * Manejadores de cambio de filtros optimizados
   * Ahora usando callbacks memorizados que no se recrean en cada renderizado
   */
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
  }, [setSelectedCategory]);
  
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, [setSearchTerm]);

  /**
   * Handlers de stock toggle con memoización
   */
  const handleLowStockToggle = useCallback(() => {
    toggleLowStockFilter();
  }, [toggleLowStockFilter]);

  const handleNoStockToggle = useCallback(() => {
    toggleNoStockFilter();
  }, [toggleNoStockFilter]);

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
          <StockFilters
            showLowStockOnly={showLowStockOnly}
            showNoStockOnly={showNoStockOnly}
            lowStockCount={lowStockCount}
            noStockCount={noStockCount}
            isLowStockLoading={isLowStockLoading}
            isNoStockLoading={isNoStockLoading}
            onLowStockToggle={handleLowStockToggle}
            onNoStockToggle={handleNoStockToggle}
          />

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
      <ProductList
        products={products}
        loading={loading}
        error={error}
        totalCount={totalCount}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        windowWidth={windowWidth}
        searchTerm={searchTerm}
        selectedCategory={selectedCategory}
        showLowStockOnly={showLowStockOnly}
        showNoStockOnly={showNoStockOnly}
        onEdit={handleOpenModal}
        onDelete={confirmDeleteProduct}
        onEditImage={handleOpenModal}
        onDeleteImage={confirmDeleteImage}
        onPageChange={handlePageChange}
      />

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
          showLowStockOnly={showLowStockOnly}
          showNoStockOnly={showNoStockOnly}
          lowStockCount={lowStockCount}
          noStockCount={noStockCount}
          isLowStockLoading={isLowStockLoading}
          isNoStockLoading={isNoStockLoading}
          onLowStockToggle={handleLowStockToggle}
          onNoStockToggle={handleNoStockToggle}
          isMobile={true}
        />
      )}
    </div>
  );
};

export default InventorySection;