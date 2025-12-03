'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
  showPrompt: (title: string, message: string, defaultValue?: string) => Promise<string | null>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 15);
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? (notification.type === 'confirm' ? 0 : 5000),
    };

    setNotifications((prev) => [...prev, newNotification]);

    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, [removeNotification]);

  const showSuccess = useCallback((title: string, message?: string) => {
    showNotification({ type: 'success', title, message });
  }, [showNotification]);

  const showError = useCallback((title: string, message?: string) => {
    showNotification({ type: 'error', title, message });
  }, [showNotification]);

  const showWarning = useCallback((title: string, message?: string) => {
    showNotification({ type: 'warning', title, message });
  }, [showNotification]);

  const showInfo = useCallback((title: string, message?: string) => {
    showNotification({ type: 'info', title, message });
  }, [showNotification]);

  const showConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    const id = Math.random().toString(36).substring(2, 15);
    
    const newNotification: Notification = {
      id,
      type: 'confirm',
      title,
      message,
      duration: 0, // Don't auto-dismiss
      onConfirm: () => {
        onConfirm();
        removeNotification(id);
      },
      onCancel: () => {
        if (onCancel) onCancel();
        removeNotification(id);
      },
      confirmText: 'Confirm',
      cancelText: 'Cancel',
    };

    setNotifications((prev) => [...prev, newNotification]);
  }, [removeNotification]);

  const showPrompt = useCallback((title: string, message: string, defaultValue?: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const id = Math.random().toString(36).substring(2, 15);
      let inputValue = defaultValue || '';

      const PromptNotification: Notification & { onInputChange?: (value: string) => void; defaultValue?: string } = {
        id,
        type: 'info',
        title,
        message,
        duration: 0,
        onConfirm: () => {
          resolve(inputValue || null);
          removeNotification(id);
        },
        onCancel: () => {
          resolve(null);
          removeNotification(id);
        },
        confirmText: 'OK',
        cancelText: 'Cancel',
        defaultValue: defaultValue || '',
        onInputChange: (value: string) => {
          inputValue = value;
        },
      };

      setNotifications((prev) => [...prev, PromptNotification]);
    });
  }, [removeNotification]);

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showConfirm,
        showPrompt,
      }}
    >
      {children}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  );
};

const NotificationContainer: React.FC<{
  notifications: Notification[];
  onRemove: (id: string) => void;
}> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

const NotificationItem: React.FC<{
  notification: Notification;
  onRemove: (id: string) => void;
}> = ({ notification, onRemove }) => {
  const [inputValue, setInputValue] = useState('');

  const getStyles = () => {
    switch (notification.type) {
      case 'success':
        return {
          bg: 'bg-green-600',
          border: 'border-green-500',
          icon: <CheckCircle size={20} className="text-green-100" />,
        };
      case 'error':
        return {
          bg: 'bg-red-600',
          border: 'border-red-500',
          icon: <AlertCircle size={20} className="text-red-100" />,
        };
      case 'warning':
        return {
          bg: 'bg-yellow-600',
          border: 'border-yellow-500',
          icon: <AlertTriangle size={20} className="text-yellow-100" />,
        };
      case 'info':
        return {
          bg: 'bg-blue-600',
          border: 'border-blue-500',
          icon: <Info size={20} className="text-blue-100" />,
        };
      case 'confirm':
        return {
          bg: 'bg-purple-600',
          border: 'border-purple-500',
          icon: <AlertCircle size={20} className="text-purple-100" />,
        };
      default:
        return {
          bg: 'bg-slate-600',
          border: 'border-slate-500',
          icon: <Info size={20} className="text-slate-100" />,
        };
    }
  };

  const styles = getStyles();
  const isPrompt = notification.type === 'info' && (notification as any).onInputChange;
  const defaultValue = (notification as any).defaultValue || '';
  
  useEffect(() => {
    if (isPrompt && defaultValue) {
      setInputValue(defaultValue);
      if ((notification as any).onInputChange) {
        (notification as any).onInputChange(defaultValue);
      }
    }
  }, [isPrompt, defaultValue]);

  return (
    <div
      className={`
        ${styles.bg} ${styles.border} border-2 rounded-lg shadow-2xl
        p-4 min-w-[320px] max-w-[420px] pointer-events-auto
        animate-in slide-in-from-right-full duration-300
        flex flex-col gap-3
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
        <div className="flex-1">
          <h4 className="font-bold text-white text-sm mb-1">{notification.title}</h4>
          {notification.message && !isPrompt && (
            <p className="text-white/90 text-xs leading-relaxed">{notification.message}</p>
          )}
          {isPrompt && (
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if ((notification as any).onInputChange) {
                  (notification as any).onInputChange(e.target.value);
                }
              }}
              className="w-full mt-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 text-sm"
              placeholder={notification.message || "Enter value..."}
              autoFocus
              value={inputValue}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && notification.onConfirm) {
                  (notification as any).onInputChange?.(inputValue);
                  notification.onConfirm();
                } else if (e.key === 'Escape' && notification.onCancel) {
                  notification.onCancel();
                }
              }}
            />
          )}
        </div>
        {!isPrompt && notification.type !== 'confirm' && (
          <button
            onClick={() => onRemove(notification.id)}
            className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {notification.type === 'confirm' && (
        <div className="flex gap-2 justify-end mt-2">
          <button
            onClick={() => {
              if (notification.onCancel) notification.onCancel();
            }}
            className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            {notification.cancelText || 'Cancel'}
          </button>
          <button
            onClick={() => {
              if (notification.onConfirm) notification.onConfirm();
            }}
            className="px-4 py-1.5 bg-white hover:bg-white/90 text-purple-600 rounded-lg text-xs font-semibold transition-colors"
          >
            {notification.confirmText || 'Confirm'}
          </button>
        </div>
      )}

      {isPrompt && (
        <div className="flex gap-2 justify-end mt-2">
          <button
            onClick={() => {
              if (notification.onCancel) notification.onCancel();
            }}
            className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (notification.onConfirm) notification.onConfirm();
            }}
            className="px-4 py-1.5 bg-white hover:bg-white/90 text-blue-600 rounded-lg text-xs font-semibold transition-colors"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
};

