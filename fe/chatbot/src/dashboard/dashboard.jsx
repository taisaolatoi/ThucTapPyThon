// src/components/Dashboard.jsx
import React, { useState } from 'react';
import './dashboard.css';
import Chatbox from '../chatbox/chatbox';
import Voice from '../voice_to_text/voice';
import TextToImage from '../text-to-image/text_to_image'
import SpeechToText from '../speech-to-text/SpeechToText';
import UserInfo from '../user_info/UserInfo'; // Import component thông tin người dùng mới
import DashboardSummary from './dashboard_sumary'; // Import component tổng quan mới
import ChatBox from '../chatbox/chatbox'; // Import component chat mới
const Dashboard = ({ loggedInUserId, username, onLogout }) => {
  const [activeMenuItem, setActiveMenuItem] = useState('Bảng điều khiển');
  const [activeSessionId, setActiveSessionId] = useState(null);

  const renderContent = () => {
    switch (activeMenuItem) {
      case 'Bảng điều khiển':
        return (
          <div className="main-content-padding">
            <UserInfo
              username={username}
              onLogout={onLogout}
            />
            <DashboardSummary
              loggedInUserId={loggedInUserId}
              username={username}
              onChatClick={() => setActiveMenuItem('CHAT')}
            />
          </div>
        );
      case 'CHAT':
        return (
          <div className="main-content-padding content-placeholder">
            <Chatbox
              loggedInUserId={loggedInUserId}
              username={username}
              activeSessionId={activeSessionId}
              setActiveSessionId={setActiveSessionId}
              onLogout={onLogout}
            />
          </div>
        );
      case 'AI Form':
        return <div className="main-content-padding content-placeholder"><TextToImage loggedInUserId={loggedInUserId} username={username} activeSessionId={activeSessionId} setActiveSessionId={setActiveSessionId} /></div>;
      case 'Tạo Voice':
        return <div className="main-content-padding content-placeholder"><Voice loggedInUserId={loggedInUserId} username={username} /></div>;
      case 'Voice to Text':
        return <div className="main-content-padding content-placeholder"><SpeechToText loggedInUserId={loggedInUserId} username={username} /></div>;
      case 'Tạo văn bản':
        return <div className="main-content-padding content-placeholder"><ChatBox loggedInUserId={loggedInUserId} username={username} /></div>;
      default:
        return <div className="main-content-padding content-placeholder">Chọn một mục từ menu bên trái.</div>;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div>
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
            <span className="sidebar-app-name">ChatBot</span>
          </div>

          <nav className="sidebar-nav">
            <ul>
              {['Bảng điều khiển', 'CHAT', 'AI Form', 'Tạo Voice', 'Voice to Text', 'Tạo văn bản'].map((item) => (
                <li key={item}>
                  <button
                    onClick={() => setActiveMenuItem(item)}
                    className={`sidebar-nav-button ${activeMenuItem === item ? 'active' : ''}`}
                  >
                    {item === 'Bảng điều khiển' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                    {item === 'CHAT' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
                    {item === 'AI Form' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
                    {item === 'Tạo Voice' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                    {item === 'Voice to Text' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                    {item === 'Tạo văn bản' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    {item}
                  </button>
                </li>
              ))}
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
            </div>
          </div>
          <button onClick={onLogout} className="logout-button-sidebar">
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="main-content">
        {renderContent()}
      </div>
    </div>
  );
}
export default Dashboard;
