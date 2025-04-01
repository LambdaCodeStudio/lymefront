// components/ComboSelector.tsx
import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, Trash2, Search, AlertTriangle } from 'lucide-react';
import { ComboSelectorProps, ComboItem, Product } from '../types/inventory.types';
import { LOW_STOCK_THRESHOLD } from '../utils/constants';
import ProductImage from './ProductImage';

/**
 * Componente para seleccionar productos para un combo
 * 
 * @param isOpen - Estado de visibilidad del diálogo
 * @param onClose - Función para cerrar el diálogo
 * @param selectedItems - Items de combo ya seleccionados
 * @param onItemsSelected - Callback cuando se confirma la selección
 * @param products - Lista de productos disponibles
 */
const ComboSelector: React.FC<ComboSelectorProps> = ({
  isOpen,
  onClose,
  selectedItems,
  onItemsSelected,
  products
}) => {
  // Estado local
  const [searchTerm, setSearchTerm] = useState('');
  const [tempItems, setTempItems] = useState<ComboItem[]>([]);
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);
  const [hasStockIssues, setHasStockIssues] = useState(false);
  
  // Inicializar tempItems al abrir el selector
  React.useEffect(() => {
    if (isOpen) {
      setTempItems([...selectedItems]);
      setSearchTerm('');
      validateStockForItems([...selectedItems], products);
    }
  }, [isOpen, selectedItems, products]);
  
  /**
   * Valida el stock disponible para los items de combo
   */
  const validateStockForItems = useCallback((items: ComboItem[], availableProducts: Product[]) => {
    const warnings: string[] = [];
    let isValid = true;
    
    if (!items || items.length === 0) {
      setStockWarnings([]);
      setHasStockIssues(false);
      return;
    }
    
    items.forEach(item => {
      const productId = typeof item.productoId === 'string'
        ? item.productoId
        : (item.productoId as Product)._id;
        
      const product = availableProducts.find(p => p._id === productId);
      
      if (product) {
        if (product.stock < item.cantidad) {
          isValid = false;
          warnings.push(`No hay suficiente stock de "${product.nombre}". Disponible: ${product.stock}, Requerido: ${item.cantidad}`);
        } else if (product.stock <= LOW_STOCK_THRESHOLD) {
          warnings.push(`Stock bajo de "${product.nombre}". Disponible: ${product.stock}, Requerido: ${item.cantidad}`);
        }
      }
    });
    
    setStockWarnings(warnings);
    setHasStockIssues(!isValid);
  }, []);
  
  /**
   * Filtra productos por término de búsqueda
   */
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // No mostrar productos que ya son combos
      if (product.esCombo) return false;
      
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      
      // Buscar en varios campos
      return (
        (product.nombre && product.nombre.toLowerCase().includes(searchLower)) ||
        (product.marca && product.marca.toLowerCase().includes(searchLower)) ||
        (product.descripcion && product.descripcion.toLowerCase().includes(searchLower))
      );
    });
  }, [products, searchTerm]);
  
  /**
   * Añade un producto al combo
   */
  const handleAddItem = useCallback((product: Product) => {
    setTempItems(prevItems => {
      // Verificar si ya existe
      const existingItem = prevItems.find(item => {
        const itemId = typeof item.productoId === 'string'
          ? item.productoId
          : (item.productoId as Product)._id;
        return itemId === product._id;
      });
      
      if (existingItem) {
        // Actualizar cantidad
        const updatedItems = prevItems.map(item => {
          const itemId = typeof item.productoId === 'string'
            ? item.productoId
            : (item.productoId as Product)._id;
            
          if (itemId === product._id) {
            return { ...item, cantidad: item.cantidad + 1 };
          }
          return item;
        });
        
        validateStockForItems(updatedItems, products);
        return updatedItems;
      } else {
        // Añadir nuevo
        const newItems = [
          ...prevItems,
          {
            productoId: product._id,
            nombre: product.nombre,
            cantidad: 1,
            precio: product.precio
          }
        ];
        
        validateStockForItems(newItems, products);
        return newItems;
      }
    });
  }, [products, validateStockForItems]);
  
  /**
   * Actualiza la cantidad de un item
   */
  const handleUpdateQuantity = useCallback((productId: string, newQuantity: number) => {
    setTempItems(prevItems => {
      if (newQuantity <= 0) {
        // Eliminar el item
        const updatedItems = prevItems.filter(item => {
          const itemId = typeof item.productoId === 'string'
            ? item.productoId
            : (item.productoId as Product)._id;
          return itemId !== productId;
        });
        
        validateStockForItems(updatedItems, products);
        return updatedItems;
      } else {
        // Actualizar cantidad
        const updatedItems = prevItems.map(item => {
          const itemId = typeof item.productoId === 'string'
            ? item.productoId
            : (item.productoId as Product)._id;
            
          if (itemId === productId) {
            return { ...item, cantidad: newQuantity };
          }
          return item;
        });
        
        validateStockForItems(updatedItems, products);
        return updatedItems;
      }
    });
  }, [products, validateStockForItems]);
  
  /**
   * Calcula el precio total del combo
   */
  const totalPrice = useMemo(() => {
    return tempItems.reduce((sum, item) => {
      const precio = item.precio || 0;
      const cantidad = item.cantidad || 0;
      return sum + (precio * cantidad);
    }, 0);
  }, [tempItems]);
  
  /**
   * Confirma la selección de items
   */
  const handleConfirm = useCallback(() => {
    onItemsSelected(tempItems);
  }, [tempItems, onItemsSelected]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-[#29696B]">Seleccionar productos para el combo</DialogTitle>
          <DialogDescription>
            Agregue los productos que formarán parte del combo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Panel izquierdo: Lista de productos disponibles */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7AA79C] w-4 h-4" aria-hidden="true" />
              <Input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20"
                aria-label="Buscar productos para añadir al combo"
              />
            </div>

            <div className="border rounded-md border-[#91BEAD]/30">
              <div className="bg-[#DFEFE6]/30 p-3 text-[#29696B] font-medium text-sm">
                Productos disponibles
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <div className="divide-y divide-[#91BEAD]/20">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-[#7AA79C]" role="status">
                      {searchTerm 
                        ? 'No se encontraron productos que coincidan con la búsqueda' 
                        : 'No hay productos disponibles'}
                    </div>
                  ) : (
                    filteredProducts.map((product) => (
                      <div key={product._id} className="p-3 flex items-center hover:bg-[#DFEFE6]/20">
                        <ProductImage 
                          product={product} 
                          size="small" 
                          className="mr-2 flex-shrink-0" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-[#29696B] truncate">{product.nombre}</div>
                          <div className="text-xs text-[#7AA79C] flex items-center gap-1 mt-1">
                            <span>${product.precio.toFixed(2)}</span>
                            <span>•</span>
                            <span className={`inline-flex px-1 py-0.5 text-xs rounded-full ${
                              product.stock <= 0
                                ? 'bg-red-100 text-red-800'
                                : product.alertaStockBajo
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-[#DFEFE6] text-[#29696B]'
                            }`}>
                              Stock: {product.stock}
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddItem(product)}
                          className="h-8 text-[#29696B] border-[#91BEAD] hover:bg-[#DFEFE6]/30 whitespace-nowrap ml-2"
                          disabled={product.stock <= 0}
                          aria-label={`Agregar ${product.nombre} al combo`}
                        >
                          <Plus className="w-3 h-3 mr-1" aria-hidden="true" />
                          Agregar
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Panel derecho: Productos seleccionados */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-[#29696B] mb-2">Productos seleccionados</h4>
              {tempItems.length === 0 ? (
                <div className="text-center py-6 text-sm text-[#7AA79C] border rounded-md border-[#91BEAD]/30" role="status">
                  No hay productos seleccionados
                </div>
              ) : (
                <div className="border rounded-md border-[#91BEAD]/30">
                  <div className="bg-[#DFEFE6]/30 p-3 text-[#29696B] font-medium text-sm">
                    Lista de productos para el combo
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    <div className="divide-y divide-[#91BEAD]/20">
                      {tempItems.map((item, index) => {
                        const itemId = typeof item.productoId === 'string'
                          ? item.productoId
                          : (item.productoId as Product)._id;
                        
                        // Verificar si este ítem tiene advertencia
                        const hasWarning = stockWarnings.some(w => 
                          w.includes(item.nombre || '')
                        );
                        
                        return (
                          <div key={index} className="p-3">
                            <div className="flex justify-between items-center mb-2">
                              <div className="font-medium text-sm text-[#29696B] truncate max-w-[200px]">
                                {item.nombre}
                                {hasWarning && (
                                  <AlertTriangle 
                                    className="inline-block w-4 h-4 text-yellow-500 ml-2" 
                                    aria-label="Advertencia de stock" 
                                  />
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateQuantity(itemId, 0)}
                                className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                                aria-label={`Eliminar ${item.nombre} del combo`}
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </Button>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="text-xs text-[#7AA79C]">
                                <span>${(item.precio || 0).toFixed(2)} x {item.cantidad}</span>
                                <span className="ml-2 text-[#29696B] font-medium">= ${((item.precio || 0) * item.cantidad).toFixed(2)}</span>
                              </div>
                              <div className="flex items-center border rounded border-[#91BEAD]">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdateQuantity(itemId, item.cantidad - 1)}
                                  className="h-7 w-7 p-0 text-[#29696B] hover:bg-[#DFEFE6]/30"
                                  aria-label="Disminuir cantidad"
                                >
                                  <Minus className="w-3 h-3" aria-hidden="true" />
                                </Button>
                                <span className="w-8 text-center text-sm" aria-label={`Cantidad: ${item.cantidad}`}>
                                  {item.cantidad}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdateQuantity(itemId, item.cantidad + 1)}
                                  className="h-7 w-7 p-0 text-[#29696B] hover:bg-[#DFEFE6]/30"
                                  aria-label="Aumentar cantidad"
                                >
                                  <Plus className="w-3 h-3" aria-hidden="true" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="p-3 border-t border-[#91BEAD]/20 bg-[#DFEFE6]/20">
                    <div className="flex justify-between items-center font-medium text-[#29696B]">
                      <span>Total:</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>

                    {/* Alertas de stock */}
                    {stockWarnings.length > 0 && (
                      <div 
                        className="mt-2 bg-yellow-50 border border-yellow-300 rounded-md p-2" 
                        aria-live="polite"
                        role="alert"
                      >
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
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="bg-[#00888A] hover:bg-[#00888A]/90 text-white"
            disabled={tempItems.length === 0 || hasStockIssues}
          >
            Confirmar selección
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default memo(ComboSelector);