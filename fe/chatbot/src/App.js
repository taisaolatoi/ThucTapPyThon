// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css'; 


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
    const storedUserRole = localStorage.getItem('user_role'); // Đọc vai trò

    if (storedUserId && storedUsername && storedUserRole !== null) {
      setLoggedInUserId(parseInt(storedUserId));
      setUsername(storedUsername);
      setLoggedInUserRole(parseInt(storedUserRole)); // Chuyển đổi vai trò thành số nguyên
    }
  }, []);

  // Cập nhật hàm handleLoginSuccess để nhận thêm 'role' từ AuthPage
  const handleLoginSuccess = (userId, user, role) => {
    setLoggedInUserId(userId);
    setUsername(user);
    setLoggedInUserRole(role); // Thiết lập vai trò người dùng
    localStorage.setItem('user_id', userId); // Lưu vào localStorage
    localStorage.setItem('username', user); // Lưu vào localStorage
    localStorage.setItem('user_role', role); // Lưu vai trò vào localStorage
  };

  const handleLogout = () => {
    setLoggedInUserId(null);
    setUsername('');
    setLoggedInUserRole(null); // Xóa vai trò khi đăng xuất
    localStorage.removeItem('user_id'); // Xóa khỏi localStorage
    localStorage.removeItem('username'); // Xóa khỏi localStorage
    localStorage.removeItem('user_role'); // Xóa vai trò khỏi localStorage
  };

  return (
    <div className="App">
      {loggedInUserId ? (
        // Kiểm tra vai trò để hiển thị giao diện phù hợp
        loggedInUserRole === 1 ? ( // Nếu vai trò là 1 (Admin)
          <AdminApp
            loggedInUserId={loggedInUserId}
            username={username}
            onLogout={handleLogout}
          />
        ) : ( // Nếu vai trò là 0 (hoặc bất kỳ vai trò nào khác không phải admin)
          <Dashboard // Đây là Dashboard của bạn, được sử dụng làm User Dashboard
            loggedInUserId={loggedInUserId}
            username={username}
            onLogout={handleLogout}
          />
        )
      ) : (
        // Hiển thị trang đăng nhập nếu chưa đăng nhập
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;
