import { useCallback, useRef } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { NotificationConfig } from '../../shared/types/notifications';
import { debounce } from '../../shared/utils';

export const useNotificationHelpers = () => {
  const { addNotification, removeNotification, clearAll } = useNotifications();
  
  // Referencia para almacenar la función de conexión con debounce
  const debouncedConnectionError = useRef<ReturnType<typeof debounce>>();

  const showSuccess = useCallback((title: string, message: string, duration = 5000) => {
    return addNotification({
      type: 'success',
      title,
      message,
      duration,
      dismissible: true
    });
  }, [addNotification]);

  const showError = useCallback((title: string, message: string, duration?: number) => {
    return addNotification({
      type: 'error',
      title,
      message,
      duration, // No auto-dismiss for errors unless specified
      dismissible: true
    });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message: string, duration = 7000) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      duration,
      dismissible: true
    });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message: string, duration = 5000) => {
    return addNotification({
      type: 'info',
      title,
      message,
      duration,
      dismissible: true
    });
  }, [addNotification]);

  const showCustom = useCallback((config: NotificationConfig) => {
    return addNotification(config);
  }, [addNotification]);

  // Specific notifications for connection validation
  const showConnectionError = useCallback((message: string) => {
    // Crear función con debounce si no existe
    if (!debouncedConnectionError.current) {
      debouncedConnectionError.current = debounce((msg: string) => {
        showWarning('Conexión no permitida', msg, 6000);
      }, 500); // 500ms de debounce
    }
    
    // Ejecutar la función con debounce pasando el mensaje
    debouncedConnectionError.current(message);
  }, [showWarning]);

  const showConnectionSuccess = useCallback((message: string = 'Conexión creada correctamente') => {
    return showSuccess('Conexión exitosa', message, 3000);
  }, [showSuccess]);

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showCustom,
    showConnectionError,
    showConnectionSuccess,
    removeNotification,
    clearAll
  };
};
