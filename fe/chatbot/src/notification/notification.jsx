import React, { useEffect } from "react";
import "./notification.css";

const Notification = ({ message, type, onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // tự ẩn sau 3 giây
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`notification ${type}`}>
      {message}
    </div>
  );
};

export default Notification;
