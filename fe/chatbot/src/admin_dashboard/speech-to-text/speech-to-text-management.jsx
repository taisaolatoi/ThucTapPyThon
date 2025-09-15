import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { InfinityIcon, Trash2Icon, ChevronLeft, ChevronRight } from 'lucide-react';

const ConfirmDeleteModal = ({ show, onClose, onConfirm, type }) => {
  if (!show) return null;

  return (
    <div className="app-modal-overlay">
      <div className="app-modal-content">
        <h3 className="app-modal-title">Xác nhận xóa</h3>
        <p className="app-modal-text">Bạn có chắc chắn muốn xóa {type} này? Hành động này không thể hoàn tác.</p>
        <div className="app-modal-actions">
          <button
            onClick={onClose}
            className="app-modal-button cancel"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="app-modal-button delete"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
};

const VoiceToTextManagement = () => {
  const [translatedAudios, setTranslatedAudios] = useState([]);

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletingAudioId, setDeletingAudioId] = useState(null);
  const [deletingAudioUserId, setDeletingAudioUserId] = useState(null);

  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [deleteStatus, setDeleteStatus] = useState(null);

  // === State cho Pagination ===
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  const API_BASE_URL = 'http://localhost:3001/api';

  // Hàm lấy tất cả lịch sử bản dịch từ backend (dành cho admin)
  const fetchAllTranslatedAudios = async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/voice-to-text/all`);
      const sortedAudios = response.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setTranslatedAudios(sortedAudios);
    } catch (err) {
      console.error('Lỗi khi lấy tất cả lịch sử bản dịch:', err);
      setHistoryError('Không thể tải lịch sử bản dịch. Vui lòng thử lại.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTranslatedAudios();
  }, []);

  const handleDeleteAudio = (id, userId) => {
    setDeletingAudioId(id);
    setDeletingAudioUserId(userId);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteAudio = async () => {
    if (!deletingAudioId) {
      setDeleteStatus('error');
      setShowDeleteConfirmModal(false);
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/delete-audio/${deletingAudioId}`, {
        params: { user_id: deletingAudioUserId }
      });
      setDeleteStatus('success');
      fetchAllTranslatedAudios(); // Tải lại lịch sử sau khi xóa thành công
    } catch (err) {
      console.error('Lỗi khi gửi yêu cầu xóa bản dịch:', err.response ? err.response.data : err.message);
      setDeleteStatus('error');
    } finally {
      setShowDeleteConfirmModal(false);
      setDeletingAudioId(null);
      setDeletingAudioUserId(null);
      setTimeout(() => setDeleteStatus(null), 3000);
    }
  };

  // === Logic cho Pagination ===
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = translatedAudios.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(translatedAudios.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="cb-admin-section-container">
      <h3 className="cb-admin-section-title">Quản lý Bản dịch Giọng nói</h3>

      {/* Thông báo trạng thái */}
      {deleteStatus === 'success' && (
        <div className="app-alert success" role="alert">
          <span className="app-alert-text">Xóa bản dịch thành công!</span>
        </div>
      )}
      {deleteStatus === 'error' && (
        <div className="app-alert error" role="alert">
          <span className="app-alert-text">Không thể xóa bản dịch. Vui lòng thử lại.</span>
        </div>
      )}
      {historyError && (
        <div className="app-alert error" role="alert">
          <span className="app-alert-text">{historyError}</span>
        </div>
      )}

      {/* Lịch sử Bản dịch đã tạo */}
      <div className="cb-admin-card" style={{ marginTop: '24px' }}>
        <h4 className="cb-admin-card-title">Lịch sử Bản dịch</h4>
        <div className="cb-admin-table-container">
          {isHistoryLoading ? (
            <div className="app-loading-state">
              <InfinityIcon className="app-loading-spinner" />
              <p className="app-loading-text">Đang tải lịch sử bản dịch...</p>
            </div>
          ) : translatedAudios.length === 0 ? (
            <p className="app-no-data">Không có bản dịch nào được tạo.</p>
          ) : (
            <>
              <table className="cb-admin-data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Văn bản gốc</th>
                    <th>Văn bản đã dịch</th>
                    <th>Người dùng</th>
                    <th>Thời gian</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((audio) => (
                    <tr key={audio.id}>
                      <td>{audio.id}</td>
                      <td className="truncate">{audio.original_text}</td>
                      <td className="truncate">{audio.translated_text}</td>
                      <td>{audio.user_name}</td>
                      <td>{new Date(audio.created_at).toLocaleString()}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteAudio(audio.id, audio.user_id)}
                          className="cb-admin-action-button delete"
                        >
                          <Trash2Icon size={16} /> Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Phần phân trang */}
              {totalPages > 1 && (
                <nav className="pagination-nav">
                  <ul className="pagination-list">
                    <li className={`pagination-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="pagination-button"
                      >
                        <ChevronLeft size={16} /> Previous
                      </button>
                    </li>
                    {pageNumbers.map(number => (
                      <li key={number} className={`pagination-item ${currentPage === number ? 'active' : ''}`}>
                        <button onClick={() => paginate(number)} className="pagination-button">
                          {number}
                        </button>
                      </li>
                    ))}
                    <li className={`pagination-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="pagination-button"
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal xác nhận xóa */}
      <ConfirmDeleteModal
        show={showDeleteConfirmModal}
        onClose={() => {
          setShowDeleteConfirmModal(false);
          setDeletingAudioId(null);
          setDeletingAudioUserId(null);
        }}
        onConfirm={confirmDeleteAudio}
        type="bản dịch"
      />
    </div>
  );
};

export default VoiceToTextManagement;
