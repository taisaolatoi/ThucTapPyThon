// src/components/dashboard_components/DashboardSummary.jsx
import React, { useState, useEffect } from 'react';
import './dashboard_sumary.css'; // Import file CSS mới cho component này
import { MessageSquareText, Image as ImageIcon, Activity } from 'lucide-react'; // Rename Image to ImageIcon to avoid conflict

const DashboardSummary = ({ loggedInUserId, username, onChatClick }) => {
    const [summaryStats, setSummaryStats] = useState({
        totalChats: 0,
        totalImageGenerations: 0,
    });
    const [recentActivities, setRecentActivities] = useState([]);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [error, setError] = useState(null);

    const API_BASE_URL = '/api/dashboard'; // Proxy sẽ xử lý điều này

    useEffect(() => {
        // Chỉ fetch dữ liệu nếu có loggedInUserId
        if (!loggedInUserId) {
            setLoadingSummary(false);
            setLoadingActivities(false);
            setError("Vui lòng đăng nhập để xem thông tin tổng quan.");
            return;
        }

        const fetchSummaryStats = async () => {
            try {
                setLoadingSummary(true);
                // Truyền user_id qua query parameter
                const response = await fetch(`${API_BASE_URL}/summary-stats-user?user_id=${loggedInUserId}`);
                if (!response.ok) {
                    throw new Error(`Lỗi HTTP! trạng thái: ${response.status}`);
                }
                const data = await response.json();
                setSummaryStats({
                    totalChats: data.total_chats,
                    totalImageGenerations: data.total_image_generations,
                });
            } catch (e) {
                console.error("Lỗi khi tải dữ liệu tổng quan:", e);
                setError(`Lỗi khi tải dữ liệu tổng quan: ${e.message}`);
            } finally {
                setLoadingSummary(false);
            }
        };

        const fetchRecentActivities = async () => {
            try {
                setLoadingActivities(true);
                // Truyền user_id qua query parameter
                const response = await fetch(`${API_BASE_URL}/recent-activities-user?user_id=${loggedInUserId}`);
                if (!response.ok) {
                    throw new Error(`Lỗi HTTP! trạng thái: ${response.status}`);
                }
                const data = await response.json();
                setRecentActivities(data);
            } catch (e) {
                console.error("Lỗi khi tải hoạt động gần đây:", e);
                setError(`Lỗi khi tải hoạt động gần đây: ${e.message}`);
            } finally {
                setLoadingActivities(false);
            }
        };

        fetchSummaryStats();
        fetchRecentActivities();
    }, [loggedInUserId]); // Thêm loggedInUserId vào mảng phụ thuộc

    // Hàm trợ giúp để định dạng thời gian "time ago"
    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const activityTime = new Date(timestamp);
        const diffInSeconds = Math.floor((now - activityTime) / 1000);

        if (diffInSeconds < 60) {
            return `${diffInSeconds} giây trước`;
        }
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `${diffInMinutes} phút trước`;
        }
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours} giờ trước`;
        }
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} ngày trước`;
    };

    return (
        <div className="dashboard-summary-container">
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <div className="summary-cards">
                <div className="summary-card">
                    <div className="card-icon">
                        <MessageSquareText size={32} strokeWidth={2.5} />
                    </div>
                    <h4>Đoạn chat đã tạo</h4>
                    {loadingSummary ? (
                        <p className="card-value loading-spinner"></p>
                    ) : (
                        <p className="card-value">{summaryStats.totalChats.toLocaleString()}</p>
                    )}
                    <button onClick={onChatClick} className="card-action-btn">
                        Chat Ngay
                    </button>
                </div>
                <div className="summary-card">
                    <div className="card-icon">
                        <ImageIcon size={32} strokeWidth={2.5} />
                    </div>
                    <h4>Ảnh đã tạo</h4>
                    {loadingSummary ? (
                        <p className="card-value loading-spinner"></p>
                    ) : (
                        <p className="card-value">{summaryStats.totalImageGenerations.toLocaleString()}</p>
                    )}
                    <button className="card-action-btn">
                        Tạo ảnh mới
                    </button>
                </div>
            </div>

            <div className="recent-activity-section">
                <h3>Hoạt động gần đây</h3>
                {loadingActivities ? (
                    <div className="loading-state">
                        <Activity className="loading-spinner-icon" size={32} />
                        <p>Đang tải hoạt động...</p>
                    </div>
                ) : recentActivities.length === 0 ? (
                    <p className="no-activity-message">Không có hoạt động gần đây.</p>
                ) : (
                    <ul className="activity-list">
                        {recentActivities.map(activity => (
                            <li key={activity.id} className="activity-item">
                                <span className="activity-type">
                                    {activity.type === 'chat' ? (
                                        <MessageSquareText size={18} style={{ color: '#16a34a' }} />
                                    ) : (
                                        <ImageIcon size={18} style={{ color: '#1d45b6' }} />
                                    )}
                                    <span style={{ marginLeft: '8px' }}>
                                        {activity.type === 'chat' ? 'Tin nhắn mới' : 'Tạo ảnh mới'}
                                    </span>
                                </span>
                                <span className="activity-text">{activity.description}</span>
                                <span className="activity-time">{formatTimeAgo(activity.created_at)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default DashboardSummary;
