import React, { useState, useEffect } from 'react';
import Sidebar from './sidebar/sidebar';
import Header from './headr/header';
import Dashboard from './dashboard/dashboard';
import QAManagement from './QA/QAmanagement';
import TextToImageManagement from './text_to_img/text_to_img_management';
import UserManagement from './user/user_management';
import SystemSettings from './system/sys_settings';
import SpeechToText from './speech-to-text/speech-to-text-management';
// Import CSS
import './dashboard.css';
// Component Route thủ công để chuyển đổi giữa các trang
const Route = ({ path, element }) => {
  const [currentPath, setCurrentPath] = useState(window.location.hash || '#dashboard');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash || '#dashboard');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return currentPath === path ? element : null;
};

const App = ({ loggedInUserId, username, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigate = (path) => {
    window.location.hash = path;
    setIsSidebarOpen(false); // Close sidebar on mobile after navigation
  };




  return (
    <div className="cb-admin-app-container">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        currentPath={window.location.hash || '#dashboard'}
        navigate={navigate}
      />
      <div className="cb-admin-main-content-area">
        <Header
          username={username}
          onLogout={onLogout}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
        <main className="cb-admin-page-content">
          <Route path="#dashboard" element={<Dashboard onLogout={onLogout} />} />
          <Route path="#qa-management" element={<QAManagement />} />
          <Route path="#text-to-image" element={<TextToImageManagement username={username} />} />
          <Route path="#users" element={<UserManagement username={username} loggedInUserId={loggedInUserId} />} />
          <Route path="#settings" element={<SystemSettings />} />
          <Route path="#voice-to-text" element={<SpeechToText />} />
        </main>
      </div>
    </div>
  );
};

export default App;
