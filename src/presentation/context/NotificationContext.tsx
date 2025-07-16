import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { Notification, NotificationConfig } from '../../shared/types/notifications';

interface NotificationState {
  notifications: Notification[];
}

type NotificationAction = 
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_ALL' };

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (config: NotificationConfig) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const notificationReducer = (state: NotificationState, action: NotificationAction): NotificationState => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    case 'CLEAR_ALL':
      return {
        ...state,
        notifications: []
      };
    default:
      return state;
  }
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, { notifications: [] });
  
  // Sistema de prevención de duplicados
  const recentNotifications = React.useRef<Map<string, number>>(new Map());
  const DUPLICATE_THRESHOLD = 1000; // 1 segundo

  const addNotification = useCallback((config: NotificationConfig): string => {
    // Crear clave única para este tipo de notificación
    const notificationKey = `${config.type}-${config.title}-${config.message}`;
    const now = Date.now();
    
    // Verificar si ya existe una notificación similar reciente
    const lastTime = recentNotifications.current.get(notificationKey);
    if (lastTime && (now - lastTime) < DUPLICATE_THRESHOLD) {
      console.log(`🔄 Notificación duplicada bloqueada: ${notificationKey}`);
      return ''; // Retornar ID vacío para indicar que no se creó
    }
    
    // Actualizar el tiempo de la última notificación
    recentNotifications.current.set(notificationKey, now);
    
    // Limpiar entradas antiguas del Map para evitar memory leaks
    const cutoffTime = now - DUPLICATE_THRESHOLD * 2;
    const keysToDelete: string[] = [];
    recentNotifications.current.forEach((time, key) => {
      if (time < cutoffTime) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => recentNotifications.current.delete(key));
    
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const notification: Notification = {
      id,
      type: config.type,
      title: config.title,
      message: config.message,
      duration: config.duration,
      dismissible: config.dismissible !== false, // default to true
      timestamp: Date.now()
    };

    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });

    // Auto-dismiss if duration is specified
    if (config.duration && config.duration > 0) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
      }, config.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  return (
    <NotificationContext.Provider 
      value={{
        notifications: state.notifications,
        addNotification,
        removeNotification,
        clearAll
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
