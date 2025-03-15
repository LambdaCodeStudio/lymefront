# Actualización del Inventario en Tiempo Real

Para que el inventario se actualice en tiempo real cuando se realizan operaciones de creación, edición o eliminación de pedidos, necesitamos implementar un sistema de observables que notifique a los componentes cuando ocurren cambios.

## 1. Crear un servicio Observable para el Inventario

Crea un nuevo archivo en `src/utils/inventoryUtils.ts`:

```typescript
// src/utils/inventoryUtils.ts

// Clase Observable para notificar cambios en el inventario
class InventoryObservable {
  private observers: (() => void)[] = [];

  subscribe(callback: () => void) {
    this.observers.push(callback);
    return () => {
      this.observers = this.observers.filter(obs => obs !== callback);
    };
  }

  notify() {
    this.observers.forEach(callback => callback());
  }
}

// Crear una instancia del observable
export const inventoryObservable = new InventoryObservable();

// Función para obtener el token de autenticación
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Función para actualizar el inventario
export const refreshInventory = async () => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }
    
    await fetch('http://179.43.118.101:4000'/api/producto', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Notificar a todos los observadores
    inventoryObservable.notify();
    
    return true;
  } catch (error) {
    console.error('Error al refrescar inventario:', error);
    return false;
  }
};

export default {
  inventoryObservable,
  refreshInventory
};
```

## 2. Modificar el componente InventorySection

En `src/components/admin/InventorySection.tsx`, necesitas modificar el useEffect que carga los productos para suscribirte a las actualizaciones:

```typescript
// Añade esta importación al principio del archivo
import { inventoryObservable } from '@/utils/inventoryUtils';

// Luego, modifica el useEffect que inicializa los productos
useEffect(() => {
  fetchProducts();
  
  // Suscribirse al observable de inventario
  const unsubscribe = inventoryObservable.subscribe(() => {
    console.log('Inventario actualizado desde observable');
    fetchProducts();
  });
  
  // Limpiar al desmontar
  return () => {
    unsubscribe();
  };
}, []);
```

## 3. Modificar OrdersSection para notificar cambios

En `src/components/admin/OrdersSection.tsx`, necesitas modificar cada función que afecte al inventario para llamar a la función de actualización:

### Para crear pedidos (handleCreateOrder):

```typescript
// Añade esta importación al principio del archivo
import { refreshInventory } from '@/utils/inventoryUtils';

// Luego, en la función handleCreateOrder, después de la respuesta exitosa:
// Éxito
await fetchOrders();
await fetchProducts(); // Recargar productos para actualizar stock

// Notificar a todos los componentes sobre el cambio en el inventario
await refreshInventory();

setShowCreateModal(false);
resetOrderForm();
setSuccessMessage('Pedido creado correctamente');
setTimeout(() => setSuccessMessage(''), 3000);
```

### Para actualizar pedidos (handleUpdateOrder):

```typescript
// En la función handleUpdateOrder, después de la respuesta exitosa:
await fetchOrders();
await fetchProducts(); // Recargar productos para actualizar stock

// Notificar a todos los componentes sobre el cambio en el inventario
await refreshInventory();

setShowCreateModal(false);
resetOrderForm();
setSuccessMessage('Pedido actualizado correctamente');
setTimeout(() => setSuccessMessage(''), 3000);
```

### Para eliminar pedidos (handleDeleteOrder):

```typescript
// En la función handleDeleteOrder, después de la respuesta exitosa:
await fetchOrders();
await fetchProducts(); // Recargar productos para actualizar stock

// Notificar a todos los componentes sobre el cambio en el inventario
await refreshInventory();

setSuccessMessage('Pedido eliminado correctamente');
setTimeout(() => setSuccessMessage(''), 3000);
```

## 4. Modificar el AdminDashboard (opcional)

Para asegurarnos de que todos los componentes tengan acceso a los eventos de inventario, podemos envolver todo el dashboard en un proveedor de contexto de inventario si lo prefiere:

```typescript
// En AdminDashboard.tsx
import { InventoryProvider } from '@/context/InventoryProvider';

// En el componente de retorno:
return (
  <InventoryProvider>
    <DashboardContext.Provider value={dashboardState}>
      {/* Contenido existente */}
    </DashboardContext.Provider>
  </InventoryProvider>
);
```

## Ventajas de esta implementación

1. **Tiempo real**: El inventario se actualizará inmediatamente cuando se realice cualquier operación que afecte al stock.
2. **Eficiencia**: No es necesario un F5 o recarga manual.
3. **Desacoplamiento**: Utiliza un patrón Observer que permite a diferentes componentes reaccionar a cambios en el inventario sin acoplarse directamente.
4. **Fácil de extender**: Puedes añadir más componentes que escuchen cambios en el inventario sin modificar el código existente.

## Notas adicionales

- Este enfoque utiliza un patrón Observer para propagar los cambios.
- También podrías implementar esto con WebSockets para una actualización aún más inmediata si lo deseas en el futuro.