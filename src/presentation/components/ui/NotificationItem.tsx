import React from 'react';
import { Notification } from '../../../shared/types/notifications';
import { useNotifications } from '../../context/NotificationContext';
import './NotificationItem.css';

interface NotificationItemProps {
  notification: Notification;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => {
  const { removeNotification } = useNotifications();

  const handleDismiss = () => {
    if (notification.dismissible) {
      removeNotification(notification.id);
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✓';
      case 'error':
        return '⚠';
      case 'warning':
        return '🔔';
      case 'info':
        return 'ℹ';
      default:
        return '';
    }
  };

  return (
    <div className={`notification notification--${notification.type}`}>
      <div className="notification__icon">
        {getIcon()}
      </div>
      <div className="notification__content">
        <div className="notification__title">{notification.title}</div>
        <div className="notification__message">{notification.message}</div>
      </div>
      {notification.dismissible && (
        <button 
          className="notification__dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default NotificationItem;
