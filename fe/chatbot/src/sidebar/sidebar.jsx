import React from 'react';
import './Sidebar.css';

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Bảng điều khiển</h2>
      </div>
      
      <div className="sidebar-menu">
        <div className="menu-section">
          <div className="menu-item active">
            <a href='#'>CHAT</a>
          </div>
          <div className="menu-item">
            <span>Al Form</span>
          </div>
          <div className="menu-item">
            <span>Tạo Voice</span>
          </div>
          <div className="menu-item">
            <span>Voice to Text</span>
          </div>
          <div className="menu-item">
            <span>Đọc hình ảnh</span>
          </div>
          <div className="menu-item">
            <span>Dịch đa ngôn ngữ</span>
          </div>
          <div className="menu-item">
            <span>Nội dung đã tạo</span>
          </div>
        </div>
        
        <div className="menu-section">
          <div className="menu-item">
            <span>Nạp PIN</span>
          </div>
          <div className="menu-item">
            <span>Nhập Mã Quà Tặng</span>
          </div>
        </div>
        
        <div className="menu-footer">
          <div className="pin-info">
            <span>đã dùng 1/10 PIN</span>
          </div>
          <div className="user-info">
            <span>Văn Phát ...</span>
            <span>Tài khoản</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;