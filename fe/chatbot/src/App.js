// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css'; // Vẫn cần import CSS chung
import AuthPage from './auth/auth'; // Đảm bảo đường dẫn đúng đến AuthPage
import Dashboard from './dashboard/dashboard'; // Đảm bảo đường dẫn đúng đến Dashboard

function App() {
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Đọc thông tin đăng nhập từ localStorage khi component mount
    const storedUserId = localStorage.getItem('user_id');
    const storedUsername = localStorage.getItem('username');
    if (storedUserId && storedUsername) {
      setLoggedInUserId(parseInt(storedUserId));
      setUsername(storedUsername);
    }
  }, []);

  const handleLoginSuccess = (userId, user) => {
    setLoggedInUserId(userId);
    setUsername(user);
    localStorage.setItem('user_id', userId); // Lưu vào localStorage
    localStorage.setItem('username', user); // Lưu vào localStorage
  };

  const handleLogout = () => {
    setLoggedInUserId(null);
    setUsername('');
    localStorage.removeItem('user_id'); // Xóa khỏi localStorage
    localStorage.removeItem('username'); // Xóa khỏi localStorage
  };

  return (
    <div className="App">
      {loggedInUserId ? (
        <Dashboard
          loggedInUserId={loggedInUserId}
          username={username}
          onLogout={handleLogout}
        />
      ) : (
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;