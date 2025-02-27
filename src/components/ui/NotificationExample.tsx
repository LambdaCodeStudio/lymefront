import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

const NotificationExample: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (message: string, type: NotificationType) => {
    const id = Date.now().toString();
    console.log(`Creating notification: ${id}, message: ${message}, type: ${type}`);
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      console.log(`Removing notification: ${id}`);
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const getNotificationStyles = (type: NotificationType) => {
    const baseStyles = 'p-4 mb-3 rounded-md shadow-lg flex justify-between items-center';
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-100 text-green-800 border-l-4 border-green-500`;
      case 'error':
        return `${baseStyles} bg-red-100 text-red-800 border-l-4 border-red-500`;
      case 'warning':
        return `${baseStyles} bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500`;
      case 'info':
      default:
        return `${baseStyles} bg-blue-100 text-blue-800 border-l-4 border-blue-500`;
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 p-4">
        <h2 className="text-xl font-semibold">Ejemplos de Notificaciones</h2>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={() => addNotification('Operación completada con éxitoooo', 'success')}
          >
            Notificación de Éxito
          </Button>
          <Button 
            variant="outline" 
            onClick={() => addNotification('Ha ocurrido un error', 'error')}
          >
            Notificación de Error
          </Button>
          <Button 
            variant="outline" 
            onClick={() => addNotification('Información importante', 'info')}
          >
            Notificación de Información
          </Button>
          <Button 
            variant="outline" 
            onClick={() => addNotification('Atención requerida', 'warning')}
          >
            Notificación de Advertencia
          </Button>
        </div>
      </div>

      {/* Notifications container */}
      {notifications.length > 0 && (
        <div 
          className="fixed top-5 right-5 z-[9999] flex flex-col items-end"
          style={{ 
            maxHeight: '80vh',
            overflowY: 'auto',
            width: 'auto',
            maxWidth: '350px'
          }}
        >
          {notifications.map((notification) => (
            <div 
              key={notification.id}
              className={`${getNotificationStyles(notification.type)} notification-enter`}
              style={{ 
                maxWidth: '350px'
              }}
            >
              <p className="pr-2">{notification.message}</p>
              <button 
                onClick={() => removeNotification(notification.id)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default NotificationExample;