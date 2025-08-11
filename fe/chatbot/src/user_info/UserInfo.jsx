// src/components/dashboard_components/UserInfo.jsx
import React, { useState } from 'react';
// import './UserInfo.css'; 
import PasswordUpdateModal from './pass_update'; // Import component modal mới

const UserInfo = ({ username, onLogout }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    // Logic xử lý thay đổi mật khẩu sẽ được đặt trong PasswordUpdateModal
    // và có thể được truyền lên đây nếu cần xử lý thêm sau khi modal đóng
    const handlePasswordUpdate = (currentPassword, newPassword) => {
        console.log('Mật khẩu hiện tại (từ modal):', currentPassword);
        console.log('Mật khẩu mới (từ modal):', newPassword);
        // TODO: Thêm logic gửi request API cập nhật mật khẩu thực tế ở đây
        // Ví dụ: axios.post('/api/update-password', { currentPassword, newPassword, userId });
        handleCloseModal(); // Đóng modal sau khi xử lý
    };

    return (
        <div className="user-info-section">
            <div className="user-profile-header">
                <div className="profile-avatar">
                    <img src={`https://ui-avatars.com/api/?name=${username}&background=random&color=fff`} alt="User Avatar" />
                </div>
                <div className="profile-details">
                    <h3>{username || 'Người dùng'}</h3>
                    <p>Chào mừng trở lại bảng điều khiển!</p>
                </div>
            </div>

            <div className="user-actions">
                <button 
                    className="update-info-btn"
                    onClick={handleOpenModal}
                >
                    Đổi mật khẩu
                </button>
                <button className="logout-btn" onClick={onLogout}>
                    Đăng xuất
                </button>
            </div>
            
            {/* Hiển thị modal nếu isModalOpen là true */}
            {isModalOpen && (
                <PasswordUpdateModal 
                    onClose={handleCloseModal} 
                    onSubmit={handlePasswordUpdate} 
                />
            )}
        </div>
    );
};

export default UserInfo;
