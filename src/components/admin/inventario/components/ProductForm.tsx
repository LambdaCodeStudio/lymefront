// components/ProductForm.tsx
import React, { useState, useEffect, useRef, memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  X, 
  Loader2, 
  ShoppingBag, 
  Image as ImageIcon 
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useProductForm } from "../hooks/useProductForm";
import { ProductFormProps, Product, ComboItem } from '../types/inventory.types';
import { PRODUCT_SUBCATEGORIES, MESSAGES } from '../utils/constants';
import ComboSelector from './ComboSelector';

/**
 * Componente optimizado para el formulario de productos/combos
 * 
 * @param product - Producto a editar (null para nuevo producto)
 * @param onSave - Función para guardar el producto
 * @param onCancel - Función para cancelar la edición
 * @param isOpen - Estado de visibilidad del diálogo
 * @param isCombo - Indica si el producto es un combo
 */
const ProductForm: React.FC<ProductFormProps> = ({
  product,
  onSave,
  onCancel,
  isOpen,
  isCombo = false
}) => {
  // Estados locales para el formulario
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isComboSelectorOpen, setIsComboSelectorOpen] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  
  // Referencias
  const initialRender = useRef(true);
  
  // Utilizar el hook de formulario
  const {
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
    handleSubmit: internalHandleSubmit,
    handleCategoryChange,
    handleImageChange,
    handleRemoveImage,
    
    calculateComboTotal,
    validateComboStock
  } = useProductForm({
    product,
    isCombo,
    onSubmit: async (data, imageFile) => {
      try {
        setIsSaving(true);
        await onSave(data, imageFile);
        onCancel(); // Cerrar formulario
        resetForm();
      } catch (error) {
        console.error('Error al guardar el producto:', error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    }
  });
  
  // Actualizar título basado en tipo y modo
  useEffect(() => {
    if (product) {
      setTitle(isCombo ? 'Editar Combo' : 'Editar Producto');
    } else {
      setTitle(isCombo ? 'Nuevo Combo' : 'Nuevo Producto');
    }
  }, [product, isCombo]);
  
  // Cargar productos disponibles para combos
  useEffect(() => {
    if (isCombo && isOpen && !availableProducts.length) {
      // Aquí se cargarían todos los productos no-combo disponibles
      // Esta implementación depende de una función externa que deberías tener
      const loadAvailableProducts = async () => {
        try {
          // Ejemplo: const products = await fetchAllProducts();
          // setAvailableProducts(products.filter(p => !p.esCombo));
          // Esta implementación sería completada en el componente real
        } catch (error) {
          console.error('Error al cargar productos disponibles:', error);
        }
      };
      
      loadAvailableProducts();
    }
  }, [isCombo, isOpen, availableProducts.length]);
  
  // Handler para guardar el producto
  const handleSaveProduct = async (e: React.FormEvent) => {
    try {
      await internalHandleSubmit(e);
    } catch (error) {
      // El error ya se maneja en el hook
    }
  };
  
  // Handler para abrir selector de combos
  const handleOpenComboSelector = () => {
    setIsComboSelectorOpen(true);
  };
  
  // Handler para confirmar selección de ítems de combo
  const handleComboItemsSelected = (items: ComboItem[]) => {
    setSelectedComboItems(items);
    
    // Actualizar el precio del combo automáticamente
    const comboTotal = calculateComboTotal(items);
    setFormData(prev => ({
      ...prev,
      precio: comboTotal.toFixed(2)
    }));
    
    setIsComboSelectorOpen(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onCancel}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto bg-white">
          <DialogHeader className="sticky top-0 bg-white pt-4 pb-2 z-10">
            <DialogTitle className="text-[#29696B] flex items-center">
              {title}
              {isCombo && (
                <Badge className="ml-2 bg-[#00888A]/10 border-[#00888A] text-[#00888A]">
                  Combo
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {isCombo 
                ? 'Los combos son agrupaciones de productos individuales' 
                : 'Complete la información del producto'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-4 py-2">
            <div className="grid gap-3">
              {/* Campo de nombre */}
              <div>
                <Label htmlFor="nombre" className="text-sm text-[#29696B]">
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
                  aria-required="true"
                  aria-invalid={!formData.nombre}
                />
              </div>

              {/* Campo de descripción */}
              <div>
                <Label htmlFor="descripcion" className="text-sm text-[#29696B]">
                  Descripción
                </Label>
                <Textarea
                  id="descripcion"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={2}
                  className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
                />
              </div>

              {/* Selección de categoría y subcategoría */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="categoria" className="text-sm text-[#29696B]">
                    Categoría <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.categoria || 'not-selected'}
                    onValueChange={handleCategoryChange}
                    name="categoria"
                    aria-required="true"
                  >
                    <SelectTrigger id="categoria" className="mt-1 border-[#91BEAD] focus:ring-[#29696B]/20">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent className="border-[#91BEAD]">
                      <SelectItem value="not-selected">Seleccionar categoría</SelectItem>
                      <SelectItem value="limpieza">Limpieza</SelectItem>
                      <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subCategoria" className="text-sm text-[#29696B]">
                    Subcategoría <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.subCategoria || 'not-selected'}
                    onValueChange={(value) => {
                      if (value !== 'not-selected') {
                        setFormData(prevState => ({
                          ...prevState,
                          subCategoria: value
                        }));
                      }
                    }}
                    disabled={!formData.categoria}
                    name="subCategoria"
                    aria-required="true"
                  >
                    <SelectTrigger id="subCategoria" className="mt-1 border-[#91BEAD] focus:ring-[#29696B]/20">
                      <SelectValue placeholder="Seleccionar subcategoría" />
                    </SelectTrigger>
                    <SelectContent className="border-[#91BEAD]">
                      <SelectItem value="not-selected">Seleccionar subcategoría</SelectItem>
                      {formData.categoria && PRODUCT_SUBCATEGORIES[formData.categoria as keyof typeof PRODUCT_SUBCATEGORIES]?.map((sub) => (
                        <SelectItem key={sub.value} value={sub.value}>
                          {sub.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Precio y stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="precio" className="text-sm text-[#29696B]">
                    Precio <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="precio"
                    name="precio"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    required
                    className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
                    maxLength={10}
                    readOnly={isCombo}
                    disabled={isCombo}
                    aria-required="true"
                    aria-readonly={isCombo ? "true" : "false"}
                  />
                  {isCombo && (
                    <p className="text-xs text-[#7AA79C] mt-1">
                      Precio calculado automáticamente de los productos seleccionados
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="stock" className="text-sm text-[#29696B]">
                    {product
                      ? (isAddingStock ? "Agregar al stock" : "Stock")
                      : "Stock"} <span className="text-red-500">*</span>
                  </Label>
                  {product && (
                    <div className="mb-2 px-1">
                      <div className="flex items-center gap-2 bg-[#DFEFE6]/30 p-2 rounded-md border border-[#91BEAD]/30">
                        <Checkbox
                          id="stock-checkbox"
                          checked={isAddingStock}
                          onCheckedChange={(checked) => setIsAddingStock(!!checked)}
                        />
                        <label
                          htmlFor="stock-checkbox"
                          className="text-sm text-[#29696B] cursor-pointer font-medium"
                        >
                          Añadir al stock existente
                        </label>
                      </div>
                    </div>
                  )}

                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => {
                      setFormData({ ...formData, stock: e.target.value });
                    }}
                    required
                    className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
                    aria-required="true"
                  />

                  {/* Información adicional de stock */}
                  {isAddingStock && product && (
                    <div className="mt-1 text-xs text-[#29696B] bg-[#DFEFE6]/20 p-2 rounded border border-[#91BEAD]/30">
                      <span className="font-medium">Stock actual:</span> {product.stock} unidades
                      <span className="mx-1">→</span>
                      <span className="font-medium">Stock final:</span> {product.stock + parseInt(formData.stock || '0')} unidades
                    </div>
                  )}
                </div>
              </div>

              {/* Campo de stock mínimo */}
              <div>
                <Label htmlFor="stockMinimo" className="text-sm text-[#29696B]">
                  Stock Mínimo
                </Label>
                <Input
                  id="stockMinimo"
                  name="stockMinimo"
                  type="number"
                  min="0"
                  value={formData.stockMinimo}
                  onChange={(e) => setFormData({ ...formData, stockMinimo: e.target.value })}
                  className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
                />
                <p className="text-xs text-[#7AA79C] mt-1">
                  El sistema alertará cuando el stock sea igual o menor a este valor
                </p>
              </div>

              {/* Sección de selección de productos para el combo */}
              {isCombo && (
                <div className="mt-4 border rounded-md p-3 border-[#91BEAD]/30 bg-[#DFEFE6]/10">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium text-[#29696B]">
                      Productos en el combo <span className="text-red-500">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleOpenComboSelector}
                      className="text-xs h-8 border-[#00888A] text-[#00888A] hover:bg-[#00888A]/10"
                    >
                      <ShoppingBag className="w-3 h-3 mr-1" aria-hidden="true" />
                      Seleccionar productos
                    </Button>
                  </div>

                  {selectedComboItems.length === 0 ? (
                    <div className="text-center py-4 text-sm text-[#7AA79C]" aria-live="polite">
                      <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-[#7AA79C]/50" aria-hidden="true" />
                      <p>No hay productos seleccionados</p>
                      <p className="text-xs">Haga clic en "Seleccionar productos" para agregar elementos al combo</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs text-[#7AA79C] grid grid-cols-5 py-1 font-medium">
                        <div className="col-span-2 pl-2">Producto</div>
                        <div className="text-center">Precio</div>
                        <div className="text-center">Cant.</div>
                        <div className="text-right pr-2">Subtotal</div>
                      </div>
                      <div className="max-h-40 overflow-y-auto pr-1">
                        {selectedComboItems.map((item, index) => (
                          <div key={index} className="text-sm text-[#29696B] grid grid-cols-5 py-2 border-b border-[#91BEAD]/10 last:border-0 items-center">
                            <div className="col-span-2 truncate pl-2">{item.nombre}</div>
                            <div className="text-center">${(item.precio || 0).toFixed(2)}</div>
                            <div className="text-center">{item.cantidad}</div>
                            <div className="text-right font-medium pr-2">${((item.precio || 0) * item.cantidad).toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 flex justify-between text-sm font-medium text-[#29696B]">
                        <span>Precio total de los productos:</span>
                        <span>${calculateComboTotal(selectedComboItems).toFixed(2)}</span>
                      </div>

                      {/* Alertas de stock para combos */}
                      {stockWarnings.length > 0 && (
                        <div className="mt-2 bg-yellow-50 border border-yellow-300 rounded-md p-2" aria-live="polite">
                          <p className="text-xs font-medium text-yellow-800 mb-1">
                            Advertencias de disponibilidad:
                          </p>
                          <ul className="text-xs text-yellow-700 list-disc pl-4 space-y-1">
                            {stockWarnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Campo de imagen */}
              <div>
                <Label className="text-sm text-[#29696B] block mb-2">Imagen del Producto</Label>

                {formData.imagenPreview ? (
                  <div className="relative w-full h-32 bg-[#DFEFE6]/20 rounded-md overflow-hidden border border-[#91BEAD]/30">
                    {typeof formData.imagenPreview === 'string' && (
                      <img
                        src={formData.imagenPreview}
                        alt="Vista previa"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          console.log("Error al cargar imagen de vista previa", e);
                          const target = e.target as HTMLImageElement;
                          target.src = "/lyme.png";
                          target.className = "w-full h-full object-contain p-4";
                        }}
                      />
                    )}

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 h-8 w-8 p-0 bg-red-500 hover:bg-red-600"
                      aria-label="Eliminar imagen"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full">
                    <label 
                      htmlFor="product-image" 
                      className="flex flex-col items-center justify-center w-full h-24 border-2 border-[#91BEAD]/30 border-dashed rounded-md cursor-pointer bg-[#DFEFE6]/20 hover:bg-[#DFEFE6]/40 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-3 pb-4">
                        <ImageIcon className="w-8 h-8 text-[#7AA79C] mb-1" aria-hidden="true" />
                        <p className="text-xs text-[#7AA79C]">
                          Haz clic para subir una imagen
                        </p>
                        <p className="text-xs text-[#7AA79C]">
                          Máximo 5MB
                        </p>
                      </div>
                      <input
                        ref={fileInputRef}
                        id="product-image"
                        name="product-image"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                        aria-label="Subir imagen de producto"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Botones de acción */}
            <DialogFooter className="sticky bottom-0 bg-white pt-2 pb-4 z-10 gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className={`${isCombo ? 'bg-[#00888A] hover:bg-[#00888A]/90' : 'bg-[#29696B] hover:bg-[#29696B]/90'} text-white`}
                disabled={
                  isSaving || 
                  (isCombo && selectedComboItems.length === 0) || 
                  !formData.categoria || 
                  !formData.subCategoria || 
                  hasStockIssues
                }
                aria-busy={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Guardando...
                  </>
                ) : (
                  product ? 'Guardar Cambios' : (isCombo ? 'Crear Combo' : 'Crear Producto')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Componente Selector de Combos */}
      {isCombo && (
        <ComboSelector
          isOpen={isComboSelectorOpen}
          onClose={() => setIsComboSelectorOpen(false)}
          selectedItems={selectedComboItems}
          onItemsSelected={handleComboItemsSelected}
          products={availableProducts}
        />
      )}
    </>
  );
};

export default memo(ProductForm);