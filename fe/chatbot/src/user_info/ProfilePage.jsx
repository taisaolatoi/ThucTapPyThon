import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Notification from "../notification/notification";
import "./UserInfo.css";

const ProfilePage = () => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Giả sử user_id lưu trong localStorage sau khi login
  const userId = localStorage.getItem("user_id");

  // Lấy dữ liệu hồ sơ khi vào trang
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/profile/${userId}`);
        const data = await res.json();
        if (res.ok) {
          setEmail(data.email || "");
          setPhone(data.phone || "");
        } else {
          setMessage({ type: "error", text: data.error || "Không thể tải hồ sơ" });
        }
      } catch (err) {
        setMessage({ type: "error", text: "Lỗi kết nối server!" });
      }
    };
    if (userId) fetchProfile();
  }, [userId]);

  // Xử lý lưu thay đổi
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:3001/api/update-profile/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setMessage({ type: "success", text: data.message || "Cập nhật thành công!" });
      } else {
        setMessage({ type: "error", text: data.error || "Cập nhật thất bại!" });
      }
    } catch (err) {
      setLoading(false);
      setMessage({ type: "error", text: "Lỗi kết nối server!" });
    }
  };

  return (
    <div className="account-page">
      <div className="account-breadcrumb">
        <Link to="/" className="account-link">Trang chủ</Link> &gt;{" "}
        <Link to="/dashboard/account" className="account-link">Tài khoản</Link> &gt;{" "}
        <span>Cập nhật hồ sơ</span>
      </div>

      <h2 className="account-title">Cập nhật hồ sơ</h2>

      {/* Thông báo */}
      <Notification
        message={message.text}
        type={message.type}
        onClose={() => setMessage({ type: "", text: "" })}
      />

      <form className="account-form" onSubmit={handleSubmit}>
        <label>Email</label>
        <input
          type="email"
          placeholder="Nhập email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Số điện thoại</label>
        <input
          type="text"
          placeholder="Nhập số điện thoại"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;
