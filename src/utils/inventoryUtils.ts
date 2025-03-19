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
export const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Función para actualizar el inventario
export const refreshInventory = async () => {
  try {
    // Simplemente notificamos a los observadores que necesitan actualizar su estado
    inventoryObservable.notify();
    console.log('Notificación de actualización de inventario enviada');
    return true;
  } catch (error) {
    console.error('Error al notificar actualización de inventario:', error);
    return false;
  }
};