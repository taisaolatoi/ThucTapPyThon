import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UserModal from './user_modal'; // Đảm bảo tên file là UserModal.jsx
import { SearchIcon, EditIcon, Trash2Icon, ChevronLeftIcon, ChevronRightIcon, InfinityIcon } from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [deleteStatus, setDeleteStatus] = useState(null); // 'success' hoặc 'error'
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7; // 5-7 dòng mỗi trang

  const API_BASE_URL = 'http://localhost:3001/api/users'; // URL của backend user_management.py

  // Hàm lấy danh sách người dùng từ backend
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(API_BASE_URL);
      setUsers(response.data.users);
    } catch (err) {
      console.error('Lỗi khi lấy dữ liệu người dùng:', err);
      setError('Không thể tải dữ liệu người dùng. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Xử lý chỉnh sửa người dùng
  const handleEditUser = (user) => {
    setCurrentUser(user);
    setShowUserModal(true);
  };

  // Xử lý xóa người dùng
  const handleDeleteUser = async () => {
    if (!deletingUserId) return;

    try {
      await axios.delete(`${API_BASE_URL}/${deletingUserId}`);
      setDeleteStatus('success');
      fetchUsers(); // Tải lại danh sách sau khi xóa
    } catch (err) {
      console.error('Lỗi khi xóa người dùng:', err);
      setDeleteStatus('error');
    } finally {
      setShowDeleteConfirmModal(false);
      setDeletingUserId(null);
      setTimeout(() => setDeleteStatus(null), 3000); // Ẩn thông báo sau 3 giây
    }
  };

  // Mở modal xác nhận xóa
  const confirmDelete = (userId) => {
    setDeletingUserId(userId);
    setShowDeleteConfirmModal(true);
  };

  // Xử lý lưu thông tin người dùng (tạo mới hoặc cập nhật)
  const handleSaveUser = async (updatedUser) => {
    try {
      // Logic cập nhật người dùng hiện có
      await axios.put(`${API_BASE_URL}/${updatedUser.id}`, updatedUser);
      fetchUsers(); // Tải lại danh sách sau khi lưu
      setShowUserModal(false);
    } catch (err) {
      console.error('Lỗi khi lưu người dùng:', err);
      alert('Không thể lưu thông tin người dùng. Vui lòng thử lại.'); // Có thể thay bằng modal thông báo lỗi
    }
  };

  // Lọc người dùng theo từ khóa tìm kiếm (tên hoặc email)
  const filteredUsers = users.filter(user =>
    String(user.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(user.email).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Logic phân trang
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="um-container">
      <h3 className="um-title">Quản lý Người dùng</h3>

      {/* Thông báo trạng thái (xóa thành công/thất bại, lỗi tải) */}
      {deleteStatus === 'success' && (
        <div className="um-alert success" role="alert">
          <span className="um-alert-text">Xóa người dùng thành công!</span>
        </div>
      )}
      {deleteStatus === 'error' && (
        <div className="um-alert error" role="alert">
          <span className="um-alert-text">Không thể xóa người dùng. Vui lòng thử lại.</span>
        </div>
      )}
      {error && (
        <div className="um-alert error" role="alert">
          <span className="um-alert-text">{error}</span>
        </div>
      )}

      <div className="um-card">
        <div className="um-header">
          <h4 className="um-subtitle">Danh sách Người dùng</h4>
          <div className="um-search-container">
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset về trang 1 khi tìm kiếm
              }}
              className="um-search-input"
            />
            {/* <SearchIcon className="um-search-icon" size={18} /> */}
          </div>
        </div>

        <div className="um-table-wrapper">
          {isLoading ? (
            <div className="um-loading-state">
              <InfinityIcon className="um-loading-spinner" />
              <p className="um-loading-text">Đang tải dữ liệu...</p>
            </div>
          ) : users.length === 0 ? (
            <p className="um-no-data">Không có người dùng nào.</p>
          ) : (
            <>
              <table className="um-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tên</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Ngày đăng ký</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user) => (
                    <tr key={user.id} className="um-table-row">
                      <td className="um-table-cell">{user.id}</td>
                      <td className="um-table-cell">{user.name}</td>
                      <td className="um-table-cell">{user.email}</td>
                      <td className="um-table-cell">
                        <span className={`um-status-badge ${user.role === 'Admin' ? 'um-role-admin' : 'um-role-user'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="um-table-cell">
                        <span className={`um-status-badge ${user.status === 'Active' ? 'um-status-active' : 'um-status-inactive'}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="um-table-cell">{user.registered}</td>
                      <td className="um-table-cell">
                        <div className="um-actions">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="um-button edit"
                            title="Sửa người dùng"
                          >
                            <EditIcon size={16} />
                          </button>
                          <button
                            onClick={() => confirmDelete(user.id)}
                            className="um-button delete"
                            title="Xóa người dùng"
                          >
                            <Trash2Icon size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="um-pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="um-pagination-button"
                  >
                    <ChevronLeftIcon size={16} />
                  </button>
                  {[...Array(totalPages).keys()].map(page => (
                    <button
                      key={page + 1}
                      onClick={() => handlePageChange(page + 1)}
                      className={`um-pagination-button ${currentPage === page + 1 ? 'active' : ''}`}
                    >
                      {page + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="um-pagination-button"
                  >
                    <ChevronRightIcon size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showUserModal && (
        <UserModal
          user={currentUser}
          onClose={() => setShowUserModal(false)}
          onSave={handleSaveUser}
        />
      )}

      {showDeleteConfirmModal && (
        <div className="um-modal-overlay">
          <div className="um-modal-content">
            <h3 className="um-modal-title">Xác nhận xóa</h3>
            <p className="um-modal-text">Bạn có chắc chắn muốn xóa người dùng này không? Hành động này không thể hoàn tác.</p>
            <div className="um-modal-actions">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="um-modal-button cancel"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteUser}
                className="um-modal-button delete"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
