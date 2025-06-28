// src/components/Dashboard.jsx
import React, { useState } from 'react'; // Đảm bảo có useState
import './dashboard.css'; // Import file CSS của bạn
import Chatbox from '../chatbox/chatbox'; // Đảm bảo đường dẫn đúng
import Voice from '../voice_to_text/voice'; // Đảm bảo đường dẫn đúng

// Main App component
// NHẬN loggedInUserId, username, và onLogout TỪ PROPS CỦA APP.JS
const Dashboard = ({ loggedInUserId, username, onLogout }) => {
  const [activeMenuItem, setActiveMenuItem] = useState('Bảng điều khiển'); // State to manage active menu item
  // THÊM STATE ĐỂ QUẢN LÝ activeSessionId Ở ĐÂY
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Function to render content based on active menu item
  const renderContent = () => {
    switch (activeMenuItem) {
      case 'Bảng điều khiển':
        return (
          <div className="main-content-padding">
            {/* Header section for user info and chat button */}
            <div className="user-header">
              <div className="user-profile">
                {/* User avatar/logo */}
                <div className="user-profile-avatar">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
                <div className="user-profile-info">
                  {/* HIỂN THỊ USERNAME TỪ PROPS */}
                  <h2>{username || 'Người dùng'}</h2>
                  {/* Bạn có thể thêm email từ props nếu có */}
                  <p>{username ? `${username.toLowerCase().replace(/\s/g, '')}@example.com` : 'email@example.com'}</p>
                </div>
              </div>
              <button className="chat-button" onClick={() => setActiveMenuItem('CHAT')}>
                Chat Ngay
              </button>
            </div>

            {/* Overview section */}
            {/* <div className="overview-section">
              <div className="overview-header">
                <h3>Tổng quan</h3>
                <div className="overview-time-filters">
                  <button className="overview-filter-button active">Tháng này</button>
                  <button className="overview-filter-button">Tất cả</button>
                </div>
              </div>
              <div className="overview-cards">

                <div className="overview-card pin">
                  <p>PIN</p>
                  <p className="overview-card-value">1</p> 
                </div>
 
                <div className="overview-card chat">
                  <p>Eloan chat</p>
                  <p className="overview-card-value">3</p> 
                </div>
                <div className="overview-card articles">
                  <p>Số bài viết được tạo</p>
                  <p className="overview-card-value">0</p> 
                </div>
              </div>
            </div> */}

            {/* AI Form content creation section */}
            {/* <div className="ai-form-section">
              <div className="ai-form-header">
                <h3>Tạo nội dung dễ dàng với AI Form</h3>
                <a href="#" className="ai-form-view-all-button">
                  <span>Xem tất cả</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
              <div className="ai-form-cards">
                <div className="ai-form-card seo">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Tạo bài SEO</span>
                </div>
                <div className="ai-form-card translate">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Dịch nội dung</span>
                </div>
              </div>
            </div> */}
          </div>
        );
      case 'CHAT':
        // TRUYỀN CÁC PROPS CẦN THIẾT XUỐNG CHATBOX
        return (
          <div className="main-content-padding content-placeholder">
            <Chatbox
              loggedInUserId={loggedInUserId}
              username={username}
              // TRUYỀN activeSessionId VÀ setActiveSessionId XUỐNG ĐÂY
              activeSessionId={activeSessionId}
              setActiveSessionId={setActiveSessionId}
              onLogout={onLogout} // Truyền onLogout nếu ChatContent cần nó
            />
          </div>
        );
      case 'AI Form':
        return <div className="main-content-padding content-placeholder"><Voice loggedInUserId={loggedInUserId} username={username} /></div>;
      case 'Tạo Voice':
        return <div className="main-content-padding content-placeholder"><Voice loggedInUserId={loggedInUserId} username={username} /></div>;
      case 'Voice to Text':
        return <div className="main-content-padding content-placeholder">Nội dung cho mục Voice to Text</div>;
      case 'Đọc hình ảnh':
        return <div className="main-content-padding content-placeholder">Nội dung cho mục Đọc hình ảnh</div>;
      case 'Dịch đa ngôn ngữ':
        return <div className="main-content-padding content-placeholder">Nội dung cho mục Dịch đa ngôn ngữ</div>;
      case 'Nội dung đã tạo':
        return <div className="main-content-padding content-placeholder">Nội dung cho mục Nội dung đã tạo</div>;
      case 'Nạp PIN':
        return <div className="main-content-padding content-placeholder">Nội dung cho mục Nạp PIN</div>;
      case 'Nhập Mã Quà Tặng':
        return <div className="main-content-padding content-placeholder">Nội dung cho mục Nhập Mã Quà Tặng</div>;
      default:
        return <div className="main-content-padding content-placeholder">Chọn một mục từ menu bên trái.</div>;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar navigation */}
      <div className="sidebar">
        <div>
          {/* Logo/App Name */}
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
            <span className="sidebar-app-name">ChatBot</span> {/* Placeholder for app name */}
          </div>

          {/* Menu items */}
          <nav className="sidebar-nav">
            <ul>
              {['Bảng điều khiển', 'CHAT', 'AI Form', 'Tạo Voice'].map((item) => (
                <li key={item}>
                  <button
                    onClick={() => setActiveMenuItem(item)}
                    className={`sidebar-nav-button ${activeMenuItem === item ? 'active' : ''}`}
                  >
                    {/* Dynamic icons based on menu item - using simple placeholders for now */}
                    {item === 'Bảng điều khiển' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                    {item === 'CHAT' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
                    {item === 'AI Form' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
                    {item === 'Tạo Voice' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                    {item === 'Voice to Text' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                    {item === 'Đọc hình ảnh' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    {item === 'Dịch đa ngôn ngữ' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                    {item === 'Nội dung đã tạo' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                    {item === 'Nạp PIN' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.592 1L21 12h-3.812c-.668 1.953-2.705 3.5-5.188 3.5-3.116 0-5.653-2.503-5.653-5.5S8.884 6.5 12 6.5c2.275 0 4.244 1.277 5.383 3H21M3 12h6.218c-.482 1.162-.858 2.361-1.066 3.607M9.496 14.288c-.843-.092-1.682-.249-2.5-.47V15a2 2 0 002 2h2.57l-1.428 1.428A2 2 0 0110 21H3v-3.586L4.414 16H6zm11.316-4.016A2.003 2.003 0 0118 10h-1.066c.34-.789.64-1.573.9-2.399L21 7v3.586z" /></svg>}
                    {item === 'Nhập Mã Quà Tặng' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* User info at the bottom of the sidebar */}
        <div className="sidebar-footer">
          <div className="sidebar-pin-usage">
            {/* đã dùng 1/10 PIN  */}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="sidebar-user-details">
              <p>{username || 'Người dùng'}</p> 
              {/* <a href="https://chathoialxm/dashboard">https://chathoialxm/dashboard</a>  */}
            </div>
          </div>
          {/* Nút Đăng xuất */}
          <button onClick={onLogout} className="logout-button-sidebar">
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="main-content">
        {renderContent()}
      </div>
    </div>
  );
}
export default Dashboard;