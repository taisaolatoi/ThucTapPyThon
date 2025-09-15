// src/components/Dashboard.jsx
import React, { useState } from 'react';
import './dashboard.css';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'; // Import useLocation

// Import các component con
import Chatbox from '../chatbox/chatbox';
import Voice from '../voice_to_text/voice';
import TextToImage from '../text-to-image/text_to_image';
import SpeechToText from '../speech-to-text/SpeechToText';
import UserInfo from '../user_info/UserInfo'
import SecurityPage from '../user_info/SecutiryPage';
import ProfilePage from '../user_info/ProfilePage';
import DashboardSummary from './dashboard_sumary';

const Dashboard = ({ loggedInUserId, username, onLogout }) => {
  const [activeSessionId, setActiveSessionId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation(); // Lấy đối tượng location hiện tại

  // Hàm để chuyển hướng đến trang chat khi click từ DashboardSummary
  const handleChatClick = () => {
    navigate('/dashboard/chat');
  };

  // Helper function để xác định xem một link có active không
  const isActive = (path) => {
    // Nếu path là '/', kiểm tra xem nó có phải là chính xác '/dashboard' không
    // hoặc là đường dẫn con của /dashboard (nếu path.startsWith('/dashboard'))
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    // Đối với các đường dẫn khác, kiểm tra xem đường dẫn hiện tại có bắt đầu bằng path không (hoặc khớp hoàn toàn)
    // Ví dụ: '/dashboard/chat' sẽ khớp với path 'chat'
    return location.pathname.startsWith(path);
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div>
          <div className="sidebar-header">
            {/* <div className="sidebar-logo">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div> */}
            <span style={{ fontSize: '20px' }} className="sidebar-app-name">ChatBot</span>
          </div>

          <nav className="sidebar-nav">
            <ul>
              <li>
                <Link
                  to="/dashboard"
                  className={`sidebar-nav-button ${isActive('/dashboard') ? 'active' : ''}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                  Bảng điều khiển
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard/chat"
                  className={`sidebar-nav-button ${isActive('/dashboard/chat') ? 'active' : ''}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  CHAT
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard/ai-form"
                  className={`sidebar-nav-button ${isActive('/dashboard/ai-form') ? 'active' : ''}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                  Text to Image
                </Link>
              </li>
              {/* <li>
                <Link
                  to="/dashboard/tao-voice"
                  className={`sidebar-nav-button ${isActive('/dashboard/tao-voice') ? 'active' : ''}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  Tạo Voice
                </Link>
              </li> */}
              <li>
                <Link
                  to="/dashboard/voice-to-text"
                  className={`sidebar-nav-button ${isActive('/dashboard/voice-to-text') ? 'active' : ''}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  Voice to Text
                </Link>



              </li>
              {/* Nếu "Tạo văn bản" là một component riêng, bạn sẽ cần thêm một Link tương tự ở đây */}
            </ul>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-pin-usage">
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="sidebar-user-details">
              <p>{username || 'Người dùng'}</p>
              <Link to="/dashboard/account" id="profile-link" class="profile-link">
                Tài khoản
              </Link>
            </div>

          </div>
          <button onClick={onLogout} className="logout-button-sidebar">
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="main-content">
        <Routes>
          <Route path="/" element={
            <div className="main-content-padding">
              {/* <UserInfo
                username={username}
                onLogout={onLogout}
              /> */}
              <DashboardSummary
                loggedInUserId={loggedInUserId}
                username={username}
                onChatClick={handleChatClick}
              />
            </div>
          } />
          <Route path="chat" element={
            <div className="main-content-padding content-placeholder">
              <Chatbox
                loggedInUserId={loggedInUserId}
                username={username}
                activeSessionId={activeSessionId}
                setActiveSessionId={setActiveSessionId}
                onLogout={onLogout}
              />
            </div>
          } />
          <Route path="ai-form" element={
            <div className="main-content-padding content-placeholder">
              <TextToImage
                loggedInUserId={loggedInUserId}
                username={username}
                activeSessionId={activeSessionId}
                setActiveSessionId={setActiveSessionId}
              />
            </div>
          } />
          <Route path="tao-voice" element={
            <div className="main-content-padding content-placeholder">
              <Voice
                loggedInUserId={loggedInUserId}
                username={username}
              />
            </div>
          } />

          <Route path="account" element={
            <div className="main-content-padding content-placeholder">
              <UserInfo
                loggedInUserId={loggedInUserId}
                username={username}
              />
            </div>
          } />

          <Route path="profile" element={
            <div className="main-content-padding content-placeholder">
              <ProfilePage
                loggedInUserId={loggedInUserId}
                username={username}
              />
            </div>
          } />

          <Route path="security" element={
            <div className="main-content-padding content-placeholder">
              <SecurityPage
                loggedInUserId={loggedInUserId}
                username={username}
              />
            </div>
          } />

          <Route path="voice-to-text" element={
            <div className="main-content-padding content-placeholder">
              <SpeechToText
                loggedInUserId={loggedInUserId}
                username={username}
              />
            </div>
          } />
          <Route path="*" element={<div className="main-content-padding content-placeholder">Trang không tồn tại.</div>} />
        </Routes>
      </div>
    </div>
  );
}

export default Dashboard;
