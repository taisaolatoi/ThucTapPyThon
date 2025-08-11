import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { InfinityIcon, Trash2Icon } from 'lucide-react'; // Chỉ giữ lại các icon cần thiết

// Component Modal xác nhận xóa tùy chỉnh
const ConfirmDeleteModal = ({ show, onClose, onConfirm }) => {
  console.log('ConfirmDeleteModal rendered. show prop:', show); 
  if (!show) return null;

  return (
    <div className="app-modal-overlay">
      <div className="app-modal-content">
        <h3 className="app-modal-title">Xác nhận xóa</h3>
        <p className="app-modal-text">Bạn có chắc chắn muốn xóa hình ảnh này? Hành động này không thể hoàn tác.</p>
        <div className="app-modal-actions">
          <button
            onClick={() => {
              console.log('Nút "Hủy" trong modal được click');
              onClose();
            }}
            className="app-modal-button cancel"
          >
            Hủy
          </button>
          <button
            onClick={() => {
              console.log('Nút "Xóa" trong modal được click');
              onConfirm(); // Đây là nơi hàm confirmDeleteImage được gọi
            }}
            className="app-modal-button delete"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
};

const TextToImageManagement = () => {
  const [generatedImages, setGeneratedImages] = useState([]); 

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState(null);
  const [deletingImageUserId, setDeletingImageUserId] = useState(null);

  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [deleteStatus, setDeleteStatus] = useState(null);

  const API_BASE_URL = 'http://localhost:3001/api'; // Đảm bảo URL này khớp với backend của bạn

  // Hàm lấy tất cả lịch sử hình ảnh đã tạo từ backend (dành cho admin)
  const fetchAllGeneratedImages = async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/image-history/all`);
      const sortedImages = response.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setGeneratedImages(sortedImages);
      console.log('Lịch sử hình ảnh đã tải thành công:', sortedImages.length, 'ảnh.');
      console.log('Dữ liệu tải về:', sortedImages); // Log toàn bộ dữ liệu tải về
    } catch (err) {
      console.error('Lỗi khi lấy tất cả lịch sử hình ảnh:', err);
      setHistoryError('Không thể tải lịch sử hình ảnh. Vui lòng thử lại.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchAllGeneratedImages();
  }, []);

  const handleDeleteImage = (id, userId) => {
    console.log('handleDeleteImage được gọi từ nút "Xóa" trong bảng.');
    console.log('Ảnh ID được truyền vào:', id, 'User ID được truyền vào:', userId);
    setDeletingImageId(id);
    setDeletingImageUserId(userId);
    setShowDeleteConfirmModal(true); // Hiển thị modal xác nhận
    console.log('showDeleteConfirmModal được đặt thành TRUE.');
  };

  const confirmDeleteImage = async () => {
    console.log('confirmDeleteImage được gọi từ modal xác nhận.');
    console.log('Đang cố gắng xóa ảnh với ID:', deletingImageId, 'và User ID:', deletingImageUserId);

    if (!deletingImageId) {
      console.error('Lỗi: ID ảnh hoặc User ID bị thiếu. Không thể gửi yêu cầu xóa.');
      setDeleteStatus('error');
      setShowDeleteConfirmModal(false);
      return;
    }

    try {
      // Gửi yêu cầu DELETE đến backend
      const response = await axios.delete(`${API_BASE_URL}/delete-image/${deletingImageId}`, {
        params: { user_id: deletingImageUserId }
      });
      console.log('Phản hồi từ API xóa:', response.data);
      setDeleteStatus('success');
      fetchAllGeneratedImages(); // Tải lại lịch sử sau khi xóa thành công
    } catch (err) {
      console.error('Lỗi khi gửi yêu cầu xóa hình ảnh:', err.response ? err.response.data : err.message);
      setDeleteStatus('error');
    } finally {
      setShowDeleteConfirmModal(false); // Đóng modal
      setDeletingImageId(null);
      setDeletingImageUserId(null);
      setTimeout(() => setDeleteStatus(null), 3000); // Ẩn thông báo sau 3 giây
    }
  };

  return (
    <div className="cb-admin-section-container">
      <h3 className="cb-admin-section-title">Quản lý Hình ảnh AI</h3>

      {/* Thông báo trạng thái */}
      {deleteStatus === 'success' && (
        <div className="app-alert success" role="alert">
          <span className="app-alert-text">Xóa hình ảnh thành công!</span>
        </div>
      )}
      {deleteStatus === 'error' && (
        <div className="app-alert error" role="alert">
          <span className="app-alert-text">Không thể xóa hình ảnh. Vui lòng thử lại.</span>
        </div>
      )}
      {historyError && (
        <div className="app-alert error" role="alert">
          <span className="app-alert-text">{historyError}</span>
        </div>
      )}

      {/* Lịch sử Hình ảnh đã tạo */}
      <div className="cb-admin-card" style={{ marginTop: '24px' }}>
        <h4 className="cb-admin-card-title">Lịch sử Hình ảnh đã tạo</h4>
        <div className="cb-admin-table-container">
          {isHistoryLoading ? (
            <div className="app-loading-state">
              <InfinityIcon className="app-loading-spinner" />
              <p className="app-loading-text">Đang tải lịch sử hình ảnh...</p>
            </div>
          ) : generatedImages.length === 0 ? (
            <p className="app-no-data">Không có hình ảnh nào được tạo.</p>
          ) : (
            <table className="cb-admin-data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Văn bản yêu cầu (Prompt)</th>
                  <th>Hình ảnh</th>
                  <th>Người dùng</th>
                  <th>Thời gian</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {generatedImages.map((img) => {
                  console.log('Dữ liệu ảnh trong map:', img); // Log toàn bộ đối tượng ảnh trong mỗi vòng lặp
                  return (
                    <tr key={img.id}>
                      <td>{img.id}</td>
                      <td className="truncate">{img.prompt}</td>
                      <td>
                        <img
                          src={img.image_url}
                          alt={img.prompt}
                          className="cb-admin-image-thumbnail"
                          onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/150x100/cccccc/000000?text=Error'; }}
                        />
                      </td>
                      <td>{img.user_name}</td>
                      <td>{img.created_at}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteImage(img.id, img.user_id)}
                          className="cb-admin-action-button delete"
                        >
                          <Trash2Icon size={16} /> Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal xác nhận xóa */}
      <ConfirmDeleteModal
        show={showDeleteConfirmModal}
        onClose={() => {
          console.log('Modal đóng (onClose) được gọi.');
          setShowDeleteConfirmModal(false);
          setDeletingImageId(null);
          setDeletingImageUserId(null);
        }}
        onConfirm={confirmDeleteImage}
      /> 
    </div>
  );
};

export default TextToImageManagement;
