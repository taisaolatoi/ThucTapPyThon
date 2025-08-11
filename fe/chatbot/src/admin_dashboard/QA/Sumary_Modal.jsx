import React, { useState, useEffect } from 'react';
import { InfinityIcon } from 'lucide-react';

const SummaryModal = ({ summary, loading, onClose }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setDots(prevDots => (prevDots.length < 3 ? prevDots + '.' : ''));
      }, 500);
      return () => clearInterval(interval);
    } else {
      setDots('');
    }
  }, [loading]);

  return (
    <div className="app-modal-overlay">
      <div className="app-modal-content large">
        <h3 className="app-modal-title">Tóm tắt Hội thoại</h3>
        {loading ? (
          <div className="app-modal-loading-state">
            <InfinityIcon className="app-loading-spinner" />
            <p className="app-modal-loading-text">Đang tạo tóm tắt{dots}</p>
          </div>
        ) : (
          <p className="app-modal-text">{summary}</p>
        )}
        <div className="app-modal-actions">
          <button
            onClick={onClose}
            type="button"
            className="app-modal-button primary"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;
