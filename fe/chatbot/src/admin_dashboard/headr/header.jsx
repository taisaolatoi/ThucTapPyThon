import React from 'react';


const Header = ({ pageTitle, username, onLogout, isSidebarOpen, setIsSidebarOpen }) => {
  return (


    <header className="cb-admin-header-bar">
      {console.log("Username:", username)}
      {console.log("onLogout type:", typeof onLogout)}
      <button
        className="cb-admin-header-toggle-button"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 6h16M4 12h16M4 18h16"
          ></path>
        </svg>
      </button>
      <h2 className="cb-admin-header-title">
        {pageTitle}
      </h2>
      <div className="cb-admin-header-user-info">
        <span className="cb-admin-header-username">Xin chào, {username}!</span>
        <div className="cb-admin-header-avatar">
          {username ? username.charAt(0).toUpperCase() : 'A'}
        </div>
        <button
          onClick={onLogout}
          className="cb-admin-header-logout-button"
        >
          Đăng xuất
        </button>
      </div>

    </header>
  );
};


export default Header;
