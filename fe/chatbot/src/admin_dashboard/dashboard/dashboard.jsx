// Dashboard.js
// Giao diện người dùng cho trang tổng quan, sử dụng các class CSS tùy chỉnh.

import React, { useState, useEffect } from 'react';
import { MessageSquareText, ReplyAll, Image, Users, Activity, ChevronLeft, ChevronRight } from 'lucide-react'; // Thêm ChevronLeft, ChevronRight

// API_BASE_URL sẽ được xử lý bởi proxy đã cấu hình trong package.json
const API_BASE_URL = '/api/dashboard';

// Component để hiển thị một chỉ số thống kê
const StatCard = ({ title, value, icon }) => (
    <div className="cb-admin-card cb-admin-stat-card">
        <div className="cb-admin-stat-icon">
            {icon}
        </div>
        <div>
            <p className="cb-admin-stat-label">{title}</p>
            <p className="cb-admin-stat-value">{value}</p>
        </div>
    </div>
);

// Component để hiển thị một mục hoạt động gần đây
const ActivityItem = ({ type, description, time }) => {
    let icon;
    let typeStyle;
    if (type === 'Câu hỏi mới') {
        icon = <MessageSquareText size={20} />;
        typeStyle = { color: '#16a34a' }; // green-600
    } else if (type === 'Tạo ảnh') {
        icon = <Image size={20} />;
        typeStyle = { color: '#2563eb' }; // blue-600
    } else if (type === 'Người dùng mới') {
        icon = <Users size={20} />;
        typeStyle = { color: '#9333ea' }; // purple-600
    } else {
        icon = <Activity size={20} />;
        typeStyle = { color: '#4b5563' }; // grey-600
    }
    
    // Hàm để chuyển đổi timestamp sang "time ago"
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

    const displayTime = typeof time === 'string' ? formatTimeAgo(time) : time;

    return (
        <li>
            <div>
                <p className="cb-admin-activity-type" style={typeStyle}>
                    {icon}
                    <span style={{ marginLeft: '8px' }}>{type}</span>
                </p>
                <p className="cb-admin-activity-description">{description}</p>
            </div>
            <span className="cb-admin-activity-time">{displayTime}</span>
        </li>
    );
};


