export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number; // milliseconds, undefined = no auto-dismiss
  dismissible?: boolean;
  timestamp: number;
}

export interface NotificationConfig {
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  dismissible?: boolean;
}
