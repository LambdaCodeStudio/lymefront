import React, { useState } from 'react';
import { useCartContext } from '@/providers/CartProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Check,
  CreditCard,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShopNavbar } from './ShopNavbar';

export const Cart: React.FC = () => {
  const { items, removeItem, updateQuantity, clearCart, totalItems, totalPrice } = useCartContext();
  const [checkoutStep, setCheckoutStep] = useState<number>(1);
  const [processingOrder, setProcessingOrder] = useState<boolean>(false);
  const [orderComplete, setOrderComplete] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  
  // Estado para formulario de checkout
  const [orderForm, setOrderForm] = useState({
    notes: '',
    deliveryDate: '',
  });
  
  // Actualizar cantidad con validación
  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity < 1) newQuantity = 1;
    if (newQuantity > 99) newQuantity = 99;
    updateQuantity(id, newQuantity);
  };
  
  // Procesamiento real de pedido
  const processOrder = async () => {
    if (items.length === 0) return;
    
    setProcessingOrder(true);
    setOrderError(null);
    
    try {
      // Obtener token de autenticación
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación. Por favor, inicie sesión nuevamente.');
      }
      
      // Obtener información del usuario
      const userResponse = await fetch('http://localhost:4000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!userResponse.ok) {
        throw new Error('Error al obtener información del usuario');
      }
      
      const userData = await userResponse.json();
      const userId = userData._id || userData.id;
      
      // Formato de los productos para la API
      const productsData = items.map(item => ({
        productoId: item.id,
        cantidad: item.quantity,
        nombre: item.name,
        precio: item.price
      }));
      
      // Crear objeto de pedido
      const orderData = {
        userId: userId,
        servicio: "Compra Online",
        seccionDelServicio: "Tienda Web",
        detalle: orderForm.notes || "Pedido creado desde la tienda web",
        productos: productsData
      };
      
      console.log('Enviando pedido:', JSON.stringify(orderData));
      
      // Enviar pedido a la API
      const response = await fetch('http://localhost:4000/api/pedido', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || `Error al crear el pedido (status: ${response.status})`);
      }
      
      // Pedido creado correctamente
      setOrderComplete(true);
      clearCart();
    } catch (error) {
      console.error('Error al procesar pedido:', error);
      setOrderError(error instanceof Error ? error.message : 'Hubo un problema al procesar tu pedido. Por favor, intenta nuevamente.');
    } finally {
      setProcessingOrder(false);
    }
  };
  
  // Vista de carrito vacío
  if (items.length === 0 && !orderComplete) {
    return (
      <>
        <ShopNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="bg-white/10 backdrop-blur-md rounded-full p-6 mb-6">
              <ShoppingCart className="h-16 w-16 text-purple-300" />
            </div>
            <h2 className="text-2xl font-semibold mb-4">Tu carrito está vacío</h2>
            <p className="text-gray-300 mb-8 text-center max-w-md">
              Parece que aún no has agregado productos a tu carrito. 
              Explora nuestro catálogo y encuentra lo que necesitas.
            </p>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              onClick={() => window.location.href = '/shop'}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a la tienda
            </Button>
          </div>
        </div>
      </>
    );
  }
  
  // Vista de pedido completado
  if (orderComplete) {
    return (
      <>
        <ShopNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-700 p-8 rounded-2xl text-center"
            >
              <div className="bg-green-500 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6">
                <Check className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-4">¡Pedido realizado con éxito!</h2>
              <p className="text-gray-300 mb-6">
                Hemos recibido tu solicitud. El equipo de administración revisará tu pedido y te contactará pronto.
              </p>
              <Button 
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => window.location.href = '/shop'}
              >
                Volver a la tienda
              </Button>
            </motion.div>
          </div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <ShopNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 flex items-center">
            <ShoppingCart className="mr-3 h-8 w-8" />
            Tu Carrito
          </h1>
          
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Lista de productos */}
            <div className="flex-grow">
              <div className="space-y-4">
                {checkoutStep === 1 ? (
                  <AnimatePresence>
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="bg-gradient-to-r from-gray-900/60 to-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden"
                      >
                        <div className="p-4 flex gap-4">
                          {/* Imagen del producto */}
                          <div className="w-20 h-20 bg-gray-800 rounded-md overflow-hidden flex-shrink-0">
                            {item.image ? (
                              <img 
                                src={`data:image/jpeg;base64,${item.image}`}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
                                Sin imagen
                              </div>
                            )}
                          </div>
                          
                          {/* Información del producto */}
                          <div className="flex-grow">
                            <div className="flex justify-between">
                              <h3 className="font-medium text-lg">{item.name}</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-transparent"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {/* Categoría */}
                            {item.category && (
                              <p className="text-sm text-gray-400 capitalize">
                                {item.category} {item.subcategory && `- ${item.subcategory}`}
                              </p>
                            )}
                            
                            <div className="flex justify-between items-center mt-2">
                              <div className="flex items-center space-x-1 bg-gray-800 rounded-md">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  max="99"
                                  value={item.quantity}
                                  onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                                  className="w-12 h-8 text-center p-0 border-0 bg-transparent focus:ring-0"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-lg font-semibold">${(item.price * item.quantity).toFixed(2)}</div>
                                <div className="text-xs text-gray-400">${item.price.toFixed(2)} por unidad</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    <Card className="bg-gray-900/60 border-gray-700">
                      <CardHeader>
                        <CardTitle>Información del pedido</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="deliveryDate">Fecha de entrega deseada</Label>
                          <Input
                            id="deliveryDate"
                            type="date"
                            className="bg-gray-800/60 border-gray-700 mt-1"
                            min={new Date().toISOString().split('T')[0]}
                            value={orderForm.deliveryDate}
                            onChange={(e) => setOrderForm({...orderForm, deliveryDate: e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="notes">Notas adicionales</Label>
                          <Textarea
                            id="notes"
                            placeholder="Instrucciones especiales, ubicación de entrega, etc."
                            className="bg-gray-800/60 border-gray-700 mt-1"
                            value={orderForm.notes}
                            onChange={(e) => setOrderForm({...orderForm, notes: e.target.value})}
                          />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-gray-900/60 border-gray-700">
                      <CardHeader>
                        <CardTitle>Resumen del pedido</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {items.map((item) => (
                          <div key={item.id} className="flex justify-between py-1">
                            <span>
                              {item.name} <span className="text-gray-400">x{item.quantity}</span>
                            </span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                        <Separator className="bg-gray-700 my-2" />
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span>${totalPrice.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {orderError && (
                      <Alert variant="destructive" className="bg-red-900/60 border-red-700">
                        <AlertDescription>{orderError}</AlertDescription>
                      </Alert>
                    )}
                  </motion.div>
                )}
              </div>
              
              {items.length > 0 && checkoutStep === 1 && (
                <div className="mt-4 flex justify-between">
                  <Button 
                    variant="outline" 
                    className="border-red-600 text-red-400 hover:bg-red-950 hover:text-red-300"
                    onClick={clearCart}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Vaciar carrito
                  </Button>
                  
                  <Button 
                    onClick={() => setCheckoutStep(2)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Continuar
                  </Button>
                </div>
              )}
              
              {checkoutStep === 2 && (
                <div className="mt-6 flex justify-between">
                  <Button 
                    variant="outline"
                    onClick={() => setCheckoutStep(1)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al carrito
                  </Button>
                  
                  <Button 
                    onClick={processOrder}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    disabled={processingOrder}
                  >
                    {processingOrder ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Realizar pedido
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
            
            {/* Resumen de compra */}
            <div className="w-full lg:w-80 flex-shrink-0">
              <div className="sticky top-20">
                <Card className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-indigo-700">
                  <CardHeader>
                    <CardTitle>Resumen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Productos:</span>
                      <span>{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                    </div>
                    
                    <Separator className="bg-indigo-800" />
                    
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total:</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>
                  </CardContent>
                  
                  <CardFooter>
                    {checkoutStep === 1 ? (
                      <Button 
                        onClick={() => setCheckoutStep(2)}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        Proceder al pago
                      </Button>
                    ) : (
                      <div className="w-full text-center text-sm text-gray-300">
                        <p>Revisa tu pedido y completa la información requerida.</p>
                      </div>
                    )}
                  </CardFooter>
                </Card>
                
                <div className="mt-4 p-4 bg-gradient-to-br from-blue-900/20 to-blue-800/20 border border-blue-800 rounded-lg">
                  <h3 className="flex items-center text-sm font-medium mb-2">
                    <Check className="text-blue-400 mr-2 h-4 w-4" />
                    Política de pedidos
                  </h3>
                  <p className="text-xs text-gray-300">
                    Los pedidos realizados están sujetos a revisión y aprobación por el equipo administrativo.
                    Una vez confirmado, se coordinará la entrega de los productos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};