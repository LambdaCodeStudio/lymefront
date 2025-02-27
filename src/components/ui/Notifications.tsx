import React from 'react';
import { useNotification, Notification } from '../../context/NotificationContext';

const getNotificationStyles = (type: Notification['type']) => {
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

const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
  const { removeNotification } = useNotification();
  
  return (
    <div 
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
  );
};

export const NotificationsContainer: React.FC = () => {
  const { notifications } = useNotification();
  
  console.log(`NotificationsContainer rendering with ${notifications.length} notifications`);
  
  if (notifications.length === 0) {
    return null;
  }

  return (
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
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
};

export default NotificationsContainer;