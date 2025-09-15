import React, { useState } from "react";
import { Link } from "react-router-dom";
import Notification from "../notification/notification";
import "./UserInfo.css";

const SecurityPage = () => {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState({ message: "", type: "" });

  // Giả sử user_id lưu trong localStorage sau khi login
  const userId = localStorage.getItem("user_id");  

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      setNotif({ message: "Mật khẩu mới không khớp!", type: "error" });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:3001/api/change-password/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            old_password: oldPass,
            new_password: newPass,
          }),
        }
      );

      const result = await response.json();
      setLoading(false);

      if (response.ok) {
        setNotif({ message: result.message || "Đổi mật khẩu thành công!", type: "success" });
        setOldPass("");
        setNewPass("");
        setConfirmPass("");
      } else {
        setNotif({ message: result.error || "Có lỗi xảy ra!", type: "error" });
      }
    } catch (error) {
      setLoading(false);
      console.error("Error:", error);
      setNotif({ message: "Lỗi kết nối server!", type: "error" });
    }
  };

  return (
    <div className="account-page">
      {/* Thông báo */}
      <Notification 
        message={notif.message} 
        type={notif.type} 
        onClose={() => setNotif({ message: "", type: "" })} 
      />

      <div className="account-breadcrumb">
        <Link to="/" className="account-link">Trang chủ</Link> &gt;{" "}
        <Link to="/dashboard/account" className="account-link">Tài khoản</Link> &gt;{" "}
        <span>Thay đổi mật khẩu</span>
      </div>

      <h2 className="account-title">Thay đổi mật khẩu</h2>
      <form className="account-form" onSubmit={handleSubmit}>
        <label>Mật khẩu hiện tại</label>
        <input
          type="password"
          placeholder="Nhập mật khẩu cũ"
          value={oldPass}
          onChange={(e) => setOldPass(e.target.value)}
          required
        />

        <label>Mật khẩu mới</label>
        <input
          type="password"
          placeholder="Nhập mật khẩu mới"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
          required
        />

        <label>Xác nhận mật khẩu mới</label>
        <input
          type="password"
          placeholder="Nhập lại mật khẩu mới"
          value={confirmPass}
          onChange={(e) => setConfirmPass(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
        </button>
      </form>
    </div>
  );
};

export default SecurityPage;
