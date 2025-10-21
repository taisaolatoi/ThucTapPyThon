import React, { useState, useEffect } from 'react';

const UserModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    id: user ? user.id : null,
    name: user ? user.name : '',
    email: user ? user.email : '',
    role: user ? user.role : 'User', // Mặc định là 'User'
    status: user ? user.status : 'Active', // Mặc định là 'Active'
  });

  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="um-modal-overlay">
      <div className="um-modal-content large">
        <h3 className="um-modal-title">{user ? 'Chỉnh sửa Người dùng' : 'Thêm Người dùng Mới'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="um-form-group">
            <label htmlFor="name" className="um-form-label">Tên:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="um-form-input"
              required
            />
          </div>
          <div className="um-form-group">
            <label htmlFor="email" className="um-form-label">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="um-form-input email-input"
              required
            />
          </div>
          <div className="um-form-group">
            <label htmlFor="role" className="um-form-label">Vai trò:</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="um-form-select"
            >
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div className="um-form-group">
            <label htmlFor="status" className="um-form-label">Trạng thái:</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="um-form-select"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="um-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="um-modal-button cancel"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="um-modal-button primary"
            >
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