const App = () => {
    const [stats, setStats] = useState({
        totalQuestions: 0,
        answeredQuestions: 0,
        imageRequests: 0,
        newUsersWeekly: 0,
    });
    const [loadingStats, setLoadingStats] = useState(true);
    const [recentActivities, setRecentActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [error, setError] = useState(null);

    // State cho phân trang hoạt động gần đây
    const [activitiesCurrentPage, setActivitiesCurrentPage] = useState(1);
    const activitiesItemsPerPage = 5; // Số lượng hoạt động trên mỗi trang

    useEffect(() => {
        // Hàm để gọi API lấy dữ liệu thống kê
        const fetchStats = async () => {
            try {
                setLoadingStats(true);
                const response = await fetch(`${API_BASE_URL}/stats`);
                
                // Nếu không OK (ví dụ: lỗi 500, 404)
                if (!response.ok && response.status !== 304) {
                    throw new Error('Lỗi khi lấy dữ liệu thống kê');
                }
                
                // Nếu status là 304 Not Modified, không cần phân tích JSON
                if (response.status === 304) {
                    console.log('Dữ liệu thống kê không thay đổi (304 Not Modified)');
                    return;
                }

                // Kiểm tra Content-Type của phản hồi
                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error('Phản hồi không phải là JSON. Có thể server backend không chạy hoặc đường dẫn API bị lỗi.');
                }
                
                const data = await response.json();
                setStats({
                    totalQuestions: data.total_questions,
                    answeredQuestions: data.answered_questions,
                    imageRequests: data.total_image_requests,
                    newUsersWeekly: data.new_users_weekly,
                });
            } catch (e) {
                console.error("Lỗi:", e);
                setError(`Lỗi khi tải dữ liệu thống kê: ${e.message}`);
            } finally {
                setLoadingStats(false);
            }
        };

        // Hàm để gọi API lấy hoạt động gần đây
        const fetchActivities = async () => {
            try {
                setLoadingActivities(true);
                const response = await fetch(`${API_BASE_URL}/activities`);
                
                // Nếu không OK (ví dụ: lỗi 500, 404)
                if (!response.ok && response.status !== 304) {
                    throw new Error('Lỗi khi lấy hoạt động gần đây');
                }

                // Nếu status là 304 Not Modified, không cần phân tích JSON
                if (response.status === 304) {
                    console.log('Hoạt động gần đây không thay đổi (304 Not Modified)');
                    return;
                }

                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error('Phản hồi không phải là JSON. Có thể server backend không chạy hoặc đường dẫn API bị lỗi.');
                }

                const data = await response.json();
                setRecentActivities(data);
            } catch (e) {
                console.error("Lỗi:", e);
                setError(`Lỗi khi tải hoạt động gần đây: ${e.message}`);
            } finally {
                setLoadingActivities(false);
            }
        };

        fetchStats();
        fetchActivities();
    }, []);

    // Logic phân trang cho hoạt động gần đây
    const totalActivitiesPages = Math.ceil(recentActivities.length / activitiesItemsPerPage);
    const activitiesStartIndex = (activitiesCurrentPage - 1) * activitiesItemsPerPage;
    const paginatedActivities = recentActivities.slice(activitiesStartIndex, activitiesStartIndex + activitiesItemsPerPage);

    const handleActivitiesPageChange = (pageNumber) => {
        setActivitiesCurrentPage(pageNumber);
    };

    return (
        <div className="cb-admin-section-container">

            {error && (
                <div style={{ textAlign: 'center', fontSize: '1.25rem', color: '#dc2626', backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                    {error}
                </div>
            )}

            <div style={{ marginBottom: '24px' }}>
                <h3 style={{color: '#2563eb', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Tổng quan thống kê</h3>
                <div className="cb-admin-stats-grid">
                    {loadingStats ? (
                        <div className="cb-admin-card cb-admin-stat-card" style={{ gridColumn: 'span 4', textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
                            <div className="cb-admin-spinner"></div>
                            <span style={{ marginLeft: '12px' }}>Đang tải số liệu thống kê...</span>
                        </div>
                    ) : (
                        <>
                            <StatCard
                                title="Tổng số câu hỏi"
                                value={stats.totalQuestions.toLocaleString()}
                                icon={<MessageSquareText size={32} strokeWidth={2.5} />}
                            />
                            <StatCard
                                title="Câu hỏi đã trả lời"
                                value={stats.answeredQuestions.toLocaleString()}
                                icon={<ReplyAll size={32} strokeWidth={2.5} />}
                            />
                            <StatCard
                                title="Yêu cầu tạo ảnh"
                                value={stats.imageRequests.toLocaleString()}
                                icon={<Image size={32} strokeWidth={2.5} />}
                            />
                            <StatCard
                                title="Người dùng mới (tuần)"
                                value={stats.newUsersWeekly.toLocaleString()}
                                icon={<Users size={32} strokeWidth={2.5} />}
                            />
                        </>
                    )}
                </div>
            </div>

            <div>
                <h3 style={{color: '#2563eb', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Hoạt động gần đây</h3>
                <div className="cb-admin-card">
                    {loadingActivities ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                            <div className="cb-admin-spinner"></div>
                            <span style={{ marginLeft: '12px' }}>Đang tải hoạt động...</span>
                        </div>
                    ) : (
                        <>
                            <ul className="cb-admin-recent-activities-list">
                                {paginatedActivities.map((activity, index) => ( // Sử dụng paginatedActivities
                                    <ActivityItem
                                        key={index}
                                        type={activity.type}
                                        description={activity.description}
                                        time={activity.created_at}
                                    />
                                ))}
                            </ul>
                            {totalActivitiesPages > 1 && (
                                <nav className="pagination-nav"> {/* Sử dụng class pagination-nav */}
                                    <ul className="pagination-list"> {/* Sử dụng class pagination-list */}
                                        <li className={`pagination-item ${activitiesCurrentPage === 1 ? 'disabled' : ''}`}> {/* Sử dụng class pagination-item */}
                                            <button
                                                onClick={() => handleActivitiesPageChange(activitiesCurrentPage - 1)}
                                                disabled={activitiesCurrentPage === 1}
                                                className="pagination-button" /* Sử dụng class pagination-button */
                                            >
                                                <ChevronLeft size={16} /> Trước
                                            </button>
                                        </li>
                                        {[...Array(totalActivitiesPages)].map((_, index) => (
                                            <li key={index + 1} className={`pagination-item ${activitiesCurrentPage === index + 1 ? 'active' : ''}`}>
                                                <button
                                                    onClick={() => handleActivitiesPageChange(index + 1)}
                                                    className="pagination-button"
                                                >
                                                    {index + 1}
                                                </button>
                                            </li>
                                        ))}
                                        <li className={`pagination-item ${activitiesCurrentPage === totalActivitiesPages ? 'disabled' : ''}`}>
                                            <button
                                                onClick={() => handleActivitiesPageChange(activitiesCurrentPage + 1)}
                                                disabled={activitiesCurrentPage === totalActivitiesPages}
                                                className="pagination-button"
                                            >
                                                Sau <ChevronRight size={16} />
                                            </button>
                                        </li>
                                    </ul>
                                </nav>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
