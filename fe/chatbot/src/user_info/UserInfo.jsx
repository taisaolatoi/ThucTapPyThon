import React from "react";
import "./UserInfo.css";
import { Link } from "react-router-dom";
import { FaUser, FaLock } from "react-icons/fa";

const AccountPage = () => {
    const items = [
        {
            icon: <FaUser />,
            title: "Hồ sơ",
            desc: "Cập nhật thông tin hồ sơ của bạn",
            link: "/dashboard/profile",
        },
        {
            icon: <FaLock />,
            title: "Bảo mật",
            desc: "Thay đổi thông tin bảo mật của bạn",
            link: "/dashboard/security",
        },
    ];

    return (
        <div className="account-page">
            <Link to="/" className="account-link">Trang chủ</Link> &gt;{" "}
            <Link to="/dashboard/account" className="account-link">Tài khoản</Link>
            <h2 className="account-title">Tài khoản</h2>

            <div className="account-list">
                {items.map((item, index) => (
                    <Link to={item.link} className="account-item" key={index}>
                        <div className="account-icon">{item.icon}</div>
                        <div className="account-content">
                            <div className="account-item-title">{item.title}</div>
                            <div className="account-item-desc">{item.desc}</div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default AccountPage;
