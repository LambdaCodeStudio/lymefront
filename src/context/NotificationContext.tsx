import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (message: string, type: NotificationType) => void;
  removeNotification: (id: string) => void;
}

const MAX_NOTIFICATIONS = 3; // Máximo de notificaciones visibles a la vez

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Notificaciones actualmente visibles
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Cola de notificaciones pendientes
  const [notificationQueue, setNotificationQueue] = useState<Notification[]>([]);
  
  // Efecto para procesar la cola cuando hay espacio para nuevas notificaciones
  useEffect(() => {
    // Si hay espacio para más notificaciones y hay notificaciones en la cola
    if (notifications.length < MAX_NOTIFICATIONS && notificationQueue.length > 0) {
      // Tomamos la primera notificación de la cola
      const nextNotification = notificationQueue[0];
      
      // La quitamos de la cola
      setNotificationQueue(prev => prev.slice(1));
      
      // La añadimos a las notificaciones visibles
      setNotifications(prev => [...prev, nextNotification]);
      
      // Configuramos su eliminación automática
      setTimeout(() => {
        removeNotification(nextNotification.id);
      }, 5000);
      
      console.log(`Mostrando notificación de la cola: ${nextNotification.id}`);
    }
  }, [notifications, notificationQueue]);

  const addNotification = (message: string, type: NotificationType) => {
    const id = Date.now().toString();
    const newNotification = { id, message, type };
    
    console.log(`Creando notificación: ${id}, mensaje: ${message}, tipo: ${type}`);
    
    // Verificar si ya hay MAX_NOTIFICATIONS visibles, contando solo las que están 
    // realmente renderizadas y no las que podrían estar programadas para eliminarse
    if (notifications.length < MAX_NOTIFICATIONS) {
      // Si hay menos de MAX_NOTIFICATIONS visibles, mostrar inmediatamente
      setNotifications(prev => {
        // Verificación adicional por si llegaron múltiples a la vez
        if (prev.length >= MAX_NOTIFICATIONS) {
          console.log(`Ya hay ${prev.length} notificaciones, agregando a la cola`);
          setNotificationQueue(prevQueue => [...prevQueue, newNotification]);
          return prev;
        }
        return [...prev, newNotification];
      });
      
      // Auto-eliminar después de 5 segundos
      setTimeout(() => {
        removeNotification(id);
      }, 5000);
    } else {
      // Si ya hay MAX_NOTIFICATIONS visibles, añadir a la cola
      console.log(`Cola llena, agregando notificación ${id} a la cola`);
      setNotificationQueue(prev => [...prev, newNotification]);
    }
  };

  const removeNotification = (id: string) => {
    console.log(`Eliminando notificación: ${id}`);
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};