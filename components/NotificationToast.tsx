import React, { useEffect, useState } from 'react';
import type { Notification } from '../contexts/NotificationContext';

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const ICONS: { [key: string]: string } = {
  success: 'fa-check-circle',
  error: 'fa-times-circle',
  info: 'fa-info-circle',
  warning: 'fa-exclamation-triangle',
};

const COLORS: { [key: string]: string } = {
  success: 'bg-green-100 border-green-400 text-green-700',
  error: 'bg-red-100 border-red-400 text-red-700',
  info: 'bg-blue-100 border-blue-400 text-blue-700',
  warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
};

const ICON_COLORS: { [key: string]: string } = {
    success: 'text-green-500',
    error: 'text-red-500',
    info: 'text-blue-500',
    warning: 'text-yellow-500',
};


const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // This is for the fade-out animation before removal from DOM
    const timer = setTimeout(() => {
        setIsExiting(true);
        // The parent component will remove it after 5s total,
        // this just triggers the animation a bit before.
    }, 4700); 

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(notification.id), 300); // wait for animation
  };

  const baseClasses = 'notification-toast flex items-start w-full p-4 rounded-lg shadow-lg border-l-4 transition-all duration-300';
  const animationClass = isExiting ? 'exit' : 'enter';

  return (
    <div className={`${baseClasses} ${COLORS[notification.type]} ${animationClass}`} role="alert">
      <div className={`text-xl ${ICON_COLORS[notification.type]}`}>
        <i className={`fas ${ICONS[notification.type]}`}></i>
      </div>
      <div className="ml-3 flex-1">
        <p className="text-sm font-bold">{notification.title}</p>
        {notification.message && (
          <p className="mt-1 text-sm">{notification.message}</p>
        )}
      </div>
      <button onClick={handleDismiss} className="ml-4 -mr-1 -mt-1 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-ring">
        <i className="fas fa-times text-sm"></i>
      </button>
    </div>
  );
};

export default NotificationToast;
