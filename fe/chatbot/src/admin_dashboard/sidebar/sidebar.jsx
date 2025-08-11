import React from 'react';

const SidebarItem = ({ icon, text, path, currentPath, onClick }) => (
  <li className="cb-admin-sidebar-item">
    <button
      onClick={() => onClick(path)}
      className={`cb-admin-sidebar-item-button ${currentPath === path ? 'active' : ''}`}
    >
      <span className="cb-admin-sidebar-item-icon">{icon}</span>
      <span className="cb-admin-sidebar-item-text">{text}</span>
    </button>
  </li>
);

const Sidebar = ({ isSidebarOpen, currentPath, navigate }) => {
  return (
    <aside className={`cb-admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
      <div className="cb-admin-sidebar-header">
        <h1 className="cb-admin-sidebar-title">Admin Chatbot</h1>
      </div>
      <nav className="cb-admin-sidebar-nav">
        <ul>
          <SidebarItem
            icon="📊"
            text="Tổng quan"
            path="#dashboard"
            currentPath={currentPath}
            onClick={navigate}
          />
          <SidebarItem
            icon="💬"
            text="Quản lý Hỏi đáp"
            path="#qa-management"
            currentPath={currentPath}
            onClick={navigate}
          />
          <SidebarItem
            icon="🖼️"
            text="Văn bản thành Hình ảnh"
            path="#text-to-image"
            currentPath={currentPath}
            onClick={navigate}
          />
          <SidebarItem
            icon="👥"
            text="Quản lý Người dùng"
            path="#users"
            currentPath={currentPath}
            onClick={navigate}
          />
          <SidebarItem
            icon="⚙️"
            text="Cài đặt Hệ thống"
            path="#settings"
            currentPath={currentPath}
            onClick={navigate}
          />
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
