// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // Import Navigate

import AuthPage from './auth/auth';
import AdminApp from './admin_dashboard/dashboard';
import Dashboard from './dashboard/dashboard';

function App() {
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [username, setUsername] = useState('');
  const [loggedInUserRole, setLoggedInUserRole] = useState(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    const storedUsername = localStorage.getItem('username');
    const storedUserRole = localStorage.getItem('user_role');

    if (storedUserId && storedUsername && storedUserRole !== null) {
      setLoggedInUserId(parseInt(storedUserId));
      setUsername(storedUsername);
      setLoggedInUserRole(parseInt(storedUserRole));
    }
  }, []);

  const handleLoginSuccess = (userId, user, role) => {
    setLoggedInUserId(userId);
    setUsername(user);
    setLoggedInUserRole(role);
    localStorage.setItem('user_id', userId);
    localStorage.setItem('username', user);
    localStorage.setItem('user_role', role);
  };

  const handleLogout = () => {
    setLoggedInUserId(null);
    setUsername('');
    setLoggedInUserRole(null);
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('user_role');
  };

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Tuyến đường cho trang đăng nhập */}
          <Route path="/login" element={
            loggedInUserId ? (
              loggedInUserRole === 1 ? (
                <Navigate to="/admin" replace /> // Nếu đã đăng nhập và là admin, chuyển hướng đến admin dashboard
              ) : (
                <Navigate to="/dashboard" replace /> // Nếu đã đăng nhập và là người dùng, chuyển hướng đến user dashboard
              )
            ) : (
              <AuthPage onLoginSuccess={handleLoginSuccess} />
            )
          } />

          {/* Tuyến đường cho Admin Dashboard */}
          <Route path="/admin/*" element={ // Dùng /* để cho phép các tuyến đường con bên trong AdminApp
            loggedInUserId && loggedInUserRole === 1 ? (
              <AdminApp
                loggedInUserId={loggedInUserId}
                username={username}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/login" replace /> // Nếu không phải admin hoặc chưa đăng nhập, chuyển hướng về login
            )
          } />

          {/* Tuyến đường cho User Dashboard */}
          <Route path="/dashboard/*" element={ // Dùng /* để cho phép các tuyến đường con bên trong Dashboard
            loggedInUserId && loggedInUserRole === 0 ? ( // Giả sử role 0 là user thường
              <Dashboard
                loggedInUserId={loggedInUserId}
                username={username}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/login" replace /> // Nếu không phải user hoặc chưa đăng nhập, chuyển hướng về login
            )
          } />

          {/* Tuyến đường mặc định (trang chủ) hoặc chuyển hướng nếu chưa đăng nhập */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Xử lý các tuyến đường không tồn tại (404) hoặc chuyển hướng về login nếu chưa xác định */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
